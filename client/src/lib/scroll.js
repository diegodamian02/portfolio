// The fixed-navbar offset deliberately lives in CSS, not here:
// `.content > section { scroll-margin-top: var(--scroll-offset) }` in
// main.scss. scrollIntoView() honours it, and so does every scroll path that
// never calls this function — a fresh load on /#about, back/forward,
// find-in-page. Do NOT also subtract a navbar height here; it would be
// counted twice.
export function scrollToSection(id) {
    const target = document.getElementById(id);
    if (target) {
        target.scrollIntoView({ behavior: "smooth" });
    }
}
