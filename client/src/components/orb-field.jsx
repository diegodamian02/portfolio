import NavOrb from "./nav-orb.jsx";
import { SECTIONS } from "../lib/sections.js";

export default function OrbField() {
    return (
        <div className="orb-field">
            {SECTIONS.map((section) => (
                <NavOrb key={section.id} id={section.id} label={section.label} />
            ))}
        </div>
    );
}
