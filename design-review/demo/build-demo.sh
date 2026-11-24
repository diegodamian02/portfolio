#!/usr/bin/env bash
# Assembles the final LinkedIn demo clip from the raw capture + music.mp3.
#
#   node design-review/demo/capture-demo.mjs        # produces raw/<hash>.webm + raw/marks.json
#   bash  design-review/demo/build-demo.sh          # -> demo.mp4         (chosen: harder cuts, flash, whip)
#   bash  design-review/demo/build-demo.sh smooth   # -> demo-smooth.mp4  (gentle crossfades, for comparison)
#
# Tune the SEGMENT / TIME block, not the filtergraph. Times are seconds in the
# raw .webm unless a var is named O_* / OFF* / OC* (seconds in the finished clip).
set -euo pipefail
cd "$(dirname "$0")"

MODE="${1:-punchy}"
WEBM=$(ls -t raw/*.webm | head -1)
MUSIC=music.mp3
SFX=.sfx
[ "$MODE" = smooth ] && OUT=demo-smooth.mp4 || OUT=demo.mp4
[ -f "$WEBM" ]  || { echo "no raw webm — run capture-demo.mjs first"; exit 1; }
[ -f "$MUSIC" ] || { echo "no music.mp3"; exit 1; }

# ---- beat windows in the raw webm ----------------------------------------------
B1_IN=0.35;  B1_OUT=5.35     # cold open on the intro type -> hero settles      (LIGHT)
B2_IN=8.50;  B2_OUT=15.60    # crate -> pick the record -> flip to DARK -> spin + skyline
B3_IN=17.10; B3_OUT=25.60    # land at Connect -> message -> walkman "ship it" -> end card (DARK)
FLIP_RAW=10.66               # raw time the light->dark view transition fires (inside B2)
NEEDLE_RAW=10.95             # raw time the record meets the platter (inside B2)

LB_H=864                     # letterbox: keep this many px from the top, bar the rest
GRADE="eq=contrast=1.04:saturation=1.06,colorbalance=rm=0.015:bm=-0.02:bh=-0.012,vignette=a=PI/16"

if [ "$MODE" = punchy ]; then
  XF1=0.42; XF1_T=zoomin        # cut 1: zoom-punch
  XF2=0.36; XF2_T=squeezeh      # cut 2: hard horizontal tape-squeeze
  F_C1=0.55; F_C2=0.32; F_FLIP=-0.28
  SPLIT_RH=8;  SPLIT_FLIP=1     # RGB split also on the flip
  KISS_SIG=7;  KISS_C1=1        # heavy blur, also on cut 1
  WHIP_X=48
else
  XF1=0.55; XF1_T=fade          # cut 1: soft crossfade + whisper of a beat flash
  XF2=0.60; XF2_T=smoothleft    # cut 2: soft directional wipe + light whip-blur
  F_C1=0.11; F_C2=0.08; F_FLIP=-0.10
  SPLIT_RH=3;  SPLIT_FLIP=0
  KISS_SIG=2.5; KISS_C1=0
  WHIP_X=8
fi

# ---- derived timing ----------------------------------------------------------
read B1 B2 B3 OFF1 X1LEN OFF2 TOTAL OC1 OC2 OFLIP ONEEDLE FOS MFS CST CRKLEN \
< <(awk -v b1i=$B1_IN -v b1o=$B1_OUT -v b2i=$B2_IN -v b2o=$B2_OUT -v b3i=$B3_IN -v b3o=$B3_OUT \
      -v fr=$FLIP_RAW -v nr=$NEEDLE_RAW -v xf1=$XF1 -v xf2=$XF2 'BEGIN{
  b1=b1o-b1i; b2=b2o-b2i; b3=b3o-b3i;
  off1=b1-xf1; x1=b1+b2-xf1; off2=x1-xf2; total=x1+b3-xf2;
  oc1=b1-xf1/2; oc2=x1-xf2/2;
  oflip=off1+(fr-b2i); oneedle=off1+(nr-b2i);
  fos=total-0.5; mfs=total-1.8; cst=total-2.5; crklen=total-oflip+0.5;
  printf "%.3f %.3f %.3f %.3f %.3f %.3f %.3f %.3f %.3f %.3f %.3f %.3f %.3f %.3f %.3f\n",
    b1,b2,b3,off1,x1,off2,total,oc1,oc2,oflip,oneedle,fos,mfs,cst,crklen }')

ms () { awk -v x=$1 'BEGIN{printf "%d", (x<0?0:x)*1000}'; }
D_W1=$(ms $(awk -v x=$OC1 'BEGIN{print x-0.14}'))
D_W2=$(ms $(awk -v x=$OFLIP 'BEGIN{print x-0.12}'))
D_W3=$(ms $(awk -v x=$OC2 'BEGIN{print x-0.14}'))
D_IMP=$(ms $OC1)
D_T1=$(ms $(awk -v x=$OC1 'BEGIN{print x-0.08}'))
D_T2=$(ms $(awk -v x=$OC2 'BEGIN{print x-0.08}'))
D_SUB=$(ms $OFLIP)
D_ND=$(ms $ONEEDLE)
D_CRK=$(ms $OFLIP)

echo "beats  b1=$B1 b2=$B2 b3=$B3   total≈${TOTAL}s"
echo "hits   cut1=$OC1  flip=$OFLIP  needle=$ONEEDLE  cut2=$OC2  endcard=$CST"

# ---- 1. synthesize the SFX -------------------------------------------------
mkdir -p "$SFX"
L () { ffmpeg -y -v error -f lavfi -i "$1" -ac 2 -ar 44100 "$SFX/$2"; }
L "anoisesrc=d=0.6:c=pink:a=0.9:s=44100" _n.wav
ffmpeg -y -v error -i "$SFX/_n.wav" -af "volume='min(t/0.32,1)*max(0,1-max(0,t-0.34)/0.24)':eval=frame,highpass=f=230,lowpass=f=2700" "$SFX/whoosh.wav"
L "aevalsrc='exp(-11*t)*sin(2*PI*t*(90*exp(-3.2*t)+40))':d=0.45:s=44100" impact.wav
L "aevalsrc='exp(-6*t)*sin(2*PI*t*(60*exp(-2*t)+28))':d=0.7:s=44100" subdrop.wav
L "aevalsrc='0.55*sin(2*PI*t*(210*(1-min(t/0.15,1))))*max(0,1-t/0.19)':d=0.22:s=44100" tapestop.wav
L "aevalsrc='0.7*exp(-22*t)*sin(2*PI*68*t)+0.32*exp(-110*t)*(random(0)*2-1)':d=0.35:s=44100" needle.wav
L "aevalsrc='0.055*(random(0)*2-1)+gt(random(1),0.9993)*(random(2)*2-1)*0.55':d=26:s=44100" _c.wav
ffmpeg -y -v error -i "$SFX/_c.wav" -af "highpass=f=1400,lowpass=f=7200" "$SFX/crackle.wav"

# ---- 2. one pass: cut, transitions, letterbox, grade, audio mix ------------
# Transition seasoning on the joined timeline — kept subtle so the xfade itself
# carries the motion: a small RGB split + soft blur + a gentle luminance lift at
# each cut, and a brief blur/dip through the light->dark flip.
FLASH="eq=eval=frame:brightness='${F_C1}*max(0,1-abs(t-${OC1})/0.15) + ${F_C2}*max(0,1-abs(t-${OC2})/0.13) + (${F_FLIP})*max(0,1-abs(t-${OFLIP})/0.18)'"
SPLIT="rgbashift=rh=${SPLIT_RH}:bh=-${SPLIT_RH}:enable='between(t,${OC1}-0.11,${OC1}+0.11)+between(t,${OC2}-0.10,${OC2}+0.10)+${SPLIT_FLIP}*between(t,${OFLIP}-0.06,${OFLIP}+0.14)'"
KISSBLUR="gblur=sigma=${KISS_SIG}:enable='${KISS_C1}*between(t,${OC1}-0.06,${OC1}+0.11)+between(t,${OFLIP}-0.05,${OFLIP}+0.16)'"
WHIP="avgblur=sizeX=${WHIP_X}:sizeY=1:enable='between(t,${OC2}-0.11,${OC2}+0.11)'"

ffmpeg -y -v error -stats \
  -i "$WEBM" -i "$MUSIC" \
  -i "$SFX/whoosh.wav" -i "$SFX/whoosh.wav" -i "$SFX/whoosh.wav" \
  -i "$SFX/impact.wav" -i "$SFX/tapestop.wav" -i "$SFX/tapestop.wav" \
  -i "$SFX/subdrop.wav" -i "$SFX/needle.wav" -i "$SFX/crackle.wav" \
  -filter_complex "
    [0:v]trim=${B1_IN}:${B1_OUT},setpts=PTS-STARTPTS,scale=1920:1080,setsar=1[b1];
    [0:v]trim=${B2_IN}:${B2_OUT},setpts=PTS-STARTPTS,scale=1920:1080,setsar=1[b2];
    [0:v]trim=${B3_IN}:${B3_OUT},setpts=PTS-STARTPTS,scale=1920:1080,setsar=1[b3];
    [b1][b2]xfade=transition=${XF1_T}:duration=${XF1}:offset=${OFF1}[x1];
    [x1][b3]xfade=transition=${XF2_T}:duration=${XF2}:offset=${OFF2}[xj];
    [xj]minterpolate=fps=30:mi_mode=blend,
        ${WHIP},${SPLIT},${KISSBLUR},${FLASH},
        ${GRADE},
        unsharp=3:3:0.5:3:3:0.0,
        crop=1920:${LB_H}:0:0,pad=1920:1080:0:(1080-${LB_H})/2:color=black,
        fade=t=in:st=0:d=0.4,fade=t=out:st=${FOS}:d=0.5,format=yuv420p[vout];

    [1:a]atrim=0:${TOTAL},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.8,afade=t=out:st=${MFS}:d=1.8,loudnorm=I=-14:TP=-1.5:LRA=11,volume=0.86[mus];
    [2:a]adelay=${D_W1}|${D_W1},volume=0.5[w1];
    [3:a]adelay=${D_W2}|${D_W2},volume=0.6[w2];
    [4:a]adelay=${D_W3}|${D_W3},volume=0.5[w3];
    [5:a]adelay=${D_IMP}|${D_IMP},volume=0.8[imp];
    [6:a]adelay=${D_T1}|${D_T1},volume=0.55[t1];
    [7:a]adelay=${D_T2}|${D_T2},volume=0.6[t2];
    [8:a]adelay=${D_SUB}|${D_SUB},volume=0.7[sub];
    [9:a]adelay=${D_ND}|${D_ND},volume=0.75[nd];
    [10:a]atrim=0:${CRKLEN},adelay=${D_CRK}|${D_CRK},volume=0.15[crk];
    [mus][w1][w2][w3][imp][t1][t2][sub][nd][crk]amix=inputs=10:normalize=0:dropout_transition=0,alimiter=level_in=1:level_out=1:limit=0.95:attack=4:release=60[aout]
  " \
  -map "[vout]" -map "[aout]" \
  -c:v libx264 -profile:v high -preset veryslow -tune film -crf 17 -pix_fmt yuv420p -r 30 \
  -x264-params "aq-mode=3:aq-strength=0.9:psy-rd=1.0\\,0.15:deblock=-1\\,-1" \
  -c:a aac -b:a 256k -movflags +faststart -shortest \
  "$OUT"

echo
ffprobe -v error -show_entries format=duration -show_entries stream=width,height,r_frame_rate,codec_name -of default=nw=1 "$OUT"
echo "-> $(pwd)/$OUT"
