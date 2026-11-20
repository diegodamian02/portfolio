import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoadingScreen from "./components/loading-screen.jsx";
import Navbar from "./components/navbar.jsx";
import SmoothScroll from "./components/smooth-scroll.jsx";
import Home from "./sections/home.jsx";
import Portfolio from "./sections/portfolio.jsx";
import MyTaste from "./sections/my-taste.jsx";
import About from "./sections/about.jsx";
import Experience from "./sections/experience.jsx";
import Connect from "./sections/connect.jsx";
import Footer from "./components/footer.jsx";
import { useHashScroll } from "./hooks/use-hash-scroll.js";

// Rendered inside <Router> so it can call useLocation(); keeps a redirected
// or bookmarked hash (e.g. /about -> /#about) actually scrolled into view.
function ScrollToHash() {
    useHashScroll();
    return null;
}

// /lab/deck — the DEV-only Snow White deck lab (Stage 12.1 spike).
//
// A ternary on import.meta.env.DEV, not an `if` inside the component: Vite
// substitutes the literal `false` in a production build, Rollup folds
// `false ? import(...) : null` to `null`, and the dynamic import disappears
// with it — so neither src/lab/ nor snow-white-deck.jsx is emitted at all.
// A static import would have bundled both no matter how the render was gated.
// Verified against the built dist rather than assumed; the check is written
// down in design-review/mobile-v3/README.md.
const DeckLab = import.meta.env.DEV
    ? lazy(() => import("./lab/deck-lab.jsx"))
    : null;

export default function App() {
    // Checked ahead of <Router> on purpose, so the lab gets a bare page: no
    // LoadingScreen covering the first 900ms of every measurement, no Navbar
    // taking 120px off a phone screen, and no Lenis owning the scroll. The lab
    // is a measurement rig, not a route of the site — it has no navigation to
    // participate in, and keeping it out of <Routes> leaves the real route
    // table byte-identical.
    if (DeckLab && window.location.pathname === "/lab/deck") {
        return <Suspense fallback={null}><DeckLab /></Suspense>;
    }

    return (
        <Router>
            <SmoothScroll>
                <div className="app-container">
                    <ScrollToHash />
                    <LoadingScreen />
                    <Navbar />
                    <div className="content">
                        <Routes>
                            <Route path="/" element={<>
                                <section id="home"><Home /></section>
                                <section id="about"><About /></section>
                                <section id="experience"><Experience /></section>
                                <section id="my-taste"><MyTaste /></section>
                                <section id="projects"><Portfolio /></section>
                                {/* The footer lives INSIDE #connect, not after
                                    the sections. Section snapping stops at
                                    #connect, so a footer sitting outside it was
                                    always below the fold and got cut off. As
                                    the last section's own content it arrives
                                    with the section. */}
                                <section id="connect"><Connect /><Footer /></section>
                            </>} />
                            <Route path="/project" element={<Navigate to="/#projects" replace />} />
                            <Route path="/about" element={<Navigate to="/#about" replace />} />
                            <Route path="/contact" element={<Navigate to="/#connect" replace />} />
                        </Routes>
                    </div>
                </div>
            </SmoothScroll>
        </Router>
    );
}
