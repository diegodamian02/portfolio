// Turntable audio engine.
//
// A MODULE-LEVEL SINGLETON, deliberately — not per-component state. Safari caps
// the number of concurrent AudioContexts and does not reliably release them on
// GC, so a context created per mount would eventually stop producing sound with
// no error. There is exactly one, created lazily, reused forever.
//
// Graph:
//     AudioBufferSourceNode → masterGain → destination
//                                  └─────→ analyser   (tap, no output)
//
// The analyser is built now even though nothing reads it until Stage 7. It is
// free here and painful to retrofit once the graph has consumers.
//
// Preview audio is fetched DIRECTLY from Apple's CDN — verified 2026-08-11 across
// Blink (desktop, Pixel 5, Galaxy S9+) and WebKit (Safari 17.6): the CDN sends
// access-control-allow-origin: *, decodeAudioData returns ~30s / 2ch, and the
// analyser reads non-zero data (i.e. the stream is not tainted). It does NOT go
// through /api/itunes/preview-proxy, which stays dormant. Only SEARCH is proxied.

const TARGET_VOLUME = 0.65;

// setTargetAtTime approaches exponentially and is ~95% there at 3τ, so this
// gives the ~0.8s fade the spec asks for.
const RAMP_TAU = 0.26;

// Short enough to be inaudible, long enough that the browser treats it as real
// output. Used only to satisfy iOS's unlock rules.
const SILENT_UNLOCK_SECONDS = 0.001;

let ctx = null;
let masterGain = null;
let analyser = null;

let currentSource = null;
let currentTrackId = null;
let currentUrl = null;

// Wall-clock bookkeeping for pause/resume. AudioBufferSourceNode cannot be
// paused or restarted — it is single-use — so "resume" means creating a fresh
// source and starting it at a stored offset.
let startedAtCtxTime = 0;
let startOffset = 0;
let isPlaying = false;

// stop() also triggers source.onended, so intentional stops must be
// distinguishable from a preview genuinely reaching its end.
let stoppingIntentionally = false;

let playbackRate = 1;
let lastError = null;

const bufferCache = new Map(); // previewUrl -> AudioBuffer
const endedListeners = new Set();

function getContextClass() {
    return window.AudioContext || window.webkitAudioContext || null;
}

export function isSupported() {
    return getContextClass() !== null;
}

/**
 * Creates the AudioContext and unlocks it. MUST be called synchronously from
 * inside a real user-gesture handler (see record-crate.jsx's selectTrack).
 *
 * Safe to call repeatedly — the context is created once.
 */
export function init() {
    const AC = getContextClass();
    if (!AC) {
        lastError = "Web Audio is not supported in this browser.";
        return null;
    }

    if (!ctx) {
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0;

        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        masterGain.connect(ctx.destination);
        // Tap only — an AnalyserNode processes whatever reaches it and does not
        // need its output connected onward.
        masterGain.connect(analyser);

        // Proves the singleton holds. If this ever logs twice, something is
        // constructing a second context and Safari will eventually go silent.
        console.info("[turntable-audio] AudioContext created", { sampleRate: ctx.sampleRate });
    }

    // resume() alone is not always enough on iOS: it wants actual output during
    // the gesture. Our real play() lands ~2s later at needle contact, and that
    // gap is exactly where the unlock tends to fail — so push a silent buffer
    // through now, synchronously, while we still hold the gesture.
    try {
        const buf = ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * SILENT_UNLOCK_SECONDS)), ctx.sampleRate);
        const unlock = ctx.createBufferSource();
        unlock.buffer = buf;
        unlock.connect(ctx.destination);
        unlock.start(0);
    } catch {
        // Non-fatal: the unlock is belt-and-braces, not the mechanism.
    }

    if (ctx.state === "suspended") ctx.resume();
    return ctx;
}

