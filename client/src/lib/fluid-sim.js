// WebGL2 fluid simulation — Stage 7a.
//
// An original implementation of the standard Stam-style "stable fluids"
// solver (advect → curl → vorticity confinement → divergence → Jacobi
// pressure projection → gradient subtract), written against this codebase's
// own-primitives pattern: React Three Fiber was abandoned, Framer Motion
// ruled out, the strobe ring is raw SVG rather than a charting library. This
// is the same call — the technique is textbook and well documented, the code
// is ours.
//
// FRAMEWORK-AGNOSTIC ON PURPOSE. No React in this file. It owns GL objects
// and a step() call; the component (fluid-background.jsx) owns the RAF loop,
// the visibility/intersection gating and the theme. That split is what lets
// the gating be tested without a GL context and the GL be reasoned about
// without effect ordering.
//
// Resolution split (the numbers Stage 7b should start from rather than
// re-derive): the SIM grid runs at 128 on its short edge; the DYE grid at
// 512. Velocity/pressure/divergence/curl all live on the 128 grid — they are
// what the Jacobi iterations hammer, 20 passes per frame, so their cost is
// what actually matters. Dye is advected once per frame and only needs to be
// sharp, so it gets 4× the linear resolution for 16× the texels at 1/20th
// the pass count. Rendering to the canvas is a single upscaled quad.

const SIM_RESOLUTION = 128;
const DYE_RESOLUTION = 512;
const PRESSURE_ITERATIONS = 20;

// ---- bloom (Stage 7c) -------------------------------------------------------
//
// The glow pass. Everything before 7c composited raw dye straight onto the
// page, which is why the field read as flat coloured smoke rather than
// anything luminous: a fluid solver produces soft-edged density, and soft
// edges without a bloom look like fog, not light.
//
// Standard threshold → downsample chain → additive upsample chain. Costs ~11
// extra blits per frame, but every one of them is on a texture at most a
// quarter the dye grid's area, and the whole chain measured well inside the
// frame budget on real hardware (numbers in STATUS.md).
const BLOOM_RESOLUTION = 256;
const BLOOM_ITERATIONS = 6;
// Soft-knee threshold: brightness below THRESHOLD contributes nothing, above
// it contributes fully, and KNEE is the width of the quadratic ramp between.
// A hard threshold makes the glow pop in and out as dye crosses the cutoff.
const BLOOM_THRESHOLD = 0.32;
const BLOOM_SOFT_KNEE = 0.7;

// Per-frame multiplier on the pressure field, carried between frames as a
// warm start for the Jacobi solve. 1.0 would let pressure accumulate
// forever; 0 would throw away a perfectly good initial guess and need far
// more iterations to converge.
const PRESSURE_DECAY = 0.8;

// Vorticity confinement strength — re-injects the small-scale swirl that a
// semi-Lagrangian advection step numerically dissipates away. This is the
// knob that makes the difference between "smoke" and "soup".
const CURL_STRENGTH = 30;

// Exponential decay rates, per second, applied inside the advection shader.
//
// Raised back toward the reference technique's own default in Stage 7b, and
// for exactly the reason FINDINGS.md B53 recorded when 7a lowered it.
//
// B53's finding was that the published constants are tuned for CONTINUOUS
// injection — a pointer-driven demo where the visitor drags dye in every
// frame — so fast decay is what stops the field saturating. 7a's idle
// placeholder injected one splat every ~2.2s, which is the opposite regime,
// and at 1.0 the dye had decayed to a peak alpha of 6/255 before anything
// could see it; 0.10 was the right answer for that.
//
// 7b puts the background back INTO the continuous-injection regime: while a
// track plays, splats arrive on the beat, several times a second. At 0.10
// that pinned peak dye at a fully saturated 1.0 for the entire playback and
// left the settle window still above threshold when its 4s ceiling expired.
// Measured across a dissipation x dye-contribution sweep (numbers in
// STATUS.md). 1.2 was the first landing but drained the field faster than the
// beat-driven splats could refill it — measured in the real page, peak dye
// fell from the burst's 0.69 to ~0.09 within 5s while the track still played.
// 0.85 sustains a visible field between splats and still clears the 0.02
// settle threshold well inside the 4s ceiling.
//
// 7c lowers both again, and this is not a re-litigation of B53 — it is a
// change of what the field is being asked to DO. Through 7b the dye was a
// local response near the deck, so a fast decay kept it from piling up. 7c
// asks the dye to cross the whole hero and read as travelling waves, which
// means a parcel of colour has to survive long enough to get there: at 0.85 a
// splat was down to a tenth of its peak in ~2.7s, and nothing injected at the
// deck ever reached the headline side.
//
// 0.42 was the first landing and it was too far: the field kept accumulating
// for a full half-minute and eventually filled the viewport. 0.7 reaches
// equilibrium in roughly fifteen seconds and holds there. Note that the
// equilibrium level, not the decay rate, is what a sweep has to measure — the
// first 7c sweeps sampled at ten seconds and compared fields that were all
// still filling, which made the results look random.
//
// The saturation B53 warned about is handled elsewhere now: the display pass
// normalises hue by the field's own peak (see DISPLAY_SHADER), so an
// over-full field goes more opaque rather than clipping to white.
const DENSITY_DISSIPATION = 0.7;
// Lower than 7a/7b for the same reason: velocity IS the flow the dye follows,
// and a current that dies in half a second cannot carry anything across a
// 1200px hero.
const VELOCITY_DISSIPATION = 0.09;

