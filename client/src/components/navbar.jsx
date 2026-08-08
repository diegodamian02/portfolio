import { useState, useEffect } from "react";
import "../styles/main.scss";
import sunIcon from "../assets/sun.png";
import moonIcon from "../assets/moon.png";
import { SECTIONS } from "../lib/sections.js";
import { scrollToSection } from "../lib/scroll.js";

export default function Navbar() {
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
    const [isMenuActive, setMenuActive] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const toggleNavbar = () => {
        setMenuActive(!isMenuActive);
    };

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
        window.dispatchEvent(new Event("themeChange"))
    }, [theme]);

    // Drives only the navbar's own background: transparent over the hero,
    // solid once you've scrolled. The links themselves are always visible —
    // the hide-during-hero gating belonged to the superseded orb-nav hero,
    // where the orbs were the hero's navigation. The turntable isn't.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const handleNavClick = (e, id) => {
        e.preventDefault();
        scrollToSection(id);
        setMenuActive(false);
    };

    return (
        <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
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
