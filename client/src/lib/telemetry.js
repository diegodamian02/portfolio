// Two owner-only beacons: a play, and a search that ended in a click. Nothing
// here is ever read back by this app — see server/db.js for what happens to
// the data. Both calls are fire-and-forget by design: a dropped or slow
// beacon must never be something a visitor's turntable or search box can feel,
// so neither call site awaits these, and failures are swallowed rather than
// surfaced.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5050").replace(/\/+$/, "");

function beacon(path, body) {
    fetch(`${apiBaseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // Lets the request survive a same-tick navigation/unmount — not the
        // reason this exists (neither call site unmounts right after firing),
        // but free to ask for and correct if that ever changes.
        keepalive: true,
    }).catch(() => {}); // a telemetry failure is never a visitor-facing one
}

/** Fired once per record actually starting playback — see home.jsx's
 * deck-state subscription for the fresh-drop-vs-resume distinction. */
export function reportPlay(track) {
    if (!track) return;
    beacon("/api/events/play", {
        trackId: track.id ?? null,
        title: track.title ?? null,
        artist: track.artist ?? null,
    });
}

/** Fired once per crate selection — the search term plus the result it led
 * to, not every keystroke of the debounced search. */
export function reportSearchClick(term, track) {
    beacon("/api/events/search-click", {
        term: term ?? null,
        trackId: track?.id ?? null,
        title: track?.title ?? null,
        artist: track?.artist ?? null,
    });
}
