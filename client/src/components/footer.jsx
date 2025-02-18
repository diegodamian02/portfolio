import {useState, useEffect} from "react";
import "../styles/main.scss"
import linkedinWhite from "../assets/linkedin.png"
import githubWhite from "../assets/github.png"
import githubBlack from "../assets/github_black.png"
import spotifyWhite from "../assets/spotify_white.png"
import spotifyBlack from "../assets/spotify_black.png"

export default function Footer() {
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

    useEffect(() => {
        const handleTheme = () => {
            setTheme(document.documentElement.getAttribute("data-theme") || "dark");
        };

        window.addEventListener("themeChange", handleTheme);
        return () => window.removeEventListener("themeChange", handleTheme);
    }, []);
    return(
        <footer className="footer">
            <p className="watermark">© 2025 | Diego Damian</p>
            <div className="footer-links">
                <a href="https://www.linkedin.com/in/diegodamian02/" target="_blank" rel="noopener noreferrer">
                    <img className="linkedin-icon" src={linkedinWhite} alt="LinkedIn"/>
                </a>
                <a href="https://github.com/diegodamian02" target="_blank" rel="noopener noreferrer">
                    <img className="github-icon" src={theme === "dark" ? githubWhite : githubBlack} alt="Github"/>
                </a>
                <a href="https://open.spotify.com/user/12182870270?si=ff914bbc78404c66" target="_blank"
                   rel="noopener noreferrer">
                    <img className="spotify-icon" src={theme === "dark" ? spotifyWhite : spotifyBlack} alt="Spotify"/>
                </a>
            </div>
        </footer>
    );
}