// Turntable audio engine.
//
// A MODULE-LEVEL SINGLETON, deliberately — not per-component state. Safari caps
// the number of concurrent AudioContexts and does not reliably release them on
// GC, so a context created per mount would eventually stop producing sound with
// no error. There is exactly one, created lazily, reused forever.
//
// Graph:
//     AudioBufferSourceNode → sourceGain ──┐
//                                          ├─→ masterGain → destination
//     ScratchWorkletNode ──→ scratchGain ──┘        └─────→ analyser  (tap)
//
// sourceGain and scratchGain exist so the two players can be CROSSFADED
// against each other without touching masterGain, which both of them pass
// through and which the spin linkage owns (see the scratch section at the
// bottom of this file). The analyser sits downstream of the sum, so the hero's
// skyline follows a scratch for free — including going silent when the record
// is held still — with no coupling between the two features.
//
// The analyser is built now even though nothing reads it until Stage 7. It is
// free here and painful to retrofit once the graph has consumers.
//
// Preview audio is fetched DIRECTLY from Apple's CDN — verified 2026-08-11 across
// Blink (desktop, Pixel 5, Galaxy S9+) and WebKit (Safari 17.6): the CDN sends
// access-control-allow-origin: *, decodeAudioData returns ~30s / 2ch, and the
// analyser reads non-zero data (i.e. the stream is not tainted). It does NOT go
// through /api/itunes/preview-proxy, which stays dormant. Only SEARCH is proxied.

const TARGET_VOLUME = 0.65;

// setTargetAtTime approaches exponentially and is ~95% there at 3τ, so this
// gives the ~0.8s fade the spec asks for.
const RAMP_TAU = 0.26;

// Short enough to be inaudible, long enough that the browser treats it as real
// output. Used only to satisfy iOS's unlock rules.
const SILENT_UNLOCK_SECONDS = 0.001;

let ctx = null;
let masterGain = null;
let analyser = null;

// Per-player gain for the ordinary buffer source. Always 1 except during the
// ~12ms handover to or from the scratch engine.
let sourceGain = null;

let currentSource = null;
let currentTrackId = null;
let currentUrl = null;

// Wall-clock bookkeeping for pause/resume. AudioBufferSourceNode cannot be
// paused or restarted — it is single-use — so "resume" means creating a fresh
// source and starting it at a stored offset.
let startedAtCtxTime = 0;
let startOffset = 0;
let isPlaying = false;

// stop() also triggers source.onended, so intentional stops must be
// distinguishable from a preview genuinely reaching its end.
let stoppingIntentionally = false;

let playbackRate = 1;
let lastError = null;

const bufferCache = new Map(); // previewUrl -> AudioBuffer
const endedListeners = new Set();

function getContextClass() {
    return window.AudioContext || window.webkitAudioContext || null;
}

export function isSupported() {
    return getContextClass() !== null;
}

/**
 * Creates the AudioContext and unlocks it. MUST be called synchronously from
 * inside a real user-gesture handler (see record-crate.jsx's selectTrack).
 *
 * Safe to call repeatedly — the context is created once.
 */
