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

### Q4 — Inverted bands? — **Defer to the design-system pass (Stage 3).**

Not a standalone decision. It resolves as part of establishing section rhythm.

> **Interim state, recorded 2026-08-10 — deliberate, not a bug.**
>
> `.work-experience` is currently the **only** inverted section on the site. It used to
> be half of an alternating rhythm; `.project-slideshow-section` was the other half,
> and Q3 deleted it (`4ebaaaf`). So what reads today as a single unexplained light band
> in the middle of a dark page is the *residue of a pattern whose other half is gone*,
> not a section that was designed to stand alone.
>
> It is being left that way **on purpose until Stage 3.** Restoring the rhythm means
> deciding which sections invert and why — exactly the section-rhythm question Q4 defers
> — and guessing at it now would mean redoing it. Stage 0's contrast work (B1/B2) only
> made the existing band *legible*; it took no position on whether the band belongs.
>
> Anyone reviewing the live site before Stage 3 should read that band as a known,
> accepted interim state. See also `FINDINGS.md` **D4** (rhythm) and **D5** (the
> white logo cards inside it, which have the same "decide the treatment first" shape).

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
- **B7** Rutgers logo clipped
- **B8 — `#my-taste` mobile layout is visibly broken.** Verified in
  `my-taste-mobile.png`: track numbers are centered on their own line *above* the
  title rather than beside it, so the number detaches from the track it labels;
  divider rules don't align to the content they separate; and the artist grid
  misaligns whenever a name wraps to two lines, leaving the final item orphaned on
  its own row. Not in the original `FINDINGS.md` list; reads as a rendering bug to
  any visitor.
- **Add a resume/CV link.** Currently absent entirely. For a site whose job is
  converting recruiter attention this is a larger gap than any unfinished animation.

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

`previewUrl` is currently captured from the iTunes search and **thrown away**. There
is no `AudioContext` anywhere in the codebase.

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

> **Verified during Phase 0, but re-verify as Stage 1's first task.** `decodeAudioData`
> returned a buffer at **29.98s**, and `<audio crossorigin="anonymous">` →
> `MediaElementAudioSourceNode` → `AnalyserNode` returned real non-zero frequency data
> (sums **2990 / 3082** — not the zeros a tainted stream produces). So the decode path
> is known to work.
>
> Re-verify anyway, for two reasons: **(a)** Phase 0 ran on a **desktop UA only**, and
> its search conclusion turned out to be UA-dependent and wrong — treat every Phase 0
> result as desktop-only until re-confirmed on real devices; **(b) Stage 7 depends
> entirely on this**, so discovering a break late is expensive.

**Watch the shared rate-limit budget** once the hero drives real search traffic — see
the README's *External APIs* section. Proxying moved every visitor's search onto one
Railway egress IP, so the whole site now shares a single Apple budget. Low risk today,
but it is a known limitation rather than a solved problem.

### Stage 2 — Scroll foundation

Lenis + `ScrollTrigger` wired properly, with `gsap.matchMedia` reduced-motion paths
established from the start. *(Lenis is not currently a dependency — this stage adds one.)*

Nothing ships visibly here, which is exactly why it is tempting to skip. Every
section transition, pin, scrub, and the scroll-linked volume ducking sits on it.
Retrofitting reduced-motion afterward is painful.

Prerequisites, both verified present in `client/src/styles/main.scss`:
- Remove `html { scroll-behavior: smooth }` (main.scss line 78) — it fights Lenis.
- Drop `background-attachment: fixed` from `.section` (main.scss line 887) — janky on mobile.
  *(Line numbers re-verified 2026-08-10; they shifted again when Task 4 added the
  navbar-height tokens.)*

**Also reconcile with Stage 0's B3 fix when Lenis lands.** Lenis takes over scrolling
from the browser, and `scroll-margin-top` is a *native* CSS feature — Lenis'
`scrollTo` does not read it. Two things need doing together in this stage:

- Removing `html { scroll-behavior: smooth }` is required *and* safe: `scrollIntoView`
  falls back to instant, and `--scroll-offset` keeps working because scroll-margin is
  independent of scroll behaviour. Do not remove it before Lenis is wired, though —
  section jumps become abrupt in the meantime.
- `scrollToSection()` will need to call `lenis.scrollTo(target, { offset: -X })`, where
  `X` is read from the **same `--scroll-offset` custom property** via
  `getComputedStyle(document.documentElement)`. Do not hardcode a second copy of the
  number — the whole point of the token is that the navbar height lives in exactly one
  place. `use-hash-scroll.js`'s settle-window logic (B3b) stays as is; only the
  underlying scroll call changes.

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
