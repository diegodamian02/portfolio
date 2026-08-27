import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { CustomEase } from "gsap/CustomEase";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { CustomBounce } from "gsap/CustomBounce";
import { CustomWiggle } from "gsap/CustomWiggle";
import { Flip } from "gsap/Flip";

// DrawSVGPlugin/CustomEase/MotionPathPlugin/ScrambleTextPlugin — added for
// Stage 3 Task 7 (Experience). All four used to be Club GreenSock-only
// (paywalled) plugins; GSAP went fully free (Webflow acquisition, 2025), so
// they now ship in the plain `gsap` npm package like everything else here —
// confirmed directly against node_modules/gsap/*.js before writing any of
// this, not assumed from an earlier task's note. No new dependency, no
// separate registry: `package.json` already pins "gsap": "^3.15.0", which
// bundles all four.
//
// CustomBounce/CustomWiggle — added for Stage 4 Task 4 (#my-taste's entrance
// cascade). Same free-tier status, re-confirmed the same way (both files
// genuinely exist under node_modules/gsap/, not assumed from CustomEase's
// own precedent). Both are thin builders ON TOP of CustomEase — each one's
// own source warns "Please gsap.registerPlugin(CustomEase, CustomBounce)" /
// "...CustomWiggle" if CustomEase isn't registered first — so CustomEase
// stays listed before them below, not just alphabetically/incidentally.
// Flip — added for Stage 3 Task 10 (#projects' single-open accordion swap).
// Same free-tier status as the four above, re-confirmed the same way
// (gsap/Flip.js genuinely exists under node_modules/gsap/). First real use
// of Flip in this codebase — My Taste's still-open Task 5 (time-range
// re-rank) was flagged as a future Flip consumer but never built one; this
// is the plugin's actual debut.
gsap.registerPlugin(
    ScrollTrigger, SplitText, Draggable, InertiaPlugin,
    DrawSVGPlugin, CustomEase, CustomBounce, CustomWiggle, MotionPathPlugin, ScrambleTextPlugin, Flip,
);

// One shared motion signature (Task 7's own ask, then retrofitted onto
// About's entrance too — about.jsx) instead of every section picking its own
// stock ease. cubic-bezier(0.16, 1, 0.3, 1) — a fast, confident deceleration
// with no overshoot/bounce ("easeOutExpo" in most naming conventions,
// popularised by Framer Motion/Vercel-family sites): the curve front-loads
// almost all of its motion into the first third and eases into rest rather
// than settling in an even burn, which is what actually reads as "snappy"
// rather than merely "quick." A CustomEase path is literally that
// cubic-bezier restated as an SVG path — CustomEase.create has no separate
// "from cubic-bezier" shorthand, so the C command's control points ARE the
// bezier's own (x1,y1,x2,y2), start/end pinned at (0,0)/(1,1).
CustomEase.create("signature", "M0,0 C0.16,1 0.3,1 1,1");
export const SIGNATURE_EASE = "signature";

// (Removed 2026-08-27: `filmstripSettle` — a gentler easeOutCubic built for
// Experience's GSAP filmstrip snap. The Stage 9 rebuild dropped that snap
// for native CSS scroll-snap, so the ease had no remaining consumer.)

// #my-taste's own pair (Stage 4 Task 4), deliberately NOT built from
// SIGNATURE_EASE. These two are a different register entirely — physical
// squash-and-stretch and an oscillating snap; the brief's own framing being
// "pinning a flyer" is a distinct enough motion identity to earn its own
// signature rather than borrowing one built for the calm-intro/snappy-UI
// feeling SIGNATURE_EASE (About, Experience's viewport reveal) is FOR.
// Scoped to my-taste.jsx only — not every section needs to share one curve.
//
// CustomBounce.create() registers TWO eases from one call, confirmed by
// reading node_modules/gsap/CustomBounce.js directly rather than assumed
// from the brief's own snippet: `id` itself (here "cardLand") for a position
// tween, PLUS `(vars.squashID || id + "-squash")` — so "cardLand-squash" —
// for a paired scale tween, only created because `squash` is truthy below.
// Both are meant to run in the SAME timeline position with the SAME
// duration on the SAME element (GSAP's own documented CustomBounce demo
// pattern) — one drives a position property, the other drives scaleX/scaleY,
// together reading as an object dropping in and squashing on each contact.
//
// strength: 0.6 -> 0.3, squash: 2 -> 1 (Task 4.1) — live feedback on the
// first version: "reads as a generic bounce, not specifically a flyer being
// pinned." Sampled the actual eased curve (gsap.parseEase("cardLand")) at
// 0.6 rather than guessing why: it touches 1 (arrived) three separate times
// with two visible dips between (down to ~0.64, then ~0.88) — a real
// multi-bounce ball. At 0.3 it touches 1 ONCE around 65% of the way through,
// dips to a single, shallow ~0.92, and settles — one clear beat instead of a
// rally. Also confirmed live: this ease NEVER exceeds 1 at any strength
// (it approaches the target from below, dips back, approaches again — not a
// spring passing through rest) — so "arrives, slight overshoot once, stops"
// is read here as "arrives, one shallow dip, stops," not a literal
// past-target overshoot; CustomBounce's own shape doesn't produce the
// latter at all, at any strength. The bouncier, more energetic motion Task
// 4.1 asked to reserve for the tape/pin instead lives in PIN_SNAP_EASE
// below, unchanged — reducing the card's own strength is what makes room
// for the tape's snap to read as the more energetic beat, not a change to
// the tape's own config.
CustomBounce.create("cardLand", { strength: 0.3, squash: 1 });
export const CARD_LAND_EASE = "cardLand";
export const CARD_LAND_SQUASH_EASE = "cardLand-squash";

// CustomWiggle output returns to exactly 0 at progress 1 (confirmed reading
// node_modules/gsap/CustomWiggle.js — the path's last point is `(1, 0)`),
// which is what makes it safe to drive a RELATIVE, net-zero tween ("+=0")
// with this ease: the property oscillates away from its starting value and
// lands back exactly where it started, reading as a wiggle/snap rather than
// a directional move. Used for each card's tape "snapping" the instant the
// card itself lands.
CustomWiggle.create("pinSnap", { wiggles: 3, type: "easeOut" });
export const PIN_SNAP_EASE = "pinSnap";

// #connect's walkman (Stage 3 Task 11.2's own follow-up — the send-success
// takeover). Two distinct beats share ONE bounce shape rather than each
// getting its own: the walkman's own pop-in (brief: "a light CustomBounce or
// similar overshoot suits it" — explicitly optional there) and the cassette
// lid snapping shut (brief: CustomBounce named explicitly, not optional,
// for this one). Same "one clear beat, not a rally" strength My Taste's own
// CARD_LAND_EASE settled on (0.3, Task 4.1) rather than the bouncier 0.6 it
// started at — a lid snapping shut and a device popping into view both read
// as one decisive contact, not a rebound.
CustomBounce.create("walkmanPop", { strength: 0.3, squash: 1 });
export const WALKMAN_POP_EASE = "walkmanPop";
export const WALKMAN_POP_SQUASH_EASE = "walkmanPop-squash";

export { gsap, ScrollTrigger, SplitText, Draggable, InertiaPlugin, DrawSVGPlugin, MotionPathPlugin, ScrambleTextPlugin, CustomBounce, CustomWiggle, Flip };
