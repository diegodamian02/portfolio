# Theme-toggle motion — options

Design canvas exploring how light↔dark should transition, beyond the instant
flash. Prompted by owner: *"is there a better transition to add for light/dark
instead of just a flash immediate change?"*

Context: the **D8 crossfade** already ships (one 180 ms `--theme-transition` on
every colour surface, enabled during the switch by `.is-theme-switching`), plus
today's follow-up (theme-color meta, `color-scheme`, atmosphere-floor crossfade,
canvas WAAPI fade, anti-FOUC). This canvas asks whether the *shape* of the
transition should change — a crossfade vs. a reveal.

## Artboards (all interactive — click the toggle)

| File | Technique | Verdict |
|---|---|---|
| `Crossfade.dc.html` | Colour crossfade, 180 ms, every surface together | **Shipped today.** Safe, instant-feeling, universal. Whole viewport dips through mid-grey. |
| `Main.dc.html` | **Circular reveal** — incoming theme irises from the toggle | **Recommended.** `document.startViewTransition()` + a `clip-path` circle keyframe; crossfade fallback for Firefox; honours reduced-motion. No extra cost, reads as deliberate. |
| `Wipe.dc.html` | Directional wipe from the toggle edge | Contrast option. Strong sense of moment, but demands attention every time — best where theme changes are rare. |
| `Dip.dc.html` | Fade through near-black at the midpoint | Contrast option. Masks the low-contrast midpoint entirely; adds a blink; light-via-dark can feel backwards. Pure CSS. |

Each artboard carries a **Motion** duration slider (a `data-props` tweak).

## Production notes for the circular reveal

```js
// navbar.jsx theme effect — wrap the data-theme flip
const flip = () => { root.setAttribute("data-theme", next); /* + theme-color meta */ };
if (!document.startViewTransition || prefersReducedMotion) { flip(); }
else {
  root.style.setProperty("--x", clickX + "px");
  root.style.setProperty("--y", clickY + "px");
  document.startViewTransition(flip);
}
```

```scss
::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
::view-transition-new(root) { animation: iris var(--theme-transition-duration) var(--theme-transition-ease) both; }
@keyframes iris {
  from { clip-path: circle(0% at var(--x, 88%) var(--y, 8%)); }
  to   { clip-path: circle(130% at var(--x, 88%) var(--y, 8%)); }
}
```

- Click coords come from the toggle button's centre (`getBoundingClientRect`);
  it renders twice (desktop bar + mobile menu), so read whichever fired.
- The D8 `.is-theme-switching` crossfade stays as-is — it *is* the fallback, and
  it runs under the VT snapshot on supporting browsers with no visible conflict.
- The full-bleed hero `<canvas>` and GSAP turntable are inside the snapshot —
  worth a device check that the capture doesn't hitch on a low-end phone. If it
  does, scope the VT to skip the canvas (`view-transition-name: none` on it).
- iOS Safari 18.2+ and Chrome/Edge support it; Firefox falls back.
