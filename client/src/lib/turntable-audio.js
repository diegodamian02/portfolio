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
function startBuffer(buffer, url, trackId, offset) {
    teardownSource();

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
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setTargetAtTime(TARGET_VOLUME, ctx.currentTime, RAMP_TAU);

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
export function playCached({ previewUrl, trackId, offset = 0 } = {}) {
    if (!ctx || !masterGain) return false;
    const url = previewUrl ?? currentUrl;
    const buffer = url && bufferCache.get(url);
    if (!buffer) return false;
    if (ctx.state === "suspended") ctx.resume(); // fire-and-forget, don't await
    startBuffer(buffer, url, trackId, offset);
    return true;
}

/**
 * Starts playback from `offset` seconds. Always builds a fresh source —
 * AudioBufferSourceNodes are single-use and cannot be restarted.
 */
export async function play({ previewUrl, trackId, offset = 0 } = {}) {
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

    return startBuffer(buffer, url, trackId, offset);
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

/** Volume changes always go through the GainNode — iOS ignores element volume. */
export function setVolume(value, timeConstant = 0.05) {
    if (!ctx || !masterGain) return;
    const v = Math.max(0, Math.min(1, value));
    masterGain.gain.setTargetAtTime(v, ctx.currentTime, timeConstant);
}

/** Exposed for Phase 9 (pitch fader). Default 1. */
export function setRate(rate) {
    playbackRate = Math.max(0.5, Math.min(2, rate));
    if (currentSource) currentSource.playbackRate.value = playbackRate;
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