/** Fetches and decodes a preview, cached by URL so re-picking never refetches. */
export async function load(previewUrl) {
    if (!previewUrl) throw new Error("No preview URL for this track.");
    if (bufferCache.has(previewUrl)) return bufferCache.get(previewUrl);
    if (!ctx) init();
    if (!ctx) throw new Error("No AudioContext.");

    const res = await fetch(previewUrl);
    if (!res.ok) throw new Error(`Preview fetch failed (${res.status}).`);
    const arrayBuffer = await res.arrayBuffer();

    // Safari still ships only the callback form of decodeAudioData in some
    // versions, so accept either shape.
    const buffer = await new Promise((resolve, reject) => {
        const maybePromise = ctx.decodeAudioData(arrayBuffer, resolve, reject);
        if (maybePromise && typeof maybePromise.then === "function") {
            maybePromise.then(resolve, reject);
        }
    });

    bufferCache.set(previewUrl, buffer);
    return buffer;
}

// ---- spin linkage ------------------------------------------------------
//
// Pins playback to the platter so a pause is a power-DOWN, not a cut: as the
// brake ramps timeScale toward 0 the pitch sags with it and the level fades,
// and a resume winds both back up. The turntable drives this from the spin
// tween's own onUpdate, so the audio rides the EXACT curve the platter is on —
// including Task 4's proportional durations, which is what makes pausing from a
// half-speed platter produce a correspondingly shorter power-down for free.

// Below this the resampler produces aliasing garbage rather than a slower
// record, so playback is cut here instead of being ridden to zero.
export const RATE_FLOOR = 0.2;

// Full volume at and above this timeScale. Between here and the floor the
// record fades, so it reaches silence exactly AT the floor and the cut lands on
// silence — a cut at audible level would click.
const GAIN_FULL_AT = 0.85;

// Short enough that the parameter tracks the tween within a frame, long enough
// to avoid zipper noise from 60 discrete writes a second.
const SPIN_FOLLOW_TAU = 0.012;

let spinLinked = false;

// Sources that are fading out but still sounding. Held so a rapid press can
// hard-stop them instead of letting several overlap.
const retiring = new Set();

function hardStopRetiring() {
    for (const source of retiring) {
        try { source.stop(); } catch { /* already stopped */ }
        try { source.disconnect(); } catch { /* already disconnected */ }
    }
    retiring.clear();
}

function spinGain(timeScale) {
    const u = Math.min(1, Math.max(0, (timeScale - RATE_FLOOR) / (GAIN_FULL_AT - RATE_FLOOR)));
    return TARGET_VOLUME * u * u * (3 - 2 * u); // smoothstep — no corner at either end
}

/**
 * Hands gain and playback rate to the platter. Called before a transport ramp.
 *
 * The needle drop deliberately does NOT use this: there the deck is treated as
 * already up to speed, so the record starts at pitch with the slow fade-in from
 * Task 2 rather than bending up from the floor.
 */
export function beginSpinLink() { spinLinked = true; }
export function endSpinLink() {
    spinLinked = false;
    // Back to pitch, so the next needle drop or replay does not inherit
    // whatever rate the last power-down left behind.
    setRate(1);
}
export function isSpinLinked() { return spinLinked; }

/**
 * Drives rate and gain from the platter's current timeScale.
 *
 * `stopAtFloor` is true only while braking. On a wind-up the same low timeScale
 * values are passed through on the way UP, and cutting there would kill the
 * playback that is just starting.
 */
export function followSpin(timeScale, { stopAtFloor = false } = {}) {
    if (!spinLinked || !ctx || !masterGain) return;
    const t = Math.max(0, timeScale);

    if (t <= RATE_FLOOR) {
        if (stopAtFloor) {
            // spinGain() has been targeting 0 on the way down, but
            // setTargetAtTime approaches asymptotically and never arrives —
            // measured, the cut landed at 0.015 (about -33dB). Inaudible in
            // practice, but a 30ms fade makes the teardown provably silent
            // rather than probably silent.
            if (isPlaying) fadeOutAndStop(0.03);
        } else {
            masterGain.gain.setTargetAtTime(0, ctx.currentTime, SPIN_FOLLOW_TAU);
            setRate(RATE_FLOOR);
        }
        return;
    }

    setRate(t);
    masterGain.gain.setTargetAtTime(spinGain(t), ctx.currentTime, SPIN_FOLLOW_TAU);
}

