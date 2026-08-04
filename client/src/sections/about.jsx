import { useState, useEffect, useRef } from "react";
import "../styles/main.scss";
import rutgers from "../assets/rutgers.png";
import peru from "../assets/peru.png";
import usa from "../assets/usa.png";
import diego from "../assets/diego.png";
import codewiz from "../assets/codewiz.jpeg";
import trump from "../assets/trump.jpeg";
import capgemini from "../assets/capgemini.svg";
import globallogic from "../assets/globallogic.png";
import arrowBlack from "../assets/arrow.png";
import arrowWhite from "../assets/arrow_white.png";

export default function About() {
    const [scrollProgress, setScrollProgress] = useState(0);
    const timelineRef = useRef(null);
    const arrowRef = useRef(null);

    // Scroll Effect for Horizontal Timeline
    useEffect(() => {
        const handleScroll = () => {
            const section = timelineRef.current;
            if (!section) return;

            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            const windowScoll = window.scrollY;
            const windowHeight = window.innerHeight;

            // Ensure section takes full page before scroll
            if (windowScoll >= sectionTop - windowHeight / 2 && windowScoll < sectionTop + sectionHeight) {
                const progress = Math.min(100, ((windowScoll - sectionTop + windowHeight / 2) / sectionHeight) * 100);
                setScrollProgress(progress);

                // Adjust arrow size
                if (arrowRef.current) {
                    arrowRef.current.style.transform = `scale(${1 + progress / 100})`;
                }
            }
        };

        window.addEventListener("scroll", handleScroll);

        return () => window.removeEventListener("scroll", handleScroll); // Cleanup on component unmount
    }, []);

    return (
        <>
            {/* Bio Section */}
            <section className="about-section bio-section">
                <div className="bio-container">
                    <div className="bio-left">
                        <img src={diego} alt="Diego Damian" className="profile-photo"/>
                        <img src={rutgers} alt="Rutgers University" className="university-logo"/>
                    </div>
                    <div className="bio-right">
                        <h2>About Me</h2>
                        <p>Hello! I'm Diego Damian, an aspiring software engineer with a passion for developing websites
                            and full-stack projects. I believe that your work speaks volumes about yourself, and that's
                            why I'm committed to bringing this website to life.
                            Originally from <img src={peru} alt="Peru" className="flag"/> Lima, Peru, and now living in
                            New Jersey, United States <img src={usa} alt="USA" className="flag"/>, I strive to blend
                            different styles and concepts I've gathered from my personal experiences. Let’s make your
                            ideas come true!
                        </p>
                        <h2>Education</h2>
                        <p>I'm currently pursuing a Bachelor of Science in Computer Science at Rutgers University - New
                            Brunswick, with a minor in Music Technology. I founded the Music Technology Club @Rutgers,
                            providing a space for people with a shared passion for music, production, and composition to
                            connect and share their ideas.
                            During my journey, I discovered my passion for website development and solving LeetCode
                            problems using Python.</p>
                    </div>
                </div>
            </section>

            {/* Work Experience Section */}
            <section className="about-section work-experience">
                <h2 className="work-title">Work Experience</h2>
                <div className="timeline-container">
                    <div className="timeline" style={{height: `${scrollProgress}%`}}>
                        <div className="timeline-item">
                            <img src={capgemini} alt="Capgemini" className="timeline-image timeline-logo"/>
                            <div className="timeline-content">
                                <h3>Capgemini — Test Engineer</h3>
                                <p>Run weekly regression cycles of 170+ cases against Archy, an AI-powered drive-thru
                                    system on GCP, for the McDonald's account. Validate new model and proxy releases
                                    before nationwide store rollout, and automate kiosk recovery with PowerShell.</p>
                                <span className="date">Apr. 2026 - Present</span>
                            </div>
                        </div>
                        <div className="timeline-item">
                            <img src={globallogic} alt="GlobalLogic" className="timeline-image timeline-logo"/>
                            <div className="timeline-content">
                                <h3>GlobalLogic — Trainee Test Engineer</h3>
                                <p>Built end-to-end automated test scripts in Java with Selenium, JUnit, and Cucumber.
                                    Refactored Gherkin scenarios, improving execution speed 40% and cross-team
                                    readability.</p>
                                <span className="date">May 2025 - Aug. 2025</span>
                            </div>
                        </div>
                        <div className="timeline-item">
                            <img src={codewiz} alt="CodeWiz" className="timeline-image"/>
                            <div className="timeline-content">
                                <h3>CodeWiz — Coding Coach</h3>
                                <p>Mentored young students in programming and robotics, helping them build real-world
                                    projects.</p>
                                <span className="date">Jan. 2025 - Jul. 2025</span>
                            </div>
                        </div>
                        <div className="timeline-item">
                            <img src={trump} alt="Trump National Golf Club" className="timeline-image"/>
                            <div className="timeline-content">
                                <h3>Trump National Golf Club</h3>
                                <p>Worked in hospitality, providing high-quality service and refining my communication
                                    skills.</p>
                                <span className="date">2022 - 2024</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