export function init() {
    const AC = getContextClass();
    if (!AC) {
        lastError = "Web Audio is not supported in this browser.";
        return null;
    }

    if (!ctx) {
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0;

        analyser = ctx.createAnalyser();

        // 2048, raised from 256 for the Stage 7 skyline.
        //
        // Not a preference — 256 cannot express the visual. It yields 128
        // bins, so at this 48kHz context each bin is 187Hz wide, and a
        // log-spaced skyline puts its first twenty columns (32-500Hz, 45% of
        // the hero width) inside the first two or three of them.
        //
        // A/B'd on RENDERED COLUMN HEIGHTS over 240 frames of the same playing
        // track, not on the bin arithmetic: at 256, 7 of the 19 adjacent pairs
        // in the bass half were indistinguishable on more than 80% of frames —
        // a run of eight columns moving as one block — with a mean neighbour
        // difference of 0.0066. At 2048 it is 0 of 19, at 0.0402. Six times
        // the detail in exactly the region log spacing exists to make room for.
        //
        // 2048 costs a 43ms analysis window and a 1024-byte copy per frame,
        // both negligible; the FFT itself is computed by the graph whether or
        // not anyone reads it.
        analyser.fftSize = 2048;

        // Lowered from the 0.8 default. That value is tuned for a spectrum
        // analyser display driven ONLY by the node's own smoothing, where the
        // job is a steady readable bar graph — it averages each bin over
        // roughly a quarter of a second, which is longer than a kick drum.
        //
        // The skyline does its own attack-fast/release-slow ballistics, which
        // is a strictly better instrument: the node's smoothing is symmetric,
        // so buying a smooth release from it also buys a slow ATTACK. Keeping
        // this low leaves the attack intact and lets the renderer own the
        // release, while still suppressing per-frame FFT noise.
        //
        // Nothing else reads the analyser.
        analyser.smoothingTimeConstant = 0.55;

        sourceGain = ctx.createGain();
        sourceGain.gain.value = 1;
        sourceGain.connect(masterGain);

        masterGain.connect(ctx.destination);
        // Tap only — an AnalyserNode processes whatever reaches it and does not
        // need its output connected onward.
        masterGain.connect(analyser);

        // Proves the singleton holds. If this ever logs twice, something is
        // constructing a second context and Safari will eventually go silent.
        console.info("[turntable-audio] AudioContext created", { sampleRate: ctx.sampleRate });
    }

    // resume() alone is not always enough on iOS: it wants actual output during
    // the gesture. Our real play() lands ~2s later at needle contact, and that
    // gap is exactly where the unlock tends to fail — so push a silent buffer
    // through now, synchronously, while we still hold the gesture.
    try {
        const buf = ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * SILENT_UNLOCK_SECONDS)), ctx.sampleRate);
        const unlock = ctx.createBufferSource();
        unlock.buffer = buf;
        unlock.connect(ctx.destination);
        unlock.start(0);
    } catch {
        // Non-fatal: the unlock is belt-and-braces, not the mechanism.
    }

    if (ctx.state === "suspended") ctx.resume();
    return ctx;
}

/** Fetches and decodes a preview, cached by URL so re-picking never refetches. */
export async function load(previewUrl) {
    if (!previewUrl) throw new Error("No preview URL for this track.");
    if (bufferCache.has(previewUrl)) return bufferCache.get(previewUrl);
    if (!ctx) init();
    if (!ctx) throw new Error("No AudioContext.");

    const res = await fetch(previewUrl);
    if (!res.ok) throw new Error(`Preview fetch failed (${res.status}).`);
    const arrayBuffer = await res.arrayBuffer();

    // Safari still ships only the callback form of decodeAudioData in some
    // versions, so accept either shape.
    const buffer = await new Promise((resolve, reject) => {
        const maybePromise = ctx.decodeAudioData(arrayBuffer, resolve, reject);
        if (maybePromise && typeof maybePromise.then === "function") {
            maybePromise.then(resolve, reject);
        }
    });

    bufferCache.set(previewUrl, buffer);
    return buffer;
}

// ---- spin linkage ------------------------------------------------------
//
// Pins playback to the platter so a pause is a power-DOWN, not a cut: as the
// brake ramps timeScale toward 0 the pitch sags with it and the level fades,
// and a resume winds both back up. The turntable drives this from the spin
// tween's own onUpdate, so the audio rides the EXACT curve the platter is on —
// including Task 4's proportional durations, which is what makes pausing from a
// half-speed platter produce a correspondingly shorter power-down for free.

// Below this the resampler produces aliasing garbage rather than a slower
// record, so playback is cut here instead of being ridden to zero.
export const RATE_FLOOR = 0.2;

// Full volume at and above this timeScale. Between here and the floor the
// record fades, so it reaches silence exactly AT the floor and the cut lands on
// silence — a cut at audible level would click.
const GAIN_FULL_AT = 0.85;