const MAX_DT = 1 / 60;

// Side length of the square readback target behind peakDyeLevel(). 96x96 is
// 36KB per read — small enough that the synchronous stall is tolerable at the
// few-times-a-second cadence the settle check uses it at, and enough texels
// that fieldStats' coverage numbers mean something.
const PROBE_RESOLUTION = 96;

const BASE_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 aPosition;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 texelSize;

void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// Semi-Lagrangian advection: trace backwards along the velocity field and
// sample where this texel's contents came from.
const ADVECTION_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;

void main () {
    vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
    vec4 result = texture(uSource, coord);
    float decay = 1.0 + dissipation * dt;
    fragColor = result / decay;
}
`;

// Free-slip boundary: mirror the normal component at the walls so fluid
// slides along the edge instead of leaking through it.
const DIVERGENCE_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;

void main () {
    float L = texture(uVelocity, vL).x;
    float R = texture(uVelocity, vR).x;
    float T = texture(uVelocity, vT).y;
    float B = texture(uVelocity, vB).y;

    vec2 C = texture(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }

    float div = 0.5 * (R - L + T - B);
    fragColor = vec4(div, 0.0, 0.0, 1.0);
}
`;

const CURL_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;

void main () {
    float L = texture(uVelocity, vL).y;
    float R = texture(uVelocity, vR).y;
    float T = texture(uVelocity, vT).x;
    float B = texture(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    fragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`;

const VORTICITY_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;

void main () {
    float L = texture(uCurl, vL).x;
    float R = texture(uCurl, vR).x;
    float T = texture(uCurl, vT).x;
    float B = texture(uCurl, vB).x;
    float C = texture(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    // + 0.0001 rather than a branch: force is legitimately zero in still
    // regions, and normalizing zero is NaN, which would poison the velocity
    // field permanently (a NaN advects into its neighbours and never leaves).
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;

    vec2 velocity = texture(uVelocity, vUv).xy;
    velocity += force * dt;
    velocity = min(max(velocity, -1000.0), 1000.0);
    fragColor = vec4(velocity, 0.0, 1.0);
}
`;

const PRESSURE_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;

void main () {
    float L = texture(uPressure, vL).x;
    float R = texture(uPressure, vR).x;
    float T = texture(uPressure, vT).x;
    float B = texture(uPressure, vB).x;
    float divergence = texture(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    fragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;

const GRADIENT_SUBTRACT_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;

void main () {
    float L = texture(uPressure, vL).x;
    float R = texture(uPressure, vR).x;
    float T = texture(uPressure, vT).x;
    float B = texture(uPressure, vB).x;
    vec2 velocity = texture(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    fragColor = vec4(velocity, 0.0, 1.0);
}
`;

const SPLAT_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;

void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture(uTarget, vUv).xyz;
    fragColor = vec4(base + splat, 1.0);
}
`;

const CLEAR_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform float value;

void main () {
    fragColor = value * texture(uTexture, vUv);
}
`;

// Bloom prefilter: keep only what is bright enough to glow, with a soft knee
// so dye crossing the threshold ramps in rather than popping.
const BLOOM_PREFILTER_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
// (threshold - knee, knee * 2, 0.25 / knee) — precomputed on the CPU so the
// shader does not redo the same three divisions per texel.
uniform vec3 curve;
uniform float threshold;

void main () {
    vec3 c = texture(uTexture, vUv).rgb;
    float brightness = max(c.r, max(c.g, c.b));
    float soft = clamp(brightness - curve.x, 0.0, curve.y);
    soft = curve.z * soft * soft;
    float contribution = max(soft, brightness - threshold) / max(brightness, 0.0001);
    fragColor = vec4(c * contribution, 1.0);
}
`;

// Four-tap bilinear blur, used for both halves of the chain. The taps are the
// vertex shader's own vL/vR/vT/vB, so the blur radius is set entirely by the
// texelSize uniform the caller passes — the SOURCE's texel size going down,
// the DESTINATION's coming back up. That asymmetry is the whole trick: each
// level is sampled with LINEAR filtering at half scale, so four taps at the
// right offsets read like a far wider kernel than four samples has any right
// to.
const BLOOM_BLUR_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uTexture;

void main () {
    vec4 sum = texture(uTexture, vL);
    sum += texture(uTexture, vR);
    sum += texture(uTexture, vT);
    sum += texture(uTexture, vB);
    fragColor = sum * 0.25;
}
`;

// Straight (non-premultiplied) alpha, driven by dye intensity, so the canvas
// composites over the hero's own --bg-color instead of carrying a background
// of its own. That is what makes the whole thing theme-aware for free: the
// page shows through wherever there is no dye, in whichever theme is active.
//
// The hue is divided back out of the alpha rather than left scaled by it —
// otherwise the browser's own `src.rgb * src.a` composite would darken the
// colour a second time, and mid-intensity dye would read as a muddy,
// desaturated version of the accent rather than a fainter one.
//
// 7c changes the DENOMINATOR of that divide, and this one is worth spelling
// out because the obvious answer is wrong.
//
// Through 7b it divided by the CLAMPED peak, so a channel that had run past
// 1.0 stayed past 1.0 and clipped toward white — the standard way to render a
// hot core inside a coloured halo, and what every reference fluid demo does.
// Rendered on this page it produced a grey smear: dividing by a clamp both
// desaturates the core AND leaves the halo's alpha low, so the bright part
// goes white while the coloured part stays transparent. Measured side by side
// at identical dye levels, that path peaked at 0.37 with 2.6% coverage and
// looked like fog; dividing by the TRUE peak reached 0.70 and 20% and looked
// like light. Screenshots of both in design-review/.
//
// So: always normalise by the true peak. The hue is then exactly the palette
// colour at every texel, never a lighter version of it, and everything the
// field's density does shows up in ALPHA instead. An over-full region goes
// more opaque rather than whiter — which is also what makes light theme
// possible at all, since white IS the background there and every step toward
// it is a step toward invisible.
//
// What remains theme-dependent is how far that goes: uAlphaGain.
const DISPLAY_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform sampler2D uBloom;
uniform float uBloomIntensity;
uniform float uAlphaGain;
// Two rectangles the dye is held back over, in UV space, each with its own
// retained fraction: (x0, y0, x1, y1) and the multiplier to apply inside.
// See calmFactor() below and setCalmZones() in the API.
uniform vec4 uCalmA;
uniform vec4 uCalmB;
uniform vec2 uCalmStrength;
uniform float uCalmFeather;

// 1.0 outside the rectangle, "strength" well inside it, smooth across the
// feather band. Separable smoothsteps rather than a distance field: the zones
// are text columns, so the falloff wants to follow the box's own axes.
float calmFactor (vec4 zone, float strength) {
    if (zone.z <= zone.x || zone.w <= zone.y) return 1.0;
    float f = max(uCalmFeather, 0.0001);
    float insideX = smoothstep(zone.x - f, zone.x + f, vUv.x)
        * (1.0 - smoothstep(zone.z - f, zone.z + f, vUv.x));
    float insideY = smoothstep(zone.y - f, zone.y + f, vUv.y)
        * (1.0 - smoothstep(zone.w - f, zone.w + f, vUv.y));
    return mix(1.0, strength, insideX * insideY);
}

void main () {
    vec3 c = texture(uTexture, vUv).rgb;
    c += texture(uBloom, vUv).rgb * uBloomIntensity;

    float peak = max(c.r, max(c.g, c.b));
    if (peak < 0.0005) { fragColor = vec4(0.0); return; }

    vec3 hue = c / peak;
    float alpha = clamp(peak * uAlphaGain, 0.0, 1.0)
        * calmFactor(uCalmA, uCalmStrength.x)
        * calmFactor(uCalmB, uCalmStrength.y);
    fragColor = vec4(hue, alpha);
}
`;

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`[fluid-sim] shader compile failed: ${log}`);
    }
    return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    // Shaders are reference-counted by the program once attached; deleting
    // them here frees the compiler's own copies without affecting the link.
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`[fluid-sim] program link failed: ${log}`);
    }

    // Uniform locations resolved once at link time. Looking them up per-draw
    // is a documented hot-path mistake and this runs ~26 draws a frame.
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
        const name = gl.getActiveUniform(program, i).name;
        uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { program, uniforms };
}

