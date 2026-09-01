// Scratch playback engine — an AudioWorkletProcessor that reads a decoded
// preview as a variable-speed tape head. Stage 6, Phase 8.
//
// WHY THIS EXISTS AT ALL. `AudioBufferSourceNode.playbackRate` is documented
// as accepting negative values, but no shipping engine actually plays a buffer
// backwards through it — Chrome and Safari both clamp to 0 and output silence.
// The deck's whole audio path (turntable-audio.js) is built on that node, and
// it is correct for everything else it does, but a scratch that cannot go
// BACKWARDS is a pitch bend, not a scratch. Reverse is the defining half of
// the sound. So the scratch gets its own source node, and only for the length
// of the gesture; turntable-audio.js hands playback back to the ordinary
// AudioBufferSourceNode the moment the platter is back at speed.
//
// WHY IT LIVES IN public/ RATHER THAN src/. `audioWorklet.addModule()` takes a
// URL and fetches it as a real network request — it is not an import Vite can
// see through. The `?url` and `new URL(..., import.meta.url)` forms both route
// the file back through Vite's JS transform pipeline, which is a no-op for
// this file today but is one dependency away from emitting an ESM wrapper into
// a scope that has no module loader. public/ is copied byte-for-byte into
// dist/ and served verbatim in dev, which is the only guarantee that matters
// for a file the audio thread has to parse.
//
// It therefore has NO imports and shares no constants with the rest of the
// client. The two numbers duplicated from turntable-audio.js are marked below.

// Below this |rate| the record is effectively held still and must be SILENT.
// A stopped record makes no sound, and reading one sample repeatedly is a DC
// offset, which thumps rather than sustains.
const SILENCE_RATE = 0.02;

// At and above this |rate| the record is at full level. Between the two the
// gain fades in, so cueing slowly produces the low rumble a real deck makes
// rather than snapping from silence to full.
const FULL_RATE = 0.14;

// One-pole coefficient for the gain follower, ~10ms at 48kHz. Only the GAIN is
// smoothed here — `rate` arrives as an a-rate AudioParam that the main thread
// has already ramped, and smoothing it twice would just add latency to the one
// value that must not lag.
const GAIN_COEF = 0.002;

// How often to report the read position back to the main thread, in render
// quanta. 8 quanta is ~21ms at 48kHz — far finer than anything that reads it
// (getElapsed(), and the hand-back offset) actually needs.
const REPORT_EVERY = 8;

class ScratchProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [{
            name: "rate",
            defaultValue: 1,
            // Wider than the gesture layer's own clamp on purpose: this is a
            // safety rail against a bad value, not the musical range.
            minValue: -8,
            maxValue: 8,
            automationRate: "a-rate",
        }];
    }

    constructor() {
        super();

        this.channels = null;   // Float32Array[] — the decoded preview
        this.frames = 0;        // length in samples
        this.position = 0;      // fractional read head, in samples
        this.active = false;
        this.gain = 0;
        this.quantum = 0;
        this.reportedEnd = false;

        this.port.onmessage = ({ data }) => {
            if (!data) return;

            if (data.type === "load") {
                // Transferred, not copied — see turntable-audio.js's own
                // comment at the postMessage call site.
                this.channels = data.channels;
                this.frames = this.channels[0] ? this.channels[0].length : 0;
                return;
            }

            if (data.type === "start") {
                // decodeAudioData resamples to the context's rate, so the
                // buffer's sample rate IS this worklet's `sampleRate` global.
                // No conversion, and nothing to get wrong on a 44.1k device.
                this.position = this.clampPosition(data.position * sampleRate);
                this.gain = 0;
                this.active = true;
                this.reportedEnd = false;
                return;
            }

            if (data.type === "stop") {
                this.active = false;
                return;
            }
        };
    }

    clampPosition(p) {
        const max = this.frames - 1;
        if (!(p > 0)) return 0;       // also catches NaN
        return p > max ? max : p;
    }

    process(_inputs, outputs, parameters) {
        const out = outputs[0];
        if (!out || out.length === 0) return true;

        const blockSize = out[0].length;

        if (!this.active || !this.channels || this.frames < 4) {
            for (let c = 0; c < out.length; c++) out[c].fill(0);
            return true;
        }

        const rateParam = parameters.rate;
        const rateIsConstant = rateParam.length === 1;
        const maxIndex = this.frames - 1;
        const sourceChannels = this.channels.length;

        let position = this.position;
        let gain = this.gain;

        for (let i = 0; i < blockSize; i++) {
            const rate = rateIsConstant ? rateParam[0] : rateParam[i];
            const speed = rate < 0 ? -rate : rate;

            // Level follows SPEED, not direction — a record dragged backwards
            // is exactly as loud as one dragged forwards.
            let target;
            if (speed <= SILENCE_RATE) {
                target = 0;
            } else if (speed >= FULL_RATE) {
                target = 1;
            } else {
                const u = (speed - SILENCE_RATE) / (FULL_RATE - SILENCE_RATE);
                target = u * u * (3 - 2 * u); // smoothstep — no corner at either end
            }

            // Pinned against either end of the preview: the head is not moving
            // over new groove, so it must be silent regardless of how fast the
            // hand is still travelling.
            if ((position <= 0 && rate < 0) || (position >= maxIndex && rate > 0)) {
                target = 0;
            }

            gain += (target - gain) * GAIN_COEF;

            const index = position | 0;      // position is always >= 0 here
            const frac = position - index;

            // Catmull-Rom (cubic Hermite) rather than linear. Linear
            // interpolation is a weak lowpass whose cutoff moves with the
            // fractional offset, so a slow scratch audibly dulls and
            // brightens as the head drifts between samples. Four taps costs
            // nothing at this block size and holds the top end steady.
            const i0 = index > 0 ? index - 1 : 0;
            const i1 = index;
            const i2 = index < maxIndex ? index + 1 : maxIndex;
            const i3 = index + 2 <= maxIndex ? index + 2 : maxIndex;

            for (let c = 0; c < out.length; c++) {
                // Mono buffer into a stereo destination duplicates rather
                // than leaving the right channel silent.
                const data = this.channels[c < sourceChannels ? c : 0];
                const y0 = data[i0];
                const y1 = data[i1];
                const y2 = data[i2];
                const y3 = data[i3];

                const a = 0.5 * (-y0 + 3 * y1 - 3 * y2 + y3);
                const b = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
                const d = 0.5 * (-y0 + y2);

                out[c][i] = (((a * frac + b) * frac + d) * frac + y1) * gain;
            }

            position += rate;
            if (position < 0) position = 0;
            else if (position > maxIndex) position = maxIndex;
        }

        this.position = position;
        this.gain = gain;

        if (++this.quantum >= REPORT_EVERY) {
            this.quantum = 0;
            this.port.postMessage({
                type: "position",
                position: position / sampleRate,
                atEnd: position >= maxIndex,
            });
        }

        return true;
    }
}

registerProcessor("scratch-processor", ScratchProcessor);
