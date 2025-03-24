import { useState, useEffect } from "react";
import "../styles/main.scss";
import pomodoro from "../assets/pomodoro.png"
import harmoni from  "../assets/harmony-cover.png"
import chess from "../assets/chess.png"

export default function Projects() {
    const projects = [
        { title: "Diego's Pomodoro", image: pomodoro },
        { title: "Harmoni - Dating App", image: harmoni },
        { title: "Check My Chess", image: chess }
    ];

    const [currentProject, setCurrentProject] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentProject((prev) => (prev + 1) % projects.length);
        }, 3000); // Change project every 3 seconds

        return () => clearInterval(interval);
    }, [projects.length]);

    return (
        <section className="project-slideshow-section">
            <div className="project-slideshow">
                <div className="image-wrapper">
                    <img src={projects[currentProject].image} alt={projects[currentProject].title}
                         className="slideshow-image"/>
                </div>
                <h2 className="slideshow-title">{projects[currentProject].title}</h2>
            </div>
        </section>
    );
}