/** Short edge to `resolution`, long edge scaled by the canvas aspect. */
function resolutionFor(gl, resolution) {
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight || 1;
    const min = Math.round(resolution);
    const max = Math.round(resolution * (aspect >= 1 ? aspect : 1 / aspect));
    return aspect >= 1 ? { width: max, height: min } : { width: min, height: max };
}

function createFBO(gl, width, height, internalFormat, format, type, filter) {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return {
        texture,
        fbo,
        width,
        height,
        texelSizeX: 1 / width,
        texelSizeY: 1 / height,
        attach(id) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        },
    };
}

/** Ping-pong pair — every solver step reads one side and writes the other. */
function createDoubleFBO(gl, width, height, internalFormat, format, type, filter) {
    let fbo1 = createFBO(gl, width, height, internalFormat, format, type, filter);
    let fbo2 = createFBO(gl, width, height, internalFormat, format, type, filter);
    return {
        width,
        height,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read() { return fbo1; },
        get write() { return fbo2; },
        swap() { const t = fbo1; fbo1 = fbo2; fbo2 = t; },
    };
}

/**
 * Builds the solver against an existing <canvas>.
 *
 * Returns null — never throws — when WebGL2 or float render targets are
 * unavailable. The caller treats that as "no background", which is a
 * perfectly good hero; the site does not depend on this rendering.
 */