// Short enough that the parameter tracks the tween within a frame, long enough
// to avoid zipper noise from 60 discrete writes a second.
const SPIN_FOLLOW_TAU = 0.012;

let spinLinked = false;

// Sources that are fading out but still sounding. Held so a rapid press can
// hard-stop them instead of letting several overlap.
const retiring = new Set();

function hardStopRetiring() {
    for (const source of retiring) {
        try { source.stop(); } catch { /* already stopped */ }
        try { source.disconnect(); } catch { /* already disconnected */ }
    }
    retiring.clear();
}

function spinGain(timeScale) {
    const u = Math.min(1, Math.max(0, (timeScale - RATE_FLOOR) / (GAIN_FULL_AT - RATE_FLOOR)));
    return TARGET_VOLUME * u * u * (3 - 2 * u); // smoothstep — no corner at either end
}

/**
 * Hands gain and playback rate to the platter. Called before a transport ramp.
 *
 * The needle drop deliberately does NOT use this: there the deck is treated as
 * already up to speed, so the record starts at pitch with the slow fade-in from
 * Task 2 rather than bending up from the floor.
 */
export function beginSpinLink() { spinLinked = true; }
export function endSpinLink() {
    spinLinked = false;
    // Back to pitch, so the next needle drop or replay does not inherit
    // whatever rate the last power-down left behind.
    setRate(1);
}
export function isSpinLinked() { return spinLinked; }

/**
 * Drives rate and gain from the platter's current timeScale.
 *
 * `stopAtFloor` is true only while braking. On a wind-up the same low timeScale
 * values are passed through on the way UP, and cutting there would kill the
 * playback that is just starting.
 */
export function followSpin(timeScale, { stopAtFloor = false } = {}) {
    if (scratchActive) return;
    if (!spinLinked || !ctx || !masterGain) return;
    const t = Math.max(0, timeScale);

    if (t <= RATE_FLOOR) {
        if (stopAtFloor) {
            // spinGain() has been targeting 0 on the way down, but
            // setTargetAtTime approaches asymptotically and never arrives —
            // measured, the cut landed at 0.015 (about -33dB). Inaudible in
            // practice, but a 30ms fade makes the teardown provably silent
            // rather than probably silent.
            if (isPlaying) fadeOutAndStop(0.03);
        } else {
            masterGain.gain.setTargetAtTime(0, ctx.currentTime, SPIN_FOLLOW_TAU);
            setRate(RATE_FLOOR);
        }
        return;
    }

    setRate(t);
    masterGain.gain.setTargetAtTime(spinGain(t), ctx.currentTime, SPIN_FOLLOW_TAU);
}

/** Lands rate and gain exactly, so a ramp can't leave them a hair off target. */
export function settleSpin(timeScale) {
    if (scratchActive) return;
    if (!ctx || !masterGain) return;
    if (timeScale <= 0) return;
    setRate(timeScale);
    if (spinLinked) {
        masterGain.gain.setTargetAtTime(spinGain(timeScale), ctx.currentTime, SPIN_FOLLOW_TAU);
    }
}

/**
 * Fade to silence, then stop — for reduced motion, where there is no brake to
 * follow and an abrupt cut is the only alternative.
 *
 * stop() cannot do this: it tears the source down in the same tick, so its gain
 * ramp never becomes audible. That is why the deck cut abruptly.
 */
export function fadeOutAndStop(seconds = 0.15) {
    if (!ctx || !masterGain || !currentSource) return stop();
    const elapsed = getElapsed();
    const source = currentSource;

    // A LINEAR ramp, not setTargetAtTime: the exponential approaches zero
    // asymptotically and never arrives — measured, it stalled around 0.03
    // (about -26dB) and stayed there. A linear ramp lands on exactly 0 at
    // exactly the moment the source below is scheduled to stop, so the fade and
    // the teardown cannot disagree.
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + seconds);

    // Detach the bookkeeping NOW so the deck counts as stopped and a new press
    // can start a fresh source, but let this node keep sounding until the fade
    // lands. onended is cleared so the retirement can't read as end-of-track.
    source.onended = null;
    currentSource = null;
    isPlaying = false;
    startOffset = elapsed;

    try { source.stop(ctx.currentTime + seconds); } catch { /* already stopped */ }
    retiring.add(source);
    setTimeout(() => {
        try { source.disconnect(); } catch { /* already disconnected */ }
        retiring.delete(source);
    }, seconds * 1000 + 80);

    return elapsed;
}

