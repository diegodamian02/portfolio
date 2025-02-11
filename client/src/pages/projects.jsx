import {useEffect, useState} from "react";
import "../styles/main.scss"

export default function Projects() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const section = document.querySelector(".projects");
            if (section) {
                const rect = section.getBoundingClientRect();
                if (rect.top < window.innerHeight * 0.75) {
                    setIsVisible(true);
                }
            }
        };

        window.addEventListener("scroll", handleScroll);
        return() => window.removeEventListener("scroll", handleScroll);
    }, []);

    return(
        <section className={`projects ${isVisible ? "show-projects" : ""}`}>
            <h2 className="section-title"> My Projects</h2>
            <div className="parallax-container">
                <div className="project-card">
                    <h3>Project 1</h3>
                    <p>Brief description of the project.</p>
                    <p>We have to add the link & video of the project!</p>
                </div>
                <div className="project-card">
                    <h3>Project 2</h3>
                    <p>Brief description of the project.</p>
                    <p>We have to add the link & video of the project!</p>
                </div>
                <div className="project-card">
                    <h3>Project 1</h3>
                    <p>Brief description of the project.</p>
                    <p>We have to add the link & video of the project!</p>
                </div>
            </div>
        </section>
    );
}