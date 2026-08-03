import { useState } from "react";
import projects from "../data/projectsData";
import "../styles/main.scss";

export default function Portfolio() {
    const [expandedProject, setExpandedProject] = useState(null);

    const toggleProject = (id) => {
        setExpandedProject(expandedProject === id ? null : id);
    };

    return (
        <section className="portfolio-section">
            <h2 className="portfolio-title">Projects</h2>
            <p className="portfolio-subtitle">Here are some of my selected projects worth sharing.</p>

            <div className="portfolio-list">
                {projects.map((project) => (
                    <div key={project.id} className="portfolio-item">
                        {/* Expandable Header */}
                        <button className="portfolio-header" onClick={() => toggleProject(project.id)}>
                            <span className="project-title">{project.title}</span>
                            <span className="project-role">{project.role}</span>
                        </button>

                        {/* Expandable Content */}
                        {expandedProject === project.id && (
                            <div className="portfolio-details">
                                <p>{project.description}</p>
                                {project.video && (
                                    <video controls className="portfolio-video">
                                        <source src={project.video} type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                )}
                                <div className="portfolio-links">
                                    {project.github && <a href={project.github} target="_blank" rel="noopener noreferrer">GitHub</a>}
                                    {project.liveDemo && <a href={project.liveDemo} target="_blank" rel="noopener noreferrer">Live</a>}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