function teardownSource() {
    if (!currentSource) return;
    stoppingIntentionally = true;
    try { currentSource.stop(); } catch { /* already stopped */ }
    try { currentSource.disconnect(); } catch { /* already disconnected */ }
    currentSource.onended = null;
    currentSource = null;
    stoppingIntentionally = false;
}

// Shared by playCached() and play() so the two can never drift apart.
function startBuffer(buffer, url, trackId, offset, fadeSeconds) {
    teardownSource();
    hardStopRetiring();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    source.connect(sourceGain);

    source.onended = () => {
        if (stoppingIntentionally) return;
        isPlaying = false;
        startOffset = 0;
        currentSource = null;
        endedListeners.forEach((fn) => fn());
    };

    const safeOffset = Math.max(0, Math.min(offset, buffer.duration - 0.01));
    source.start(0, safeOffset);

    currentSource = source;
    currentUrl = url;
    currentTrackId = trackId ?? currentTrackId;
    startedAtCtxTime = ctx.currentTime;
    startOffset = safeOffset;
    isPlaying = true;
    lastError = null;

    // Ramp rather than jump — assigning gain.value produces an audible click.
    //
    // Skipped entirely while spin-linked: there the platter owns the gain, and
    // a ramp to full volume here would immediately be fought by followSpin()
    // writing the speed-derived value on the very next frame.
    if (!spinLinked) {
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setTargetAtTime(
            TARGET_VOLUME,
            ctx.currentTime,
            (fadeSeconds ? fadeSeconds / 3 : RAMP_TAU),
        );
    }

    return { duration: buffer.duration };
}

/**
 * FULLY SYNCHRONOUS play, for the needle-contact moment specifically.
 *
 * Returns false if the buffer isn't decoded yet, so the caller can fall back to
 * the async path. Exists because `await` — even on an already-resolved promise —
 * defers to a microtask that lands AFTER the frame in which GSAP wrote the arm's
 * final position. Measured: the async path put audio ~50ms (3 frames) behind
 * needle contact even with the buffer warm. This closes that gap by starting the
 * source in the same tick as the timeline callback.
 */
export function playCached({ previewUrl, trackId, offset = 0, fadeSeconds } = {}) {
    if (!ctx || !masterGain) return false;
    const url = previewUrl ?? currentUrl;
    const buffer = url && bufferCache.get(url);
    if (!buffer) return false;
    if (ctx.state === "suspended") ctx.resume(); // fire-and-forget, don't await
    startBuffer(buffer, url, trackId, offset, fadeSeconds);
    return true;
}

/**
 * Starts playback from `offset` seconds. Always builds a fresh source —
 * AudioBufferSourceNodes are single-use and cannot be restarted.
 */
export async function play({ previewUrl, trackId, offset = 0, fadeSeconds } = {}) {
    if (!ctx) init();
    if (!ctx) throw new Error("No AudioContext.");
    if (ctx.state === "suspended") await ctx.resume();

    const url = previewUrl ?? currentUrl;
    if (!url) throw new Error("Nothing to play.");

    let buffer;
    try {
        buffer = await load(url);
        lastError = null;
    } catch (err) {
        lastError = err.message || "Could not load this preview.";
        isPlaying = false;
        throw err;
    }

    return startBuffer(buffer, url, trackId, offset, fadeSeconds);
}

/** Stops playback and returns the offset reached, for a later resume. */
export function stop() {
    const elapsed = getElapsed();
    abortScratch();
    if (ctx && masterGain) {
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    }
    teardownSource();
    isPlaying = false;
    startOffset = elapsed;
    return elapsed;
}

