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
// Dye lingers far longer than the reference technique's default (1.0) —
// that value is tuned for a pointer-driven demo where the visitor drags new
// dye in continuously, so fast decay is what keeps it from saturating. Here
// injection is one splat every ~2.2s, and dissipation has to be low enough
// that the field survives between them. At 1.0 the dye had decayed to a
// peak alpha of 6/255 by the time anything sampled it: the solver was
// running correctly and the canvas was, in every way that matters, blank.
//
// Chosen by measuring equilibrium over 30s runs of the real idle pattern
// (seed burst + top-ups), not by eye — full numbers in STATUS.md. 0.22 and
// 0.14 both decayed to ~5% coverage; 0.08 held ~25% but let the seed burst
// clip to alpha 255. 0.10 sits between them and stays bounded.
const DENSITY_DISSIPATION = 0.10;
const VELOCITY_DISSIPATION = 0.2;

const MAX_DT = 1 / 60;

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

// Straight (non-premultiplied) alpha, driven by dye intensity, so the canvas
// composites over the hero's own --bg-color instead of carrying a background
// of its own. That is what makes the whole thing theme-aware for free: the
// page shows through wherever there is no dye, in whichever theme is active.
//
// The hue is divided back out by the alpha rather than left scaled by it —
// otherwise the browser's own `src.rgb * src.a` composite would darken the
// colour a second time, and mid-intensity dye would read as a muddy,
// desaturated version of the accent rather than a fainter one.
const DISPLAY_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;

void main () {
    vec3 c = texture(uTexture, vUv).rgb;
    float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
    vec3 hue = a > 0.001 ? c / a : vec3(0.0);
    fragColor = vec4(hue, a);
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
    const densityDissipation = options.densityDissipation ?? DENSITY_DISSIPATION;
    const velocityDissipation = options.velocityDissipation ?? VELOCITY_DISSIPATION;
    const curlStrength = options.curlStrength ?? CURL_STRENGTH;

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
            .concat([divergence, curl].filter(Boolean));
        all.forEach((target) => {
            gl.deleteTexture(target.texture);
            gl.deleteFramebuffer(target.fbo);
        });
        dye = velocity = divergence = curl = pressure = null;
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
     */
    function splat(x, y, dx, dy, color, radius = 0.25) {
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

        gl.uniform1i(prog.uniforms.uTarget, dye.read.attach(0));
        gl.uniform3f(prog.uniforms.color, color[0], color[1], color[2]);
        blit(dye.write);
        dye.swap();
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
        gl.uniform1f(vortProg.uniforms.curl, curlStrength);
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
        gl.uniform1f(advProg.uniforms.dissipation, velocityDissipation);
        blit(velocity.write);
        velocity.swap();

        // Dye advects on the VELOCITY grid's texel size, not its own: the
        // shader steps backwards through the velocity field, so the step
        // length has to be expressed in that field's units. Using the dye
        // grid's texel size here would scale the trace by 4× and the colour
        // would tear away from the motion driving it.
        gl.uniform1i(advProg.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(advProg.uniforms.uSource, dye.read.attach(1));
        gl.uniform1f(advProg.uniforms.dissipation, densityDissipation);
        blit(dye.write);
        dye.swap();

        // --- display -------------------------------------------------------
        const dispProg = programs.display;
        gl.useProgram(dispProg.program);
        gl.uniform1i(dispProg.uniforms.uTexture, dye.read.attach(0));
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        blit(null);

        frameCount++;
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
        dispose,
        get frameCount() { return frameCount; },
        get simResolution() { return velocity ? [velocity.width, velocity.height] : null; },
        get dyeResolution() { return dye ? [dye.width, dye.height] : null; },
    };
}
