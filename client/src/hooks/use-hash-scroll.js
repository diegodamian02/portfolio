import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollToSection } from "../lib/scroll.js";

// <Navigate> (used by the /about, /project, /contact redirect routes) only
// updates the URL via history.replaceState — it does NOT scroll the viewport
// to a hash fragment the way a real browser navigation would. Without this,
// landing on e.g. /about (from a bookmark, or the Spotify OAuth callback
// redirect) leaves the URL at /#about but the page scrolled to wherever it
// already was.
export function useHashScroll() {
    const location = useLocation();

    useEffect(() => {
        if (!location.hash) return;
        const id = location.hash.slice(1);
        // Defer a frame so the route's sections are mounted before we measure.
        const frame = requestAnimationFrame(() => scrollToSection(id));
        return () => cancelAnimationFrame(frame);
    }, [location.hash]);
}
