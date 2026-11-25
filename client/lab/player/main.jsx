import ReactDOM from "react-dom/client";
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-600.css";
import "../../src/styles/main.scss";
import "../../src/lib/gsap.js";
import PlayerLab from "./player-lab.jsx";

// No <React.StrictMode> — same reason as /lab/deck/'s bootstrap. StrictMode
// double-invokes effects, which here would build the sheet's Draggable twice
// and leave the first one bound to the same element, giving every drag two
// handlers and making the dismiss threshold fire at half the distance. The
// app absorbs that because useGSAP cleans up; a measurement rig should not
// have to.
ReactDOM.createRoot(document.getElementById("root")).render(<PlayerLab />);
