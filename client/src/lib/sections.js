// The resume tab/link (navbar.jsx, connect.jsx) and the PDF it pointed at
// (client/public/Diego-Damian-Resume.pdf) were removed here (2026-08-17) —
// direct request, personal data the owner didn't want publicly linked from
// the live site. RESUME_URL/RESUME_ARIA_LABEL used to live here; both
// deleted along with their only two call sites rather than left unused.

// Order matches the on-page scroll order (Stage 3 Task 4) — Home, then the
// person (About), then the work/education history (Experience), then the
// rest. id="about" is the intro card (about.jsx); the work-experience
// content that used to share that id has its own, id="experience"
// (experience.jsx) — renamed from "Timeline" in Stage 3 Task 7, since the
// section covers education and coaching too, not just jobs.
export const SECTIONS = [
    { id: "home", label: "Home" },
    { id: "about", label: "About Me" },
    { id: "experience", label: "Experience" },
    { id: "my-taste", label: "My Taste" },
    { id: "projects", label: "Projects" },
    { id: "connect", label: "Let's Connect" },
];
