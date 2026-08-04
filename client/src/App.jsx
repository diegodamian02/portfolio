import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoadingScreen from "./components/loading-screen.jsx";
import Navbar from "./components/navbar.jsx";
import Home from "./sections/home.jsx";
import Portfolio from "./sections/portfolio.jsx";
import Projects from "./sections/projects.jsx";
import MyTaste from "./sections/my-taste.jsx";
import About from "./sections/about.jsx";
import Connect from "./sections/connect.jsx";
import Footer from "./components/footer.jsx";

export default function App() {
    return (
        <Router>
            <div className="app-container">
                <LoadingScreen />
                <Navbar />
                <div className="content">
                    <Routes>
                        <Route path="/" element={<>
                            <section id="home"><Home /></section>
                            <section id="projects">
                                <Projects />
                                <Portfolio />
                            </section>
                            <section id="my-taste"><MyTaste /></section>
                            <section id="about"><About /></section>
                            <section id="connect"><Connect /></section>
                        </>} />
                        <Route path="/project" element={<Navigate to="/#projects" replace />} />
                        <Route path="/about" element={<Navigate to="/#about" replace />} />
                        <Route path="/contact" element={<Navigate to="/#connect" replace />} />
                    </Routes>
                </div>
                <Footer />
            </div>
        </Router>
    );
}
