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

export default apiBaseUrl;