/** Stops and clears the stored offset, so the next play starts from the top. */
export function reset() {
    stop();
    startOffset = 0;
}

export function getElapsed() {
    // The worklet is the only thing that knows where the head is during a
    // gesture — startOffset/startedAtCtxTime describe a source that is not
    // running, and the position can have gone BACKWARDS since it stopped.
    if (scratchActive) return getScratchPosition();
    if (!ctx) return startOffset;
    if (!isPlaying) return startOffset;
    return startOffset + (ctx.currentTime - startedAtCtxTime) * playbackRate;
}

/**
 * Banks the time played at the CURRENT rate before the rate changes.
 *
 * getElapsed() multiplies the whole span since the last start by one rate, which
 * is only correct while that rate is constant. Once the platter bends the pitch
 * it is not, so every rate change closes off the previous segment first —
 * piecewise integration. Without this, pausing mid-power-down and resuming would
 * pick up at the wrong point in the track.
 */
function commitElapsed() {
    if (!ctx || !isPlaying) return;
    const now = ctx.currentTime;
    startOffset += (now - startedAtCtxTime) * playbackRate;
    startedAtCtxTime = now;
}

/** Volume changes always go through the GainNode — iOS ignores element volume. */
export function setVolume(value, timeConstant = 0.05) {
    if (!ctx || !masterGain) return;
    const v = Math.max(0, Math.min(1, value));
    masterGain.gain.setTargetAtTime(v, ctx.currentTime, timeConstant);
}

/**
 * Also used by the spin linkage above, and by Phase 9 (pitch fader). Default 1.
 *
 * The lower bound is RATE_FLOOR rather than 0.5 because a power-down runs the
 * rate down to the floor; 0.5 would have silently clamped the bottom half of
 * every brake to a constant pitch.
 */
export function setRate(rate) {
    const next = Math.max(RATE_FLOOR, Math.min(2, rate));
    if (next === playbackRate) return;
    commitElapsed();
    playbackRate = next;
    if (currentSource) {
        // Ramped, not assigned: 60 discrete writes a second is audible as
        // stepping on a sustained note.
        currentSource.playbackRate.setTargetAtTime(playbackRate, ctx.currentTime, SPIN_FOLLOW_TAU);
    }
}

export function onEnded(fn) {
    endedListeners.add(fn);
    return () => endedListeners.delete(fn);
}

export function getState() {
    return {
        // True while the worklet owns playback. isPlaying stays FALSE then —
        // it tracks the AudioBufferSourceNode specifically, which really is
        // stopped — so anything asking "is this deck making sound" has to read
        // both. Exposed here rather than only through isScratching() because
        // getState() is what the skyline's debug hook surfaces, and that hook
        // is the only reliable way a probe reaches the app's own instance.
        scratching: scratchActive,
        isPlaying,
        trackId: currentTrackId,
        elapsed: getElapsed(),
        error: lastError,
        contextState: ctx ? ctx.state : "none",
    };
}

/** Stage 7 reads from this. Present now so the graph never needs rebuilding. */
export function getAnalyser() {
    return analyser;
}

/**
 * The live playback rate — which IS the platter's live timeScale.
 *
 * Not a parallel value that happens to agree: the spin linkage drives this
 * from the spin tween's own onUpdate (see followSpin/settleSpin above), and
 * Phase 9 verified the two track each other at every point of a pitch-fader
 * drag and its spring-back, not merely at rest.
 *
 * The Stage 7 skyline does not read this: pulling the fader down changes the
 * audio the AnalyserNode is already looking at, so the columns follow the
 * pitch for free rather than needing to be told about it.
 *
 * Reading it here rather than reaching into turntable.jsx's spin tween keeps
 * any consumer decoupled from the deck component, and this is the value that
 * is actually authoritative for what the visitor is hearing.
 */
export function getRate() {
    return playbackRate;
}

