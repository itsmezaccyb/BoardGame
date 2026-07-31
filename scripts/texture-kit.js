/**
 * Shared drawing helpers for the generated texture packs.
 *
 * The packs themselves (`generate-*-pack.js`) hold nothing but their own
 * palette and motifs; everything here is the machinery they all need — a
 * deterministic random source, washes, bloom, neon glow, grain, vignette, and
 * the rolling-ridge primitive that terrain is built from.
 *
 * Nothing in here knows what a pack looks like. Colours are passed in as
 * "r, g, b" strings so they can be given an alpha at the point of use.
 */

/** Small deterministic PRNG so every run draws the same pack. */
function rng(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

function rgba(color, alpha) {
    return `rgba(${color}, ${alpha})`;
}

/** Vertical base wash — the ground every tile starts from. */
function wash(ctx, size, top, bottom) {
    const gradient = ctx.createLinearGradient(0, 0, 0, size.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size.width, size.height);
}

/** A soft pool of coloured light. Additive, so pools overlap into brighter cores. */
function bloom(ctx, { x, y, radius, color, alpha }) {
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';

    const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
    light.addColorStop(0, rgba(color, alpha));
    light.addColorStop(0.45, rgba(color, alpha * 0.35));
    light.addColorStop(1, rgba(color, 0));

    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = previous;
}

/** Runs `draw` with a glow around whatever it paints. */
function glowing(ctx, { color, blur, alpha = 1, additive = true }, draw) {
    ctx.save();
    if (additive) ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = rgba(color, alpha);
    ctx.shadowBlur = blur;
    draw();
    // A second pass over the same path deepens the glow into a proper bloom.
    draw();
    ctx.restore();
}

function clamp(value) {
    return value < 0 ? 0 : value > 255 ? 255 : value;
}

/** Film grain. Keeps the flat gradients from banding on a big screen. */
function grain(ctx, size, strength, seed) {
    const image = ctx.getImageData(0, 0, size.width, size.height);
    const { data } = image;
    const random = rng(seed);

    for (let i = 0; i < data.length; i += 4) {
        const noise = (random() - 0.5) * strength;
        data[i] = clamp(data[i] + noise);
        data[i + 1] = clamp(data[i + 1] + noise);
        data[i + 2] = clamp(data[i + 2] + noise);
    }

    ctx.putImageData(image, 0, 0);
}

/** Darkens the edges so the lit middle is where the eye lands. */
function vignette(ctx, size, strength, ink) {
    const edge = ctx.createRadialGradient(
        size.width / 2, size.height / 2, Math.min(size.width, size.height) * 0.26,
        size.width / 2, size.height / 2, Math.max(size.width, size.height) * 0.72
    );
    edge.addColorStop(0, rgba(ink, 0));
    edge.addColorStop(1, rgba(ink, strength));
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, size.width, size.height);
}

/** A filled band following a sine ridge — the basis of the rolling terrain. */
function ridge(ctx, size, { baseline, amplitude, wavelength, phase, fill }) {
    ctx.beginPath();
    ctx.moveTo(0, size.height);
    for (let x = 0; x <= size.width; x += 4) {
        const y = baseline + Math.sin((x / wavelength) + phase) * amplitude;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(size.width, size.height);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
}

/** The lit crest of a ridge, traced as a glowing line. */
function ridgeLight(ctx, size, { baseline, amplitude, wavelength, phase, color, width, blur }) {
    const trace = () => {
        ctx.beginPath();
        for (let x = 0; x <= size.width; x += 4) {
            const y = baseline + Math.sin((x / wavelength) + phase) * amplitude;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = rgba(color, 0.5);
        ctx.lineWidth = width;
        ctx.stroke();
    };
    glowing(ctx, { color, blur }, trace);
}

/**
 * Where the two corners of a hex side fall inside a port boat's image.
 *
 * A port is centred on a hex side and rotated so that side runs horizontally
 * through the middle of the image — so both corners sit on the image's
 * horizontal centre line. The hexagon is regular, so each side is 0.5774
 * hex-widths long, against an image drawn `sizeFactor` hex-widths across.
 *
 * `sizeFactor` must match the one the style declares in `styles.ts`, or the
 * lines will point at thin air.
 */
const HEX_SIDE_OVER_WIDTH = 0.5774;

function portCorners(imageSize, sizeFactor) {
    const offset = HEX_SIDE_OVER_WIDTH / sizeFactor / 2;
    return [
        { x: imageSize * (0.5 - offset), y: imageSize * 0.5 },
        { x: imageSize * (0.5 + offset), y: imageSize * 0.5 },
    ];
}

module.exports = {
    rng,
    rgba,
    wash,
    bloom,
    glowing,
    grain,
    vignette,
    ridge,
    ridgeLight,
    portCorners,
    HEX_SIDE_OVER_WIDTH,
};
