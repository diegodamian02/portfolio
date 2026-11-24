import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /lab/deck -> /lab/deck/ , dev server only.
//
// The deck lab (Stage 12.1) is its own Vite entry at lab/deck/index.html, so
// its URL needs the trailing slash. Without this the SPA history fallback
// catches the slashless form first and serves the ROOT index.html instead —
// i.e. typing /lab/deck on a phone silently loads the entire site, which is
// both the wrong page and the exact 4.2 MB load this entry exists to avoid.
// A silent wrong-page is worse than a 404, hence the redirect rather than a
// line in the docs.
//
// configureServer only — `apply: 'serve'` keeps it out of the build, where
// lab/deck/index.html is not an input and therefore does not exist.
const labTrailingSlash = {
    name: 'lab-trailing-slash',
    apply: 'serve',
    configureServer(server) {
        server.middlewares.use((req, res, next) => {
            const [pathname, query] = req.url.split('?');
            if (pathname === '/lab/deck') {
                res.writeHead(301, { Location: `/lab/deck/${query ? `?${query}` : ''}` });
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
    open: true
  }
})
