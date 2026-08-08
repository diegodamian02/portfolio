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

- **B1** "Work Experience" heading invisible (~1.04:1) — one line
- **B2** timeline card text, same token-inversion root cause — audit every
  `--bg-inverted` rule and confirm its text tokens invert with it
- **B3** nav links scroll their target under the fixed navbar
- **B4** **mobile has no navigation at all** — most recruiter traffic is mobile
- **B5** `client/.env` missing URL scheme, breaks local `#my-taste`
- **B6** slideshow duplicates the project list and is missing a project — resolved by
  deleting the slideshow entirely (Q3)
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

Also fold in the trivial cleanup while in these files: delete `nav-orb.jsx` /
`orb-field.jsx` and their CSS, drop `@react-spring/web` and `@use-gesture/react`
(orphaned), and remove the navbar's hide-during-hero link gating (Phases 11–12 —
they touch nothing the turntable depends on).

### Stage 1 — Make the hero keep its promise *(Phases 6 + 7)*

Drop-record + tonearm animation, then the audio engine
(`AudioContext` → `GainNode` → `AudioBufferSourceNode`), unlocked by the needle-drop
gesture. `audio.play()` must land exactly on needle contact.

`previewUrl` is currently captured from the iTunes search and **thrown away**. There
is no `AudioContext` anywhere in the codebase.

Audio tier is expected to be **Tier 1, no proxy**: the Phase 0 probe confirmed
`itunes.apple.com/search` and the `mzstatic.com` preview CDN both send
`access-control-allow-origin: *`, so direct browser `fetch` works. The host-locked
`/api/itunes/preview-proxy` route stays in the codebase, dormant, as fallback.

> **Unverified as of this writing:** that `decodeAudioData` succeeds and `AnalyserNode`
> returns non-zero data on an iTunes preview. The CORS probe confirmed header access,
> not the full decode path. **Stage 7 depends entirely on this**, so verify it as the
> first task of Stage 1 rather than discovering it late.

### Stage 2 — Scroll foundation

Lenis + `ScrollTrigger` wired properly, with `gsap.matchMedia` reduced-motion paths
established from the start. *(Lenis is not currently a dependency — this stage adds one.)*

Nothing ships visibly here, which is exactly why it is tempting to skip. Every
section transition, pin, scrub, and the scroll-linked volume ducking sits on it.
Retrofitting reduced-motion afterward is painful.

Prerequisites, both verified present in `client/src/styles/main.scss`:
- Remove `html { scroll-behavior: smooth }` (line 53) — it fights Lenis.
- Drop `background-attachment: fixed` from `.section` (line 976) — janky on mobile.

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
`<button>`, single `<h1>`, skip-link. Clear the 18 ESLint errors. Animated theme
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
