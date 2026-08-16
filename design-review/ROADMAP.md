# Roadmap — diegodamian.com

**Written:** 2026-08-08 · Companion to [`FINDINGS.md`](./FINDINGS.md) (what's wrong)
and [`STATUS.md`](./STATUS.md) (where things stand).

This file answers the open questions in `FINDINGS.md` §8 and **supersedes the
sequencing in `STATUS.md` §5 and `FINDINGS.md` §9.** Read this one for order of work.

Like the others, it is written to be self-contained — assume any chat reading it
starts from zero.

---

## 0. Current state — quick summary *(updated 2026-08-15)*

For anyone opening this file cold: the detailed stage-by-stage record below (§3)
is the source of truth, but it's long. This section is the fast version —
what's shipped, what's next, what's still sitting on the shelf.

**Shipped and done:** Stage 0 (every launch-blocking bug), Stage 1 (the
turntable actually plays audio), Stage 2 (Lenis/ScrollTrigger foundation),
and — within Stage 3 — the design system itself plus a full rebuild of
`#about` (intro card + Experience). Experience alone went through three
builds (Tasks 7, 8, 9) chasing "big photos" and "fits on screen" at once;
Task 9's pinned horizontal filmstrip is what actually landed both. Also a
site-wide scroll-feel tuning (Lenis `lerp`) outside any one section, and —
most recently, a live-feedback fix landed outside the Stage 4 sequence
below since it touches an already-"done" section — Experience's title
overlapping its cards on real (not exotic) short windowed-browser heights;
`STATUS.md`/`FINDINGS.md` B29 has the measurements and the structural fix
(a flex-centered spacer replacing a section-blind absolute-center calc).

**Reordered, deliberately:** Stage 4 (`#my-taste`) jumped ahead of finishing
Stage 3's remainder (`#projects`/`#connect`) — this file's own prior "next
step" recommendation. A direct call, not something the repo forced; noted
here per the working agreement on sequencing deviations. `#my-taste`'s
concept also changed: no longer "records as vinyl / tracks as a crate," now
a **festival-lineup poster** (headliner/support/setlist, duotone, torn edges,
grain) — see Stage 4 below for the full 5-task sequence, and
`stage4-my-taste-concept.md` for the concept/mechanism writeup. Tasks 1, 2, a
retrofitted 2.5, 3, a second retrofit at 3.5, a refinement pass at 3.6, and a
polish pass at 3.8 are all done — foundations, wall layout, fit-within-one-
screen, real photography/duotone/grain, a two-column restructure (wall
beside a crate for the setlist), a smaller headliner + simplified crate + a
gray-duotone fix, and now: the whole poster links out to real Spotify pages
(kicker, every artist card, every track) and the crate lost its tilt while
the wall kept its. Desktop still measures **0.72×** one screen — Task 3.8
touched no element's size, only what wraps/rotates it, so Task 3.6's own
numbers carry over unchanged.

**Not started yet, in the order the roadmap currently has them:**

| Stage | What | Depends on |
|---|---|---|
| **4 (remainder)** | `#my-taste` Tasks 4–5: entrance motion, time-range switching | Tasks 1, 2, 2.5, 3, 3.5, 3.6, 3.8 — done |
| **3 (remainder)** | Apply the design system to `#projects` and `#connect` — the same tokens/mixins already used on `#about`, just not applied there yet. This is the rest of Stage 3's own original scope | Nothing — ready now |
| **3 (deferred pass)** | The deck's material pass: dark-theme turntable contrast (D3, 1.15–2.07:1 today), the mat-as-a-ring problem (D12), light-theme deck colour revisit, the weak rim→mat boundary. Bundled together because they interact | Nothing — ready now |
| **5** | Mobile pass | Stages 3/4 landing first, so mobile isn't built twice |
| **6** | Turntable delight — pitch fader, scroll-linked ducking/mute, scratch | Stages 1 + 2 — both done |
| **7** | "WOW layer" — audio-reactive waveform, `#my-taste` visualizer, `#projects` as a pinned record-crate scrub, a waveform transition line | Stage 1's `AnalyserNode` — done |
| **8** | Accessibility (theme-toggle label, single `h1`, skip-link), animated theme toggle, lint cleanup, `.git` history rewrite | Nothing — ready now, always deferred as "polish" |

**Standing manual tasks (not code — need dashboard access), highest priority first:**
1. Set `RESEND_API_KEY` on Railway's server service — the contact form 503s until this lands.
2. Revoke the old Gmail app password; delete `SMTP_USER`/`SMTP_PASS` from `server/.env` and Railway.
3. *(Optional)* Add `send.diegodamian.com` DNS records in Cloudflare to lift the Resend sandbox's own-address-only restriction.
4. Do **not** click the Resend "Confirm email change" email sitting in the inbox — it would move the account off the working address.
5. Recurring: the Spotify refresh token expires roughly every 6 months (root `README.md`).

**My read on immediate next step:** Stage 4 Task 4 (`#my-taste`'s entrance
motion) — the section is now fully built as two columns, real duotoned
photography throughout (no gray photos), every card a real outbound link,
and proven (no-overlap in either column, deterministic, no-overflow down to
320px, both fallback paths verified against real API traffic), so animating
it in is a direct continuation with all the structural and visual risk
already retired. Task 4's own brief should account for the cards now being
real `<a>`s, not inert `<article>`s — noted in `stage4-my-taste-concept.md`
§10's open items. The crate is one setlist card (Task 3.6 reverted Task
3.5's five separate "singles"), so Task 4 has one fewer independent element
to sequence than it would have two tasks ago.
`#projects`/`#connect` haven't gone anywhere and are still the natural
close-out for Stage 3 whenever that's picked back up. Your call either way —
see §3 below for the full stage list.

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

### Stage 4 — `#my-taste` redesign

**Superseded concept.** This section originally read "top artists as records, top
tracks as a crate, reusing the hero's sleeve component." That's replaced —
`#my-taste` is being rebuilt as a **festival-lineup poster** instead: a headliner
(top artist), four support acts, and a five-track setlist, styled like a gig
poster — duotoned photos, torn-edge cards, tape, grain, one display/support/mono
type trio. Held until now for the same reason as before: it depends on both the
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
4. **Motion** — entrance animation, parallax, reduced-motion fallback.
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