// ---- scratch (Stage 6, Phase 8) ----------------------------------------
//
// A SECOND, TEMPORARY SOURCE, not a mode of the existing one. For the length
// of a gesture the AudioWorklet in public/scratch-processor.js replaces the
// AudioBufferSourceNode; when the platter is back at speed, playback is handed
// back. Everything outside the gesture — pause/resume, the spin linkage, the
// elapsed bookkeeping, onEnded — is untouched and stays authoritative.
//
// The split is because the two nodes are good at opposite things:
//
//   - AudioBufferSourceNode plays a buffer forwards, at pitch, bit-exact, with
//     the browser doing the work. It cannot play backwards (both Chrome and
//     Safari clamp a negative playbackRate to 0 and output silence), which
//     makes it useless for the half of a scratch that defines the sound.
//   - The worklet resamples by hand, so it goes backwards, stops dead, and
//     changes direction inside one render quantum (2.7ms). It also
//     interpolates every sample it emits, which is a thing to spend on a
//     2-second gesture and not on 30 seconds of ordinary listening.
//
// Handing back rather than staying on the worklet is what keeps this phase
// from touching the rest of the engine: the moment endScratch() returns, the
// deck is in exactly the state it would have been in had the scratch never
// happened, only at a different offset.

// Matches the pointer layer's own smoothing window. setTargetAtTime is
// exponential, so this is ~95% arrived in 18ms — below the ~30ms where a rate
// change stops reading as instant, and long enough that 60 discrete writes a
// second do not step audibly.
const SCRATCH_RATE_TAU = 0.006;

// The crossfade between the two players, each way. Both are playing the SAME
// audio from the SAME offset, so the signals are correlated and a LINEAR
// crossfade is the correct one — an equal-power curve would bulge by ~3dB in
// the middle. Short enough to be a seam rather than a dissolve.
const SCRATCH_XFADE = 0.012;

// The power-down when a scratch is released on a deck that was paused: the
// record was never going to keep turning, so the sound goes with it.
const SCRATCH_CUE_RELEASE = 0.12;

const SCRATCH_MODULE_URL = "/scratch-processor.js";

let scratchNode = null;
let scratchGain = null;
let scratchModulePromise = null;
let scratchModuleFailed = false;
let scratchLoadedUrl = null;   // which preview the worklet currently holds
let scratchActive = false;

// Last position reported by the worklet, and the context time it arrived, so
// getElapsed() can extrapolate between reports instead of stepping every 21ms.
let scratchPosition = 0;
let scratchPositionAt = 0;
let scratchRate = 1;
let scratchAtEnd = false;

export function isScratchSupported() {
    return !scratchModuleFailed && typeof AudioWorkletNode !== "undefined";
}

export function isScratching() {
    return scratchActive;
}

/** Live read head during a scratch, in seconds. Extrapolated between reports. */
function getScratchPosition() {
    if (!ctx) return scratchPosition;
    const drift = (ctx.currentTime - scratchPositionAt) * scratchRate;
    return Math.max(0, scratchPosition + drift);
}

/**
 * Loads the worklet module and hands it the decoded preview.
 *
 * Called from the needle-contact beat, NOT from the gesture — beginScratch()
 * has to be synchronous (it runs inside pointerdown, where a single dropped
 * frame is felt), and addModule() plus a ~10MB channel copy are not things to
 * do with a finger already on the record. By the time anyone can touch the
 * platter this has been settled for well over a second.
 *
 * Safe to call repeatedly; it no-ops once the worklet holds this URL.
 */
