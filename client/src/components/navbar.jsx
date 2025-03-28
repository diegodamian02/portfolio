import { useState, useEffect } from "react";
import { Link, useLocation} from "react-router-dom"; // Use Link for navigation
import "../styles/main.scss";
import sunIcon from "../assets/sun.png";
import moonIcon from "../assets/moon.png";

export default function Navbar() {
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
    const location = useLocation();
    const [isMenuActive, setMenuActive] = useState(false);

    const toggleNavbar = () => {
        setMenuActive(!isMenuActive);
    };


    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
        window.dispatchEvent(new Event("themeChange"))
    }, [theme]);

    //Scroll to Top
    const scrollToTop = (e) => {
        e.preventDefault();
        window.scrollTo({top: 0, behavior: "smooth"});
    }

    // Smooth Scroll Function for Projects
    const scrollToProjects = (e) => {
        e.preventDefault();
        const projectsSection = document.querySelector(".projects");
        if (projectsSection) {
            projectsSection.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <nav className="navbar">
            <h1 className="logo">D.</h1>
            <div className="navbar-right">
                <div className="navbar-links">
                    {location.pathname === "/" ? (
                        <a href="#" onClick={scrollToTop}>Home</a>
                    ) : (
                        <Link to="/">Home</Link>
                    )}
                    <Link to="/project">Projects</Link>
                    <Link to="/about">About</Link> {/* Navigates properly */}
                    <Link to="/contact">Contact</Link> {/* Navigates properly */}
                </div>
                <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    <img src={sunIcon} alt="Sun Icon" className="theme-icon sun"/>
                    <img src={moonIcon} alt="Moon Icon" className="theme-icon moon"/>
                </button>
            </div>

            {/* Hamburger Icon */}
            <div className="hamburger" onClick={toggleNavbar}>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
            </div>

            {/* Mobile Navbar */}
            <div className="navbar-mobile">
                <div className="navbar-links">
                    <Link to="/" onClick={scrollToTop}>Home</Link>
                    <Link to="/project">Projects</Link>
                    <Link to="/about">About</Link>
                    <Link to="/contact">Contact</Link>
                </div>
            </div>
        </nav>

    );
}
