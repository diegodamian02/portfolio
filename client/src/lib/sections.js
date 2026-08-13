// The resume is a static file in client/public/, copied to dist/ verbatim by
// Vite and served straight off the filesystem by Caddy.
//
// Deliberately NOT part of SECTIONS. That array drives scrollToSection(),
// aria-current and the hashchange sync — everything in it is treated as an
// in-page anchor. A document link that ended up in there would try to scroll to
// a section that doesn't exist and could take an aria-current highlight.
export const RESUME_URL = "/Diego-Damian-Resume.pdf";

// Screen readers get the format and the new-tab behaviour, which the visible
// label leaves implicit.
export const RESUME_ARIA_LABEL = "Resume (PDF, opens in a new tab)";

// Order matches the on-page scroll order (Stage 3 Task 4) — Home, then the
// person (About), then the work history (Timeline), then the rest. id="about"
// is the new intro card (about.jsx); the work-experience content that used to
// share that id now has its own, id="timeline" (timeline.jsx).
export const SECTIONS = [
    { id: "home", label: "Home" },
    { id: "about", label: "About Me" },
    { id: "timeline", label: "Timeline" },
    { id: "my-taste", label: "My Taste" },
    { id: "projects", label: "Projects" },
    { id: "connect", label: "Let's Connect" },
];
