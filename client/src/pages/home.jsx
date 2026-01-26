import { useState, useEffect, useRef } from "react";
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
    const sectionRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentProject((prev) => (prev + 1) % projects.length);
        }, 5000); // Change project every 5 seconds

        return () => clearInterval(interval);
    }, [projects.length]);

    useEffect(() => {
        const section = sectionRef.current;
        const canvas = canvasRef.current;
        if (!section || !canvas) return;

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (prefersReducedMotion.matches) return;

        const ctx = canvas.getContext("2d", { alpha: true });
        const dpr = window.devicePixelRatio || 1;
        let animationId = 0;
        let lastMove = 0;
        let lastPoint = null;
        const splats = [];
        const hues = [195, 210, 260, 300, 335];

        const resizeCanvas = () => {
            const rect = section.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const addSplat = (x, y, vx, vy) => {
            splats.push({
                x,
                y,
                vx,
                vy,
                life: 1,
                radius: 24 + Math.random() * 24,
                hue: hues[Math.floor(Math.random() * hues.length)],
            });
        };

        const handleMove = (x, y) => {
            const now = performance.now();
            if (now - lastMove < 12) return;
            lastMove = now;

            const vx = lastPoint ? x - lastPoint.x : 0;
            const vy = lastPoint ? y - lastPoint.y : 0;
            lastPoint = { x, y };
            addSplat(x, y, vx * 0.25, vy * 0.25);
        };

        const onPointerMove = (event) => {
            const rect = section.getBoundingClientRect();
            handleMove(event.clientX - rect.left, event.clientY - rect.top);
        };

        const onTouchMove = (event) => {
            const touch = event.touches[0];
            if (!touch) return;
            const rect = section.getBoundingClientRect();
            handleMove(touch.clientX - rect.left, touch.clientY - rect.top);
        };

        const tick = () => {
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

            ctx.globalCompositeOperation = "lighter";
            for (let i = splats.length - 1; i >= 0; i -= 1) {
                const splat = splats[i];
                splat.life -= 0.02;
                splat.x += splat.vx;
                splat.y += splat.vy;
                splat.vx *= 0.96;
                splat.vy *= 0.96;

                if (splat.life <= 0) {
                    splats.splice(i, 1);
                    continue;
                }

                const gradient = ctx.createRadialGradient(
                    splat.x,
                    splat.y,
                    0,
                    splat.x,
                    splat.y,
                    splat.radius
                );
                gradient.addColorStop(0, `hsla(${splat.hue}, 90%, 65%, ${0.18 * splat.life})`);
                gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(splat.x, splat.y, splat.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            animationId = window.requestAnimationFrame(tick);
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        section.addEventListener("pointermove", onPointerMove);
        section.addEventListener("touchmove", onTouchMove, { passive: true });
        animationId = window.requestAnimationFrame(tick);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            section.removeEventListener("pointermove", onPointerMove);
            section.removeEventListener("touchmove", onTouchMove);
            window.cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <section className="home" ref={sectionRef}>
            <canvas ref={canvasRef} className="hero-fluid" aria-hidden="true" />
            <h1 className="hero-title">Diego Damian</h1>
            <p className="hero-subtitle">Let's Make The Impossible Possible!</p>
        </section>
    );
}
