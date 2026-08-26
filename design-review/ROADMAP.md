# Roadmap — diegodamian.com

**Written:** 2026-08-08 · Companion to [`FINDINGS.md`](./FINDINGS.md) (what's wrong)
and [`STATUS.md`](./STATUS.md) (where things stand).

This file answers the open questions in `FINDINGS.md` §8 and **supersedes the
sequencing in `STATUS.md` §5 and `FINDINGS.md` §9.** Read this one for order of work.

Like the others, it is written to be self-contained — assume any chat reading it
starts from zero.

---

## 0. Current state — quick summary *(updated 2026-08-25, Stage 7.2 — light theme reads as colour, the banding was the mask, smooth tips)*

For anyone opening this file cold: the detailed stage-by-stage record below (§3)
is the source of truth, but it's long. This section is the fast version —
what's shipped, what's next, what's still sitting on the shelf.

**Shipped and done:** Stage 0 (every launch-blocking bug), Stage 1 (the
turntable actually plays audio), Stage 2 (Lenis/ScrollTrigger foundation),
and — within Stage 3 — the design system itself plus a full rebuild of
`#about` (intro card + Experience). Experience alone went through three
builds (Tasks 7, 8, 9) chasing "big photos" and "fits on screen" at once;
Task 9's pinned horizontal filmstrip is what actually landed both. Also a
site-wide scroll-feel tuning (Lenis `lerp`) outside any one section. Two more
live-feedback passes landed on Experience since, outside the Stage 4 sequence
below since they touch an already-"done" section: **B29** — the title
overlapping its cards on real (not exotic) short windowed-browser heights,
fixed with a flex-centered spacer replacing a section-blind absolute-center
calc (`STATUS.md`/`FINDINGS.md` B29); then, **most recently (2026-08-17)** —
"move it a bit higher, title and slideshow," a trimmed top padding plus an
asymmetric flex-grow split replacing 50/50 centering, reusing `about.jsx`'s
own `TOP_BIAS` reasoning (`STATUS.md`'s own dated entry; §3's Stage 3 Task 9
blockquote below has the full writeup for both).

Also removed entirely, same day, direct request over privacy — **the resume**:
the nav link, the `#connect` link, and the PDF itself
(`client/public/Diego-Damian-Resume.pdf`, tracked in git since Stage 0).
`.gitignore` now blocks a future resume from being re-tracked, but the file
is still recoverable from git history until that's separately rewritten —
flagged against Stage 8's own already-planned `.git` history rewrite, not
done automatically. Full writeup: `STATUS.md`'s own dated entry; the
reversed Stage 0 item itself is struck through with an Update note, §3 below.

**Reordered, deliberately:** Stage 4 (`#my-taste`) jumped ahead of finishing
Stage 3's remainder (`#projects`/`#connect`) — this file's own prior "next
step" recommendation. A direct call, not something the repo forced; noted
here per the working agreement on sequencing deviations. `#my-taste`'s
concept also changed: no longer "records as vinyl / tracks as a crate," now
a **festival-lineup poster** (headliner/support/setlist, torn edges, tape —
also duotoned photos and a grain overlay at first, both later cut on direct
feedback, see below) — see Stage 4 below for the full 5-task sequence, and
`stage4-my-taste-concept.md` for the concept/mechanism writeup. Tasks 1, 2, a
retrofitted 2.5, 3, a second retrofit at 3.5, a refinement pass at 3.6, a
polish pass at 3.8, and a wall restructure at 3.7 are all done — foundations,
wall layout, fit-within-one-screen, real photography (duotoned at first, see
below), a two-column restructure (wall beside a crate for the setlist), a smaller
headliner + simplified crate + a gray-duotone fix, the whole poster linking
out to real Spotify pages, and now: the wall's old 1-headliner-plus-4-support
hierarchy regrouped into 2 "featured" cards (deliberately sized identically
to each other) beside 3 clearly-smaller "secondary" cards — hierarchy from
tier membership, not one card's raw size. **Task 3.7 landed after 3.8**
despite the lower number (its brief referenced only 3.6, not 3.8 — noted in
`stage4-my-taste-concept.md` §2 rather than silently reordered). A same-day
follow-up (2026-08-17) fixed a real bug the initial 3.7 pass introduced and
missed: a copied, unverified grid-row minimum left 139px of dead space
under every featured card's name. Desktop now measures **0.77×** one
screen, laptop **0.89×** — corrected from an as-shipped 0.94×/1.09× that
was partly inflated by that same bug, still up from Task 3.6's 0.72×/0.82×
baseline on the genuine part (the featured pair really is wider than the
old support cards, using real headroom, not padding). **Task 4** (same day)
added the section's entrance motion on top of that now-settled layout: a
`ScrollTrigger` pin (reusing Experience's own `pin: true`) holds the
section for a timed ~2.1s while the kicker, wall cards (`CustomBounce`
landings + `CustomWiggle` tape snaps, one `MotionPathPlugin` arc), and
crate cascade in, in that order — real scroll input held via
`lenis.stop()`/`start()` (About's own Task 5 hold mechanism), not a scrub.
Deliberately skipped below 601px (mobile's own 2.68× fit ratio makes
pinning it a real regression, not an untuned one) and under
prefers-reduced-motion. `stage4-my-taste-concept.md` §11 has the full
mechanism writeup. Two days later, **Task 3.9** added the kicker's own
avatar (Diego's real Spotify profile photo, a new `GET /api/spotify/profile`
route, same duotone treatment as everything else in this section) and
**Task 4.1** refined Task 4's own cascade — `CustomBounce`'s strength
pulled back so the wall cards read as pinned rather than bounced, a
deliberate pause before each tape/pin snap, each card's settle pivoted
around the tape's own anchor instead of its center, and two new zone
titles ("MY TOP ARTISTS"/"MY TOP 5 TRACKS") with their own pop-in beats.
Both landed together; fit ratio moved again as a result — desktop
**0.83×**, laptop **0.95×** (still comfortably under one screen), mobile
**2.80×** (still Stage 5's own territory). One real regression caught and
fixed in the same pass: the avatar pushed the kicker's text into a
mid-word wrap at 390px, fixed with `flex-wrap: wrap` + `white-space:
nowrap` on the kicker link. `stage4-my-taste-concept.md` §12/§13 have the
full writeups.

Live feedback on that build (same day) surfaced two more real bugs and one
cut: **B30** — the pin never engaged on a fresh reload, root-caused to a
stale `ScrollTrigger` measurement (created before this section's own
webfonts finished swapping in) and fixed page-wide in `smooth-scroll.jsx`,
not patched locally; **B31** — the setlist's own row-wrap could orphan a
track's index number onto its own line for long titles, fixed by grouping
index+track into one flex unit. The grain texture (`.my-taste-section::after`,
Task 3) was cut outright — it read as static on real photos, not the
intended paper texture. Full writeups: `FINDINGS.md` B30/B31,
`STATUS.md`'s own dated entry.

Two days later, more live feedback on the same section: the Task 3/3.9
duotone filter (grayscale + `--card-tint` tint layer, `PhotoSlot`/
`AvatarSlot`) came off entirely — real photos now render exactly as
Spotify serves them, direct feedback that the tint shifted them away from
their real colors. And **B32** — the pin-hold's own "don't trap the
visitor" safety net was silently skipping the hold on completely ordinary
desktop window heights (700/660/600px tall, not just squeezed ones),
because the check compared this section's fixed content height against
raw available space with zero tolerance. Widened to allow up to 60%
overflow before bailing (`SAFETY_NET_OVERFLOW_ALLOWANCE`), re-verified
holding cleanly across that whole height range. Full writeups: `FINDINGS.md`
B32, `STATUS.md`'s own dated entry.

**Most recently (2026-08-18) — Stage 3's own remainder, `#projects`:**
refined list, single-open accordion, GSAP entrance — `#connect` is now the
only section left in Stage 3's original `#about` → `#projects` → `#connect`
sequence. Deleted B11 (a dead slideshow-era rule sizing the list's title at
40px) plus three fully-orphaned rules found alongside it, reconciled the
content column to `--content-width`, and applied `@mixin section-title`
(fluid `--text-xl`, centered — both deliberate, named as such). The
open/close swap is now coordinated by real GSAP `Flip` — this codebase's
first use of the plugin — rather than two unrelated instant state changes;
entrance is a plain `ScrollTrigger` reveal (`start: "top 80%", once: true`,
no pin/scrub, gated through `gsap.matchMedia()`); hover gained a left accent
edge. Two regressions this task's own changes introduced were caught and
fixed in the same pass, not shipped: a `box-sizing` gap overflowing the
mobile viewport by 64px, and a pre-existing (previously invisible)
`scale: (1.1)` on the header's hover state that started visibly clipping
title text once Flip needed `overflow: hidden` on the row — full writeups
`FINDINGS.md` B33/B34. Also found, and fixed in shared test infrastructure
rather than the site itself: `design-review/capture-screenshots.mjs`'s own
section-traversal order could permanently trap a capture inside About's
scroll-hold (`FINDINGS.md` D14) — fixed by navigating through the real
navbar link instead of a raw `scrollIntoViewIfNeeded()`. The brief's own
header called this "Stage 5 Task 1," which doesn't match this file's own
numbering (Stage 5 is reserved for the mobile pass) — logged under Stage 3
instead, flagged rather than silently either way. Fit ratio at true default
rest (all rows collapsed): desktop **0.68×**, laptop **0.77×**, mobile
**0.90×** (informational — Stage 5's own territory). Full writeup:
`STATUS.md`'s own dated entry.

**Immediately after (2026-08-19) — a follow-up fixing the Flip swap's own feel:**
the brief reported the swap "doesn't feel smooth" and named two suspected causes;
neither matched the tree on inspection (duration/ease were already explicit, just the
wrong values; `getState()` was already scoped to the whole list). Live per-frame
tracing found the real causes instead — one a Playwright test artifact (the test
target sat off-screen, so Playwright's own `.click()` auto-scrolled before dispatching;
never visible to a real visitor), one genuine: `Flip.from()`'s "after" measurement runs
synchronously before the newly-mounted `<video>` element's real size has settled, so
the row animated toward a target that was already too small, landing an un-eased ~210px
snap the instant the tween released. Fixed with the mockup's own stated `duration: 0.4`/
`ease: "power2.inOut"`, `absolute: true` (GSAP's documented list/accordion fix), and —
the change that actually closed the race — each video's real encoded dimensions given
as HTML `width`/`height` attributes so the browser reserves correct space before the
resource loads. Full writeup: `FINDINGS.md` B35, `STATUS.md`'s own dated entry.

**Also 2026-08-19 — `#connect`'s own form logic (Task 1 of 2):** client-side message
validation (inline, no native alert) and a `data-state` hook for a future animation
pass landed — `STATUS.md`'s own Stage 3 Task 11 entry has the full writeup, including a
real discrepancy found and corrected: `RESEND_API_KEY` turns out to already be live on
Railway, contradicting both this file's own outstanding-tasks list and the task brief
that assumed otherwise (`FINDINGS.md` D15). `#connect`'s own still-separate
design-system token pass (the "3 (remainder)" row just below) remains unstarted.

**Most recently (2026-08-20) — `#projects` again: expanded content now scrolls into
view.** A row's video/description/links could push past the fold with nothing bringing
it back into view; fixed with a helper that skips entirely if the row already fits,
otherwise moves the minimum distance to reveal whichever edge is cut off. The real work
was diagnostic, not the scrolling logic itself: a browser-native mechanism, cause not
identified despite ruling out every JS scroll call, `overflow-anchor`, focus-follow, and
this app's own `useHashScroll`, moves `window.scrollY` on its own whenever a row's
height changes — a delta computed upfront and fired alongside `Flip.from()` couldn't
reliably predict where things would land once that mechanism also had a say. Redesigned
to measure the real, final position after everything settles and correct only if still
needed, rather than racing it — full writeup `FINDINGS.md` D16 (worth checking against
before `#my-taste`'s own Task 5 below, the next place a Flip-driven layout change is
likely to reorder content near the viewport edge). Also found and fixed along the way:
`.portfolio-list` had no explicit height, so Task 10.1's `absolute: true` collapsed it
to 0px for the whole tween, shifting `#connect` and the footer with it — `FINDINGS.md`
B36. `STATUS.md`'s own Stage 3 Task 10.2 entry has the full writeup.

**Most recently (2026-08-21) — `#connect`'s own animation, Task 2 of 2 (numbered
Task 11.2, a follow-up to Task 11 rather than a new top-level item, same convention as
10.1/10.2):** a scroll-triggered entry pin, closing out the pair Task 11 opened. Brief
named `#experience` alongside `#my-taste` as sharing "the same scroll-hold pin
pattern" — re-read both live and they don't: `#experience`'s pin stays engaged for its
whole scroll-through distance, continuously scrub-driven, with no "reveal completes,
then release" moment at all; `#my-taste`'s pin (itself tracing back to About's Task 5)
is the one that actually holds briefly, plays a timeline once, and releases from its own
`onComplete` — built against that pattern instead, flagged rather than silently
following the brief's framing. Two real bugs found along the way, both would have
shipped broken if copied on faith: `.contact-section`'s plain `min-height: 100vh`
(unlike `#about`'s own navbar-aware `calc()`) would have silently defeated the pin's own
safety-net height check on every viewport (`FINDINGS.md` B37); and About/My Taste's own
overshoot-correction, copied verbatim, turned out to actively unpin this specific
trigger and produce a real ~200px visible jump right as the hold engaged — dropped
entirely once live tracing showed nothing here reads `self.progress` for it to protect
(`FINDINGS.md` B38). `STATUS.md`'s own Stage 3 Task 11.2 entry has the full writeup.
Task 3 (free scroll both directions once unpinned) is this task's own stated
assumption for what comes next, not built here — and turned out to already be
true by construction (Task 11.2's own settled state was already plain,
untransformed static content), so nothing further was needed to satisfy it.

**Also 2026-08-21 (Stage 3 Task 12) — `#connect`'s send-success walkman:** a
separate, later brief (no task number of its own; numbered here as a fresh
top-level item rather than a further decimal off Task 11, since this is new
functionality layered on an already-complete Task 11.2, not a fix/extension
of that same feature). On a successful send, the cassette-shaped message
field (also new this task — a tape-label textarea, reel windows and all)
Flip-flies into a cassette walkman's bay, the walkman pops up and takes over
the section (scale + centered scrim, lid-snap, looping EQ/cord, a
ScrambleTextPlugin LCD readout through a self-hosted DSEG7 font's own
ghost/lit segment layers), then settles back into normal in-flow content — a
second send in the same session reuses the same walkman rather than popping
in again. Two real bugs found and fixed live (`FINDINGS.md` B39): a stray CSS
default fought the settle animation's own `clearProps`, sticking the walkman
at half size. One pre-existing, unrelated bug found while regression-testing
and flagged rather than fixed (`FINDINGS.md` D17): an intermittent, bot-pace-
only React crash in `#my-taste`'s own `AvatarSlot`, confirmed present before
this task too via `git stash`. `STATUS.md`'s own Stage 3 Task 12 entry has
the full writeup.

**Also 2026-08-23 (Stage 3 Task 12.1) — `#connect`: field layout, cassette
rebalance, walkman bug pass:** a decimal follow-up on Task 12's own feature
(a fix/refinement pass, like 10.1/10.2/11.2 each were to their own parent
task — not new functionality). Name/email moved from two stacked full-width
fields into one 2-column row with more compact inputs (measured: input
height 44px → 36px); the cassette message field's reel-window chrome shrank
and dimmed so it reads as quiet resting-state decoration instead of
competing with the text, while the textarea itself gained more padding and
`.about-me-bio`'s own `line-height: 1.6` (measured: cassette height
198px → 160.78px, ~19% shorter, despite the extra text breathing room). Of
the brief's three reported walkman bugs, one was real: the LCD readout's
box/font-size were sized for a 12-character word, and DSEG7 Classic's own
T/N/K glyphs render illegibly at this size regardless of length — fixed by
choosing `"CHEERS!"` after screenshotting several candidates
(`FINDINGS.md` B40). The other two — stale compose text left in the DOM,
and a ~2-second auto-revert — did not reproduce under direct testing
(unique-marker DOM dumps, 30+-second holds, a full second-cycle run); no
code changed for either, and no mechanism in the code could produce them
(`FINDINGS.md` D18). `STATUS.md`'s own Stage 3 Task 12.1 entry has the full
writeup.

**Also 2026-08-23 (Stage 3 Task 12.2) — `#connect`: heading copy, dead-
scroll fix, textarea overflow fix:** a second decimal follow-up on Task
12's own feature (sibling to 12.1, not a sub-decimal of it — same
convention as 10.1/10.2 both being decimals off Task 10). Heading changed
to "Let's Connect," the description paragraph under it (and its inline
`mailto:` link) removed entirely per direct instruction, no replacement
copy added. Two real, measured bugs found and fixed: the entry-pin's
`ScrollTrigger` had no explicit `end`, defaulting to the trigger's own full
height and leaving the section visually pinned for ~938px of dead scroll
after the reveal had already finished and real scroll input had already
resumed (`FINDINGS.md` B41) — My Taste's own pin, the pattern this section
already claimed to follow, sets `end: "+=200"` for exactly this reason and
this section never copied it; fixed by adding the same value, dead scroll
now ~340px (the genuinely expected remainder). Separately, the message
textarea rendered 24px wider than its own cassette container (`FINDINGS.md`
B42) — no global `box-sizing: border-box` reset exists in
this file, so `width: 100%` plus the textarea's own padding overflowed the
box by exactly that padding; a smaller version of the same bug has existed
since Task 12 shipped, Task 12.1's own padding increase just made it more
visible. Fixed with one line. `STATUS.md`'s own Stage 3 Task 12.2 entry has
the full writeup.

**Also 2026-08-23 (Stage 3 Task 12.3) — `#connect`: heading takeover, LCD
root cause, walkman prominence, real reset button:** a third decimal
follow-up on Task 12's own feature. The heading itself now becomes the
confirmation message via ScrambleTextPlugin ("Let's Connect" -> "Thank you
for reaching out!"); `.contact-success` (the old separate two-paragraph
success block) is removed entirely so there's exactly one message on
screen. The brief asked whether the LCD's garbled text ("ehEEr98") was a
scramble charset/timing bug — it wasn't: the underlying DOM text was
sampled every 100ms through a full send and was correct and stable the
entire time. Root-caused instead to DSEG7 Classic itself: a 7-segment
display can't form full-height capital B/C/D/H/N/R without colliding with
a digit shape, so the font substitutes small stylized glyphs for those
letters by design, confirmed by rendering the whole alphabet at this exact
size (`FINDINGS.md` B43) — the LCD now reads "ALL DONE" instead of
"CHEERS!", chosen from the font's own clean letter set. The walkman's own
rest size grew from 260px to 460px wide (measured centered, zero overflow
at 390px) so it reads as the confirmation state's actual centerpiece. Its
left window, previously an empty rect, now holds its own 6-bar visualizer
(`colorwayFor()`-salted, joins the existing idle loop) layered over the
cassette bay/lid — hidden during Phase 1's own use of that space, revealed
once the lid seals. "Send another message" is a real bordered pill button
now (reusing `.experience-date`'s own accent-border recipe, the closest
existing pattern on a site with no other filled/bordered CTA) instead of
the ghost-text `.submit-button` style, grouped with the walkman in a new
`.walkman-stage` wrapper — and clicking it now returns the walkman to
FULLY HIDDEN (a deliberate reversal of Task 12's own original "stay
settled across a resend" design, flagged not silently changed) with every
loop/tween killed, ready for a clean second send. One more real bug found
during this task's OWN verification, not asked for but fixed: with the
compose form scrolled to a completely ordinary position before sending,
the confirmation heading landed entirely behind the fixed navbar
(`FINDINGS.md` B44) — since it's now the only confirmation message, fixed
with a new `ensureHeadlineVisible()` that nudges scroll only when actually
needed. `STATUS.md`'s own Stage 3 Task 12.3 entry has the full writeup.

**Also 2026-08-23 (Stage 3 Task 12.4) — `#connect`: the cassette actually
goes in.** The send sequence was instrumented (per-frame rect sampling on a
real send) before being tuned, which found two defects no screenshot of this
feature had ever shown: the flying cassette had been aiming at a bay rect
measured *after* the pop-in shrank the walkman to half size, so it never
landed in the slot (`FINDINGS.md` B45); and a tween placed at position `0`
silently pushed the pop-in and flight 600ms/1050ms late, leaving an orphan
rectangle motionless on a blank section before anything moved
(`FINDINGS.md` B46). Both fixed; first motion 683ms -> 117ms, whole sequence
~4.15s -> 2.45s, cassette now lands flush on the bay. Takeover scale dropped
2.3 -> 1.35 (that constant was tuned for a 260px walkman and never revisited
when 12.3 grew it to 460px), the confirmation heading was lifted above the
scrim it had been hidden behind, the scrim softened to keep light theme
legible (3.73:1 -> 6.18:1, measured), both bar rows recoloured onto a new
fixed neon token family on their own dark screen panels, and a third
`box-sizing` overflow in B42's family cleaned up. Plus the two layout asks:
section block up 64px, message textarea one row taller. `STATUS.md`'s own
Stage 3 Task 12.4 entry has the full writeup.

**Also 2026-08-23 (Stage 3 Task 12.5) — `#connect`: heading punctuation +
description restored.** Direct-request copy only, no bug report: heading
"Let's Connect" -> "Let's Connect!"; `.contact-description` — removed
entirely by Task 12.2 earlier the same day — brought back as a **different**
paragraph (a plain thank-you note, no `mailto:` link, unlike the one 12.2
removed) rather than a reversal of that call. Wired into the same
entry-reveal `SplitText` cascade this project used pre-12.2 (title ->
description -> form) and gated on the identical `status !== 'sent'`
condition as the form, so it disappears alongside the compose box on send —
Task 12.3's "exactly one message on screen after a send" guarantee needed
no new logic to hold. One investigation, not logged as a bug (inconclusive,
reproduces identically on the prior commit too): a synthetic 390px scroll
test overshot the entry pin's intended engage line by ~140px, possibly a
Lenis-velocity/wheel-emulation artifact rather than a real risk to an actual
visitor — `STATUS.md`'s own Stage 3 Task 12.5 entry has the full reasoning
and a note to spot-check on a real device before `#connect`'s own
design-system pass.

**Also 2026-08-23 (Stage 5) — `#my-taste`'s own mobile layout: two horizontal scroll-snap
rows.** Jumped ahead of this file's own stated Stage 5 dependency ("Stages 3/4 landing
first, so mobile isn't built twice") — a deliberate reorder, noted per the working
agreement rather than done silently, same as `#my-taste` itself jumping ahead of Stage 3's
remainder once before. Replaces the un-rotated single-column stack every mobile override
since Task 3.7 fell back to (fit ratio had crept to 2.80× one screen, `stage4-my-taste-concept.md`
§16) with a `min-height: calc(100dvh - var(--scroll-offset))` section containing two
horizontal scroll-snap rows (artists, tracks) plus scroll-position dots — verified live to
fit with zero extra scroll after a direct nav/hash landing at 320/375/390/430/600px, not
just "doesn't overflow." One real bug found and fixed along the way, the same flex
min-content trap this section has hit twice before (B25, B31) one level up — a card
containing `white-space: nowrap` text can grow past its own `flex: 0 0 <width>` basis
without an explicit `min-width: 0` on the card itself, stretching every sibling in the row
to match (`FINDINGS.md` B48). Full writeup: `STATUS.md`'s own dated entry.

**Also 2026-08-24 (Stage 6 Phase 9) — the pitch fader, self-centering:**
`.turntable-fader` was decorative-only markup since Stage 1; now a real,
spring-loaded control — drag it and pitch bends live ±8%, let go and it
always animates back to centre (never left off-centre, which removes the
persist-across-pause/reset-on-swap state an earlier draft of this task would
otherwise have needed). GSAP `Draggable` on the visual handle (first real
use — registered since Stage 0) plus a layered, `pointer-events:none` native
`<input type="range">` for keyboard/SR semantics; reuses the transport's own
`beginSpinLink()`/`followSpin()` machinery for the drag-through-spring-back
rather than building a second one. State-gated and verified for all five
deck states, including the mid-drag/transport-press conflict the task
specifically flagged as worth checking directly (resolved by reading deck
state live on every tick rather than once at gesture-start). Two real bugs
found and fixed along the way, both non-obvious GSAP API misreadings —
`FINDINGS.md` B49 (`setSpin`'s `seconds` is a rate, not a flat duration) and
B50 (`Draggable.update(true, true)`'s `sticky` resync only fires mid-press;
calling it after a release re-applied Draggable's own stale pre-release
position instead of adopting the tween's new one). Full writeup:
`STATUS.md`'s own dated entry.

**Also 2026-08-24 (Stage 7a) — a WebGL2 fluid background behind the whole
hero.** Hand-rolled Stam-style solver (advect → curl → vorticity → Jacobi
pressure projection → gradient subtract), full-bleed behind the text, crate
and turntable, `pointer-events: none`. **Replaces the `.hero-vu-slot` waveform
concept outright** — that element is deleted, not repurposed. Structural task
only: no `AnalyserNode`, no per-track colour, no deck-state gating, all of
which is 7b. Simulates at a 128 grid and renders dye at 512 (the numbers 7b
should start from rather than re-derive; per-viewport allocations recorded in
`STATUS.md`). Idle behaviour is a 4-splat seed plus a top-up every 1.6–2.8s
and **7b should remove that loop rather than stack audio splats on it**;
reduced motion renders exactly one static frame with no RAF loop. Paused by
both a `visibilitychange` handler and an IntersectionObserver on the hero, each
verified by frame count rather than by state flag. Two items in the task brief
were stale against the tree and are corrected in `STATUS.md` (there is no
IntersectionObserver in `navbar.jsx`, and `visibilitychange` lives in
`turntable.jsx`, not `turntable-audio.js`). Three real bugs found and fixed —
`FINDINGS.md` B51 (a `loseContext()` that permanently bricked the canvas
element on remount), B52 (a splat radius squared twice, rendering correctly
and invisibly), B53 (reference dissipation tuned for continuous injection,
decaying this background to alpha 6/255 between splats). Full writeup:
`STATUS.md`'s own dated entry.

**Also 2026-08-24 (Stage 7b) — the fluid is presence-gated and audio-driven.**
The hero background is now blank and its loop stopped whenever nothing is
playing; the instant playback starts it bursts in, rides the track's own
analyser data while it plays, and drains away when it stops. 7a's idle-splat
placeholder is deleted rather than left underneath. The burst is fired
SYNCHRONOUSLY from the same `applyDeckState` call the needle-contact callback
makes right after `audio.playCached()` — measured at 0.2ms and the same
animation frame as the audio it represents, which is the whole reason it does
not go through a React effect (Stage 1 measured that path 551ms late).
Bass drives splat force and radius, treble drives cadence and scatter, and
both are multiplied by the pitch fader's live rate. Reduced motion was
REVISED here as a deliberate accessibility call: one static frame appears when
PLAYING begins and is cleared when it ends, so the preference still carries
the "the hero responds to playback" information without an always-on frame
falsely implying sound. A five-colour fluid-only palette cycles on a
free-running wall clock, and all ten colour x theme combinations were verified
rather than spot-checked — four of them failed and are `FINDINGS.md` B54,
alongside B55 (a beat detector whose baseline tracked the signal too closely
to fire). Real-GPU frame timing, which 7a flagged as owed to this task, is
60fps with zero frames over 20ms on an Apple M2. Full writeup: `STATUS.md`'s
own dated entry.

**Also 2026-08-24 (Stage 7c) — the fluid now looks like something.** Direct
feedback on 7b as it shipped: the waves were "very subtle", the colours needed
to be "vibrant and catch the person", the field should "take the entire hero
background to roam around", energy should follow the song, and the colour
should change per track — with "fading neon, bright mint, glowing" and no dark
colours in either theme. All of that is a fair reading: 7b's numbers were about
synchrony and gating, and none of them were about how it looked.

Five changes. **Bloom** in the display pass (dye without a glow reads as fog).
A **seven-hue neon palette** — mint, aqua, violet, magenta, coral, gold, lime —
solved into a per-theme luminance BAND rather than to a single target, which
lifts only the hues that need it and leaves the authored neon alone; all
fourteen colour × theme combinations rendered. **One colour per track**,
advancing on the id inside the same synchronous handler the burst fires from —
this replaces 7b's free-running wall clock, which made colour a property of
*when* you pressed play. An **energy model** off broadband RMS with fast/slow
envelopes, so soft tracks get big slow swells and punchy ones tight frequent
ones (measured: energy 0.30/0.79/0.95 across three previews, radius 2.81 →
2.04, cadence 310ms → 105ms). And **three roaming emitters** plus dye-free
"current" splats, so the field crosses the whole hero instead of pooling at the
deck.

The one place two goals genuinely conflicted is recorded as `FINDINGS.md` D20:
at the amplitude that makes the hero look alive, the nav links measured
**1.1:1**. Resolved by holding the dye back only over the boxes that carry
text, measured from the live DOM — nav is **17.0:1** after, with the field
brighter everywhere else. Also `FINDINGS.md` B57 (the display pass normalising
by a clamped peak, which is why every earlier version read as haze), B58
(both audio envelopes starting at zero, so every track's first five seconds
read as a quiet track having a seizure) and B59 (a "transient detector" firing
on 57–85% of frames). Real-GPU cost is **1.94ms per step** against a 16.67ms
60Hz budget — measured through a readback, because rAF timing reported the
display's refresh rate and `gl.finish()` reported 0.02ms. Full writeup:
`STATUS.md`'s own dated entry.

> **Found while doing this, NOT fixed, and it should not wait:**
> `FINDINGS.md` **B56** — `#my-taste` hands an element to GSAP `SplitText`
> that React also renders a child into, and when the Spotify profile fetch
> resolves React throws `insertBefore` and **the entire page goes blank**.
> Reproduces in the production build (load dark → toggle to light; or load
> light → scroll to `#my-taste`). Live does not currently reproduce, which is
> timing, not safety. One-line fix shape is in the finding.

**Also 2026-08-25 (Stage 7d) — the fluid draws lines instead of clouds, and
the spectrum drives them.** Feedback on 7c: the flow was too aggressive, the
liquid should read as lines rather than gas, slimmer and smoother; plus "think
about a spectrum display", and a direct ask to research and use a library.

7c injected discrete splats at radius 2.4 — a Gaussian a tenth of the hero
across, which is a *cloud generator by construction*. 7d **draws** instead:
each emitter lays a thin deposit every frame, and because it is moving those
deposits overlap along its path into a continuous ribbon. There are five
ribbons, one per log-spaced FREQUENCY BAND, stacked by pitch — bass low in the
frame, air high, each with its own spectrum-analyser-style auto-gain, so the
hero reads as the shape of the track rather than its volume. Traced over 45
seconds the band heights are monotonic (0.23 / 0.29 / 0.48 / 0.61 / 0.70) while
every ribbon still crosses the full width.

**One dependency added — `simplex-noise` 4.0.3**, for a curl-noise flow field
(the 2D curl of a noise potential, divergence-free by construction, so the
ribbons circulate rather than piling into sinks — that is what reads as liquid
rather than wind). Meyda was researched and declined for the audio half: 115kB
of tarball against 15.9kB, for band splitting that is fifteen lines against an
`AnalyserNode` the component already owns. Flagged as the right choice if the
`#my-taste` visualizer later wants real timbral features.

The counterintuitive result, now `FINDINGS.md` **D21**: "less dense" is
governed by how fast dye LEAVES, not by how much goes in. The shipped build
deposits nearly 12x the dye of the first slim attempt and clears it 5x faster,
and measures as *less* coverage while looking dramatically thinner. Also
**D22** (a single frame of an advecting field spans 0.07–0.50 around a 0.19
median, so screenshots cannot be tuned against — this cost real time across
two stages) and **B60** (the band stacking silently inverted because the
restoring force was a heading bend rather than a position spring).

Coverage median 0.19 desktop / 0.22 mobile, text contrast 16.7:1 or better in
both themes, GPU 1.89ms per step against a 16.67ms budget. Full writeup:
`STATUS.md`'s own dated entry.

> **⚠ The four Stage 7a–7d paragraphs above are SUPERSEDED as of 2026-08-25.**
> The WebGL2 fluid they describe is **deleted** — solver, component and the
> `simplex-noise` dependency. They are kept for what they measured, not as a
> description of the hero background. See the entry immediately below.

**Also 2026-08-25 (Stage 7, rebuild) — the fluid is gone; the hero background is
a synthwave skyline spectrum.** A full-bleed horizon of neon columns, one per
log-spaced frequency bucket, rising and falling with the track, gradient-filled
and glowing. **Canvas2D, hand-rolled, no library.** `audioMotion-analyzer` was
the obvious reference and was rejected on **licence**: AGPL-3.0 is a real
copyleft obligation for a deployed site, so its techniques were reimplemented and
its source was not touched. Net dependency change **−1**, and the bundle
**shrank** by 16.33 kB (5.12 kB gz).

Three files, split the way the fluid's was:
`client/src/lib/skyline-spectrum.js` (renderer),
`client/src/lib/palette-cycle.js` (**the palette module the last two task briefs
assumed already existed — it did not, until now**), and
`client/src/components/skyline-background.jsx` (RAF loop, gating, DOM
measurement). The presence model and the synchronous needle-contact reveal carry
over unchanged in intent; `deck-state.js` was reused, not rebuilt.

**`analyser.fftSize` 256 → 2048**, and this is not a preference. At 256 the first
twenty columns of a log scale share two or three bins: A/B'd on rendered heights,
**7 of 19 adjacent bass pairs were indistinguishable on >80% of frames** at 256
and **0 of 19** at 2048. Log spacing gives **20 of 44 columns to below 500 Hz
against linear's 2** — the brief's own comparison, measured.

Four things worth carrying forward, all in `FINDINGS.md`: **B61** — Stage 7d's
fix for shipping dev diagnostics (spread them behind `import.meta.env.DEV`) is
itself a trap, because **object spread invokes getters** and freezes them;
**B62** — the `fftSize` finding above; **B63** — cancelling a RAF leaves the last
frame on the canvas, so a gate closing mid-playback froze the skyline;
**D23** — the hero is 1080px tall against a 900px window, so a background
anchored to its bottom edge puts its horizon below the fold; **D24** — a spectrum
display normalised to its *peak* has no dynamic range (heights spanned 0.54–0.92
and drew as a block), the span has to be normalised instead.

The **task brief was stale in four ways** and all four are documented in
`STATUS.md` rather than implemented against: it described the tree as being at
7a/7b (it was at 7d); it assumed a decoupled palette module existed; the five
colours it named are the 7b palette that **B54** measured as failing and that 7c
deleted on direct instruction; and the synchronous reveal it specified was
already built.

Text contrast **5.29:1 or better** in both themes at the worst pixel of 90
frames, GPU **0.228 ms/frame** (1.4% of a 60 Hz budget) on an M2, blank canvas
and stopped loop in every non-playing state. Full writeup, including the three
attempts the text mask took and a glow benchmark whose ranking **inverts between
software and hardware rasterisation**: `STATUS.md`'s own dated entry.

**Also 2026-08-25 (Stage 7.1) — the skyline goes electric, taller, and the
colour travels.** Three asks plus one piece of live feedback mid-build.

**Palette.** Seven hues moved from *bright* to *electric* — the change was
**lightness**, not saturation: every entry was already at HSL 91–100%, and what
made them read as pastel was L 71–81%. `gold` left, `azure` joined (the ring had
no true blue — a 75° gap, the widest on the wheel), mint kept by request. The
peak luminance band had to widen to `{0.18, 0.85}` and the base target drop to
0.085, because a saturated hue is *darker* than its pastel version: five of the
seven new entries landed below the old floor and would have been lifted straight
back into pastels. **All seven authored hexes now pass through untouched.**

**Height.** The ceiling is derived from the live navbar box rather than being a
fraction: the tallest possible column tops out **28px below the navbar**, which
is 0.809 of the horizon on desktop and 0.839 on mobile — **81% of the visible
height, up from 62%**. The nav links are the one hero element with no safe zone,
so keeping them clear by geometry rather than by luck is the point.

**Travelling wave.** Each column samples the palette ring at its own position
(shared position + spatial offset from its index), so a band of colour crosses
the skyline instead of one hue changing everywhere. Continuous and
one-directional, **1.15 palette entries across the hero width at 0.14
entries/second** — a lava-lamp drift, measured at −0.137 entries/s. It lives in
`palette-cycle.js`; the ring is tiled once into 168 fixed gradients so a column
picks a bucket rather than building a gradient per frame.

**The live feedback — "the bars look a bit opaque" — was the most useful thing
said about this stage,** and is now `FINDINGS.md` **D25**: the first pass at
"more glow" added *alpha*, and alpha is coverage, not brightness. Tightening the
halo (buffer 1/6 → 1/4, blur 3.5 → 2), backing the body ramp off (0.72 → 0.50)
and adding a **per-column tip cap** is what makes it read as neon. The cap also
fixes a real limitation: with one shared gradient, only a full-height column
ever reaches the bright end, so short columns were all base colour.

**D26** records the other half: a text mask is tuned against a *geometry*, and
raising the ceiling dropped the dark headline from 12.62:1 to **2.68:1** with the
mask untouched. Strengthening it worked but made the zones visible as an oval
behind the type; the fix was **shape, not strength** — full-width bands have no
left/right edge to notice.

Contrast back to **12.50:1 / 6.74:1 / 12.68:1** dark and **14.92 / 7.05 / 10.06**
light, zero white-clipped pixels with the more saturated palette (the brief
predicted the opposite), GPU **0.307 ms/frame** (1.8% of a 60Hz budget). Full
writeup: `STATUS.md`'s own dated entry.

**Also 2026-08-25 (Stage 7.2) — the light theme, the banding, and the tips.**
Three pieces of live feedback, and all three were about something other than what
they looked like.

*"The lighter mode looks kinda white"* is `FINDINGS.md` **D27**. Alpha does not do
the same job on the two themes: on a dark ground it trades brightness, on a light
one it trades **saturation**. Measured, light theme needed alpha 0.70 to reach the
chroma dark theme has at 0.20, and its ramp started at **0** — the dark theme's
ethereal fade, scaled. On paper a bar that fades out does not go ethereal, it goes
absent. There are two ramps now rather than one and a multiplier, and the halo came
down to 0.34 in step, because it is drawn *under* the columns and its alpha
compounds with theirs — sized separately, the two changes cancelled exactly and the
histogram did not move.

*"The bars look pixeled"* is **D28**, and it looked exactly like 8-bit banding.
It was the mask: 7.1's seven-rect accumulated falloff is a **staircase**, 8%-alpha
steps 27 device pixels apart across every column at once. It is now a vertical
linear gradient sampled along a smoothstep — three fills a frame instead of
twenty-one. The genuine 8-bit banding underneath got a **dither**, one third white
/ one third black / one third transparent at one 255th alpha, which is the only
mix whose amplitude does not collapse where the pixel is already near the ink.

*"Make the tips smooth, not that hard line"* — the lit cap went from a 3px slab at
flat 0.92 to a **14px falloff**, so the only edge left is the bar's own outline.

**D29** is the one that was latent: full-width safe zones **compose**, so the
headline's and the tagline's bands — 25px apart, 96px feather each — were quietly
running at an effective **0.956**, a 400px hole across the middle of the hero that
neither authored number described. They are one zone over one block of copy now,
and the strengths are per theme, because `--secondary-text` flips luminance and the
two themes' columns close on it from opposite sides.

Contrast, worst case over all seven palette entries: **12.28 / 5.87 / 12.11 /
17.03** dark and **11.75 / 5.15 / 8.02 / 17.44** light. GPU **0.363 ms/frame**
(2.2% of a 60Hz budget). Full writeup: `STATUS.md`'s own dated entry.

**Not started yet, in the order the roadmap currently has them:**

| Stage | What | Depends on |
|---|---|---|
| **4 (remainder)** | `#my-taste` Task 5: time-range switching + `Flip` re-rank | Tasks 1, 2, 2.5, 3, 3.5, 3.6, 3.8, 3.7, 4, 3.9, 4.1 — done |
| **3 (remainder)** | Apply the design system to `#connect` — the same tokens/mixins already used on `#about`/`#projects`, just not applied there yet. This is the last piece of Stage 3's own original scope | Nothing — ready now |
| **3 (deferred pass)** | The deck's material pass: dark-theme turntable contrast (D3, 1.15–2.07:1 today), the mat-as-a-ring problem (D12), light-theme deck colour revisit, the weak rim→mat boundary. Bundled together because they interact | Nothing — ready now |
| **5 (`#my-taste` piece)** | ~~Mobile pass~~ — **done, above.** | — |
| **5 (remainder)** | A mobile pass for any other section still worth a deliberate look (not just "doesn't overflow") — `#about`'s timeline, `#projects`' accordion, `#connect`'s cassette/walkman all currently ride generic responsive overrides, none audited the way `#my-taste` just was | Nothing — ready now |
| **6 (Phase 9)** | ~~Pitch fader~~ — **done, above.** | — |
| **6 (Phases 8, 10)** | Turntable delight remainder — scroll-linked ducking/mute, scratch | Stages 1 + 2 — both done |
| **7 (a–d)** | ~~Hero fluid background, presence-gating and audio routing, vibrancy/energy pass, spectrum-bound ribbons~~ — **superseded and DELETED, see the rebuild above.** | — |
| **7 (rebuild)** | ~~Hero synthwave skyline spectrum — Canvas2D renderer, standalone palette module, presence + synchronous reveal~~ — **done, above.** | — |
| **7.1** | ~~Electric palette, navbar-derived height ceiling, travelling colour wave, neon glow pass~~ — **done, above.** | — |
| **7 (perspective grid)** | The receding horizon grid with a vanishing point — the other half of the synthwave idiom. Deliberately **not** built in the rebuild: it is a decorative layer over a structure that has to be correct first, the same structural-before-motion split every prior stage took | The rebuild — done |
| **7 (e+)** | "WOW layer" remainder — `#my-taste` visualizer, `#projects` as a pinned record-crate scrub, a waveform transition line | Stage 1's `AnalyserNode` — done. **`meyda` is the flagged candidate if the visualizer wants real timbral features** (spectral flux/centroid/chroma); it was declined for the hero, where band splitting is fifteen lines |
| **8** | Accessibility (theme-toggle label, single `h1`, skip-link), animated theme toggle, lint cleanup, `.git` history rewrite | Nothing — ready now, always deferred as "polish" |

**Standing manual tasks (not code — need dashboard access), highest priority first:**
1. ~~Set `RESEND_API_KEY` on Railway's server service~~ — **stale, corrected 2026-08-19.**
   The key is already live (Stage 3 Task 11 found this by probing production directly;
   `FINDINGS.md` D15). This line sat here claiming otherwise after someone had already
   set it, with nothing catching the mismatch — left struck through rather than deleted
   so the next reader sees the correction, not just a silently vanished line.
2. Revoke the old Gmail app password; delete `SMTP_USER`/`SMTP_PASS` from `server/.env` and Railway.
3. *(Optional)* Add `send.diegodamian.com` DNS records in Cloudflare to lift the Resend sandbox's own-address-only restriction.
4. Do **not** click the Resend "Confirm email change" email sitting in the inbox — it would move the account off the working address.
5. Recurring: the Spotify refresh token expires roughly every 6 months (root `README.md`).

**My read on immediate next step:** Stage 4 Task 5 (`#my-taste`'s
time-range switching + `Flip` re-rank) — the section now has its final
layout, real linked content, its entrance motion, AND the kicker's avatar,
so this is the last piece of Stage 4's original 5-task sequence. Task 5's
own brief should account for the wall's current two-tier grid (2 featured
+ 3 secondary, grid-area names `featured-1/2`/`secondary-1/2/3`) when a
re-rank moves an artist BETWEEN tiers, not just within one — noted in
`stage4-my-taste-concept.md` §16's open items (renumbered twice since —
was §14 — as later live-feedback sections were inserted above it), unresolved
from Task 3.7 and still open after Tasks 4/4.1.
`#connect` is now the only section left in Stage 3's own original sequence
(`#projects` closed out 2026-08-18, above) — a smaller task than `#projects`
was, since it needs no interaction rebuild, just the same type-scale/
spacing/content-width tokens already applied twice elsewhere. Your call
either way — see §3 below for the full stage list.

---

## 1. The open questions, answered

### Q1 — Which design direction? — **Neither (a) nor (b). Option (c).**

`FINDINGS.md` framed this as *extend the hero's material language downward* vs *pull
the hero back toward convention*. Both assume the body's problem is that it isn't
skeuomorphic enough. It isn't.

Compare two sections:

- `connect-desktop.png` — no material, no texture, and it **works**. Clean, calm, legible.
- `my-taste-desktop.png` — centered stacked headings, a photo floating beside a title,
  track numbers in a column that don't align to their own rows.

The second isn't failing for lack of wood grain. It's failing because it was never
designed. The diagnosis in `FINDINGS.md` §3 is right that the site reads as two
websites — but the fix is a **shared design system, not shared material.**

**The direction:** one type scale, one spacing rhythm, one alignment logic, one
section-header pattern, applied across every section below the hero. The hero stays a
bespoke object. A gallery does not have to be made of the same stuff as the exhibit.

This is significantly cheaper than option (a) and gets most of the coherence.

**Exception — the one place material *should* travel: `#my-taste`.** It is
simultaneously the weakest section and the most thematically connected one. Top
artists as records, top tracks as a crate, reusing the sleeve component already built
for the hero. Material spent here is content-appropriate rather than decorative.
Do not spread it further.

### Q2 — Decorative or functional turntable? — **Functional. Not actually open.**

The hero reads *"put a record on…"*. That is a promise. The page currently does not
keep it, which puts the site in violation of its own goal #1 (`STATUS.md` §1:
"nothing broken or lying to visitors"). The alternative — changing the copy — discards
the site's entire premise.

**Scope note:** the promise is discharged by **Phases 6 + 7 only** (drop/tonearm
animation + audio engine). Phases 8, 9, 10 (scratch, pitch, ducking) are delight, not
premise, and belong later.

### Q3 — Does the slideshow survive? — **No. Delete it.**

It duplicates the project list directly beneath it, is missing a project (B6), holds
one rotating image in 80vh, and creates a second source of truth already out of sync.
Deleting it is a net design improvement *and* removes a bug class. Free win.

### Q4 — Inverted bands? — **Un-invert `.work-experience`. Decided, Stage 3 Task 1.**

> **Decided 2026-08-12 — reasoning in full in `STATUS.md`.** No content-driven reason was
> found to single out Work Experience for inversion specifically; the original two-band
> rhythm (this + the deleted slideshow) was never content-driven either, both sections
> just happened to be styled that way. D4's own framing is the deciding fact: a lone,
> unpartnered inversion reads as a rendering accident, not a choice — reinstating a
> *second* band purely for symmetry would manufacture that same question a second time
> with no content backing either band. Un-inverting makes the whole scroll one surface,
> which is the literal content of the "reads as one coherent design" goal.
>
> **Not applied yet** — `.work-experience`'s inverted tokens are untouched. Task 2 removes
> them when it reaches `#about`. D5 (logos-on-white-cards vs. photographs in the same row)
> is separate and still open — Task 2's problem too, not decided here.

---

## 2. Why the order changed

`STATUS.md` §5 put the design direction as blocking (Stage 1) and the turntable last
(Stage 4). Two problems with that:

1. It leaves the site's **central premise unfulfilled the longest**, while everything
   else gets polished around an inert centerpiece.
2. A working turntable is itself **design information.** Sections below a hero cannot
   be properly designed until the hero's real behavior — its motion, its audio, what
   the visitor is doing when they arrive — is known.

The direction question (Q1) is now answered above, so it no longer blocks anything.

---

## 3. Stages

Ordered by *what is costing us now* → *what raises the ceiling*.

### Stage 0 — Stop the bleeding *(~half a day, zero design decisions)*

The site is live and is being used for a job search. These are visible failures.

- ~~**B1** "Work Experience" heading invisible (~1.04:1)~~ — **DONE 2026-08-08**,
  now 17.44:1 dark / 17.03:1 light
- ~~**B2** timeline card text, same token-inversion root cause — audit every
  `--bg-inverted` rule and confirm its text tokens invert with it~~ —
  **DONE 2026-08-08**. The offender was `.date`, not `.timeline-content`; fixed with a
  new `--secondary-text-inverted` token (2.34:1 → 7.7:1). Audit found only one
  `--bg-inverted` region remaining, since Task 2 deleted the other
- ~~**B3** nav links scroll their target under the fixed navbar~~ — **DONE 2026-08-10**.
  `scroll-margin-top: var(--scroll-offset)` on the sections, driven by a single
  `--navbar-height` token redefined at the two breakpoints where `.logo` shrinks.
  Every section now clears the bar by ~25px at 1440/1024/768/480. Fixing it surfaced
  **B3b** (direct hash landings missed by 811px because `#my-taste` grows when its
  Spotify data lands — pre-existing, also fixed) and **B3c** (nav clicks never update
  the URL — left open, it's navbar behaviour, pairs with B4)
- ~~**B4** **mobile has no navigation at all** — most recruiter traffic is mobile~~ —
  **DONE 2026-08-10**. Slide-down panel below 768px: hamburger (a real `<button>` with
  `aria-expanded`/`aria-controls`), five destinations plus the theme toggle, all rows
  ≥44px, Escape/outside-click/focus-return, body scroll lock, and navigation landing at
  the Task 4 offset. Note the finding's premise was **stale** — the links weren't
  missing, they were wrapping with "About Me" split across two lines, because Task 2 had
  already un-gated them. Fixed **B3c** (URL now updates, via `replaceState`) and the §6
  hamburger accessibility item in the same pass, and made `--navbar-height` authoritative
  (`.navbar { height: var(--navbar-height) }` + `box-sizing: border-box`)
- ~~**B5** `client/.env` missing URL scheme, breaks local `#my-taste`~~ — **DONE
  2026-08-08**, fixed in the same pass as the iTunes search proxy (`FINDINGS.md`).
  Stale in this list since — no strikethrough was applied when it landed
- ~~**B6** slideshow duplicates the project list and is missing a project~~ —
  **DONE 2026-08-08** (`4ebaaaf`), deleted entirely per Q3
- ~~**B7** Rutgers logo clipped~~ — **DOES NOT REPRODUCE 2026-08-10.** The logo renders
  complete and undistorted at every width; the "slicing" in `about-*.png` is the fixed
  navbar overlaying the element capture (the artifact `FINDINGS.md` §2 warns about).
  Resizing it for visual balance against the profile photo is a design decision with no
  defect behind it — moved to Stage 3 / D5
- ~~**B8 — `#my-taste` mobile layout is visibly broken.**~~ — **DONE 2026-08-10.**
  All three defects reproduced and are fixed, alignment only: numbers sit beside their
  titles on the title's baseline (0.0px delta at every width), dividers start at the
  content's left edge, and the artist list is a grid with `align-items: start` so images
  share a top edge. Column counts are arithmetic — the server hardcodes `limit=5`, and
  only 5 or 3 columns avoid an orphan, so `auto-fit` (which gave 4+1 and 2+2+1) was
  replaced by explicit counts. Surfaced **D10**: every `#my-taste` responsive override
  is dead code, beaten on specificity by the base rules nested under `.spotify-section`
  — which is *why* B8 existed, since `flex-direction` was the one property that got
  through. Stage 4 should delete that block rather than repair it
- ~~**Add a resume/CV link.** Currently absent entirely. For a site whose job is
  converting recruiter attention this is a larger gap than any unfinished animation.~~
  — **DONE 2026-08-10.** `client/public/Diego-Damian-Resume.pdf` (36 KB), linked from
  the desktop navbar, the mobile menu and `#connect`, opening in a new tab. Kept out of
  `SECTIONS` so it can never take an `aria-current` highlight or trigger a scroll.
  Adding a sixth nav item pushed the inline row past its fit, so the hamburger
  breakpoint moved 768 → 900px. Deliberately **not** added to `sitemap.xml` — the PDF
  carries a phone number and the nav link already makes it discoverable
  > **Update (2026-08-17):** reversed. Direct request, privacy — "i don't want people
  > seeing my data." The nav link, the `#connect` link, and the PDF itself all came out
  > (`STATUS.md`'s own dated entry has the full writeup). The 900px hamburger
  > breakpoint stayed put rather than being moved back to 768px — re-measured live with
  > six items instead of seven, it still fits with real slack, and a lower re-tune wasn't
  > asked for. `.gitignore` now blocks a future resume file from being re-tracked, but the
  > PDF is still recoverable from git history (one commit, `8030639`) until that history
  > is separately rewritten — flagged against Stage 8's own already-planned rewrite, §3
  > below, not done automatically.

**Stage 0 is complete.** See `STATUS.md` for the close-out.

~~Also fold in the trivial cleanup while in these files: delete `nav-orb.jsx` /
`orb-field.jsx` and their CSS, drop `@react-spring/web` and `@use-gesture/react`
(orphaned), and remove the navbar's hide-during-hero link gating (Phases 11–12 —
they touch nothing the turntable depends on).~~ — **DONE 2026-08-08** (`f7911ac`).
Nav links are now usable from the top of the page. Note the dependency removal did
**not** shrink the bundle — those libraries were already tree-shaken out, since
nothing imported them. See `STATUS.md` for the numbers.

### Stage 1 — Make the hero keep its promise *(Phases 6 + 7)*

Drop-record + tonearm animation, then the audio engine
(`AudioContext` → `GainNode` → `AudioBufferSourceNode`), unlocked by the needle-drop
gesture. `audio.play()` must land exactly on needle contact.

There is no `AudioContext`, `GainNode`, `AnalyserNode` or `<audio>` element anywhere in
`client/src/` — confirmed 2026-08-11.

> **Correction (Stage 1, Task 1).** This previously said `previewUrl` is *"captured from
> the iTunes search and thrown away."* **It is not.** It is carried all the way to the
> component that needs it:
>
> `record-crate.jsx:27` puts it in the track shape → `:59` filters results to only tracks
> that *have* one (`.filter(r => r.previewUrl)`) → `:162` `onSelect?.(track)` →
> `home.jsx:7` `nowPlaying` → `home.jsx:19` `<Turntable track={nowPlaying} />`.
>
> So it already sits in `Turntable`'s props and is simply never *consumed* —
> `VinylRecord` reads only `artworkUrl`. **No plumbing work is needed.** Stage 1 consumes
> existing data rather than routing new data.
>
> Track shape: `{ id, title, artist, artworkUrl (600×600), artworkThumbUrl, previewUrl }`.

**Current state of the deck, verified 2026-08-11** — `turntable.jsx` is pure markup: no
GSAP import, no refs, no hooks. Two targets are prepared but inert:

- `.turntable-platter-spin` has `transform-origin: 50% 50%` and a comment naming it as
  the future rotation target. **No tween exists, and no ref to hand GSAP.**
- `.turntable-tonearm-rotor` rests at `rotate(20.5deg)` with
  `transition: transform 0.4s ease`. Nothing drives it. **That CSS transition will fight
  GSAP** — remove it when GSAP takes the property over.
- **There is no gesture surface yet.** Every deck control is an `aria-hidden` div with no
  handler; the only interactive element in the hero is the crate row. Task 2 must decide
  whether `resume()` rides that click or a new needle-drop control — and if the latter,
  that element has to become a real button.
- `.hero-vu-slot` is present and empty, with `clamp(40px, 4vw, 50px)` of height reserved.

> **Read the hero components from the tree before writing a line of animation code.**
> This is not boilerplate caution — it is the single most repeated lesson of Stage 0.
> Four separate tasks found this document, or the task brief quoting it, describing a
> state that no longer existed:
>
> - **B4** said mobile had no navigation. Task 2 had already un-gated the links, so the
>   real bug was different *and worse* — they were wrapping mid-label.
> - **B7** described a clipped logo. It renders perfectly; the fixed navbar was
>   overlaying the screenshot.
> - **Task 2's brief** cited a `var(--seconday-color)` typo and a `.theme-transition`
>   rule. Neither existed.
> - **Phase 0's** own "no proxy needed" conclusion was desktop-UA-only and wrong for
>   iPhone search.
>
> Start by reading these three, verified present 2026-08-10:
>
> | File | Size then |
> |---|---|
> | `client/src/sections/home.jsx` | 22 lines |
> | `client/src/components/turntable.jsx` | 57 lines |
> | `client/src/components/record-crate.jsx` | 265 lines |
>
> Also present and relevant: `components/vinyl-record.jsx` and
> `components/strobe-ring.jsx`. Confirm what each actually renders, what state it
> already holds, and where `previewUrl` currently dies — **then** plan the animation.
> Line counts above are a staleness check: if they differ, the file changed after this
> was written and nothing here should be trusted about it.

**Two different Apple hosts, two different architectures. Do not conflate them.**

| | Host | Path | Status |
|---|---|---|---|
| **Search** (text → track list) | `itunes.apple.com/search` | `GET /api/itunes/search` — **server-side** | Live path, not a fallback |
| **Preview audio** (30s `.m4a`) | `audio-ssl.itunes.apple.com` / `*.mzstatic.com` CDN | **Direct browser `fetch`** | Tier 1, unchanged |

- **Search is proxied, permanently.** Apple's Search API inspects the User-Agent and
  `301`s an `iPhone` UA to a `musics://` deep link, which a browser `fetch` cannot
  follow. This is *the* live path for every visitor on every device, not a contingency.
- **Preview audio is still Tier 1 direct.** The preview CDN sends
  `access-control-allow-origin: *` and does **not** do the UA redirect. Stage 1's audio
  engine fetches Apple's CDN **directly from the browser** — 30s `.m4a` files do **not**
  stream through Railway, and nothing here adds bandwidth or latency on our host.
- `/api/itunes/preview-proxy` stays dormant as a fallback **for the audio path only**.
  It has nothing to do with search.

So: proxying search did *not* change the audio architecture. If a future session reads
"iTunes is proxied" and routes preview audio through Railway too, that is a regression.

> **The decode path is VERIFIED — re-tested 2026-08-11 (Stage 1, Task 1).** Phase 0 had
> only tested this on a desktop UA, and its *other* conclusion (direct search) turned out
> to be UA-dependent and wrong, so every Phase 0 result was treated as unproven until
> re-confirmed. It now holds.
>
> | Profile | Engine | fetch | ACAO | `decodeAudioData` | `AnalyserNode` |
> |---|---|---|---|---|---|
> | Desktop Chrome | Blink | 200 `audio/x-m4p` | `*` | 29.93s, 2ch @48kHz | peak **17,701** |
> | Pixel 5 | Blink | 200 | `*` | 29.93s, 2ch | peak **18,098** |
> | Galaxy S9+ | Blink | 200 | `*` | 29.93s, 2ch | peak **18,114** |
> | **Desktop Safari 17.6** | **WebKit** | 200, no CORS error | `*` | **30.02s, 2ch** | — |
>
> That is **two engines across four profiles** (Blink ×3, WebKit ×1) — not four engines.
> Non-zero analyser sums mean the stream is **not tainted**: `crossorigin="anonymous"`
> plus the CDN's `access-control-allow-origin: *` is sufficient.
>
> **Tier 1 confirmed. Preview audio stays a direct browser fetch — no proxy.**
> `/api/itunes/preview-proxy` remains dormant.
>
> **Still unverified, and deliberately separate: iOS's autoplay/gesture policy.** That is
> browser *policy*, not the decode engine — desktop WebKit proves the codec and CORS path,
> not what iOS Safari permits without a user gesture. Build to the constraint now
> (`AudioContext.resume()` and `audio.play()` only ever inside a real gesture handler,
> volume exclusively through a `GainNode`, one shared `AudioContext`) and put a
> **real-device iPhone test before Stage 7**, which is where a failure would actually cost
> something.

**Watch the shared rate-limit budget** once the hero drives real search traffic — see
the README's *External APIs* section. Proxying moved every visitor's search onto one
Railway egress IP, so the whole site now shares a single Apple budget. Low risk today,
but it is a known limitation rather than a solved problem.

> **Stage 1 is DONE** — Tasks 1–5, 2026-08-11/12. The hero plays, the transport is
> labelled and survives adversarial input, bends pitch on pause/resume, the deck reads as
> an object in both themes, and a theme toggle changes every surface on one 180ms curve.
> Full measurements in `STATUS.md`.
>
> **Decisions made in Task 4 — do not relitigate:**
>
> - **`setSpin` is the single writer for the platter's `timeScale`.** Nothing else may
>   touch it or pause/play the spin tween. Three separate freeze bugs came from having
>   more than one writer; Phases 8 (scratch) and 9 (pitch) both want to drive platter
>   speed and **must** go through it rather than adding their own tweens.
> - **Anything that schedules a state change on a delay must own its own cancellation.**
>   The worst bug of the task was a `tl.call(() => tween.pause())` scheduled 800ms out,
>   surviving the timeline that scheduled it and landing on top of a later wind-up.
>   Putting it in the tween's `onComplete` means `killTweensOf` cancels both together.
> - **Transport reads deck state from a ref, not the state variable.** Two presses inside
>   one frame otherwise take the same branch.
> - **Deck surfaces mix against `--deck-ground`, never `--bg-color`.** That token is the
>   single lever for the deck's whole material stack per theme — it is also how D3 (dark
>   theme) should be fixed when its turn comes.
> - **Reduced motion keeps the platter still**, consistently across load *and* transport.
>
> **Carried forward:** D11 (replay swallows presses for 0.6s — wants a `DECK.CUEING`
> state, fits naturally in Phase 8) and D12 (the mat is a ~1.5% ring once a record is on
> — Stage 4 should decide whether the record shrinks or the mat simplifies).

> **Stage 1, Task 5 — power-down audio + D8.** Also done, 2026-08-12. Decisions:
>
> - **The audio is pinned to the platter, not tweened alongside it.** `setSpin`'s tween
>   drives `audio.followSpin(tween.timeScale())` from its own `onUpdate`, so rate and gain
>   ride the real curve and inherit Task 4's proportional durations. Phases 8 (scratch)
>   and 9 (pitch) should extend `followSpin`/`setRate` rather than writing
>   `playbackRate` directly — `setRate` also owns the piecewise elapsed integration, and
>   bypassing it silently corrupts the resume position.
> - **`RATE_FLOOR = 0.2`** is where playback cuts; `spinGain()` reaches 0 exactly there so
>   the cut lands on silence. Phase 8's scratch will want to go below the floor
>   *deliberately* — that is a different mode, not a reason to lower this.
> - **The needle drop is NOT spin-linked.** A drop and a replay start at pitch with Task
>   2's slow fade-in. Only transport bends.
> - **`--theme-transition` is the first motion token.** Stage 3 extends this set — it does
>   not invent a parallel one. `--theme-transition-ease` is deliberately separate from the
>   duration so non-colour motion can reuse the curve.
> - **Never `setTargetAtTime` when a parameter must actually ARRIVE.** It approaches
>   asymptotically; measured, a fade stalled at ≈ −26 dB and stayed there. Use
>   `linearRampToValueAtTime` wherever a value has to reach its target by a known instant.

### Deferred together — the deck's material pass *(Stage 3)*

Three findings about the deck's surfaces are **deliberately not being fixed piecemeal**.
They interact, and fixing any one alone risks flattening the others — which already
happened once, in Task 4, where deepening the light-theme ground cost 2.4 L\* on the
`rim → mat` boundary without touching the mat at all.

| | What |
|---|---|
| **Light-theme deck colour** | Diego wants to revisit it. Task 4 took the plinth from 11.7 to 28.5 L\* against the page, which fixed the "dissolves into the background" problem, but the resulting silver-grey is a design judgement, not a settled answer |
| **D12** | The mat shows as a **~1.5% ring** once a record is on the platter (mat radius 0.935 of the platter, record radius 0.920). Either the record shrinks so the mat reads as a real layer, or the mat simplifies because it is almost never seen |
| **Task 4's weak boundary** | `platter rim → mat` sits at **6.4 L\***, the weakest step on the deck, and only after a `--deck-well-shadow` token paid part of it back |

`--deck-ground` is the lever for all three: every deck surface mixes against it, so the
whole stack moves together. **D3 (dark theme) belongs in the same pass** — its
record-vs-mat contrast is 1.15–2.07:1 across the five pressings, and the same token
fixes it from the other direction.

### Stage 2 — Scroll foundation

Lenis + `ScrollTrigger` wired properly, with `gsap.matchMedia` reduced-motion paths
established from the start.

Nothing ships visibly here, which is exactly why it is tempting to skip. Every
section transition, pin, scrub, and the scroll-linked volume ducking sits on it.
Retrofitting reduced-motion afterward is painful.

Prerequisites, both verified present in `client/src/styles/main.scss`:
- Remove `html { scroll-behavior: smooth }` (main.scss line 192) — it fights Lenis.
- Drop `background-attachment: fixed` from `.section` (main.scss line 1322) — janky on mobile.
  *(Line numbers re-verified 2026-08-12, after Tasks 3–5 added ~450 lines to the file —
  they had drifted by over 400 lines since the 2026-08-10 count. Re-verify again before
  editing rather than trusting these; this file has now been wrong about its own line
  numbers on every prior check.)*

**Also reconcile with Stage 0's B3 fix when Lenis lands.** Lenis takes over scrolling
from the browser, and `scroll-margin-top` is a *native* CSS feature.

- Removing `html { scroll-behavior: smooth }` is required *and* safe: `scrollIntoView`
  falls back to instant, and `--scroll-offset` keeps working because scroll-margin is
  independent of scroll behaviour. Do not remove it before Lenis is wired, though —
  section jumps become abrupt in the meantime.
- `scrollToSection()` will need to call `lenis.scrollTo(target)`. `use-hash-scroll.js`'s
  settle-window logic (B3b) stays as is; only the underlying scroll call changes.

> **Correction, done — this premise was wrong.** Lenis's own `scrollTo(target)`
> **already reads `getComputedStyle(target).scrollMarginTop`** when given an element or
> selector, not just an element. Passing `{ offset: -X }` read from
> `getComputedStyle(document.documentElement)` would have worked, but it's a second,
> unnecessary read of a value Lenis already resolves itself — and worse, the custom
> property doesn't resolve its own `calc()` when queried directly (`--scroll-offset`
> returns the literal string `"calc(144px + 24px)"`, not a number; verified by injecting
> Lenis into the live page). `scrollToSection()` passes no offset at all. Full writeup in
> `STATUS.md`.

> **Stage 2 is DONE** — 2026-08-12. Lenis wired via `gsap.matchMedia()` (not
> `lenis/react` — its `<ReactLenis root>` needs children to construct anything, which
> would have split the reduced-motion gate across two mechanisms), driven by
> `gsap.ticker`, `ScrollTrigger.update` subscribed to Lenis's scroll event. Full
> measurements and the touch-settings rationale in `STATUS.md`.
>
> **Decisions made — do not relitigate:**
>
> - **`gsap.matchMedia()` is the reduced-motion pattern for any media-query-gated
>   subsystem**, not only tweens — `.add(query, setup)` runs `setup` on match and
>   auto-reverts whatever it returns on unmatch. Stage 3/6/7 should reuse this shape
>   rather than a React hook for "should X exist" plus a separate matchMedia call for
>   the GSAP side.
> - **`lib/scroll.js` holds a module-level `activeLenis` reference** (`setActiveLenis` /
>   `getActiveLenis`), same shape as `turntable-audio.js`'s `AudioContext` singleton.
>   Anything needing the Lenis instance outside `smooth-scroll.jsx` reads it from there,
>   not through props or context.
> - **`syncTouch: false`** (Lenis's default) — touch drags scroll natively, Lenis only
>   smooths wheel input. Deliberate, not an oversight: see `STATUS.md` for why.
> - **Anything that programmatically cancels a scroll must be Lenis-aware when Lenis is
>   active.** Native `window.scrollTo({top: window.scrollY, behavior:'instant'})` does
>   NOT stop Lenis — it writes the position again on its next RAF tick. Use
>   `lenis.scrollTo(lenis.animatedScroll, { immediate: true })` instead.

### Stage 3 — The design system, applied *(the Q1 answer)*

Define the system once — type scale, spacing rhythm, section-header pattern,
alignment logic, and the inverted-band decision (Q4) — then apply section by section,
weakest first:

`#about` work experience → `#projects` → `#connect`.

`#about` is first: it is the weakest presentation (D5 — logos-on-white-cards mixed
with photographs, ragged bottom edge) attached to the strongest content (specific,
quantified accomplishments). Stage 0's contrast fix already puts us in that file.

Also here: migrate the About timeline's unthrottled scroll handler to `ScrollTrigger`
(Stage 2 makes this available).

> **Stage 3 Task 1 is DONE** — 2026-08-12. The system is defined as tokens + `@mixin`s in
> `main.scss` (`--text-xs..xl`, `--space-1..9`, `--content-width`/`-wide`,
> `@mixin section-title/subtitle`, `@mixin content-column`) and the Q4 decision is made
> (above). **Nothing is applied to any section yet** — verified zero rendered-pixel change
> via a real pixel diff, not a byte diff. Full audit and every number in `STATUS.md`.
>
> **For Task 2 — three bugs found while auditing, not fixed here, all confirmed rendered:**
>
> - `.work-title` ("Work Experience") is `display: none` below 768px — the heading is
>   **invisible on mobile**.
> - `.portfolio-header .project-title` renders at **40px** — the bare `.project-title`
>   rule (sized for the deleted slideshow) still cascades onto it; the scoped override
>   only touches `font-weight`.
> - `.contact-title`'s `font-weight: 60` is almost certainly a dropped digit for `600`.
>
> **And one deliberate, visible change Task 2 is making, not avoiding:** `.portfolio-title`
> moves from a standalone 4rem to `--text-xl` (2.5rem, matching every other section's
> title) and from left-aligned to centered. Named here so it lands as intentional, not as
> accidental fallout of adopting the mixin.
>
> My Taste's three equal, unhierarchied `h2`s are audited above (`STATUS.md`) but belong
> to **Stage 4**, not Task 2 — `#my-taste` is a full redesign, not a type-scale
> application, per the sequencing below.

> **Stage 3 Task 2 is DONE — 2026-08-13.** Scope is
> larger than "apply the type scale to the existing markup": `#about`'s Work Experience
> half is being **rebuilt** as a full-bleed, scroll-revealed timeline — eight cover
> panels (photo or a generative motif as background, caption text overlaid on a dark
> scrim), a slim scroll-progress rail down the section's left edge, free scroll
> throughout (**no pin, no scrub-driven entrance** — each panel's reveal is a
> `ScrollTrigger` `toggleActions` play/reverse, triggered once per panel crossing into
> view). This is deliberately a different mechanism from the horizontal pinned carousel
> planned for `#projects` (Stage 7) — panels here never hijack the scrollbar.
>
> **Extends, does not replace,** the existing `.timeline-container` / `.timeline-item`
> DOM shape. The Bio half of `#about` (`.bio-section`) is untouched by this task.
>
> **Decisions made before writing code:**
>
> - **Q4 is applied here**, not just decided: `.work-experience`'s
>   `background-color: var(--bg-inverted)` / `color: var(--text-inverted)` come off, and
>   `.work-title` / `.date` move off the inverted trio onto ordinary `--text-color` /
>   `--secondary-text`.
> - **A new, deliberately non-flipping token pair is needed for panel-overlay text** —
>   `--panel-text` / `--panel-text-secondary`, defined once in `:root` and **not**
>   redeclared under `[data-theme="light"]`. The inverted trio was the wrong tool here:
>   it *flips* with `data-theme` (dark theme's `--text-inverted` is a DARK colour, for
>   the old light inverted band), but a photo-plus-dark-scrim panel needs light text
>   **regardless of site theme** — the photo doesn't get lighter in light mode. Reusing
>   `--text-inverted` here would reproduce the exact ~1.05:1 failure mode CLAUDE.md's
>   theming section warns about, just gated on the wrong variable.
> - **B10 is fixed as a side effect of the rebuild, not patched separately.** "Work
>   Experience" stays as a real heading (see below), moved into normal document flow
>   above the panel stack and set with `@include section-title`, which has no
>   `display: none` at any breakpoint — the 768px rule that hid it is simply not carried
>   forward.
> - **The "Work Experience" heading is kept, not dropped.** The panels are self-labeled
>   (each carries its own role/company), so a section title is not load-bearing the way
>   it is elsewhere — but Stage 3's own goal is one section-header pattern across every
>   section, and dropping the one heading that would otherwise match `@mixin
>   section-title` undercuts that more than it simplifies anything. Keeping it costs
>   nothing and buys consistency with Projects/Connect.
> - **Content column: `--content-width-wide` (1100px), reconciled against "most of
>   viewport width."** Task 1 earmarked `-wide` specifically for Work Experience's items.
>   Left uncapped, panels would run the full viewport at ultra-wide sizes, which is the
>   same "no two sections agree where the page's edges are" problem Stage 3 exists to
>   fix. 1100px is already ~76% of a 1440px viewport — reads as large — and panel
>   *height* (generous, vh-based) is where "large" shows up most anyway.
> - **The rail is scoped to `.work-experience`, not all of `#about`.** Read literally
>   the brief said progress "through `#about`," but `#about` also contains
>   `.bio-section`, which has no panels and no rail — scoping the fill to the whole
>   wrapper would start the rail partway full before the first panel even enters view.
>   Scoped to `.work-experience` (`top top` → `bottom bottom`), the fill actually tracks
>   what it's next to.
> - **Placeholder photos, sourced and stored locally** (not hotlinked), per
>   `client/src/assets/about/`: `costa-verde.jpg` (Unsplash, Miraflores coastline —
>   entry 1) and `rutgers-campus.jpg` (Unsplash, Rutgers' Old Queens gate — genuinely
>   Rutgers-specific, top fallback tier, so the generic-campus/motif tiers under it were
>   not needed — entry 2). Both flagged in `STATUS.md` as pending Diego's own photos.
> - **Entries 3 and 4 are NOT placeholders** — `trump.jpeg` and `codewiz.jpeg` already
>   exist in `client/src/assets/` (Diego's own photos, already live on the site today).
>   Reused as-is. Their **dates and captions changed**: the brief's dates (Trump
>   National Jan–Aug 2024, CodeWiz Aug 2024–Jul 2025) don't match what's currently live
>   (2022–2024 / Jan–Jul 2025) — brief's data used as the more recent/specific source,
>   discrepancy flagged in `STATUS.md` rather than silently overwritten.
> - **Capgemini (entry 6) has no photo anywhere in the repo** — `capgemini.svg` is a
>   logo, not a photo, and the brief itself flags this entry as "may be sparse." Falls
>   back to the generative motif in full, per the brief's own fallback rule.
> - **Client-lockup badge: Capgemini's simpleicons URL 404s, McDonald's resolves.**
>   Tested both before use (required by the brief). Badge is `McDonald's` icon (its
>   actual brand colour, `#FBC817`) + "×" + the word "Capgemini" as text — a mixed
>   lockup, not a full fallback to text-only, since only one mark actually 404s.
> - **GitHub embed verified live**, not assumed: `ghchart.rshah.org/6f9bff/diegodamian02`
>   returns a real SVG, 369 `<rect>` day-cells, 54KB — not an empty or placeholder
>   response. `6f9bff` is `--panel-accent`'s value (below), not a live reference to
>   `--accent` — the embed URL is a static string, so it can't follow a CSS variable.
> - **One unresolved content discrepancy, not decided here:** the brief's closing-beat
>   copy (entry 8) says Diego was **VP** of the Music Tech Club; `.bio-section`'s existing
>   text says he **founded** it. Both are Diego's own words at different times — not
>   something this task can adjudicate. Brief's wording is used for the new panel only;
>   `.bio-section` is out of scope for this task and left untouched. Flagged for Diego to
>   reconcile.
>
> **Two things found only by verifying, not by re-reading the CSS:**
>
> - **B12 (new) — `.work-experience` shares a classname with `.bio-section`**
>   (`"about-section work-experience"`), and `.about-section`'s `height: 100vh` — inert
>   before, since the old `.work-experience` rule redeclared a matching height — silently
>   capped eight stacked panels into a 1092px box once that redeclaration was dropped.
>   Caught by measuring `.work-experience`'s `offsetHeight` against `.timeline`'s, not by
>   eye — the flex-centred overflow doesn't clip, it just corrupts the surrounding
>   document flow. Fixed with an explicit `height: auto; display: block;` override,
>   commented in place. Full writeup in `FINDINGS.md`.
> - **The three `work-motif.jsx` variants had no fill/stroke/background at all** —
>   SVG's own default made all three render as black-on-near-black, invisible. Fixed with
>   a third fixed token, **`--panel-accent`** (`#6f9bff`), alongside `--panel-text` /
>   `--panel-text-secondary` above, for the same reason: the motifs stand in for a photo
>   on the same always-dark panel, and `--accent` is considerably darker in light theme.
>
> **Verified:** Q4's un-invert measured (`.work-title` 17.03:1 dark / 17.44:1 light,
> matching every other section's heading pairing), B10 confirmed fixed at 480px, B3's
> nav-to-`#about` landing re-verified holding (144px navbar, lands at 170px). Reveal and
> rail-fill checked against real scroll input (a raw `scrollTo()` jump doesn't reliably
> exercise `ScrollTrigger` the way eased/wheel scroll does) — panels transition smoothly
> 0 → partial → 1 opacity crossing `start: "top 85%"`; the rail fill sampled at 5 depths
> came back monotonic, 0.073 → 0.368 → 0.664 → 0.959 → 1.0. Reduced motion: panels render
> fully visible immediately; the rail still scrubs (1:1 with the visitor's own scroll,
> not the autoplaying motion the media query targets). `npm run build` and `npm run lint`
> both clean — lint actually dropped to **13** errors (from the 16 baseline), incidental
> to rebuilding `about.jsx` data-driven rather than a deliberate fix. Full numbers,
> screenshot index and the placeholder/fallback table for all eight entries in
> `STATUS.md`.

> **Stage 3 Task 3 is DONE — 2026-08-13.** Two trims to the timeline Task 2 shipped,
> made after re-reading the actual shipped code rather than assuming Task 2's brief
> still matched it (it did — entries and rail mechanism were exactly as described
> above):
>
> - **GitHub-activity panel removed entirely** — entry, both JSX branches, the two URL
>   constants, and the two CSS rules (`.timeline-github-chart`, `.timeline-link`) that
>   only it used. Checked with a repo-wide grep before deleting that nothing else
>   referenced any of them.
> - **Closing beat no longer claims "VP of the Music Technology Club."** Now: "A minor
>   in Music Technology — the same interest behind the turntable up top, and the thread
>   running into what's below." The discrepancy this closes (`.bio-section` says
>   *founded*, not VP'd) is moot for this panel now rather than resolved — it no longer
>   makes a title claim either way.
>
> **Timeline is now 7 panels.** The rail-fill's `ScrollTrigger` was never count-based —
> scoped to `.work-experience`'s own scroll extent, it recalculates start/end against
> whatever the section's actual height is, so removing a panel needed no separate
> recalculation. Verified anyway, not assumed: re-sampled at 5 depths through the
> now-shorter section, scaleY **0.085 → 0.388 → 0.691 → 0.993 → 1.0** — still a clean
> 0→1 sweep. B1/B2/B3 re-verified unchanged (`.work-title` 17.03:1 dark / 17.44:1
> light; B3 lands at 169px, same ~25px clearance). Full writeup, bundle deltas (all
> down, as expected for a pure removal) and screenshots in `STATUS.md`.

> **Stage 3 Task 4 is DONE — 2026-08-13.** A new, calm single-viewport About Me intro
> (portrait, name, placeholder bio, five fact chips) inserted between the hero and
> Timeline — **replacing `.bio-section` entirely**, not added alongside it.
>
> **The `#about`/id collision this task flagged was real** — the old `about.jsx`
> wrapped both bio and work-experience under one `id="about"`. Resolved as
> recommended: `id="about"` is now this new intro card; work-experience moved to its
> own file, `timeline.jsx`, with its own `id="timeline"`. Nav order updated in the
> single `SECTIONS` source (`lib/sections.js`): Home → About Me → Timeline → My Taste
> → Projects → Let's Connect.
>
> **B3 re-verified for all six sections empirically, not assumed** — clicked every
> nav link fresh and measured landing position. All five non-home sections clear the
> 144px navbar by the same ~25-29px B3 established; the blanket `scroll-margin-top`
> rule needed no per-section change. B1/B2 also unchanged (17.03:1 dark / 17.44:1
> light; 12.99:1).
>
> **No Tabler icon library exists anywhere in this project** — not just missing a
> guitar glyph, checked and there is no icon dependency at all. Five chip icons are
> hand-drawn inline SVGs instead, matching `turntable.jsx`'s existing icon convention
> rather than adding a dependency for five glyphs.
>
> **Both animations go through `gsap.matchMedia()`, as specified** — the entrance
> (`ScrollTrigger` `once: true`, portrait wipe then name→bio→chips cascading on
> explicit `">+=0.25"`/`">+=0.3"` timeline positions, verified by sampling the
> sequence every 100ms) and the idle tilt (`pointer:fine` + `no-preference` combined
> in one query, `gsap.quickTo()`, ±8°).
>
> **A real GSAP bug, found and fixed:** two `quickTo()` calls writing `rotateX`/
> `rotateY` directly onto one element silently no-op'd (console warning: "not
> eligible for reset") — the browser's native independent `rotate` CSS property
> can't take two separate writers on its two axes. Fixed by routing `quickTo` through
> a plain proxy object, combining both axes into one `gsap.set()` call. Caught by
> tracing actual `getComputedStyle()` transforms, not by the absence of a thrown
> error. Full writeup, verification numbers and screenshots in `STATUS.md`.

> **Stage 3 Task 5 is DONE — 2026-08-13.** Three fixes to the About Me intro Task 4
> shipped.
>
> **The scroll fix did NOT end up using `pin` — the brief's own literal
> suggestion — after testing showed it couldn't satisfy the brief's own requirement.**
> A fixed pin distance can't be both short (so a normal scroll doesn't feel stuck)
> and reliable (so a fast flick can't still clear it), and patching that with a
> position clamp fought Lenis's own in-flight scroll target closely enough to
> reproducibly leave the section stuck `position: fixed` under specific frame timing
> — found more than once across three patch attempts before the mechanism was
> replaced rather than patched further. Shipped version holds *scroll input itself*
> (`lenis.stop()`/`start()` for wheel, a non-passive `touchmove` block for touch —
> checked that this project's `syncTouch: false` Lenis config means touch scroll is
> native and unaffected by `lenis.stop()` alone before relying on either mechanism —
> plus a `keydown` block) rather than reacting to scroll position after the fact.
> Verified across six input speeds/devices, including a real CDP touch session (not
> synthetic JS events, which Chromium ignores as untrusted for native scroll). Full
> reasoning and results in `STATUS.md` and `FINDINGS.md` (B13).
>
> **A second bug found by the same testing pass, fixed before it ever shipped:** a
> nav click straight to Timeline scrolls through `#about` en route and would have
> been held captive for the whole entrance without a check. Fixed with a small
> pub/sub in `lib/scroll.js` — `isProgrammaticScrollActive()` /
> `onProgrammaticScrollChange()` — set around `scrollToSection()`'s own
> `lenis.scrollTo()` call. `FINDINGS.md` B14.
>
> **Photo path answered and documented in `STATUS.md`, not just chat, per the
> brief:** `client/src/assets/diego.png`, overwriting the existing file — already
> the exact path `about.jsx` imports, so no code change needed. Confirmed this
> matches the convention Timeline's own non-placeholder photos already use (flat in
> `assets/`, not the `assets/about/` placeholder subfolder).
>
> **Location chip split as specified** — "Lima → Chicago" (one chip implying a
> direct move, silently dropping the Rutgers/New Jersey years between) replaced by
> "From Lima, Peru" and "Based in Chicago" (two independent facts), two new
> hand-drawn SVG icons matching the existing five-icon convention.

> **Task 5 follow-up, same day — live feedback surfaced a bug B13's own test suite
> hadn't caught.** The scroll-hold's `start: "top top"` ignored the fixed navbar
> entirely (unlike every other anchor on the site, which respects
> `var(--scroll-offset)`) — invisible with the small 240px portrait, real once the
> portrait grew and its top edge was landing genuinely behind the navbar. Fixed
> properly (reads the same resolved offset Lenis's own `scrollTo()` uses), not
> patched around. `FINDINGS.md` B15. Also this session: the real portrait dropped
> in (`diego.jpg` — JPEG, not the `.png` this task originally specified, once an
> actual photograph made the size difference concrete), sized substantially bigger
> and un-circled per direct feedback, and Timeline's panels shrunk ~25% end to end
> (`min-height` and inter-panel gap both cut) after feedback that it read as
> oversized. Full numbers in `STATUS.md`.

> **Stage 3 Task 7 is DONE — 2026-08-14.** Timeline rebuilt entirely as
> `experience.jsx`/`id="experience"` — a compact, alternating two-column spine
> layout (six entries either side of a central drawn line) replacing the full-bleed
> scroll-revealed panels, meant to read as one ~1.1s entrance beat rather than
> unfold over a long scroll. Renamed Timeline → Experience everywhere (file, id,
> nav label, every internal comment) since the section covers education and
> coaching, not just jobs.
>
> Four Club GreenSock plugins registered (`DrawSVGPlugin`, `CustomEase`,
> `MotionPathPlugin`, `ScrambleTextPlugin`) — confirmed directly against
> `node_modules/gsap` rather than trusting the brief's own "per Task 4's confirmed
> access" premise, which didn't match anything in this file; the underlying fact
> held anyway (GSAP went fully free in 2025). One `CustomEase` curve
> (`SIGNATURE_EASE`, `lib/gsap.js`) now backs both Experience's card stagger AND
> About's entire entrance, retrofitted — one motion signature instead of two
> sections each picking their own stock ease.
>
> **Rutgers shows 2021 (start year), not 2025 — flagged per the brief's own
> request**, for two reasons: it matches the brief's own CodeWiz decision (also
> multi-year, also shown by start year), and it's the only choice that keeps the
> spine's six badges monotonically increasing top to bottom, which is what makes a
> vertical timeline readable at a glance in the first place.
>
> FIT measured, not eyeballed: 1.13× one screen at 1440×900, 1.25× at 1280×800,
> 1.04× at 390×844 (mobile) — tightened down from an initial 1.35×/1.46×/1.04× pass
> by cutting thumbnail size and per-item padding specifically, not caption text.
> Two implementation bugs found and fixed in testing before ship — `FINDINGS.md`
> B18 (connector fell short of the card, two independently-picked spacing tokens
> for one gap), B19 (Capgemini's client badge overflowed the mobile thumbnail).
> B1/B2/B3 and the Capgemini badge re-verified after the rebuild. Full numbers in
> `STATUS.md`.

> **Stage 3 Task 8 was started, then superseded mid-task by Task 9 — 2026-08-14.**
> Bigger images, hover/focus captions, and an entrance-pin were implemented (and a
> real mobile clipping bug found and fixed), but live feedback — "images too
> small... doesn't look centered" — plus the entrance-pin's own safety net almost
> never engaging at standard viewport heights (Task 7's vertical layout already
> ran past one screen before Task 8 grew anything) meant the vertical shape itself
> needed to go, not just be re-tuned again. Never shipped as its own commit.

> **Stage 3 Task 9 is DONE — 2026-08-14.** Experience rebuilt AGAIN, this time as
> a pinned, horizontally-scrubbed filmstrip — replaces Task 7/8's vertical
> alternating spine entirely. A fixed-footprint pin maps vertical scroll to
> horizontal track motion (`scrub: 0.3`), removing the coupling that made "bigger
> photos" and "fits one screen" incompatible in a stacked-row layout: six entries
> now cost the same vertical space as one, regardless of image size. Same four
> plugins as Task 7 (DrawSVG/CustomEase/MotionPath/ScrambleText), now driving a
> horizontal self-drawing rail + accent dot scrubbed in sync with scroll position
> itself, not time. Center-focus emphasis (scale/opacity falloff by distance from
> viewport center) reconciles "images loud" with a fixed footprint — only the
> active card needs to be large at any moment. Two-tier captions: year always
> visible, role+caption automatic on the active card (works identically on touch,
> no hover required) plus a hover/focus peek on any card as a bonus. Reduced
> motion gets a genuinely different, non-scrubbed plain list, not the same
> component with effects removed.
>
> Three real bugs found and fixed before/during ship (`FINDINGS.md` B20-B22): the
> scrub didn't scrub at all at first (a mis-wired ScrollTrigger/timeline pairing —
> the pin worked, scrub silently didn't, autoplaying to its end instantly);
> tabbing to an off-screen card fought the pin via the browser's own native
> scroll-into-view heuristic; and live feedback ("doesn't look centered on my
> MacBook 13-inch M2") led to a first fix attempt that froze scrolling entirely
> (a Lenis `scrollTo` correction re-entering its own scroll handling from inside
> a live scrub), reverted in favor of an entry-buffer approach that never touches
> real scroll position. Centering re-verified at three real MacBook-class
> viewports (0.02px off true center at each). Touch verified with real CDP
> dispatched touch events, not a scroll proxy. B1/B2/B3 and the Capgemini badge
> re-verified — B18/B19 (Task 7's connector/badge bugs) no longer apply, that
> layout is gone. Full numbers and screenshots in `STATUS.md`.
>
> **Live feedback since, both outside the Task 9 ship date:** **B29
> (2026-08-15, `STATUS.md`'s own dated entry)** — `.experience-title` overlapped
> the cards on real (not exotic) short windowed-browser heights, up to 55px at
> some sizes; root cause was the viewport being absolutely centered against the
> section's TOTAL height, blind to the title sitting above it. Fixed
> structurally: `.experience-section` became a flex column (title, then a
> `.experience-viewport-shell` spacer absorbing whatever's actually left), so a
> section-center offset can never land above the title's own real flow height
> again. **Then (2026-08-17):** "move it a bit higher, title and slideshow" —
> the section's own top padding trimmed a token-step, and the shell's centering
> replaced with an asymmetric 0.35/0.65 flex-grow split (reusing About's own
> `TOP_BIAS` reasoning: true mathematical centering under a fixed navbar reads
> as lower than intended). flex-grow, not a fixed offset, so it can't
> reintroduce B29's overlap on a short window — re-verified across
> 900/800/700/660/600px. Both fixes' full writeups: `STATUS.md`'s own dated
> entries (`FINDINGS.md` B29 for the first).

> **Stage 3 Task 10 is DONE — 2026-08-18.** `#projects` refined: B11 (a dead
> slideshow-era rule sizing the list's title at 40px) and three orphaned
> rules deleted, content column reconciled to `--content-width`, title
> moved onto `@mixin section-title`. The open/close swap is now coordinated
> by real GSAP `Flip` (this codebase's first use of the plugin) instead of
> two unrelated instant state changes; entrance is a plain `ScrollTrigger`
> reveal, no pin/scrub; hover gained a left accent edge. `#connect` is now
> the only section left in this stage's original sequence. Two regressions
> introduced and caught in the same pass (a `box-sizing` mobile overflow, a
> previously-invisible hover `scale` that started clipping text once Flip
> needed `overflow: hidden`) plus one fixed in shared test infrastructure
> rather than the site (`capture-screenshots.mjs` could permanently trap a
> capture inside About's scroll-hold) — full writeups `FINDINGS.md`
> B33/B34/D14, `STATUS.md`'s own dated entry.

> **Stage 3 Task 10.1 is DONE — 2026-08-19.** Follow-up fixing the Flip
> swap's own feel. Live per-frame tracing found the real causes weren't
> either of the brief's own two guesses (duration/ease were already
> explicit, just the wrong values; `getState()` was already whole-list
> scoped) — instead, one was a Playwright test artifact (auto-scroll before
> click, never visible to a real visitor) and one a genuine race:
> `Flip.from()`'s "after" measurement runs synchronously before a
> newly-mounted `<video>`'s real size has settled, so the row animated
> toward a stale, too-small target and snapped the instant the tween
> released. Fixed with the mockup's own `duration: 0.4`/`ease:
> "power2.inOut"`, `absolute: true`, and each video's real encoded
> dimensions as HTML `width`/`height` attributes — the change that actually
> closed the race, since it reserves correct space before the resource
> loads rather than after. Full writeup: `FINDINGS.md` B35, `STATUS.md`'s
> own dated entry.

> **Stage 3 Task 11 is DONE (1 of 2) — 2026-08-19.** `#connect`'s contact
> form got client-side message validation (inline error, no native alert)
> and a `data-state` container hook for a future animation pass — Task 2,
> landed 2026-08-21 as Task 11.2, below. Found along the way:
> `RESEND_API_KEY` is already live on Railway, contradicting both this
> file's own outstanding-tasks list and the task brief itself, which both
> assumed the form still 503s — corrected in `STATUS.md`, logged as
> `FINDINGS.md` D15. The separate design-system token pass for `#connect`
> (below) is still unstarted.

> **Stage 3 Task 10.2 is DONE — 2026-08-20.** `#projects`' expanded rows now
> scroll into view when they don't already fit, skipping entirely when they
> do. The scrolling logic itself was the easy part — the real work was
> diagnosing a browser-native `window.scrollY` adjustment this app doesn't
> cause and couldn't intercept (every JS scroll call, `overflow-anchor`,
> focus-follow, and `useHashScroll` ruled out live, cause still unidentified
> — `FINDINGS.md` D16), which made a delta computed upfront and fired
> alongside `Flip.from()` unreliable. Redesigned to measure the real final
> position after everything settles and correct only if still needed. Also
> found and fixed: `.portfolio-list` had no explicit height, so `absolute:
> true` (Task 10.1) collapsed it to 0px for the whole tween, shifting
> `#connect` and the footer with it (`FINDINGS.md` B36). Worth checking D16
> against before `#my-taste`'s own Task 5 below, the next place a
> Flip-driven layout change is likely to reorder content near the viewport
> edge.

> **Stage 3 Task 11.2 is DONE — 2026-08-21.** `#connect`'s own scroll-hold
> entry pin, closing out the pair Task 11 opened (Task 2 of 2, numbered as a
> decimal follow-up rather than a new top-level item, same convention as
> 10.1/10.2). Brief grouped `#experience` with `#my-taste` as sharing one
> pin pattern; re-read both live and they don't — `#experience`'s pin stays
> engaged for its whole scrub-driven scroll-through with no release-on-
> complete moment, `#my-taste`'s (tracing back to About's own Task 5) is the
> one that actually holds briefly and releases from its timeline's
> `onComplete` — built against that pattern instead. SplitText cascade
> (title → description → compose box), gated behind
> `prefers-reduced-motion: no-preference` only — nothing needed a separate
> reduced-motion branch, since nothing here is hidden by CSS by default.
> Two real bugs found live: `.contact-section`'s plain `min-height: 100vh`
> would have silently defeated the pin's own safety-net height check on
> every viewport, unlike `#about`'s navbar-aware `calc()` (`FINDINGS.md`
> B37); and About/My Taste's overshoot-correction, copied verbatim, turned
> out to unpin this specific trigger and produce a real ~200px visible jump
> right as the hold engaged — dropped once tracing showed nothing here
> reads `self.progress` for it to protect (`FINDINGS.md` B38). Verified
> live: fresh nav into `#connect`, fresh-reload-then-immediate-scroll (B30
> regression check), scroll back up past it, and a second pass through it
> (should not re-hold) — all clean, zero console errors.

> **Stage 3 Task 12 is DONE — 2026-08-21.** `#connect`'s send-success
> walkman — a separate later brief, numbered as a fresh top-level item since
> it's new functionality on top of an already-complete Task 11.2, not a
> fix/extension of it. Cassette-shaped message field (new this task) flies
> via GSAP Flip into a walkman's bay on send success, the walkman takes over
> the section (scaled + centered over a section-scoped scrim, lid-snap via
> CustomBounce, looping EQ/cord, a ScrambleTextPlugin LCD readout through a
> self-hosted DSEG7 font's ghost/lit segment layers), then settles back into
> normal in-flow content; a second send in the same session reuses the same
> walkman rather than popping in again. Two real bugs found and fixed live
> (`FINDINGS.md` B39) — a stray CSS default (`.walkman`'s own permanent
> `transform: scale(0.5)`) fought the settle animation's `clearProps`,
> sticking the settled walkman at half size. One pre-existing, unrelated bug
> found while regression-testing and flagged, not fixed (`FINDINGS.md` D17):
> an intermittent React crash in `#my-taste`'s `AvatarSlot`, confirmed
> present before this task too via `git stash`. Verified live: full pop-in
> -> flight -> lid-snap -> scrim -> scale-up -> scramble -> settle sequence
> traced via computed styles; a second send confirmed to skip the pop-in and
> reuse the loop; reduced motion confirmed instant/static; a failed send
> confirmed the walkman never renders; scroll-away-and-back confirmed the
> settled walkman keeps looping without duplicating; the takeover's own
> scale cap confirmed zero overflow at both 1440px and 390px (the narrowest
> currently-supported width).

> **Stage 3 Task 12.1 is DONE — 2026-08-23.** A decimal follow-up fixing/
> refining Task 12's own walkman feature, not new functionality. Name/email
> combined into one compact 2-column row (input height 44px -> 36px,
> measured via `git stash` before/after); the cassette's reel-window chrome
> shrunk and dimmed (30px -> 18px, `opacity: 0.55`) so it reads as quiet
> shell decoration rather than competing with the text, while the textarea
> gained more padding and `.about-me-bio`'s own `line-height: 1.6` (net:
> cassette height 198px -> 160.78px despite the extra room to read). Of
> three reported walkman bugs, one was real and fixed: the LCD's box/font
> were sized for a 12-character word, and DSEG7 Classic's T/N/K glyphs
> render illegibly at this size regardless — `"THANK YOU!"` and `"THANKS"`
> were screenshotted and rejected before landing on `"CHEERS!"`
> (`FINDINGS.md` B40). The other two — stale compose text in the DOM after
> a send, and a ~2-second auto-revert — were investigated directly (unique-
> marker DOM dumps across a full two-cycle run; 30+-second holds sampling
> the EQ loop's own transform) and did not reproduce; no code changed for
> either (`FINDINGS.md` D18). Re-hit D17's own pre-existing scroll crash
> once under an aggressive test pace, unrelated to this work, same finding
> as Task 12 — avoided for the rest of verification at a human-like scroll
> pace. `npm run lint` holds at 7 errors/2 warnings, unchanged.

> **Stage 3 Task 12.2 is DONE — 2026-08-23.** A second decimal follow-up on
> Task 12's own feature. Heading "Let's have a coffee talk" -> "Let's
> Connect," the description paragraph and its `mailto:` link removed
> entirely, no replacement copy. Two real bugs found and fixed: the entry
> pin's `ScrollTrigger` had no explicit `end`, defaulting to the trigger's
> own full height and leaving the section pinned for ~938px of dead scroll
> after the reveal had already finished (`FINDINGS.md` B41) — fixed with
> `end: '+=200'`, the same value My Taste's own pin (the pattern this
> section claimed to follow) already uses, dead scroll now ~340px. The
> message textarea rendered 24px wider than its own cassette container
> (`FINDINGS.md` B42) — no global `box-sizing: border-box` reset exists in
> this file, so `width: 100%` plus the textarea's own padding overflowed
> the box; fixed with one line, re-measured to confirm the focus outline
> now sits fully inside the cassette. Both measured directly (scrollY vs.
> the section's own bounding rect; textarea rect vs. cassette rect), not
> assumed from the brief's own description. `npm run lint` holds at 7
> errors/2 warnings; `npm run build` is a net decrease (JS -0.41 kB, CSS
> -0.09 kB) since this pass removed more than it added.

> **Stage 3 Task 12.3 is DONE — 2026-08-23.** A third decimal follow-up on
> Task 12's own feature. Heading now scrambles ("Let's Connect" -> "Thank
> you for reaching out!") to BECOME the confirmation message via
> ScrambleTextPlugin — `.contact-success` (the old separate success block)
> is gone, exactly one message on screen. The brief's reported LCD garbling
> ("ehEEr98") was investigated as a possible scramble/charset bug and
> ruled out empirically (raw DOM text sampled every 100ms, correct and
> stable the whole time); root-caused instead to DSEG7 Classic's own
> glyph substitution for letters that would otherwise collide with digit
> shapes, confirmed by rendering the full alphabet at this size
> (`FINDINGS.md` B43) — LCD now reads "ALL DONE." Walkman's settled size
> grew 260px -> 460px wide (measured centered, zero overflow at 390px);
> its left window gained its own 6-bar `colorwayFor()` visualizer, layered
> over the cassette bay/lid and revealed once the lid seals so it doesn't
> fight Phase 1's own use of that space. "Send another message" is a real
> bordered pill button now (`.experience-date`'s own accent-border recipe
> — the closest existing pattern on a site with no other filled CTA),
> grouped with the walkman in `.walkman-stage`; clicking it returns the
> walkman to fully hidden with every loop/tween killed — a deliberate
> reversal of Task 12's own "stay settled" design, flagged not silently
> changed. One bug found during this task's own verification, not asked
> for but fixed: the confirmation heading could land entirely behind the
> fixed navbar at an ordinary scroll position (`FINDINGS.md` B44) — fixed
> with a new `ensureHeadlineVisible()` that only corrects scroll when
> actually needed. `npm run lint` holds at 7 errors/2 warnings.

> **Stage 3 Task 12.4 is DONE — 2026-08-23.** A fourth decimal follow-up on
> Task 12, prompted by a short ask with an explicit priority: *"remember the
> animation is inserting the message box (cassette) into the walkman... Make
> sure the animation is smooth. That's what we care about the most now."*
> The send sequence was instrumented before being touched — a `requestAnimation
> Frame` sampler recording real rects for the flight clone, walkman, bay,
> heading and scrim on every frame of a real send — which found two defects
> that no screenshot of this feature had ever revealed. **The cassette was
> never landing in the bay** (`FINDINGS.md` B45): the bay's rect was read
> *after* Phase 0's own `scale: 0.5`, so Flip's destination was 108.6x73
> against a real bay of 209.1x138. **And 1050ms of dead air preceded any
> motion at all** (`FINDINGS.md` B46): the heading scramble sits at position
> `0` with a 0.6s duration, so the walkman pop-in — appended with no position
> argument, i.e. `'>'` — silently inherited a 0.6s start and the flight
> chained off that. Both fixed: all rects measured in one block above any
> transforming `gsap.set` (cassette now lands flush, 527.6/354.0 against a bay
> at 527.3/354.1), and every step placed at an explicit absolute position from
> named constants — no relative position strings left in the function. First
> motion 683ms -> **117ms**; click-to-settled ~4.15s -> **2.45s**. The lid now
> actually closes *over* the cassette (the clone dissolves under it instead of
> painting on top of it, and the scale-up waits until it is gone). Takeover
> scale 2.3 -> **1.35** — that multiplier was tuned for a 260px walkman and
> was never revisited when Task 12.3 grew the device to 460px, so it had been
> inflating it to 1058px and back. `.contact-title` was found sitting *behind*
> `.connect-scrim` for the whole hold despite being the send's only
> confirmation message; now `z-index: 8`, and with it legible on top the scrim
> was measured rather than assumed and softened `black 55% -> 40%` (light
> theme 3.73:1 -> **6.18:1**, dark 17.66:1). Both bar rows moved off
> `colorwayFor()`/`--vinyl-N` — two of those pressings are darker than the
> walkman's own case — onto a new fixed `--viz-neon-1..5` family assigned as
> an ordered left-to-right ramp (a hash is right for record pressings, wrong
> for a spectrum analyser), with the left window gaining its own `--lcd-bg`
> panel so the neons hold in both themes. A third `box-sizing` overflow in
> B42's family found and fixed (`.walkman-visualizer` hung 20px past its bay;
> now 0.00px). Layout asks landed too: `.contact-container` padding-top
> `6rem -> 2rem` (block up 64px) and the message textarea `rows` 3 -> 4
> (100 -> 126.4px). One unrelated pre-existing bug recorded but deliberately
> NOT fixed here (`FINDINGS.md` B47): `loading-screen.jsx` throws an uncaught
> `TypeError` on every window resize after the loader finishes. `npm run lint`
> holds at 7 errors/2 warnings.

### Stage 4 — `#my-taste` redesign

**Superseded concept.** This section originally read "top artists as records, top
tracks as a crate, reusing the hero's sleeve component." That's replaced —
`#my-taste` is being rebuilt as a **festival-lineup poster** instead: a headliner
(top artist), four support acts, and a five-track setlist, styled like a gig
poster — torn-edge cards, tape, one display/support/mono type trio. (Originally
also duotoned photos and a grain overlay; both were cut later on direct live
feedback — real photo colors read better than the tint, and the grain read as
static rather than paper texture. See this stage's own task list below for
when.) Held until now for the same reason as before: it depends on both the
design system (Stage 3) and the finished hero components (Stage 1). Note Stage 0's
**B8** only made the old layout *not broken* — this stage replaces it outright.

Split into five small tasks deliberately, not one large one — Experience's own
Stage 3 (Tasks 7→8→9) already paid for the alternative: bundling structural risk
with visual polish meant each rebuild only found its real problem once fully
built and sitting next to everything else. Sequence:

1. **Foundations** — data reshaped into headliner/support/setlist roles, three
   self-hosted typefaces wired (Anton/Oswald/Space Mono, scoped to this section
   only), one real `h2`, `.spotify-section` deleted entirely. No wall, no photos,
   no motion. **DONE 2026-08-15** — `STATUS.md`.
2. **Layout** — the wall geometry: card positions, rotation, overlap. Flat-color
   placeholders, still no real photos. **DONE 2026-08-15** — `STATUS.md`,
   full mechanism writeup in `stage4-my-taste-concept.md`.
2.5. **Fit within one screen** — retrofit of the section's own original "one
   panel, one page" requirement, which never got a checkable target until now.
   Inserted here rather than folded into Task 3, while resizing is still cheap
   (flat placeholders, no locked-in photo crops). **DONE 2026-08-15** —
   `STATUS.md`.
3. **Photography** — real images wired in, duotone tint (`colorwayFor`, already
   exported from `vinyl-record.jsx` in Task 1, not yet consumed), grain, image
   fallback cards. **DONE 2026-08-15** — `STATUS.md`, mechanism writeup in
   `stage4-my-taste-concept.md`.
3.5. **Two columns** — restructure the wall + setlist row into a wall/crate
   side-by-side layout, so section height is `max(wall, crate)` instead of
   their sum. Retrofit, same idea as 2.5 — direct feedback that the shipped
   result still read as "2 pages." **DONE 2026-08-15** — `STATUS.md`,
   mechanism writeup in `stage4-my-taste-concept.md`.
3.6. **Refinement pass** — headliner less dominant, crate simplified back to
   one plain list (Task 3.5's five separate "singles" read too busy), and a
   real bug fix: ~2 in 5 photos were landing on a plain gray duotone wash.
   **DONE 2026-08-15** — `STATUS.md`, mechanism writeup in
   `stage4-my-taste-concept.md`.
3.8. **Spotify link, clickable cards, straighten the setlist** — the kicker
   links out to the real profile, every artist/track card is a real link to
   its own Spotify page, and the crate's rotation/jitter is removed (torn
   edge/tape kept) so it reads straight beside the still-tilted wall.
   **DONE 2026-08-15** — `STATUS.md`, mechanism writeup in
   `stage4-my-taste-concept.md`.
3.7. **Three-zone restructure** — regroups the wall's 1 headliner + 4 uniform
   support cards into 2 "featured" (deliberately identical to each other) +
   3 "secondary" (clearly smaller) — hierarchy from tier membership, not one
   card's raw size. Lands *after* 3.8 despite the lower number (its own
   brief referenced only 3.6). **DONE 2026-08-15, follow-up 2026-08-17** —
   `STATUS.md`, mechanism writeup in `stage4-my-taste-concept.md`.
4. **Motion** — entrance animation, parallax, reduced-motion fallback.
   **DONE 2026-08-17** — `STATUS.md`, mechanism writeup in
   `stage4-my-taste-concept.md`.
3.9. **Profile avatar** — a small circular, duotoned photo of Diego's own
   Spotify profile left of "MY TASTE," a new `GET /api/spotify/profile`
   server route. **DONE 2026-08-17** — `STATUS.md`, mechanism writeup in
   `stage4-my-taste-concept.md`.
4.1. **Sell "pinning," not "bouncing" + zone titles** — refinement pass on
   Task 4's own cascade: pulled back `CustomBounce`'s strength, added a
   deliberate pause before each tape/pin snap, pivoted each card's settle
   around the tape's own anchor, added "MY TOP ARTISTS"/"MY TOP 5 TRACKS"
   zone titles. **DONE 2026-08-17** — `STATUS.md`, mechanism writeup in
   `stage4-my-taste-concept.md`.
5. **Time-range switching** — the UI to flip between Spotify's `time_range`
   values (the server endpoints already accept it), with a `Flip`-powered
   re-rank when the data changes underneath the poster.

> **Update, Task 1 (2026-08-15):** data/typography/skeleton landed. Jumped ahead
> of this file's own prior "next step" recommendation (`#projects`/`#connect`,
> §0 below) — a direct call, not a forced reorder; noted here per the working
> agreement on sequencing deviations. Two real bugs found and fixed in the same
> pass (a flex `min-width: auto` overflow trap, and a third recurrence of the
> `width: 100%` + padding + missing `box-sizing: border-box` bug `.navbar` and
> Experience already have comments about) — full detail in `FINDINGS.md` B25.
> `#projects`/`#connect` are still there, just not next anymore.
>
> **Update, Task 2 (2026-08-15):** wall geometry landed — CSS Grid
> (`grid-template-areas`), overlap structurally impossible by construction,
> additionally verified live (zero overlapping card pairs at 1440/1024/768px).
> Rotation/jitter deterministic per card id via a new `lib/hash.js`, shared
> with `colorwayFor` (both now use one mixing implementation, not two).
> `design-review/stage4-my-taste-concept.md` — the file this task's own brief
> pointed to for prior context — **didn't exist**; written this task instead
> of guessed around, from Tasks 1+2's briefs. Two real bugs found from the
> first screenshot, one in the product (headliner photo placeholder
> near-invisible in dark theme — colorway 1 reused from a context where
> that's correct) and one in this session's own contrast-measurement script
> (`FINDINGS.md` D8's `color(srgb ...)` 0-1-scale notation, parsed as 0-255) —
> full detail in `FINDINGS.md` B26.
>
> **Update, Task 2.5 (2026-08-15):** fit pass landed. Desktop went 1.53× → 1.15×
> one screen (now inside Experience's own achieved 1.13–1.25× band), laptop
> 1.76× → 1.32×, via photo `aspect-ratio` cuts (headliner 4/3→16/9, support
> 1/1→3/2) and tighter card/wall/section spacing — no font-size, track count,
> or grid-architecture changes. Mobile improved (3.59×→2.65×) but stayed the
> worst by far, on purpose — Stage 5 owns mobile art direction; this task's
> only mobile obligation (no horizontal overflow) held, 0px at 320–1440px.
> Re-verified zero card-overlap at 1440/1024/768px with the new, smaller card
> sizes. Full numbers in `STATUS.md`.
>
> **Update, Task 3 (2026-08-15):** real photography landed, additive to Task
> 2's structure — no change to the grid, the rotation/jitter mechanism, or
> Task 2.5's sizes. Real `artist.images[]`/`track.album.images[]`, sized per
> slot (headliner gets Spotify's largest, everything else gets its ≤400px
> middle size, not the full original). Duotone via `grayscale(1) contrast(1.1)`
> plus a `mix-blend-mode: color` layer reusing the exact same `--card-tint`
> Task 2's placeholder used — no second tinting mechanism. `object-fit: cover`
> verified against synthetic non-square sources (real Spotify data turned out
> to be square in every case checked). Grain reused `.record-crate-panel`'s
> own `feTurbulence` recipe rather than a second one. Both fallback paths
> (empty `images[]`, and new this task, a URL that fails to load) verified
> against mocked API traffic, landing on the identical flat-tint treatment.
> Task 2's colorway-1 border fix explicitly re-evaluated per the brief's own
> instruction — **kept**, since the new broken-image fallback lands on the
> exact flat fill that fix was for, even though real photos removed the
> original problem from the happy path. Fit ratio re-run, unchanged (1.15×
> desktop) — predicted, since the photo/tint layers sit outside layout flow.
> No new product bugs found this task. Full detail in `FINDINGS.md` B26's own
> update and `STATUS.md`.
>
> **Update, Task 3.5 (2026-08-15):** restructured into two columns — the wall
> (headliner + support, unchanged mechanism) beside a new crate column of 5
> small torn "singles" (one per track, all now carrying album art, replacing
> Task 3's 3-thumbnail-plus-list-rows shape). Desktop **1.15× → 1.02×** one
> screen, laptop **1.32× → 1.18×** — a structural fix, the same category of
> move as Experience's own Task 7/8→9 (tuning a paradigm's sizes vs. replacing
> the paradigm). Singles reuse the wall's own rotation/jitter/tear/tape
> mechanism and Task 3's `PhotoSlot` unchanged, just applied to a new card
> shape — their own overlap-margin recomputed for that shape's very different
> (wide, short) proportions, and re-verified live: zero overlap in either
> column at 1440/1024/768px. A real bug found and fixed: nesting the wall
> inside a grid *track* instead of a block-level parent reintroduced the
> `min-width: auto`-family trap (`FINDINGS.md` B25's own pattern, at the grid
> level this time) — 37-107px of horizontal overflow at 390/320px that didn't
> exist before this task, fixed with `minmax(0, ...)` tracks, re-verified 0px
> at all 8 widths down to 320px. Mobile fit got worse on purpose (2.65× →
> 3.01×) — the crate adds its own stacked elements below the wall at narrow
> widths, explicitly Stage 5's problem to solve, not this task's. Full detail
> in `STATUS.md`.
>
> **Update, Task 3.6 (2026-08-15):** refinement pass, not structural — three
> direct pieces of feedback. Headliner dominance cut via the name's own
> `font-size` only (reverted to Task 2's original clamp value); tried cutting
> the photo `aspect-ratio` too but measured it had **zero effect** — the
> wall's height turned out to be set by the support cards' own wrapped names
> ("Red Hot Chili Peppers" → 3 lines), not the headliner, a pre-existing
> condition from Task 3.5, left alone as outside this task's scope. Crate
> reverted from Task 3.5's five individually torn "singles" back to one plain
> numbered list (checked Task 3's original implementation first, reused most
> of it) — direct feedback the singles read too busy. Real bug fixed:
> `colorwayFor`'s two near-neutral tokens (correct for real vinyl) were
> washing ~2 in 5 photos plain gray; fixed with a new `photoColorwayFor`
> restricted to 3 colored tokens, sharing the same hash, `colorwayFor` itself
> untouched — full detail in `FINDINGS.md` B27. A second real bug, introduced
> and fixed within this same task: an explicit `width: 100%` on the setlist
> card overflowed 8-11px at 1024/768px specifically (`FINDINGS.md` B28) — a
> fourth occurrence of the `width: 100%` + margin/padding class of bug this
> codebase keeps re-finding. Fit ratio dropped to **0.72×** desktop (from
> 1.02×) — not a regression: the crate's own height fell because simplifying
> 5 cards to 1 removes real overhead, and the wall's height was never
> touched by this task at all. Under 1.0× means comfortable room to spare,
> not a failure of "fits in one screen." Full detail in `STATUS.md`.
>
> **Update, Task 3.8 (2026-08-15):** brief called itself a follow-up to "Task
> 3.7's three-zone structure" — no such task exists in this repo's history;
> checked against the tree and flagged rather than guessed around (the three
> asks mapped cleanly onto the real two-column wall/crate structure anyway).
> Polish pass, no structural change. Kicker replaced with a real outbound
> link to the site's actual Spotify profile (reused from `footer.jsx`, not
> invented) plus its icon, theme-swapped, used as-is per Spotify's own brand
> guidelines rather than run through this section's duotone treatment. Every
> artist card and setlist track is now a real `<a>` to its own
> `external_urls.spotify` (verified live against the real API, not assumed —
> spot-checked all 10 hrefs against raw payload data), with a visible
> `:focus-visible` outline confirmed by screenshot to read clearly even
> across each card's own torn `clip-path` edge. Crate's rotation/jitter
> removed (`transform: none`, torn edge/tape kept) so it reads as a straight
> list beside the wall's still-tilted cards, confirmed live (wall: -2.2° to
> 3.84°, within the original 2-4° band; crate: exactly `none`). No new
> product bugs found this task. Fit ratio unchanged from Task 3.6 (0.72×/
> 0.82×/2.73×) — nothing this task did resizes any element. Full detail in
> `STATUS.md`.
>
> **Update, Task 3.7 (2026-08-15, follow-up 2026-08-17):** regrouped the
> wall's 1 headliner + 4 uniform support cards into 2 "featured" (deliberately
> identical size/treatment to each other) + 3 "secondary" (clearly smaller) —
> hierarchy from tier membership instead of one card's raw size. Lands
> *after* Task 3.8 despite the lower number — this brief referenced only
> Task 3.6, never 3.8, so building it on top of 3.8's already-shipped links/
> straightened crate is a superset of the ask, not a conflict; noted rather
> than silently reordered. Grid moved from 4 columns (headliner 2×2 + four
> 1×1 support cells) to 6 columns (featured pair at 3×2 each, secondary trio
> at 2×1 each) — 6 divides evenly by both 2 and 3. Removed 5 now-dead
> `grid-area` CSS rules found in the process (`TasteCard` already sets
> `gridArea` as an inline style, which always wins the cascade). Measured
> the actual size gap, not just relabeled it: old headliner:support ratio
> 4.77:1 by real rendered area.
>
> **Follow-up, same task, two days later:** a live report re-sent this same
> brief describing "a large unused vertical gap between the headliner and
> the first support card" — stale terminology (the task had already
> shipped) but a real, still-present bug once translated: 139px of dead
> space under every featured card's own name, caused by an unverified
> `grid-template-rows` minimum copied straight from the old headliner block
> without checking it against the new card's actual content height. Fixed
> by dropping that minimum from 180px to 90px per row — dead space fell to
> 8px (the card's own intentional padding). This corrected the fit-ratio
> numbers this task originally reported: desktop 0.94× → **0.77×**, laptop
> 1.09× → **0.89×**, both now comfortably under one screen (laptop no
> longer overshoots at all) — the genuine "use the headroom" result (the
> featured pair still as wide as the old single headliner, now ×2) survives
> fully intact; the higher numbers were just partly inflated by the bug.
> Real featured:secondary area ratio, corrected: ~1.8:1, still a noticeably
> smaller gap than the old 4.77:1. Zero overlap, zero overflow, zero
> console errors, all of Task 3.8's own links/focus/rotation re-verified
> unchanged, both before and after the fix. Full detail in `STATUS.md`.
>
> **Update, Task 4 (2026-08-17):** entrance motion landed — no layout/grid
> change, confirmed against the tree first. A `ScrollTrigger` pin (reusing
> Experience's own `pin: true`) holds the section for a timed ~2.1s while a
> single non-scrubbed timeline cascades kicker → wall cards → crate;
> `CustomBounce`/`CustomWiggle` newly registered in `lib/gsap.js` (confirmed
> present in the installed `gsap` package first), one `MotionPathPlugin` arc
> on the first card. Real scroll input held via `lenis.stop()`/`start()` —
> About's own Task 5 hold mechanism, not a scrub — because the cascade runs
> on its own clock, not tied to scroll distance the way Experience's
> filmstrip is. Two things the brief described that don't exist in this
> file: a Task 3.9 profile avatar (checked against git log/this file/
> `STATUS.md` — never shipped, flagged as its own open item) and a "MY TOP 5
> TRACKS" crate label (no such element has ever existed here). Deliberately
> skipped below 601px, not named in this task's own scope but the same
> reasoning Tasks 3.7/3.8 already used for mobile applies more sharply here:
> pinning a section at mobile's own 2.68× fit ratio would hold a visitor
> captive against mostly-cut-off content. One real bug found and fixed
> during the build (not shipped and found later): `end: "+=1"` on the pin
> let fast scroll momentum cross the whole start-to-end span in a single
> update tick, so the pin never visually engaged — fixed with `end: "+=200"`,
> the same order of magnitude as Experience's own `ENTRY_BUFFER`. Verified
> pin engage/release via the section's own `getBoundingClientRect().top`
> staying constant under continued scroll input then moving again once
> released, since `getComputedStyle().position` reads `"relative"` the whole
> time here (GSAP's Lenis-aware pin uses transform-based pinning, not
> `position: fixed`) — the wrong signal to check, found live. Full detail in
> `STATUS.md`.
>
> **Update, Task 3.9 (2026-08-17):** the kicker's own avatar landed —
> Diego's real Spotify profile photo, a new `GET /api/spotify/profile`
> route reusing the same auth/cache mechanism as the two top-items routes.
> Scope checked live against the real refresh token before writing any
> frontend code (`user-top-read`, the existing scope, turned out to already
> cover `/me`'s `images[]` — confirmed, not assumed, nothing to report as a
> blocked finding). Same duotone treatment as every other photo in this
> section, tried first per the brief and kept. One real regression caught
> in the same pass: the avatar's own width broke the kicker's mobile
> single-line fit, wrapping "MY TASTE" mid-word at 390px — fixed with
> `flex-wrap: wrap` + `white-space: nowrap` on the kicker link, now wraps as
> two clean whole-chunk lines instead. Fit ratio (landed alongside Task 4.1,
> below, measured together): desktop 0.83×, laptop 0.95×, mobile 2.80×.
>
> **Update, Task 4.1 (2026-08-17):** refinement pass on Task 4's own
> cascade, not a rebuild — the pin mechanism itself untouched. Sampled
> `CustomBounce`'s own eased output directly rather than guessing why live
> feedback called the landing "generic bounce": pulled `strength` back from
> 0.6 to 0.3 (and `squash` from 2 to 1) so each card touches its target once
> with one shallow dip instead of three visible bounces. Added a deliberate
> 0.15s pause before each tape/pin snap (was firing the instant the card's
> own land tween finished) — verified via a real frame-sequence capture
> that the two beats read as separate on screen, not just separated by a
> number. Each card's settle now pivots around the tape's own anchor point
> (`transform-origin: 50% 0%`) instead of the card's center, rotating from
> level into its real tilt as it lands. Added "MY TOP ARTISTS"/"MY TOP 5
> TRACKS" zone titles above the wall/crate, each with the kicker's own
> `SplitText` pop, requiring a new title+content wrapper around each column
> (`.my-taste-layout`'s own grid needed no changes). Also ran Task 3.9 for
> real after a follow-up brief claimed its file "was already written
> earlier and simply never run" — checked against the tree, no such file
> existed anywhere; built it for real instead of searching for one that was
> never going to exist. Timeline duration grew from ~2.1s to ~2.76s, stated
> plainly rather than forced back down by cutting the pacing this task
> itself asked for. Full detail in `STATUS.md`.

### Stage 5 — Mobile

Deliberately deferred, per `STATUS.md`: the mobile treatment falls out of the layout,
so building it before the redesign means building it twice. (Note B4 is *not*
deferred — navigation existing at all is a Stage 0 bug, separate from mobile polish.)

### Stage 6 — Turntable delight *(Phases 8, 9, 10)*

- **9** Pitch fader — ±8% `playbackRate`, `preservesPitch = false` *(~1 hour)*
- **10** Scroll-linked ducking + persistent mute *(depends on Stages 1 and 2)*
- **8** Scratch — `Draggable(type:"rotation")` + `InertiaPlugin` *(hardest, pure delight, last)*

### Stage 7 — The WOW layer

Everything here depends on the `AnalyserNode` exposed in Stage 1 — **and on the decode
path verified at the start of that stage.**

The unifying idea: **the visitor's chosen record drives visuals across the whole
site.** They pick a song in the hero; its frequency data animates the waveform under
the name, pulses section transitions, drives the `#my-taste` visualizer. One choice at
the top makes the entire scroll reactive to *their* taste meeting Diego's.

- ~~Audio-reactive waveform in the reserved `.hero-vu-slot`~~ — **done, and not
  this way.** The slot was deleted in 7a; the hero background is now a full-bleed
  skyline spectrum (`.hero-skyline-canvas`), which does the same job across the
  whole hero rather than in a 40–50px strip. Nothing will ever render in that slot
- `#my-taste` frequency visualizer
- `#projects` as a horizontal `ScrollTrigger`-pinned record crate
- A continuous waveform line connecting sections as the transition language

### Stage 8 — Remaining polish

Accessibility (`FINDINGS.md` §6): theme-toggle `aria-label`, hamburger as a real
`<button>`, single `<h1>`, skip-link. Clear the 16 ESLint errors. Animated theme
toggle. Consider a `.git` history rewrite — grown to **177MB** as of 2026-08-17
(re-measured, `STATUS.md` §3 — was 91MB when the ~5MB reclaim estimate below was
made; this session alone added many commits with binary screenshot diffs, each a
new object in history regardless of a PNG's own current file size). The ~5MB
post-rewrite estimate itself hasn't been re-verified against the new baseline —
treat it as a rough floor, not a re-confirmed number.

A second, stronger reason for that same history rewrite showed up 2026-08-17
(`STATUS.md`'s own dated entry): the resume PDF was removed from the working tree and
`.gitignore`'d, but it's still fully recoverable from git history (one commit, `8030639`)
until the history is actually rewritten — `.gitignore` alone doesn't retroactively hide
it. Not done automatically (force-push, rewrites every commit SHA after that point,
breaks any existing clone/fork) — flagged for whenever this stage is picked up, sooner
if the privacy concern outweighs waiting for the size cleanup to be worth doing together.

---

### Stage 9 — minimal Postgres logging *(2026-08-25, built same day, out of sequence)*

Not part of the original stage order — raised by live feedback mid-Stage-8 and
built immediately on explicit instruction, rather than queued behind the rest
of Stage 8's polish items. Noted here so the sequence isn't misread as having
been planned in advance.

Three tables, owner-only, no public UI: `plays` (record selected from the
crate — resume-from-pause explicitly excluded), `search_clicks` (only the
click that picks a result, never a debounced keystroke), `messages` (every
contact-form attempt, delivered or not). No raw IP stored anywhere — a
cookieless visitor hash (`sha256(ip+UA+day)`, truncated), Cloudflare's own
`CF-IPCountry` header, and a UA-regex device/browser guess. `DATABASE_URL` is
a Railway reference variable to the `Postgres` service already in this
project, resolving to its private network address — no code path requires it
to exist, so local dev is unaffected either way. Full writeup, including why
the play/resume distinction reuses `skyline-background.jsx`'s own edge
condition rather than hooking the crate's click handler:
`STATUS.md`'s own dated entry.

A public "what's been played" panel was discussed and deliberately **not**
built — flagged for later, with the one real constraint already written down:
raw search terms must never be the thing rendered back to visitors of a live
job-search site; a public view would read from `plays` alone.

---

## 4. Standing manual tasks

Not code. See `STATUS.md` §4 for the full list. Highest priority:

- **Set `RESEND_API_KEY`** on the Railway server service — contact form returns 503 until then.
- **Revoke the Gmail app password** and delete `SMTP_USER`/`SMTP_PASS` from
  `server/.env` and Railway.

> **Correction to an earlier draft of this roadmap:** it listed "rotate the Spotify
> client secret — long outstanding." That was **already completed on 2026-08-05**
> (root `README.md`, Standing action items): the secret was rotated and migrated to
> the new env vars. No action needed.

---

## 5. Working agreement

- Commit after each stage. Nothing sits uncommitted across stages.
- Re-capture `screenshots/` after any visual change and diff against the previous set.
- Update `STATUS.md` (what shipped) and `FINDINGS.md` (what that resolved or revealed)
  when a stage lands. These files are the project's durable memory.
