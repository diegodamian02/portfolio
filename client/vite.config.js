import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /lab/<name> -> /lab/<name>/ , dev server only.
//
// Each lab (Stage 12.1's deck, 12.2's player) is its own Vite entry at
// lab/<name>/index.html, so its URL needs the trailing slash. Without this
// the SPA history fallback catches the slashless form first and serves the
// ROOT index.html instead — i.e. typing /lab/deck on a phone silently loads
// the entire site, which is both the wrong page and the exact 4.2 MB load
// these entries exist to avoid. A silent wrong-page is worse than a 404,
// hence the redirect rather than a line in the docs.
//
// Matched by PATTERN rather than listing '/lab/deck': the original version
// hardcoded that one path, so when 12.2 added lab/player the slashless
// /lab/player went back to silently serving the whole site — the same trap
// the redirect was written to close, reopened by adding a second lab. A new
// lab should not have to remember to come back here.
//
// configureServer only — `apply: 'serve'` keeps it out of the build, where
// none of the lab/*/index.html files are inputs and therefore do not exist.
const labTrailingSlash = {
    name: 'lab-trailing-slash',
    apply: 'serve',
    configureServer(server) {
        server.middlewares.use((req, res, next) => {
            const [pathname, query] = req.url.split('?');
            if (/^\/lab\/[a-z0-9-]+$/i.test(pathname)) {
                res.writeHead(301, { Location: `${pathname}/${query ? `?${query}` : ''}` });
                res.end();
                return;
            }
            next();
        });
    },
}

export default defineConfig({
  plugins: [react(), labTrailingSlash],
  build: {
    outDir: 'dist',
    // NOTE: rollupOptions.input is deliberately left at its default (the root
    // index.html). That default is what keeps lab/deck/index.html out of the
    // production build — the lab is dev-only BY CONSTRUCTION, not by a
    // runtime gate. Adding an input here would ship it.
  },
  server: {
    port: 5173,
    open: true,
    // Dev-only API proxy — the thing that makes the site TESTABLE ON A PHONE.
    //
    // src/lib/api-base.js resolves to an empty base in dev, so every call is
    // relative ("/api/itunes/search"). This forwards those to Express.
    //
    // Why it matters: with the old absolute "http://localhost:5050", a phone
    // pointed at the Mac resolves `localhost` to ITSELF and every API call
    // fails — the crate shows its generic error state, which reads exactly
    // like a bug in the crate and is not one. Pointing the phone at the Mac's
    // LAN address instead would be cross-origin, and server/server.js's
    // DEFAULT_ALLOWED_ORIGINS permits `http://localhost:5173` and nothing
    // else local, so that fails too — on CORS this time, with a different
    // misleading symptom.
    //
    // Through the proxy the phone only ever talks to the Vite server it
    // loaded the page from, so it is same-origin by construction: no CORS to
    // configure, and no LAN IP baked into an env var that changes with every
    // network.
    //
    // `server.proxy` is dev-only in Vite — there is no equivalent in a
    // production build, so this cannot leak into `dist/`.
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 5050}`,
        changeOrigin: true,
      },
    },
  }
})
