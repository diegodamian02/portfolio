import { useState, useEffect } from "react";
import "../styles/main.scss";
import sunIcon from "../assets/sun.png";
import moonIcon from "../assets/moon.png";
import { SECTIONS } from "../lib/sections.js";
import { scrollToSection } from "../lib/scroll.js";

export default function Navbar() {
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
    const [isMenuActive, setMenuActive] = useState(false);
    const [pastHero, setPastHero] = useState(false);

    const toggleNavbar = () => {
        setMenuActive(!isMenuActive);
    };

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
        window.dispatchEvent(new Event("themeChange"))
    }, [theme]);

    // The orbs are the hero's own nav statement — the link list only
    // shows up once you've scrolled past it, as a slim persistent nav.
    useEffect(() => {
        const heroEl = document.getElementById("home");
        if (!heroEl) return;
        const observer = new IntersectionObserver(
            ([entry]) => setPastHero(!entry.isIntersecting),
            { threshold: 0.1 }
        );
        observer.observe(heroEl);
        return () => observer.disconnect();
    }, []);

    const handleNavClick = (e, id) => {
        e.preventDefault();
        scrollToSection(id);
        setMenuActive(false);
    };

    return (
        <nav className={`navbar ${pastHero ? "navbar-scrolled" : ""}`}>
            <h1 className="logo">D.</h1>
            <div className="navbar-right">
                <div className="navbar-links">
                    {SECTIONS.map((section) => (
                        <a key={section.id} href={`#${section.id}`} onClick={(e) => handleNavClick(e, section.id)}>
                            {section.label}
                        </a>
                    ))}
                </div>
                <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    <span className="theme-icon sun" style={{ "--icon-mask": `url(${sunIcon})` }} role="img" aria-label="Sun Icon" />
                    <span className="theme-icon moon" style={{ "--icon-mask": `url(${moonIcon})` }} role="img" aria-label="Moon Icon" />
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
                    {SECTIONS.map((section) => (
                        <a key={section.id} href={`#${section.id}`} onClick={(e) => handleNavClick(e, section.id)}>
                            {section.label}
                        </a>
                    ))}
                </div>
            </div>
        </nav>

    );
}