/** Lands rate and gain exactly, so a ramp can't leave them a hair off target. */
export function settleSpin(timeScale) {
    if (!ctx || !masterGain) return;
    if (timeScale <= 0) return;
    setRate(timeScale);
    if (spinLinked) {
        masterGain.gain.setTargetAtTime(spinGain(timeScale), ctx.currentTime, SPIN_FOLLOW_TAU);
    }
}

/**
 * Fade to silence, then stop — for reduced motion, where there is no brake to
 * follow and an abrupt cut is the only alternative.
 *
 * stop() cannot do this: it tears the source down in the same tick, so its gain
 * ramp never becomes audible. That is why the deck cut abruptly.
 */
export function fadeOutAndStop(seconds = 0.15) {
    if (!ctx || !masterGain || !currentSource) return stop();
    const elapsed = getElapsed();
    const source = currentSource;

    // A LINEAR ramp, not setTargetAtTime: the exponential approaches zero
    // asymptotically and never arrives — measured, it stalled around 0.03
    // (about -26dB) and stayed there. A linear ramp lands on exactly 0 at
    // exactly the moment the source below is scheduled to stop, so the fade and
    // the teardown cannot disagree.
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + seconds);

    // Detach the bookkeeping NOW so the deck counts as stopped and a new press
    // can start a fresh source, but let this node keep sounding until the fade
    // lands. onended is cleared so the retirement can't read as end-of-track.
    source.onended = null;
    currentSource = null;
    isPlaying = false;
    startOffset = elapsed;

    try { source.stop(ctx.currentTime + seconds); } catch { /* already stopped */ }
    retiring.add(source);
    setTimeout(() => {
        try { source.disconnect(); } catch { /* already disconnected */ }
        retiring.delete(source);
    }, seconds * 1000 + 80);

    return elapsed;
}

function teardownSource() {
    if (!currentSource) return;
    stoppingIntentionally = true;
    try { currentSource.stop(); } catch { /* already stopped */ }
    try { currentSource.disconnect(); } catch { /* already disconnected */ }
    currentSource.onended = null;
    currentSource = null;
    stoppingIntentionally = false;
}

// Shared by playCached() and play() so the two can never drift apart.
function startBuffer(buffer, url, trackId, offset, fadeSeconds) {
    teardownSource();
    hardStopRetiring();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    source.connect(masterGain);

    source.onended = () => {
        if (stoppingIntentionally) return;
        isPlaying = false;
        startOffset = 0;
        currentSource = null;
        endedListeners.forEach((fn) => fn());
    };

    const safeOffset = Math.max(0, Math.min(offset, buffer.duration - 0.01));
    source.start(0, safeOffset);

    currentSource = source;
    currentUrl = url;
    currentTrackId = trackId ?? currentTrackId;
    startedAtCtxTime = ctx.currentTime;
    startOffset = safeOffset;
    isPlaying = true;
    lastError = null;

    // Ramp rather than jump — assigning gain.value produces an audible click.
    //
    // Skipped entirely while spin-linked: there the platter owns the gain, and
    // a ramp to full volume here would immediately be fought by followSpin()
    // writing the speed-derived value on the very next frame.
    if (!spinLinked) {
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setTargetAtTime(
            TARGET_VOLUME,
            ctx.currentTime,
            (fadeSeconds ? fadeSeconds / 3 : RAMP_TAU),
        );
    }

    return { duration: buffer.duration };
}

/**
 * FULLY SYNCHRONOUS play, for the needle-contact moment specifically.
 *
 * Returns false if the buffer isn't decoded yet, so the caller can fall back to
 * the async path. Exists because `await` — even on an already-resolved promise —
 * defers to a microtask that lands AFTER the frame in which GSAP wrote the arm's
 * final position. Measured: the async path put audio ~50ms (3 frames) behind
 * needle contact even with the buffer warm. This closes that gap by starting the
 * source in the same tick as the timeline callback.
 */
