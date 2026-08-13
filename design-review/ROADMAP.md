# Roadmap — diegodamian.com

**Written:** 2026-08-08 · Companion to [`FINDINGS.md`](./FINDINGS.md) (what's wrong)
and [`STATUS.md`](./STATUS.md) (where things stand).

This file answers the open questions in `FINDINGS.md` §8 and **supersedes the
sequencing in `STATUS.md` §5 and `FINDINGS.md` §9.** Read this one for order of work.

Like the others, it is written to be self-contained — assume any chat reading it
starts from zero.

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
- **B5** `client/.env` missing URL scheme, breaks local `#my-taste`
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

### Stage 4 — `#my-taste` redesign

The one section that gets the material language. Top artists as records, top tracks
as a crate, reusing the hero's sleeve component.

Held until now because it depends on both the design system (Stage 3) and the
finished hero components (Stage 1). Note Stage 0's **B8** only makes the current
layout *not broken* — this stage replaces it.

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

- Audio-reactive waveform in the reserved `.hero-vu-slot` *(already present in
  `home.jsx` and styled in `main.scss` — the slot exists and is empty)*
- `#my-taste` frequency visualizer
- `#projects` as a horizontal `ScrollTrigger`-pinned record crate
- A continuous waveform line connecting sections as the transition language

### Stage 8 — Remaining polish

Accessibility (`FINDINGS.md` §6): theme-toggle `aria-label`, hamburger as a real
`<button>`, single `<h1>`, skip-link. Clear the 16 ESLint errors. Animated theme
toggle. Consider a `.git` history rewrite (91MB → ~5MB).

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
