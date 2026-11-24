import ReactDOM from "react-dom/client";
// Poppins 400/600, latin only — the two weights and the one subset the deck
// lab actually renders. The site's own main.jsx also pulls latin-ext, which
// nothing on this page needs; My Taste's three families (Anton, Oswald,
// Space Mono) are not imported here at all, since no element on this page
// uses them.
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-600.css";
import "../../src/styles/main.scss";
// Registers every GSAP plugin, same as the app. The deck needs CustomEase
// and CustomBounce registered before snow-white-deck.jsx's module-scope
// create() calls run, and this import is what guarantees the order.
import "../../src/lib/gsap.js";
import DeckLab from "./deck-lab.jsx";

// No <React.StrictMode>, deliberately — unlike the site's main.jsx (which is
// also why `React` itself is not imported here; the automatic JSX runtime
// needs no import and eslint flags an unused one). StrictMode
// double-invokes effects in development, which would build the deck's GSAP
// timeline twice and leave the first one's spin tween orphaned on the same
// element. The app absorbs that because useGSAP's cleanup handles it; here it
// would put a second writer on the platter's rotation for the whole session
// and quietly corrupt every frame-time and reverse measurement taken off this
// page. Correctness of the measurement beats parity with the app's bootstrap.
ReactDOM.createRoot(document.getElementById("root")).render(<DeckLab />);