export function playCached({ previewUrl, trackId, offset = 0, fadeSeconds } = {}) {
    if (!ctx || !masterGain) return false;
    const url = previewUrl ?? currentUrl;
    const buffer = url && bufferCache.get(url);
    if (!buffer) return false;
    if (ctx.state === "suspended") ctx.resume(); // fire-and-forget, don't await
    startBuffer(buffer, url, trackId, offset, fadeSeconds);
    return true;
}

/**
 * Starts playback from `offset` seconds. Always builds a fresh source —
 * AudioBufferSourceNodes are single-use and cannot be restarted.
 */
export async function play({ previewUrl, trackId, offset = 0, fadeSeconds } = {}) {
    if (!ctx) init();
    if (!ctx) throw new Error("No AudioContext.");
    if (ctx.state === "suspended") await ctx.resume();

    const url = previewUrl ?? currentUrl;
    if (!url) throw new Error("Nothing to play.");

    let buffer;
    try {
        buffer = await load(url);
        lastError = null;
    } catch (err) {
        lastError = err.message || "Could not load this preview.";
        isPlaying = false;
        throw err;
    }

    return startBuffer(buffer, url, trackId, offset, fadeSeconds);
}

/** Stops playback and returns the offset reached, for a later resume. */
export function stop() {
    const elapsed = getElapsed();
    if (ctx && masterGain) {
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    }
    teardownSource();
    isPlaying = false;
    startOffset = elapsed;
    return elapsed;
}

/** Stops and clears the stored offset, so the next play starts from the top. */
export function reset() {
    stop();
    startOffset = 0;
}

export function getElapsed() {
    if (!ctx) return startOffset;
    if (!isPlaying) return startOffset;
    return startOffset + (ctx.currentTime - startedAtCtxTime) * playbackRate;
}

/**
 * Banks the time played at the CURRENT rate before the rate changes.
 *
 * getElapsed() multiplies the whole span since the last start by one rate, which
 * is only correct while that rate is constant. Once the platter bends the pitch
 * it is not, so every rate change closes off the previous segment first —
 * piecewise integration. Without this, pausing mid-power-down and resuming would
 * pick up at the wrong point in the track.
 */
function commitElapsed() {
    if (!ctx || !isPlaying) return;
    const now = ctx.currentTime;
    startOffset += (now - startedAtCtxTime) * playbackRate;
    startedAtCtxTime = now;
}

/** Volume changes always go through the GainNode — iOS ignores element volume. */
export function setVolume(value, timeConstant = 0.05) {
    if (!ctx || !masterGain) return;
    const v = Math.max(0, Math.min(1, value));
    masterGain.gain.setTargetAtTime(v, ctx.currentTime, timeConstant);
}

/**
 * Also used by the spin linkage above, and by Phase 9 (pitch fader). Default 1.
 *
 * The lower bound is RATE_FLOOR rather than 0.5 because a power-down runs the
 * rate down to the floor; 0.5 would have silently clamped the bottom half of
 * every brake to a constant pitch.
 */
export function setRate(rate) {
    const next = Math.max(RATE_FLOOR, Math.min(2, rate));
    if (next === playbackRate) return;
    commitElapsed();
    playbackRate = next;
    if (currentSource) {
        // Ramped, not assigned: 60 discrete writes a second is audible as
        // stepping on a sustained note.
        currentSource.playbackRate.setTargetAtTime(playbackRate, ctx.currentTime, SPIN_FOLLOW_TAU);
    }
}

export function onEnded(fn) {
    endedListeners.add(fn);
    return () => endedListeners.delete(fn);
}

export function getState() {
    return {
        isPlaying,
        trackId: currentTrackId,
        elapsed: getElapsed(),
        error: lastError,
        contextState: ctx ? ctx.state : "none",
    };
}

/** Stage 7 reads from this. Present now so the graph never needs rebuilding. */
export function getAnalyser() {
    return analyser;
}
