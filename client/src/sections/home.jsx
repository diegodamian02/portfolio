import { useState } from "react";
import "../styles/main.scss";
import Turntable from "../components/turntable.jsx";
import RecordCrate from "../components/record-crate.jsx";
import SkylineBackground from "../components/skyline-background.jsx";

export default function Home() {
    const [nowPlaying, setNowPlaying] = useState(null);

    return (
        <section className="home">
            {/* Stage 7 — full-bleed, behind everything, pointer-events:none.
                First in the DOM so it paints under the positioned hero
                content even before z-index is considered. Replaces the
                .hero-vu-slot waveform concept outright: that reserved a
                40–50px strip inside .hero-content, and nothing will ever
                render there now. */}
            <SkylineBackground />
            <div className="hero-content">
                <h1 className="hero-name">Diego Damian</h1>
                <p className="hero-tagline">welcome to my playground</p>
            </div>
            <RecordCrate onSelect={setNowPlaying} />
            <div className="hero-deck-stage">
                <Turntable track={nowPlaying} />
            </div>
        </section>
    );
}