export function createFluidSim(canvas, options = {}) {
    // Mutable rather than const so a dev sweep can retune them against the
    // real page without a reload — every constant in this file that was
    // "tuned by measurement" was measured that way, and pinning them behind
    // a closure made each sweep a rebuild.
    const solver = {
        densityDissipation: options.densityDissipation ?? DENSITY_DISSIPATION,
        velocityDissipation: options.velocityDissipation ?? VELOCITY_DISSIPATION,
        curlStrength: options.curlStrength ?? CURL_STRENGTH,
    };
    // Display response. Set per theme by the caller — see DISPLAY_SHADER.
    const display = {
        bloomIntensity: options.bloomIntensity ?? 1.6,
        alphaGain: options.alphaGain ?? 1.4,
    };
    // Regions the dye is held back over, so page text stays readable through
    // it. Empty by default: this module knows nothing about the page, and the
    // caller measures the boxes from the live DOM.
    const calm = {
        a: [0, 0, 0, 0],
        b: [0, 0, 0, 0],
        strength: [1, 1],
        feather: 0.08,
    };

    const gl = canvas.getContext("webgl2", {
        alpha: true,
        // Straight alpha, matching DISPLAY_SHADER's output. With the default
        // (premultiplied) the browser would expect rgb already scaled by a
        // and the dye would composite too dark.
        premultipliedAlpha: false,
        depth: false,
        stencil: false,
        antialias: false,
        // The sim is fully re-derived from its own textures every frame, so
        // there is nothing to preserve and asking to keep the drawing buffer
        // costs a full-surface copy per frame on some drivers.
        preserveDrawingBuffer: false,
    });
    if (!gl) return null;

    // Rendering INTO half-float textures is the extension-gated part.
    // Sampling them with linear filtering is core WebGL2, so only this one
    // matters — without it every FBO below would be FRAMEBUFFER_INCOMPLETE.
    if (!gl.getExtension("EXT_color_buffer_float")) return null;

    const programs = {
        advection: createProgram(gl, BASE_VERTEX_SHADER, ADVECTION_SHADER),
        divergence: createProgram(gl, BASE_VERTEX_SHADER, DIVERGENCE_SHADER),
        curl: createProgram(gl, BASE_VERTEX_SHADER, CURL_SHADER),
        vorticity: createProgram(gl, BASE_VERTEX_SHADER, VORTICITY_SHADER),
        pressure: createProgram(gl, BASE_VERTEX_SHADER, PRESSURE_SHADER),
        gradientSubtract: createProgram(gl, BASE_VERTEX_SHADER, GRADIENT_SUBTRACT_SHADER),
        splat: createProgram(gl, BASE_VERTEX_SHADER, SPLAT_SHADER),
        clear: createProgram(gl, BASE_VERTEX_SHADER, CLEAR_SHADER),
        bloomPrefilter: createProgram(gl, BASE_VERTEX_SHADER, BLOOM_PREFILTER_SHADER),
        bloomBlur: createProgram(gl, BASE_VERTEX_SHADER, BLOOM_BLUR_SHADER),
        display: createProgram(gl, BASE_VERTEX_SHADER, DISPLAY_SHADER),
    };

    // One unit quad, reused by every pass.
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    let dye = null;
    let velocity = null;
    let divergence = null;
    let curl = null;
    let pressure = null;
    // Bloom target (the prefilter's destination and the upsample's final
    // accumulator — this is what the display pass samples) plus the
    // progressively-halved chain the blur walks down and back up.
    let bloom = null;
    let bloomChain = [];
    // Small readback target for peakDyeLevel(). RGBA8 rather than a float
    // format on purpose: readPixels to UNSIGNED_BYTE is the universally
    // supported path, and 8 bits is ample for a "has this decayed yet" test.
    let probe = null;
    let probePixels = null;
    let disposed = false;
    let frameCount = 0;

    function blit(target) {
        if (target) {
            gl.viewport(0, 0, target.width, target.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        } else {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    function destroyTargets() {
        const all = [dye, velocity, pressure]
            .filter(Boolean)
            .flatMap((d) => [d.read, d.write])
            .concat([divergence, curl, bloom, probe].filter(Boolean))
            .concat(bloomChain);
        all.forEach((target) => {
            gl.deleteTexture(target.texture);
            gl.deleteFramebuffer(target.fbo);
        });
        dye = velocity = divergence = curl = pressure = probe = bloom = null;
        bloomChain = [];
        probePixels = null;
    }

    function initTargets() {
        destroyTargets();
        const sim = resolutionFor(gl, SIM_RESOLUTION);
        const dyeRes = resolutionFor(gl, DYE_RESOLUTION);
        const { RGBA16F, RG16F, R16F, RGBA, RG, RED, HALF_FLOAT, LINEAR, NEAREST } = gl;

        dye = createDoubleFBO(gl, dyeRes.width, dyeRes.height, RGBA16F, RGBA, HALF_FLOAT, LINEAR);
        velocity = createDoubleFBO(gl, sim.width, sim.height, RG16F, RG, HALF_FLOAT, LINEAR);
        // Scalar fields are only ever sampled at exact texel centres by the
        // Jacobi/divergence passes, so linear filtering would cost bandwidth
        // for no benefit.
        divergence = createFBO(gl, sim.width, sim.height, R16F, RED, HALF_FLOAT, NEAREST);
        curl = createFBO(gl, sim.width, sim.height, R16F, RED, HALF_FLOAT, NEAREST);
        pressure = createDoubleFBO(gl, sim.width, sim.height, R16F, RED, HALF_FLOAT, NEAREST);

        // Bloom chain. RGBA16F throughout: the prefilter's whole job is to
        // isolate values ABOVE 1.0, which an 8-bit target cannot represent —
        // it would clamp them to 1.0 and the glow would lose exactly the
        // information that distinguishes a hot core from a merely bright one.
        const bloomRes = resolutionFor(gl, BLOOM_RESOLUTION);
        bloom = createFBO(gl, bloomRes.width, bloomRes.height, RGBA16F, RGBA, HALF_FLOAT, LINEAR);
        bloomChain = [];
        let bw = bloomRes.width;
        let bh = bloomRes.height;
        for (let i = 0; i < BLOOM_ITERATIONS; i++) {
            bw = bw >> 1;
            bh = bh >> 1;
            // Below 2px a bilinear 4-tap has nothing left to average and the
            // level contributes a single flat colour — cost without effect.
            if (bw < 2 || bh < 2) break;
            bloomChain.push(createFBO(gl, bw, bh, RGBA16F, RGBA, HALF_FLOAT, LINEAR));
        }

        // Independent of the canvas aspect: this is a decay probe, not an
        // image, so it only needs enough texels that a small surviving blob
        // cannot fall between them. LINEAR so the downsample averages rather
        // than point-samples, which would let a thin filament read as zero.
        probe = createFBO(gl, PROBE_RESOLUTION, PROBE_RESOLUTION, gl.RGBA8, RGBA, gl.UNSIGNED_BYTE, LINEAR);
        probePixels = new Uint8Array(PROBE_RESOLUTION * PROBE_RESOLUTION * 4);
    }

    /**
     * Resizes the drawing buffer to the canvas's CSS box and rebuilds the
     * grids. Returns false when nothing changed, so the caller can skip the
     * (expensive) target reallocation on no-op resize events.
     */
    function resize(cssWidth, cssHeight, dpr) {
        const width = Math.max(1, Math.floor(cssWidth * dpr));
        const height = Math.max(1, Math.floor(cssHeight * dpr));
        if (canvas.width === width && canvas.height === height && dye) return false;
        canvas.width = width;
        canvas.height = height;
        initTargets();
        return true;
    }

    /**
     * Injects dye and velocity at a point.
     *
     * @param x,y      normalised 0..1, origin bottom-left (GL convention)
     * @param dx,dy    velocity impulse
     * @param color    [r,g,b] linear-ish 0..1
     * @param radius   splat size in normalised units
     * @param opts.velocityOnly  push the fluid without adding any colour —
     *   how Stage 7c's slow "currents" work. Injecting dye as well would
     *   defeat the point: the current's job is to MOVE colour that is already
     *   in the field across the hero, and a wide low-dye splat on top of that
     *   just fogs the whole canvas evenly.
     */
    function splat(x, y, dx, dy, color, radius = 0.25, opts = {}) {
        if (!velocity) return;
        const { splat: prog } = programs;
        gl.useProgram(prog.program);

        gl.uniform1i(prog.uniforms.uTarget, velocity.read.attach(0));
        gl.uniform1f(prog.uniforms.aspectRatio, canvas.width / canvas.height);
        gl.uniform2f(prog.uniforms.point, x, y);
        gl.uniform3f(prog.uniforms.color, dx, dy, 0);
        // The shader computes exp(-dot(p,p) / radius) with p in UV space, so
        // this uniform is a VARIANCE (a squared length), not a length —
        // `radius / 100` already is that quantity. An earlier version
        // squared it a second time, which made the actual variance 1e-5
        // instead of 3e-3 and shrank every splat to about half a percent of
        // the screen: the sim ran correctly and the dye had the right hue,
        // but only ~32 pixels of a 400x300 buffer were ever non-transparent,
        // so the canvas looked completely blank. Caught with readPixels on a
        // throwaway sim, since a page screenshot could not distinguish
        // "drawing something invisibly small" from "not drawing at all".
        gl.uniform1f(prog.uniforms.radius, radius / 100);
        blit(velocity.write);
        velocity.swap();

        if (opts.velocityOnly) return;

        gl.uniform1i(prog.uniforms.uTarget, dye.read.attach(0));
        gl.uniform3f(prog.uniforms.color, color[0], color[1], color[2]);
        blit(dye.write);
        dye.swap();
    }

    /**
     * Threshold → downsample → additive upsample. Leaves the result in
     * `bloom`, which the display pass samples.
     */
    function applyBloom() {
        if (!bloom || bloomChain.length < 2) return;

        gl.disable(gl.BLEND);
        const pre = programs.bloomPrefilter;
        gl.useProgram(pre.program);
        const knee = BLOOM_THRESHOLD * BLOOM_SOFT_KNEE + 0.0001;
        gl.uniform3f(pre.uniforms.curve, BLOOM_THRESHOLD - knee, knee * 2, 0.25 / knee);
        gl.uniform1f(pre.uniforms.threshold, BLOOM_THRESHOLD);
        gl.uniform1i(pre.uniforms.uTexture, dye.read.attach(0));
        blit(bloom);

        const blur = programs.bloomBlur;
        gl.useProgram(blur.program);

        let source = bloom;
        for (let i = 0; i < bloomChain.length; i++) {
            const target = bloomChain[i];
            gl.uniform2f(blur.uniforms.texelSize, source.texelSizeX, source.texelSizeY);
            gl.uniform1i(blur.uniforms.uTexture, source.attach(0));
            blit(target);
            source = target;
        }

        // Coming back up, each level is ADDED to the next larger one, so the
        // final image is the sum of every blur radius rather than only the
        // widest — that superposition is what gives a bloom its falloff
        // instead of a uniform haze.
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.enable(gl.BLEND);
        for (let i = bloomChain.length - 2; i >= 0; i--) {
            const target = bloomChain[i];
            gl.uniform2f(blur.uniforms.texelSize, source.texelSizeX, source.texelSizeY);
            gl.uniform1i(blur.uniforms.uTexture, source.attach(0));
            blit(target);
            source = target;
        }
        gl.uniform2f(blur.uniforms.texelSize, source.texelSizeX, source.texelSizeY);
        gl.uniform1i(blur.uniforms.uTexture, source.attach(0));
        blit(bloom);
        gl.disable(gl.BLEND);
    }

    /** Binds the display program and every uniform it needs. */
    function bindDisplay() {
        const prog = programs.display;
        gl.useProgram(prog.program);
        gl.uniform1i(prog.uniforms.uTexture, dye.read.attach(0));
        gl.uniform1i(prog.uniforms.uBloom, (bloom ?? dye.read).attach(1));
        gl.uniform1f(prog.uniforms.uBloomIntensity, bloom ? display.bloomIntensity : 0);
        gl.uniform1f(prog.uniforms.uAlphaGain, display.alphaGain);
        gl.uniform4f(prog.uniforms.uCalmA, ...calm.a);
        gl.uniform4f(prog.uniforms.uCalmB, ...calm.b);
        gl.uniform2f(prog.uniforms.uCalmStrength, ...calm.strength);
        gl.uniform1f(prog.uniforms.uCalmFeather, calm.feather);
        return prog;
    }

    /** One solver step plus the display pass. `dt` in seconds. */
    function step(dt) {
        if (disposed || !velocity) return;
        const clamped = Math.min(Math.max(dt, 0), MAX_DT);

        gl.disable(gl.BLEND);

        // --- vorticity confinement -------------------------------------
        const curlProg = programs.curl;
        gl.useProgram(curlProg.program);
        gl.uniform2f(curlProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(curlProg.uniforms.uVelocity, velocity.read.attach(0));
        blit(curl);

        const vortProg = programs.vorticity;
        gl.useProgram(vortProg.program);
        gl.uniform2f(vortProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(vortProg.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(vortProg.uniforms.uCurl, curl.attach(1));
        gl.uniform1f(vortProg.uniforms.curl, solver.curlStrength);
        gl.uniform1f(vortProg.uniforms.dt, clamped);
        blit(velocity.write);
        velocity.swap();

        // --- pressure projection ---------------------------------------
        const divProg = programs.divergence;
        gl.useProgram(divProg.program);
        gl.uniform2f(divProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(divProg.uniforms.uVelocity, velocity.read.attach(0));
        blit(divergence);

        const clearProg = programs.clear;
        gl.useProgram(clearProg.program);
        gl.uniform1i(clearProg.uniforms.uTexture, pressure.read.attach(0));
        gl.uniform1f(clearProg.uniforms.value, PRESSURE_DECAY);
        blit(pressure.write);
        pressure.swap();

        const pressProg = programs.pressure;
        gl.useProgram(pressProg.program);
        gl.uniform2f(pressProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(pressProg.uniforms.uDivergence, divergence.attach(0));
        for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
            gl.uniform1i(pressProg.uniforms.uPressure, pressure.read.attach(1));
            blit(pressure.write);
            pressure.swap();
        }

        const gradProg = programs.gradientSubtract;
        gl.useProgram(gradProg.program);
        gl.uniform2f(gradProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(gradProg.uniforms.uPressure, pressure.read.attach(0));
        gl.uniform1i(gradProg.uniforms.uVelocity, velocity.read.attach(1));
        blit(velocity.write);
        velocity.swap();

        // --- advection ---------------------------------------------------
        const advProg = programs.advection;
        gl.useProgram(advProg.program);
        gl.uniform2f(advProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(advProg.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(advProg.uniforms.uSource, velocity.read.attach(0));
        gl.uniform1f(advProg.uniforms.dt, clamped);
        gl.uniform1f(advProg.uniforms.dissipation, solver.velocityDissipation);
        blit(velocity.write);
        velocity.swap();

        // Dye advects on the VELOCITY grid's texel size, not its own: the
        // shader steps backwards through the velocity field, so the step
        // length has to be expressed in that field's units. Using the dye
        // grid's texel size here would scale the trace by 4× and the colour
        // would tear away from the motion driving it.
        gl.uniform1i(advProg.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(advProg.uniforms.uSource, dye.read.attach(1));
        gl.uniform1f(advProg.uniforms.dissipation, solver.densityDissipation);
        blit(dye.write);
        dye.swap();

        // --- bloom ---------------------------------------------------------
        applyBloom();

        // --- display -------------------------------------------------------
        bindDisplay();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        blit(null);

        frameCount++;
    }

    /**
     * Wipes dye, velocity and pressure and paints one blank frame.
     *
     * Used by Stage 7b for the hard cut at the end of a settle window, and
     * for reduced motion's "disappears the moment PLAYING ends". NOT a fade —
     * the gradual disappearance is the solver's own dissipation doing its
     * job; this is the instantaneous reset that follows it.
     */
    function clear() {
        if (disposed || !velocity) return;
        const targets = [dye.read, dye.write, velocity.read, velocity.write,
            pressure.read, pressure.write, divergence, curl,
            ...(bloom ? [bloom] : []), ...bloomChain];
        gl.disable(gl.BLEND);
        targets.forEach((target) => {
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
            gl.viewport(0, 0, target.width, target.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        });
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    /**
     * Peak dye intensity currently in the field, 0..1.
     *
     * Stage 7b stops its RAF loop once the dye has genuinely decayed after
     * playback ends, and "genuinely" has to mean a measured value rather than
     * a guess at how long the exponential takes — the same standard the rest
     * of this project holds itself to.
     *
     * Reads back a heavily downsampled copy rather than the dye texture
     * itself: the full grid is up to 683x512 and a readPixels of that size
     * stalls the pipeline hard. Rendering it through the display program into
     * a small FBO first lets LINEAR filtering do the downsampling on the GPU,
     * so the synchronous read is a few kilobytes. Still not free — the caller
     * throttles this to a few times a second and only during the settle
     * window, never on a normal playing frame.
     */
    function peakDyeLevel() {
        if (disposed || !dye || !probe) return 0;
        gl.disable(gl.BLEND);
        // Deliberately the DISPLAY program, not a raw read of the dye
        // texture: bloom and the per-theme alpha gain both feed the alpha
        // this measures, and "has it decayed" has to mean "is anything still
        // VISIBLE", not "is the dye buffer near zero". A residue below the
        // raw-dye threshold can still glow.
        bindDisplay();
        blit(probe);

        gl.bindFramebuffer(gl.FRAMEBUFFER, probe.fbo);
        gl.readPixels(0, 0, probe.width, probe.height, gl.RGBA, gl.UNSIGNED_BYTE, probePixels);
        let peak = 0;
        // Alpha carries dye intensity — the display program writes
        // max(r,g,b) into it, so one channel is enough.
        for (let i = 3; i < probePixels.length; i += 4) {
            if (probePixels[i] > peak) peak = probePixels[i];
        }
        return peak / 255;
    }

    /**
     * Peak, mean and coverage of the composited field, for tuning.
     *
     * Peak alone cannot tell "a few bright waves crossing a dark hero" from
     * "the whole hero filled in" — both read 1.0. COVERAGE is what
     * distinguishes them, and it is the number that decides whether the
     * background is a background or a wash. Shares the settle probe's
     * readback path; not called from any frame the visitor sees.
     */
    function fieldStats() {
        if (disposed || !dye || !probe) return null;
        peakDyeLevel();
        let peak = 0;
        let total = 0;
        let over25 = 0;
        let over50 = 0;
        let over80 = 0;
        const count = probePixels.length / 4;
        for (let i = 3; i < probePixels.length; i += 4) {
            const a = probePixels[i];
            if (a > peak) peak = a;
            total += a;
            if (a > 64) over25++;
            if (a > 128) over50++;
            if (a > 204) over80++;
        }
        return {
            peak: peak / 255,
            mean: total / count / 255,
            coverage25: over25 / count,
            coverage50: over50 / count,
            coverage80: over80 / count,
        };
    }

    /**
     * Milliseconds of real GPU work per step, averaged over `frames`.
     *
     * Wall-clock rAF timing cannot answer this. It is capped by the display's
     * refresh rate, so a sim using 3ms and a sim using 15ms both report the
     * frame interval and nothing else — on the machine this was written on,
     * an idle page with the fluid loop STOPPED measured the same 33.33ms as a
     * fully-loaded field, which says only that the display runs at 30Hz.
     *
     * The sync point is a `readPixels`, NOT `gl.finish()`. finish() is
     * supposed to block until the queue drains and on this stack it does not:
     * measured through it, a full field reported 0.02ms per step — fifty
     * thousand steps a second, which is not a number a GPU produces. A
     * readback has to round-trip to be able to return the bytes, so it cannot
     * be deferred the same way. It stalls hard by design — dev diagnostics
     * only, never a frame the visitor sees.
     */
    function benchmark(frames = 200, dt = 1 / 60) {
        if (disposed || !velocity) return null;
        step(dt);
        peakDyeLevel();
        const start = performance.now();
        for (let i = 0; i < frames; i++) step(dt);
        peakDyeLevel();
        return (performance.now() - start) / frames;
    }

    function dispose() {
        if (disposed) return;
        disposed = true;
        // Frees the float textures (the expensive part — six of them, up to
        // RGBA16F at the dye resolution) and the programs, promptly, rather
        // than waiting on GC.
        destroyTargets();
        Object.values(programs).forEach(({ program }) => gl.deleteProgram(program));
        gl.deleteBuffer(vertexBuffer);
        gl.deleteBuffer(indexBuffer);
        gl.deleteVertexArray(vao);

        // Deliberately NOT WEBGL_lose_context.loseContext() here.
        //
        // Losing the context permanently disables THE CANVAS ELEMENT: every
        // later getContext('webgl2') on that same element returns null.
        // React keeps the same <canvas> node across an effect re-run, so
        // disposing that way made the second run see "no WebGL2" and fall
        // into the unsupported branch forever. Found immediately in dev,
        // where StrictMode double-invokes every effect (mount → cleanup →
        // mount) — but it was never only a dev problem: in production the
        // same thing happens on any real remount, e.g. the `reduced`
        // dependency flipping when a visitor changes their OS
        // reduced-motion setting with the tab open.
        //
        // Nothing leaks by omitting it. A canvas element owns exactly one
        // context for its lifetime — getContext returns the existing one on
        // a re-run rather than allocating another — so the per-page context
        // cap is never approached, and the context dies with the element.
    }

    return {
        resize,
        splat,
        step,
        clear,
        peakDyeLevel,
        dispose,
        // Diagnostics. Exposed only in dev: `import.meta.env.DEV` is replaced
        // with a literal at build time, so the whole spread collapses to
        // nothing and these never reach a visitor's bundle. Checked by
        // grepping `dist` rather than assumed — the first version of this
        // returned them unconditionally and all three shipped, because a
        // property of an object literal is not something a bundler can
        // tree-shake away.
        ...(import.meta.env.DEV ? { fieldStats, benchmark, setSolver(next) { Object.assign(solver, next); } } : {}),
        /** Per-theme display response — see DISPLAY_SHADER. */
        setDisplay(next) { Object.assign(display, next); },
        /**
         * Up to two rectangles the dye is held back over, in UV space with
         * GL's bottom-left origin: [{ rect: [x0,y0,x1,y1], strength }].
         * `strength` is the fraction of alpha that survives inside.
         */
        setCalmZones(zones = [], feather) {
            calm.a = zones[0]?.rect ?? [0, 0, 0, 0];
            calm.b = zones[1]?.rect ?? [0, 0, 0, 0];
            calm.strength = [zones[0]?.strength ?? 1, zones[1]?.strength ?? 1];
            if (feather !== undefined) calm.feather = feather;
        },
        get calmZones() { return { ...calm }; },
        get displayOptions() { return { ...display }; },
        get solverOptions() { return { ...solver }; },
        get frameCount() { return frameCount; },
        get simResolution() { return velocity ? [velocity.width, velocity.height] : null; },
        get dyeResolution() { return dye ? [dye.width, dye.height] : null; },
    };
}
