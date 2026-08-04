import VinylRecord from "./vinyl-record.jsx";
import StrobeRing from "./strobe-ring.jsx";

export default function Turntable({ track = null }) {
    return (
        <div className="turntable">
            <div className="turntable-plinth">
                <div className="turntable-fader" aria-hidden="true">
                    <div className="turntable-fader-track">
                        <span className="turntable-fader-tick" style={{ top: "0%" }} />
                        <span className="turntable-fader-tick" style={{ top: "25%" }} />
                        <span className="turntable-fader-tick turntable-fader-tick-center" style={{ top: "50%" }} />
                        <span className="turntable-fader-tick" style={{ top: "75%" }} />
                        <span className="turntable-fader-tick" style={{ top: "100%" }} />
                        <div className="turntable-fader-handle" />
                    </div>
                </div>

                <div className="turntable-controls" aria-hidden="true">
                    <div className="turntable-power-led" />
                    <div className="turntable-speed-buttons">
                        <div className="turntable-speed-button" />
                        <div className="turntable-speed-button" />
                    </div>
                    <div className="turntable-start-button" />
                </div>

                <div className="turntable-arm-rest" aria-hidden="true" />

                <div className="turntable-platter-mount">
                    <div className="turntable-platter">
                        <div className="turntable-platter-spin">
                            <StrobeRing />
                            <div className="turntable-mat" aria-hidden="true" />
                            <VinylRecord track={track} />
                            <div className="turntable-spindle" aria-hidden="true" />
                        </div>
                    </div>
                </div>

                <div className="turntable-tonearm" aria-hidden="true">
                    <div className="turntable-tonearm-bearing" />
                    <div className="turntable-tonearm-pivot" />
                    <div className="turntable-tonearm-rotor">
                        <div className="turntable-tonearm-counterweight-stub" />
                        <div className="turntable-tonearm-counterweight" />
                        <div className="turntable-tonearm-arm">
                            <div className="turntable-tonearm-head">
                                <div className="turntable-tonearm-needle" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
