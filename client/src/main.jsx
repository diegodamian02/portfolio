import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Site-wide body/heading font (Stage 10 — replaces the "Avenir Next" system
// stack, which was never actually self-hosted: a commercial Linotype/Monotype
// typeface with no free self-hosting path, silently falling through to a
// generic system sans on every non-Apple machine; Stage 12 — Poppins itself
// swapped for Urbanist, same token architecture, see main.scss). latin-*/
// latin-ext-* subpaths specifically, not the package-default full-unicode
// imports — same subsetting fix already applied to My Taste's fonts
// (my-taste.jsx), which without it pulled 46 files / 620KB for three
// families this English-language site only ever renders in Latin script.
import "@fontsource/urbanist/latin-400.css";
import "@fontsource/urbanist/latin-ext-400.css";
import "@fontsource/urbanist/latin-600.css";
import "@fontsource/urbanist/latin-ext-600.css";
import "./styles/main.scss";
import "./lib/gsap.js";


ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
