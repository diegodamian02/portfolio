import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { CustomEase } from "gsap/CustomEase";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

// DrawSVGPlugin/CustomEase/MotionPathPlugin/ScrambleTextPlugin — added for
// Stage 3 Task 7 (Experience). All four used to be Club GreenSock-only
// (paywalled) plugins; GSAP went fully free (Webflow acquisition, 2025), so
// they now ship in the plain `gsap` npm package like everything else here —
// confirmed directly against node_modules/gsap/*.js before writing any of
// this, not assumed from an earlier task's note. No new dependency, no
// separate registry: `package.json` already pins "gsap": "^3.15.0", which
// bundles all four.
gsap.registerPlugin(
    ScrollTrigger, SplitText, Draggable, InertiaPlugin,
    DrawSVGPlugin, CustomEase, MotionPathPlugin, ScrambleTextPlugin,
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

// A second, gentler curve — Experience's filmstrip snap (experience.jsx)
// used SIGNATURE_EASE at first and live feedback called it out: "I get in
// between years and then it locks... doesn't feel that natural." That's the
// signature curve doing exactly what its own comment above says it's FOR —
// front-loading almost all motion into the first third — which reads as
// confident/snappy for instant UI feedback (a hover reveal, an entrance
// pop), but for a scrub SETTLING to rest after a drag, the honest physical
// comparison is a carousel or a turntable easing to a stop: an even
// deceleration, not a lunge-then-hold. cubic-bezier(0.215, 0.61, 0.355, 1) —
// "easeOutCubic" in most naming conventions — is the standard, well-worn
// choice for exactly that: still a clear, un-springy ease-out, just spread
// across the whole duration instead of front-loaded into the start of it.
CustomEase.create("filmstripSettle", "M0,0 C0.215,0.61 0.355,1 1,1");
export const FILMSTRIP_SETTLE_EASE = "filmstripSettle";

export { gsap, ScrollTrigger, SplitText, Draggable, InertiaPlugin, DrawSVGPlugin, MotionPathPlugin, ScrambleTextPlugin };
