import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../styles/main.scss";
import rutgers from "../assets/rutgers.png";
import peru from "../assets/peru.png";
import usa from "../assets/usa.png";
import diego from "../assets/diego.png";
import codewiz from "../assets/codewiz.jpeg";
import trump from "../assets/trump.jpeg";
import arrowBlack from "../assets/arrow.png"
import arrowWhite from "../assets/arrow_white.png"

export default function About() {
    const [topTracks, setTopTracks] = useState([]);
    const [topArtists, setTopArtists] = useState([]);
    const [scrollProgress, setScrollProgress] = useState(0);
    const timelineRef = useRef(null);
    const arrowRef = useRef(null)


    //Fetch Spotify Profile, Top Tracks & Artist
    const fetchSpotifyData = async (token) => {
        try {
            const trackRes = await axios.get("https://portfolio-production-8fce.up.railway.app/api/spotify/top-tracks");
            setTopTracks(trackRes.data)

            const artistRes = await axios.get("https://portfolio-production-8fce.up.railway.app/api/spotify/top-artists");
            setTopArtists(artistRes.data)
        } catch (error){
            console.error("Error Fetching Spotify Data", error);
        }
    };

    // Scroll Effect for Horizontal Timeline
    useEffect(() => {
        const handleScroll = () => {
            const section = timelineRef.current;
            if (!section) return;

            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            const windowScoll = window.scrollY;
            const windowHeight = window.innerHeight;

            //Ensure section takes full page before scroll
            if (windowScoll >= sectionTop - windowHeight / 2 && windowScoll < sectionTop + sectionHeight) {
                const progress = Math.min(100, ((windowScoll - sectionTop + windowHeight / 2) / sectionHeight) * 100);
                setScrollProgress(progress);

                //Adjust arrow size
                if (arrowRef.current) {
                    arrowRef.current.style.transform = `scale(${1 + progress / 100})`;
                }
            }
        };

        window.addEventListener("scroll", handleScroll);
    }, []);

    return (
        <>
            {/* Bio Section */}
            <section className="about-section bio-section">
                <div className="bio-container">
                    <div className="bio-left">
                        <img src={diego} alt="Diego Damian" className="profile-photo" />
                        <img src={rutgers} alt="Rutgers University" className="university-logo" />
                    </div>
                    <div className="bio-right">
                        <h2>About Me</h2>
                        <p>Hello! I'm Diego Damian, an aspiring software engineer with a passion for developing
                            innovative systems.
                            Since a young age, I loved creating things, and the ability to express ideas through
                            software fascinated me.
                            Originally from <img src={peru} alt="Peru" className="flag"/> Peru, now living in the
                            United States <img src={usa} alt="USA" className="flag"/>.
                        </p>
                        <h2>Education</h2>
                        <p>Currently pursuing a **Bachelor of Science in Computer Science** at Rutgers University - New
                            Brunswick.
                            My academic journey has helped me refine my problem-solving skills and gain hands-on
                            experience in software development.</p>
                    </div>
                </div>
        </section>

    {/* Work Experience Section */}
    <section className="about-section work-experience">
        <h2 className="work-title">Work Experience</h2>
        <div className="timeline-container">
             <div className="timeline" style={{height: `${scrollProgress}%`}}>
                        <div className="timeline-item">
                        <img src={codewiz} alt="CodeWiz" className="timeline-image" />
                            <div className="timeline-content">
                                <h3>CodeWiz</h3>
                                <p>Mentored young students in programming and robotics, helping them build real-world projects.</p>
                                <span className="date">2024 - Present</span>
                            </div>
                        </div>
                        <div className="timeline-item">
                            <img src={trump} alt="Trump National Golf Club" className="timeline-image" />
                            <div className="timeline-content">
                                <h3>Trump National Golf Club</h3>
                                <p>Worked in hospitality, providing high-quality service and refining my communication skills.</p>
                                <span className="date">2022 - 2024</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Spotify Section */}
            <section className="about-section spotify-section">
                <h2>🎵 My Top Tracks</h2>
                <ul>
                    {topTracks.length > 0 ? (
                        topTracks.map((track, index) => (
                            <li key={index}>
                                <img src={track.album.images[0]?.url} alt={track.name} className="spotify-track-img"/>
                                {track.name} - {track.artists.map(artist => artist.name).join(", ")}
                            </li>
                        ))
                    ) : (
                        <p>Loading top tracks...</p>
                    )}
                </ul>

                <h2>🎤 My Top Artists</h2>
                <ul>
                    {topArtists.length > 0 ? (
                        topArtists.map((artist, index) => (
                            <li key={index}>
                                <img src={artist.images[0]?.url} alt={artist.name} className="spotify-artist-img"/>
                                {artist.name}
                            </li>
                        ))
                    ) : (
                        <p>Loading top artists...</p>
                    )}
                </ul>
            </section>
        </>
    );
}
