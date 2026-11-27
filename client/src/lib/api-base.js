// Where the API lives, in one place.
//
// This constant was copy-pasted into three files (record-crate.jsx,
// my-taste.jsx, connect.jsx), each with its own identical trailing-slash
// guard and its own comment explaining the guard. Three copies of a URL is
// three places to forget.
//
// ---------------------------------------------------------------------------
// WHY DEV RESOLVES TO AN EMPTY STRING
// ---------------------------------------------------------------------------
// An empty base makes every call RELATIVE — `/api/itunes/search` rather than
// `http://localhost:5050/api/itunes/search` — which the Vite dev server then
// proxies to Express (see `server.proxy` in vite.config.js).
//
// That matters for one specific reason: TESTING ON A REAL PHONE. With an
// absolute `http://localhost:5050`, a phone pointed at the Mac resolves
// `localhost` to ITSELF and every API call fails — the crate shows its
// generic error state, which reads exactly like a bug in the crate. And
// pointing the phone at the Mac's LAN address instead would then be a
// cross-origin request, which `DEFAULT_ALLOWED_ORIGINS` in server/server.js
// does not permit (it lists `http://localhost:5173` and nothing else local).
//
// Relative + proxy sidesteps both: the phone talks only to the Vite server it
// already loaded the page from, so it is SAME-ORIGIN by construction and
// there is no CORS to configure and no IP baked into a variable that changes
// with every network.
//
// PRODUCTION IS UNCHANGED. `VITE_API_BASE_URL` is baked at build time (see
// CLAUDE.md — changing it on Railway does nothing until the client is
// rebuilt) and still wins whenever it is set. The `localhost:5050` fallback
// is kept verbatim for a non-DEV build with no variable set, which is the
// same broken-but-explicit behaviour as before rather than a new silent
// relative path.
const configured = import.meta.env.VITE_API_BASE_URL;

export const apiBaseUrl = configured
    // A trailing slash would produce "//api/contact", which Express treats as
    // an unregistered path — the guard each of the three copies carried.
    ? configured.replace(/\/+$/, "")
    : (import.meta.env.DEV ? "" : "http://localhost:5050");

// ---------------------------------------------------------------------------
// A loud warning for the failure that cost an afternoon.
//
// `client/.env.local` held `VITE_API_BASE_URL=http://192.168.1.68:5050` — a
// LAN address captured two days earlier while testing on a phone. A Mac's
// LAN IP changes with every network, so by then .68 belonged to nothing. The
// site loaded perfectly, the crate span on "searching the crate…" forever,
// and no record could be played.
//
// Nothing reported it. A fetch to an unreachable host does not 404 or throw
// synchronously; it just never resolves, so there was no console error, no
// failed response, and no visible difference from a slow network. Worse,
// `.env.local` is gitignored — invisible in a diff, and it silently
// overrides the dev proxy that exists precisely so no IP has to be written
// down at all.
//
// So: in dev, if an explicit base points at a HOST OTHER THAN THE ONE
// SERVING THE PAGE, say so. That is almost always a stale LAN IP. It is not
// always wrong — pointing the dev client at a deployed backend is a real
// thing to want — hence a warning rather than an override. Explicit
// configuration still wins.
//
// DEV-only: `import.meta.env.DEV` is a compile-time constant, so this whole
// block is removed from the production bundle by dead-code elimination.
if (import.meta.env.DEV && configured && typeof window !== "undefined") {
    try {
        const target = new URL(configured, window.location.origin);
        if (target.hostname !== window.location.hostname) {
            console.warn(
                `[api-base] VITE_API_BASE_URL points at ${target.origin}, but this page `
                + `is served from ${window.location.origin}.\n`
                + `If that host is unreachable, every API call will hang with NO error: `
                + `the record crate spins forever and nothing can be played.\n`
                + `This is usually a stale LAN IP in client/.env.local. Unset it and the `
                + `dev server proxies /api for you, on localhost and from a phone alike.`,
            );
        }
    } catch {
        console.warn(`[api-base] VITE_API_BASE_URL is not a valid URL: ${configured}`);
    }
}

export default apiBaseUrl;
