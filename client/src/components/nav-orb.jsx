import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { scrollToSection } from "../lib/scroll.js";

const RADIUS_X = 90;
const RADIUS_Y = 70;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export default function NavOrb({ id, label }) {
    const [{ x, y, scale, glow }, api] = useSpring(() => ({ x: 0, y: 0, scale: 1, glow: 0 }));

    const bind = useDrag(
        ({ down, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], tap }) => {
            if (tap) {
                api.start({ glow: 0 });
                scrollToSection(id);
                return;
            }
            if (down) {
                api.start({
                    x: clamp(mx, -RADIUS_X, RADIUS_X),
                    y: clamp(my, -RADIUS_Y, RADIUS_Y),
                    scale: 1.08,
                    glow: 1,
                    immediate: (key) => key === "x" || key === "y" || key === "scale",
                });
            } else {
                api.start({
                    x: 0,
                    y: 0,
                    scale: 1,
                    glow: 0,
                    immediate: false,
                    config: (key) => {
                        if (key === "x") return { tension: 210, friction: 14, velocity: vx * dx * 18 };
                        if (key === "y") return { tension: 210, friction: 14, velocity: vy * dy * 18 };
                        return { tension: 300, friction: 20 };
                    },
                });
            }
        },
        { filterTaps: true, tapsThreshold: 6 }
    );

    return (
        <animated.button
            {...bind()}
            className="nav-orb"
            style={{ x, y, scale, "--orb-glow": glow, touchAction: "none" }}
            aria-label={`Go to ${label}`}
        >
            <span className="nav-orb-label">{label}</span>
        </animated.button>
    );
}
