import "../styles/main.scss"
import SocialIcon from "./social-icon.jsx"

export default function Footer() {
    return(
        <footer className="footer">
            <p className="watermark">Diego Damian <span className="watermark-year">· {new Date().getFullYear()}</span></p>
            <div className="footer-links">
                <SocialIcon name="linkedin" href="https://www.linkedin.com/in/diegodamian02/" />
                <SocialIcon name="github" href="https://github.com/diegodamian02" />
                <SocialIcon name="spotify" href="https://open.spotify.com/user/12182870270?si=ff914bbc78404c66" />
            </div>
        </footer>
    );
}
