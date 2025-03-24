import { useState, useEffect } from "react";
import "../styles/main.scss";
import pomodoro from "../assets/pomodoro.png"
import harmoni from "../assets/harmony-cover.png";
import chess from "../assets/chess.png"

export default function Home() {
    const projects = [
        { title: "Project 1", image: pomodoro },
        { title: "Project 2", image: harmoni },
        { title: "Project 3", image: chess }
    ];

    const [currentProject, setCurrentProject] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentProject((prev) => (prev + 1) % projects.length);
        }, 5000); // Change project every 5 seconds

        return () => clearInterval(interval);
    }, [projects.length]);

    return (
        <section className="home">
            <h1 className="hero-title">Diego Damian</h1>
            <p className="hero-subtitle">Let's Make The Impossible Possible!</p>
        </section>
    );
}