export async function prepareScratch(previewUrl) {
    if (!isScratchSupported()) return false;
    if (!ctx) return false;
    const url = previewUrl ?? currentUrl;
    if (!url) return false;
    if (scratchLoadedUrl === url && scratchNode) return true;

    try {
        if (!scratchModulePromise) {
            scratchModulePromise = ctx.audioWorklet.addModule(SCRATCH_MODULE_URL);
        }
        await scratchModulePromise;

        const buffer = bufferCache.get(url) || await load(url);

        if (!scratchNode) {
            scratchGain = ctx.createGain();
            scratchGain.gain.value = 0;
            scratchGain.connect(masterGain);

            scratchNode = new AudioWorkletNode(ctx, "scratch-processor", {
                numberOfInputs: 0,
                numberOfOutputs: 1,
                // Always stereo out. A mono preview is duplicated inside the
                // processor rather than left hard-panned left.
                outputChannelCount: [2],
            });
            scratchNode.port.onmessage = ({ data }) => {
                if (!data || data.type !== "position") return;
                scratchPosition = data.position;
                scratchPositionAt = ctx.currentTime;
                scratchAtEnd = data.atEnd;
            };
            scratchNode.connect(scratchGain);
        }

        // .slice() copies out of the AudioBuffer (its own channel data must
        // stay intact for the ordinary source), then the copies are
        // TRANSFERRED — the second argument moves ownership rather than
        // structured-cloning ~10MB across the thread boundary.
        const channels = [];
        for (let c = 0; c < buffer.numberOfChannels; c++) {
            channels.push(buffer.getChannelData(c).slice());
        }
        scratchNode.port.postMessage(
            { type: "load", channels },
            channels.map((a) => a.buffer),
        );

        scratchLoadedUrl = url;
        return true;
    } catch (err) {
        // Not fatal and not surfaced: the deck still plays, it just cannot be
        // scratched. The gesture layer falls back to a forward-only pitch bend.
        scratchModuleFailed = true;
        console.warn("[turntable-audio] scratch engine unavailable", err);
        return false;
    }
}

/**
 * Takes over playback at the current position. SYNCHRONOUS — safe to call from
 * a pointerdown handler. Returns false if the worklet isn't ready, in which
 * case the caller keeps the ordinary source and degrades to a pitch bend.
 *
 * `startRate` is where the record is already travelling: 1 on a playing deck,
 * 0 on a paused one, so the handover is continuous in rate as well as position.
 */
export function beginScratch(startRate = 1) {
    if (scratchActive) return true;
    if (!ctx || !masterGain || !scratchNode || scratchLoadedUrl !== currentUrl) return false;
    if (ctx.state === "suspended") ctx.resume(); // fire-and-forget

    const now = ctx.currentTime;
    const offset = getElapsed();

    // The scratch owns rate and gain for the whole gesture. Leaving the spin
    // link on would let followSpin() write RATE_FLOOR-clamped values over the
    // top of it the moment anything touched the platter's timeScale — and the
    // floor is exactly what a scratch has to go below.
    endSpinLink();

    // Retire the ordinary source under a short fade rather than tearing it
    // down in the same tick. teardownSource() would cut it at full level.
    const outgoing = currentSource;
    if (outgoing) {
        sourceGain.gain.cancelScheduledValues(now);
        sourceGain.gain.setValueAtTime(sourceGain.gain.value, now);
        sourceGain.gain.linearRampToValueAtTime(0, now + SCRATCH_XFADE);
        outgoing.onended = null;
        try { outgoing.stop(now + SCRATCH_XFADE); } catch { /* already stopped */ }
        retiring.add(outgoing);
        setTimeout(() => {
            try { outgoing.disconnect(); } catch { /* already disconnected */ }
            retiring.delete(outgoing);
        }, SCRATCH_XFADE * 1000 + 80);
    }
    currentSource = null;
    isPlaying = false;
    startOffset = offset;

    scratchRate = startRate;
    scratchPosition = offset;
    scratchPositionAt = now;
    scratchAtEnd = false;

    const rate = scratchNode.parameters.get("rate");
    rate.cancelScheduledValues(now);
    rate.setValueAtTime(startRate, now);

    scratchNode.port.postMessage({ type: "start", position: offset });

    scratchGain.gain.cancelScheduledValues(now);
    scratchGain.gain.setValueAtTime(scratchGain.gain.value, now);
    scratchGain.gain.linearRampToValueAtTime(1, now + SCRATCH_XFADE);

    // Covers the cue case: on a paused deck masterGain is sitting at 0 from
    // the power-down, and a scratch has to be audible anyway — moving a record
    // by hand makes sound whether or not the motor is running.
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(TARGET_VOLUME, now + SCRATCH_XFADE);

    scratchActive = true;
    return true;
}

