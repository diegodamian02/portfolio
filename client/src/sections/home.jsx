import { useState } from "react";
import "../styles/main.scss";
import Turntable from "../components/turntable.jsx";
import RecordCrate from "../components/record-crate.jsx";

export default function Home() {
    const [nowPlaying, setNowPlaying] = useState(null);

    return (
        <section className="home">
            <div className="hero-content">
                <h1 className="hero-name">Diego Damian</h1>
                <p className="hero-tagline">welcome to my playground</p>
                <div className="hero-vu-slot" aria-hidden="true" />
            </div>
            <RecordCrate onSelect={setNowPlaying} />
            <div className="hero-deck-stage">
                <Turntable track={nowPlaying} />
            </div>
        </section>
    );
}
