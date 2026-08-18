import { useState, useEffect, useRef, useCallback } from "react";
import "../styles/main.scss";
import sunIcon from "../assets/sun.png";
import moonIcon from "../assets/moon.png";
import { SECTIONS } from "../lib/sections.js";
import { scrollToSection } from "../lib/scroll.js";

const MENU_ID = "navbar-mobile-menu";

// Markup is deliberately identical to what was here before — the missing
// aria-label and the two role="img" spans are a known finding (FINDINGS §6) but
// belong to Stage 8. Factored out only because the toggle now renders twice:
// once in the desktop bar, once in the mobile panel.
//
// A plain function rather than a component, matching links() below. The repo
// has no propTypes convention and no prop-types dependency, so a real component
// taking props would add an eslint error to a 16-error baseline for one button.
function themeToggle(onToggle) {
    return (
        <button className="theme-toggle" onClick={onToggle}>
            <span className="theme-icon sun" style={{ "--icon-mask": `url(${sunIcon})` }} role="img" aria-label="Sun Icon" />
            <span className="theme-icon moon" style={{ "--icon-mask": `url(${moonIcon})` }} role="img" aria-label="Moon Icon" />
        </button>
    );
}

export default function Navbar() {
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
    const [isMenuActive, setMenuActive] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    // Which section the visitor last navigated to, for aria-current. Seeded from
    // the URL so a shared link (/#about) marks the right item on arrival.
    // NOTE: this tracks navigation, not scroll position — it does not update as
    // you scroll past sections. A real scroll-spy needs ScrollTrigger (Stage 2).
    const [activeId, setActiveId] = useState(() => window.location.hash.slice(1));

    const hamburgerRef = useRef(null);
    const menuRef = useRef(null);

    // This effect also runs on mount, where it applies the stored theme. That
    // application must NOT crossfade — the page would visibly fade in from the
    // wrong theme on every load.
    const themeApplied = useRef(false);

    const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

    useEffect(() => {
        const root = document.documentElement;
        let timer;

        // D8 — every surface changes on one duration. Enumerating each element
        // that sets its own colour is the fragile approach; instead a class
        // enables a catch-all transition (see main.scss, last rule) for exactly
        // as long as the switch takes, so nothing else on the site inherits a
        // permanent 180ms transition on hover and focus.
        if (themeApplied.current) {
            root.classList.add("is-theme-switching");
            // Read from the token rather than repeating the number here, so the
            // class can never outlive or undercut the transition it enables.
            const ms = parseFloat(
                getComputedStyle(root).getPropertyValue("--theme-transition-duration"),
            ) || 180;
            timer = setTimeout(() => root.classList.remove("is-theme-switching"), ms + 60);
        }
        themeApplied.current = true;

        root.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
        window.dispatchEvent(new Event("themeChange"));

        return () => clearTimeout(timer);
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

    // Seeding activeId at mount only covers a cold load. A hash can also change
    // without remounting this component — browser back/forward, or any
    // same-document hash navigation — and without this the highlight sticks to
    // whatever was current when the navbar first rendered.
    useEffect(() => {
        const onHashChange = () => setActiveId(window.location.hash.slice(1));
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    const closeMenu = useCallback(({ restoreFocus = true } = {}) => {
        setMenuActive((open) => {
            // Only pull focus back if the menu was actually open, so an
            // incidental close never steals focus from elsewhere on the page.
            if (open && restoreFocus) hamburgerRef.current?.focus();
            return false;
        });
    }, []);

    // Escape closes from anywhere, and Tab is contained to the panel while it is
    // open so focus cannot wander into the page behind it.
    useEffect(() => {
        if (!isMenuActive) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                closeMenu();
                return;
            }
            if (e.key !== "Tab") return;

            // The hamburger is part of the cycle — it is the close control.
            const focusable = [
                hamburgerRef.current,
                ...(menuRef.current?.querySelectorAll("a[href], button") ?? []),
            ].filter(Boolean);
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (e.shiftKey && (active === first || !focusable.includes(active))) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [isMenuActive, closeMenu]);

    // Lock the page behind the open panel. The previous value is restored rather
    // than blanked, so this cannot clobber the intro sequence's own lock in
    // loading-screen.jsx if the two ever overlap.
    useEffect(() => {
        if (!isMenuActive) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previous; };
    }, [isMenuActive]);

    const handleNavClick = (e, id) => {
        e.preventDefault();
        closeMenu({ restoreFocus: false });
        setActiveId(id);

        // replaceState, not pushState: this is a five-section one-pager, and
        // pushing would mean a visitor who clicked through every section needs
        // five Back presses to leave the site. replaceState still makes the URL
        // copyable (the actual goal) and leaves Back meaning "leave".
        //
        // Deliberately raw history, not react-router's navigate(): the router
        // never sees this, so location.hash does not change, so use-hash-scroll
        // cannot re-fire and double-scroll on top of the scroll below.
        window.history.replaceState(null, "", `#${id}`);

        // Deferred a frame so the effect above has released the body scroll lock
        // — scrolling while overflow:hidden is still applied does nothing.
        requestAnimationFrame(() => scrollToSection(id));
    };

    const links = (extraClass = "") =>
        SECTIONS.map((section) => (
            <a
                key={section.id}
                className={extraClass}
                href={`#${section.id}`}
                aria-current={activeId === section.id ? "page" : undefined}
                onClick={(e) => handleNavClick(e, section.id)}
            >
                {section.label}
            </a>
        ));

    return (
        <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""} ${isMenuActive ? "navbar-menu-open" : ""}`}>
            <h1 className="logo">D.</h1>

            <div className="navbar-right">
                <div className="navbar-links">
                    {links()}
                </div>
                {themeToggle(toggleTheme)}
            </div>

            <button
                ref={hamburgerRef}
                className="hamburger"
                type="button"
                aria-label={isMenuActive ? "Close menu" : "Open menu"}
                aria-expanded={isMenuActive}
                aria-controls={MENU_ID}
                onClick={() => (isMenuActive ? closeMenu() : setMenuActive(true))}
            >
                <span className="bar" />
                <span className="bar" />
                <span className="bar" />
            </button>

            {/* Tap-anywhere-else-to-close. aria-hidden because Escape and the
                hamburger already expose closing to assistive tech. */}
            {isMenuActive && (
                <div className="navbar-scrim" aria-hidden="true" onClick={() => closeMenu()} />
            )}

            <div
                ref={menuRef}
                id={MENU_ID}
                className={`navbar-mobile ${isMenuActive ? "is-open" : ""}`}
                inert={isMenuActive ? undefined : ""}
            >
                <div className="navbar-links">
                    {links("navbar-mobile-link")}
                </div>
                <div className="navbar-mobile-footer">
                    {themeToggle(toggleTheme)}
                </div>
            </div>
        </nav>
    );
}
