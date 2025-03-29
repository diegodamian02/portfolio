import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/navbar.jsx";
import Home from "./pages/home.jsx";
import Portfolio from "./pages/portfolio.jsx";
import Projects from "./pages/projects.jsx";
import About from "./pages/about.jsx";
import Contact from "./pages/contact.jsx";
import Thankyou from "./pages/thankyou.jsx";
import Footer from "./components/footer.jsx";

export default function App() {
    return (
        <Router>
            <div className="app-container">
                <Navbar />
                <div className="content">
                    <Routes>
                        <Route path="/" element={<>
                            <Home />
                            <Projects />
                            <Thankyou />
                        </>} />
                        <Route path="/project" element={<Portfolio />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/contact" element={<Contact />} />
                    </Routes>
                </div>
                <Footer />
            </div>
        </Router>
    );
}
