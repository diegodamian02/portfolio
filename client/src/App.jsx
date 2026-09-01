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

export default function App() {
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