/**
 * The hot path — called on every pointer sample and every animation frame of
 * the release. Negative values play backwards; 0 holds the record still, which
 * the processor renders as silence rather than DC.
 */
export function scratchTo(rate) {
    if (!scratchActive || !scratchNode || !ctx) return;
    // Bank the distance covered at the OLD rate before adopting the new one,
    // for the same reason setRate() does: getScratchPosition() extrapolates
    // with a single rate, which is only correct while that rate holds.
    scratchPosition = getScratchPosition();
    scratchPositionAt = ctx.currentTime;
    scratchRate = rate;
    scratchNode.parameters.get("rate")
        .setTargetAtTime(rate, ctx.currentTime, SCRATCH_RATE_TAU);
}

/**
 * Hands playback back. `resume: true` starts an ordinary source at the scratch
 * position (the deck is playing again); `resume: false` fades out and banks the
 * position for a later resume (the deck was, and stays, paused).
 *
 * Returns the position reached, in seconds.
 */
export function endScratch({ resume = true } = {}) {
    if (!scratchActive) return getElapsed();
    const now = ctx.currentTime;
    const position = getScratchPosition();
    const reachedEnd = scratchAtEnd;

    scratchActive = false;
    startOffset = position;

    const fadeScratch = (seconds) => {
        scratchGain.gain.cancelScheduledValues(now);
        scratchGain.gain.setValueAtTime(scratchGain.gain.value, now);
        scratchGain.gain.linearRampToValueAtTime(0, now + seconds);
        // Stopping the processor is deferred past its own fade for the same
        // reason the source teardown is: silencing and stopping in one tick
        // makes the ramp inaudible and the cut audible.
        setTimeout(() => {
            if (!scratchActive) scratchNode?.port.postMessage({ type: "stop" });
        }, seconds * 1000 + 40);
    };

    if (!resume) {
        fadeScratch(SCRATCH_CUE_RELEASE);
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.linearRampToValueAtTime(0, now + SCRATCH_CUE_RELEASE);
        return position;
    }

    // Scratched forward off the end of the preview: there is nothing left to
    // hand back to, so this is the same end-of-side the ordinary source would
    // have reported. Told through the SAME listener set, so the deck's arm
    // return and brake run exactly as they do on a natural finish.
    if (reachedEnd) {
        fadeScratch(SCRATCH_CUE_RELEASE);
        startOffset = 0;
        endedListeners.forEach((fn) => fn());
        return position;
    }

    const buffer = bufferCache.get(currentUrl);
    if (!buffer) {
        fadeScratch(SCRATCH_CUE_RELEASE);
        return position;
    }

    // Back to pitch before the new source is built — startBuffer() reads
    // `playbackRate` for its initial value, and whatever the pitch fader or a
    // power-down last left there is not what a resumed scratch should inherit.
    setRate(1);

    sourceGain.gain.cancelScheduledValues(now);
    sourceGain.gain.setValueAtTime(0, now);
    sourceGain.gain.linearRampToValueAtTime(1, now + SCRATCH_XFADE);
    fadeScratch(SCRATCH_XFADE);

    startBuffer(buffer, currentUrl, currentTrackId, position, undefined);
    return position;
}

/**
 * Drops the scratch immediately, with no hand-back — for a track swap, a tab
 * blur, or anything else that is about to rebuild playback anyway and would
 * otherwise be fought by a gesture still in flight.
 */
export function abortScratch() {
    if (!scratchActive) return;
    scratchActive = false;
    if (ctx && scratchGain) {
        scratchGain.gain.cancelScheduledValues(ctx.currentTime);
        scratchGain.gain.setValueAtTime(0, ctx.currentTime);
    }
    scratchNode?.port.postMessage({ type: "stop" });
    startOffset = getScratchPosition();
}
