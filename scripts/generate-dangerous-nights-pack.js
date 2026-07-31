#!/usr/bin/env node

/**
 * Draws the "Dangerous Nights" texture pack.
 *
 * The whole board after dark: near-black terrain lit from the edges by neon,
 * with bloom on anything that glows. Nothing here is a photograph — every tile
 * is built from gradients, silhouettes and grain, so the pack ships as code
 * rather than as a folder of stock art, and re-running produces byte-identical
 * files.
 *
 *     node scripts/generate-dangerous-nights-pack.js
 *     npm run optimize-images     # refresh the manifest afterwards
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const OUT = path.join(__dirname, '..', 'public', 'images');

/** Tiles are drawn at 768 and shown at roughly 345, matching the other packs. */
const TILE = 768;
/** The sea sits behind the whole page, so it is drawn far wider. */
const BACKDROP = { width: 1920, height: 1080 };
/** Port boats and their glyphs keep their own sizes. */
const BOAT = 768;
const GLYPH = 384;

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const NEON = {
    magenta: '255, 45, 149',
    cyan: '34, 211, 238',
    violet: '168, 85, 247',
    gold: '255, 201, 74',
    ember: '255, 107, 53',
    mint: '52, 231, 168',
    white: '255, 246, 252',
};

const INK = '10, 6, 18';

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

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

/** Vertical base wash — every tile starts as night. */
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

/** Runs `draw` with a neon glow around whatever it paints. */
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

function clamp(value) {
    return value < 0 ? 0 : value > 255 ? 255 : value;
}

/** Darkens the edges so the lit middle is where the eye lands. */
function vignette(ctx, size, strength = 0.55) {
    const edge = ctx.createRadialGradient(
        size.width / 2, size.height / 2, Math.min(size.width, size.height) * 0.26,
        size.width / 2, size.height / 2, Math.max(size.width, size.height) * 0.72
    );
    edge.addColorStop(0, rgba(INK, 0));
    edge.addColorStop(1, rgba(INK, strength));
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

function tileCanvas() {
    const canvas = createCanvas(TILE, TILE);
    return { canvas, ctx: canvas.getContext('2d'), size: { width: TILE, height: TILE } };
}

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------

/** Forest — black pines backlit by a magenta glow rising off the horizon. */
function drawForest() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(884422);

    wash(ctx, size, '#1A0C2C', '#05030B');

    // The glow the treeline is read against: a band of light on the horizon.
    bloom(ctx, { x: TILE * 0.5, y: TILE * 0.34, radius: TILE * 0.6, color: NEON.magenta, alpha: 0.42 });
    bloom(ctx, { x: TILE * 0.22, y: TILE * 0.26, radius: TILE * 0.4, color: NEON.violet, alpha: 0.3 });
    bloom(ctx, { x: TILE * 0.8, y: TILE * 0.3, radius: TILE * 0.34, color: NEON.violet, alpha: 0.22 });

    // Few trees, drawn big. At hex size a dense stand turns into noise, so the
    // near band is only a handful of tall silhouettes with sky between them.
    const bands = [
        { baseline: 0.62, height: 0.3, count: 9, fill: 'rgba(34, 18, 52, 0.92)', rim: 0.3 },
        { baseline: 0.82, height: 0.44, count: 7, fill: 'rgba(17, 8, 28, 0.96)', rim: 0.45 },
        { baseline: 1.04, height: 0.62, count: 5, fill: 'rgba(5, 2, 10, 1)', rim: 0.6 },
    ];

    bands.forEach(band => {
        const baseline = TILE * band.baseline;
        for (let i = 0; i < band.count; i++) {
            const x = ((i + 0.5) / band.count) * TILE + (random() - 0.5) * (TILE / band.count) * 0.55;
            const height = TILE * band.height * (0.78 + random() * 0.44);
            const width = height * (0.26 + random() * 0.1);

            // Pines drawn as three stacked boughs, which keeps the silhouette
            // recognisable at a fraction of this size.
            const pine = () => {
                ctx.beginPath();
                for (let tier = 0; tier < 3; tier++) {
                    const top = baseline - height + (height * tier) / 3.4;
                    const spread = width * (0.45 + tier * 0.28);
                    ctx.moveTo(x, top);
                    ctx.lineTo(x + spread, top + height / 2.6);
                    ctx.lineTo(x - spread, top + height / 2.6);
                    ctx.closePath();
                }
            };

            glowing(ctx, { color: NEON.magenta, blur: 30, alpha: band.rim }, () => {
                pine();
                ctx.strokeStyle = rgba(NEON.magenta, 0.4);
                ctx.lineWidth = 3;
                ctx.stroke();
            });

            pine();
            ctx.fillStyle = band.fill;
            ctx.fill();
        }
    });

    // Mist pooling at the foot of the stand.
    bloom(ctx, { x: TILE * 0.55, y: TILE * 0.86, radius: TILE * 0.36, color: NEON.violet, alpha: 0.2 });

    vignette(ctx, size, 0.5);
    grain(ctx, size, 12, 5150);
    return canvas;
}

/** Pasture — velvet grass under a low moon, mint sheen on every crest. */
function drawPasture() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(717171);

    wash(ctx, size, '#15332E', '#04090C');
    bloom(ctx, { x: TILE * 0.62, y: TILE * 0.18, radius: TILE * 0.6, color: NEON.mint, alpha: 0.34 });
    bloom(ctx, { x: TILE * 0.24, y: TILE * 0.44, radius: TILE * 0.45, color: NEON.cyan, alpha: 0.22 });

    // Ridges start high and stack to the bottom edge, so the whole tile is
    // pasture rather than a strip of it under empty sky.
    const crests = [
        { baseline: TILE * 0.3, amplitude: 34, wavelength: 230, phase: 0.4, fill: 'rgba(24, 68, 58, 0.95)' },
        { baseline: TILE * 0.48, amplitude: 46, wavelength: 280, phase: 2.1, fill: 'rgba(17, 52, 46, 0.96)' },
        { baseline: TILE * 0.68, amplitude: 40, wavelength: 200, phase: 4.3, fill: 'rgba(10, 36, 33, 0.97)' },
        { baseline: TILE * 0.88, amplitude: 30, wavelength: 160, phase: 5.9, fill: 'rgba(5, 21, 20, 0.99)' },
    ];

    crests.forEach((crest, index) => {
        ridge(ctx, size, crest);
        ridgeLight(ctx, size, {
            ...crest,
            color: index < 2 ? NEON.mint : NEON.cyan,
            width: 3.5,
            blur: 26,
        });

        // Grass catching the light along the crest.
        for (let i = 0; i < 70; i++) {
            const x = random() * TILE;
            const y = crest.baseline + Math.sin(x / crest.wavelength + crest.phase) * crest.amplitude;
            const height = 8 + random() * 20;
            ctx.beginPath();
            ctx.moveTo(x, y + 4);
            ctx.quadraticCurveTo(x + (random() - 0.5) * 8, y - height / 2, x + (random() - 0.5) * 14, y - height);
            ctx.strokeStyle = rgba(index < 2 ? NEON.mint : NEON.cyan, 0.06 + random() * 0.12);
            ctx.lineWidth = 1.4;
            ctx.stroke();
        }
    });

    // Fireflies. Sparse, so they read as light rather than as dust.
    for (let i = 0; i < 30; i++) {
        const x = random() * TILE;
        const y = TILE * (0.2 + random() * 0.7);
        bloom(ctx, { x, y, radius: 5 + random() * 13, color: NEON.mint, alpha: 0.5 + random() * 0.45 });
    }

    vignette(ctx, size, 0.48);
    grain(ctx, size, 11, 66123);
    return canvas;
}

/** Field — wheat lit from below, a wall of warm amber stalks. */
function drawField() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(313377);

    wash(ctx, size, '#20140A', '#080401');
    bloom(ctx, { x: TILE * 0.5, y: TILE * 0.92, radius: TILE * 0.7, color: NEON.gold, alpha: 0.34 });
    bloom(ctx, { x: TILE * 0.5, y: TILE * 0.98, radius: TILE * 0.4, color: NEON.ember, alpha: 0.22 });

    // Back rows first, dimmer and thinner, so the field has depth.
    for (let row = 0; row < 3; row++) {
        const depth = row / 2;
        const count = 90 - row * 18;
        const alpha = 0.18 + depth * 0.38;
        const width = 2 + depth * 3.5;

        for (let i = 0; i < count; i++) {
            const x = (i / count) * TILE + (random() - 0.5) * 14;
            const top = TILE * (0.24 + depth * 0.14) + random() * 70;
            const lean = (random() - 0.5) * 42;

            ctx.beginPath();
            ctx.moveTo(x, TILE);
            ctx.quadraticCurveTo(x + lean * 0.4, (top + TILE) / 2, x + lean, top);

            const stalk = ctx.createLinearGradient(x, TILE, x + lean, top);
            stalk.addColorStop(0, rgba(NEON.ember, alpha));
            stalk.addColorStop(0.55, rgba(NEON.gold, alpha * 0.9));
            stalk.addColorStop(1, rgba(NEON.gold, 0));

            ctx.strokeStyle = stalk;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }

    // A few heads catching the light at the top of the crop.
    for (let i = 0; i < 30; i++) {
        bloom(ctx, {
            x: random() * TILE,
            y: TILE * (0.26 + random() * 0.3),
            radius: 6 + random() * 14,
            color: NEON.gold,
            alpha: 0.35 + random() * 0.35,
        });
    }

    vignette(ctx, size, 0.6);
    grain(ctx, size, 12, 20993);
    return canvas;
}

/** Mountain — wet slate facets with a cold specular edge. */
function drawMountain() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(551122);

    wash(ctx, size, '#1E293B', '#05070D');
    bloom(ctx, { x: TILE * 0.3, y: TILE * 0.16, radius: TILE * 0.6, color: NEON.cyan, alpha: 0.34 });
    bloom(ctx, { x: TILE * 0.78, y: TILE * 0.26, radius: TILE * 0.4, color: NEON.violet, alpha: 0.24 });

    // Peaks big enough to fill the hex, back ones first. Each is split down the
    // apex so one face takes the light and the other stays in shadow — that
    // split is what makes flat triangles read as rock.
    const peaks = [
        { x: 0.2, base: 0.92, height: 0.56, width: 0.34, lit: '#42546E', dark: '#1A2231', edge: NEON.cyan },
        { x: 0.78, base: 0.94, height: 0.5, width: 0.3, lit: '#39485F', dark: '#151C29', edge: NEON.violet },
        { x: 0.5, base: 1.02, height: 0.78, width: 0.42, lit: '#2E3B50', dark: '#0B0F17', edge: NEON.cyan },
    ];

    peaks.forEach(peak => {
        const apexX = TILE * peak.x;
        const apexY = TILE * (peak.base - peak.height);
        const left = apexX - TILE * peak.width;
        const right = apexX + TILE * peak.width;
        const baseY = TILE * peak.base;

        // Lit face.
        ctx.beginPath();
        ctx.moveTo(apexX, apexY);
        ctx.lineTo(apexX, baseY);
        ctx.lineTo(left, baseY);
        ctx.closePath();
        const litFace = ctx.createLinearGradient(left, apexY, apexX, baseY);
        litFace.addColorStop(0, peak.lit);
        litFace.addColorStop(1, peak.dark);
        ctx.fillStyle = litFace;
        ctx.fill();

        // Shadow face.
        ctx.beginPath();
        ctx.moveTo(apexX, apexY);
        ctx.lineTo(right, baseY);
        ctx.lineTo(apexX, baseY);
        ctx.closePath();
        ctx.fillStyle = peak.dark;
        ctx.fill();

        // Snow catching the light just below the summit.
        ctx.beginPath();
        ctx.moveTo(apexX, apexY);
        ctx.lineTo(apexX + TILE * peak.width * 0.3, apexY + TILE * peak.height * 0.26);
        ctx.lineTo(apexX, apexY + TILE * peak.height * 0.18);
        ctx.lineTo(apexX - TILE * peak.width * 0.3, apexY + TILE * peak.height * 0.26);
        ctx.closePath();
        ctx.fillStyle = rgba(NEON.white, 0.5);
        ctx.fill();

        glowing(ctx, { color: peak.edge, blur: 30, alpha: 0.7 }, () => {
            ctx.beginPath();
            ctx.moveTo(left, baseY);
            ctx.lineTo(apexX, apexY);
            ctx.strokeStyle = rgba(peak.edge, 0.6);
            ctx.lineWidth = 5;
            ctx.stroke();
        });

        // Fracture lines running down the rock.
        for (let i = 0; i < 6; i++) {
            const t = 0.15 + random() * 0.7;
            ctx.beginPath();
            ctx.moveTo(apexX, apexY);
            ctx.lineTo(left + (right - left) * t, baseY);
            ctx.strokeStyle = rgba(INK, 0.25 + random() * 0.25);
            ctx.lineWidth = 1.5 + random() * 2;
            ctx.stroke();
        }
    });

    vignette(ctx, size, 0.5);
    grain(ctx, size, 13, 44011);
    return canvas;
}

/** Hill — dark clay terraces with embers banked in the seams. */
function drawHill() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(990011);

    wash(ctx, size, '#24100C', '#0A0404');
    bloom(ctx, { x: TILE * 0.5, y: TILE * 0.55, radius: TILE * 0.55, color: NEON.ember, alpha: 0.24 });

    // Courses of clay, each one a slab with a hot seam beneath it.
    const courses = 7;
    for (let row = 0; row < courses; row++) {
        const y = (row / courses) * TILE;
        const height = TILE / courses;
        const offset = row % 2 === 0 ? 0 : TILE / 8;

        for (let col = -1; col < 5; col++) {
            const x = col * (TILE / 4) + offset;
            const inset = 5 + random() * 5;

            ctx.beginPath();
            ctx.rect(x + inset, y + inset, TILE / 4 - inset * 2, height - inset * 2);
            const shade = 0.55 + random() * 0.45;
            ctx.fillStyle = `rgba(${Math.round(58 * shade)}, ${Math.round(24 * shade)}, ${Math.round(20 * shade)}, 1)`;
            ctx.fill();

            // Ember light along the top edge of each slab.
            glowing(ctx, { color: NEON.ember, blur: 18, alpha: 0.35 }, () => {
                ctx.beginPath();
                ctx.moveTo(x + inset, y + inset);
                ctx.lineTo(x + TILE / 4 - inset, y + inset);
                ctx.strokeStyle = rgba(NEON.ember, 0.3);
                ctx.lineWidth = 2.5;
                ctx.stroke();
            });
        }
    }

    // Heat pooling low in the tile.
    bloom(ctx, { x: TILE * 0.42, y: TILE * 0.8, radius: TILE * 0.4, color: NEON.ember, alpha: 0.2 });
    bloom(ctx, { x: TILE * 0.7, y: TILE * 0.3, radius: TILE * 0.3, color: NEON.magenta, alpha: 0.12 });

    vignette(ctx, size, 0.6);
    grain(ctx, size, 14, 78222);
    return canvas;
}

/** Desert — dunes under a sodium lamp, cold violet in the troughs. */
function drawDesert() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(606060);

    wash(ctx, size, '#3A2A2E', '#08060C');
    bloom(ctx, { x: TILE * 0.7, y: TILE * 0.14, radius: TILE * 0.62, color: NEON.gold, alpha: 0.34 });
    bloom(ctx, { x: TILE * 0.2, y: TILE * 0.3, radius: TILE * 0.4, color: NEON.ember, alpha: 0.16 });

    // Each dune sits a clear step darker than the one behind it, so the sand
    // reads as banked ridges rather than as one flat wash.
    const dunes = [
        { baseline: TILE * 0.32, amplitude: 40, wavelength: 320, phase: 1.1, fill: 'rgba(104, 76, 74, 0.95)' },
        { baseline: TILE * 0.52, amplitude: 48, wavelength: 260, phase: 3.4, fill: 'rgba(74, 53, 56, 0.96)' },
        { baseline: TILE * 0.72, amplitude: 40, wavelength: 200, phase: 5.6, fill: 'rgba(48, 34, 40, 0.97)' },
        { baseline: TILE * 0.92, amplitude: 30, wavelength: 165, phase: 2.2, fill: 'rgba(26, 18, 24, 0.99)' },
    ];

    dunes.forEach(dune => {
        ridge(ctx, size, dune);
        ridgeLight(ctx, size, { ...dune, color: NEON.gold, width: 3.5, blur: 24 });
    });

    // Wind-scoured streaks across the sand.
    for (let i = 0; i < 40; i++) {
        const y = TILE * (0.45 + random() * 0.5);
        const x = random() * TILE;
        const length = 40 + random() * 150;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + length, y + (random() - 0.5) * 12);
        ctx.strokeStyle = rgba(NEON.gold, 0.04 + random() * 0.05);
        ctx.lineWidth = 1 + random() * 2;
        ctx.stroke();
    }

    vignette(ctx, size, 0.58);
    grain(ctx, size, 13, 31415);
    return canvas;
}

/**
 * Figures for the gold tile, posed like the neon over a late bar.
 *
 * Each is a head plus a handful of curves in a 0-100 box — line art, not
 * anatomy. Drawn dark first so the shape reads against the bright gold, then
 * lined with neon.
 */
const FIGURES = {
    /** Standing, weight on one leg, one arm thrown up. */
    standing: {
        head: { x: 50, y: 13, r: 8 },
        hair: [[42, 6], [31, 18], [38, 34]],
        skirt: [[56, 45], [43, 67], [70, 64]],
        strokes: [
            [[50, 21], [52, 34], [56, 51]],   // spine, with a lean in it
            [[56, 51], [47, 69], [44, 92]],   // near leg
            [[56, 51], [64, 71], [67, 92]],   // far leg
            [[52, 31], [40, 41], [36, 56]],   // arm down to the hip
            [[54, 31], [67, 23], [73, 8]],    // arm raised
        ],
    },
    /** Seated, leaning back on one arm, legs crossed away. */
    seated: {
        head: { x: 34, y: 21, r: 7.5 },
        hair: [[26, 14], [17, 27], [27, 41]],
        strokes: [
            [[35, 29], [43, 42], [51, 54]],   // spine
            [[51, 54], [67, 57], [81, 45]],   // upper leg
            [[51, 54], [64, 67], [83, 63]],   // crossed leg
            [[38, 35], [30, 50], [24, 61]],   // arm bracing behind
            [[40, 35], [55, 41], [63, 31]],   // arm forward
        ],
    },
};

/** Traces one figure's curves at the current transform. */
function traceFigure(ctx, figure, u) {
    figure.strokes.concat([figure.hair]).forEach(([a, b, c]) => {
        ctx.beginPath();
        ctx.moveTo(a[0] * u, a[1] * u);
        ctx.quadraticCurveTo(b[0] * u, b[1] * u, c[0] * u, c[1] * u);
        ctx.stroke();
    });
}

/** Draws a figure at `x`,`y`, sized to `scale` of the tile. */
function drawFigure(ctx, { figure, x, y, scale, color }) {
    const u = (TILE * scale) / 100;

    ctx.save();
    ctx.translate(TILE * x, TILE * y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const head = () => {
        ctx.beginPath();
        ctx.arc(figure.head.x * u, figure.head.y * u, figure.head.r * u, 0, Math.PI * 2);
    };

    const skirt = () => {
        if (!figure.skirt) return false;
        ctx.beginPath();
        figure.skirt.forEach(([px, py], i) => {
            if (i === 0) ctx.moveTo(px * u, py * u);
            else ctx.lineTo(px * u, py * u);
        });
        ctx.closePath();
        return true;
    };

    // Dark pass: the silhouette, which is what carries at hex size.
    ctx.strokeStyle = rgba(INK, 0.9);
    ctx.fillStyle = rgba(INK, 0.9);
    ctx.lineWidth = 7 * u;
    traceFigure(ctx, figure, u);
    if (skirt()) ctx.fill();
    head();
    ctx.fill();
    ctx.lineWidth = 4 * u;
    ctx.stroke();

    // Neon rim over the top.
    glowing(ctx, { color, blur: 30, alpha: 0.85 }, () => {
        ctx.strokeStyle = rgba(color, 0.65);
        ctx.lineWidth = 2.6 * u;
        traceFigure(ctx, figure, u);
        if (skirt()) ctx.stroke();
        head();
        ctx.stroke();
    });

    ctx.restore();
}

/** Gold — crumpled leaf, the brightest thing on the board. */
function drawGold() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(24680);

    wash(ctx, size, '#2A1B04', '#0C0701');
    bloom(ctx, { x: TILE * 0.5, y: TILE * 0.46, radius: TILE * 0.62, color: NEON.gold, alpha: 0.42 });

    // Facets of beaten metal, each catching a different amount of light.
    for (let i = 0; i < 46; i++) {
        const cx = random() * TILE;
        const cy = random() * TILE;
        const radius = 50 + random() * 130;
        const sides = 3 + Math.floor(random() * 3);
        const rotation = random() * Math.PI * 2;

        ctx.beginPath();
        for (let s = 0; s < sides; s++) {
            const angle = rotation + (s / sides) * Math.PI * 2;
            const point = radius * (0.6 + random() * 0.6);
            const x = cx + Math.cos(angle) * point;
            const y = cy + Math.sin(angle) * point;
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const face = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
        const heat = 0.1 + random() * 0.3;
        face.addColorStop(0, rgba(NEON.gold, heat));
        face.addColorStop(1, rgba(NEON.ember, heat * 0.4));
        ctx.fillStyle = face;
        ctx.fill();

        ctx.strokeStyle = rgba(NEON.white, 0.05 + random() * 0.09);
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // Specular hits — the glints that sell it as metal.
    for (let i = 0; i < 14; i++) {
        bloom(ctx, {
            x: random() * TILE,
            y: random() * TILE,
            radius: 18 + random() * 55,
            color: i % 3 === 0 ? NEON.white : NEON.gold,
            alpha: 0.3 + random() * 0.45,
        });
    }

    // The sign over the gold. Two figures, one standing and one sat back, so
    // the tile is the one you look at twice.
    drawFigure(ctx, { figure: FIGURES.standing, x: 0.04, y: 0.16, scale: 0.56, color: NEON.magenta });
    drawFigure(ctx, { figure: FIGURES.seated, x: 0.44, y: 0.4, scale: 0.54, color: NEON.cyan });

    vignette(ctx, size, 0.5);
    grain(ctx, size, 10, 13579);
    return canvas;
}

/** Fog — violet smoke, thick enough to hide what is under it. */
function drawFog() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(80808);

    wash(ctx, size, '#221733', '#0B0714');

    for (let i = 0; i < 24; i++) {
        const progress = i / 24;
        const radius = TILE * (0.44 - progress * 0.26) * (0.7 + random() * 0.6);
        bloom(ctx, {
            x: TILE * (0.1 + random() * 0.8),
            y: TILE * (0.15 + random() * 0.7),
            radius,
            color: i % 4 === 0 ? NEON.magenta : NEON.violet,
            alpha: 0.06 + progress * 0.12,
        });
    }

    bloom(ctx, { x: TILE * 0.5, y: TILE * 0.44, radius: TILE * 0.5, color: NEON.violet, alpha: 0.22 });

    vignette(ctx, size, 0.5);
    grain(ctx, size, 12, 24242);
    return canvas;
}

/** The sea, and the backdrop to the whole page: black water under neon. */
function drawWater() {
    const canvas = createCanvas(BACKDROP.width, BACKDROP.height);
    const ctx = canvas.getContext('2d');
    const size = BACKDROP;
    const random = rng(19283746);

    wash(ctx, size, '#0B0A1E', '#030209');

    // Distant signage bleeding across the water.
    const pools = [
        { x: 0.18, y: 0.24, color: NEON.magenta, alpha: 0.2, radius: 0.5 },
        { x: 0.78, y: 0.2, color: NEON.cyan, alpha: 0.17, radius: 0.46 },
        { x: 0.5, y: 0.78, color: NEON.violet, alpha: 0.18, radius: 0.55 },
        { x: 0.9, y: 0.7, color: NEON.magenta, alpha: 0.12, radius: 0.38 },
        { x: 0.06, y: 0.82, color: NEON.cyan, alpha: 0.12, radius: 0.36 },
    ];
    pools.forEach(pool => bloom(ctx, {
        x: size.width * pool.x,
        y: size.height * pool.y,
        radius: size.width * pool.radius,
        color: pool.color,
        alpha: pool.alpha,
    }));

    // Reflections: broken horizontal streaks, brighter directly under a pool.
    for (let i = 0; i < 260; i++) {
        const y = random() * size.height;
        const x = random() * size.width;
        const length = 60 + random() * 420;
        const nearest = pools.reduce((best, pool) => {
            const dx = x - size.width * pool.x;
            const dy = y - size.height * pool.y;
            const distance = Math.hypot(dx, dy);
            return distance < best.distance ? { distance, pool } : best;
        }, { distance: Infinity, pool: pools[0] });

        const falloff = Math.max(0, 1 - nearest.distance / (size.width * 0.5));

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const streak = ctx.createLinearGradient(x, y, x + length, y);
        streak.addColorStop(0, rgba(nearest.pool.color, 0));
        streak.addColorStop(0.5, rgba(nearest.pool.color, 0.05 + falloff * 0.16));
        streak.addColorStop(1, rgba(nearest.pool.color, 0));
        ctx.strokeStyle = streak;
        ctx.lineWidth = 1 + random() * 3.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + length, y + (random() - 0.5) * 4);
        ctx.stroke();
        ctx.restore();
    }

    vignette(ctx, size, 0.7);
    grain(ctx, size, 9, 55555);
    return canvas;
}

// ---------------------------------------------------------------------------
// Ports
// ---------------------------------------------------------------------------

/**
 * The harbour boat: a low black hull with light under the waterline and a
 * dark sail. The sail is left clear — the resource glyph is stamped onto it.
 */
function drawBoat() {
    const canvas = createCanvas(BOAT, BOAT);
    const ctx = canvas.getContext('2d');
    const unit = BOAT / 100;

    // A port is anchored to a hex side and rotated so that the image's LOWER
    // half is the one facing open water — the upper half ends up behind the
    // land tile, which draws over it. So the boat is drawn a half-turn round
    // and scaled into that lower half: the mast then points out to sea and no
    // part of it is lost behind the coast. Everything below is authored the
    // right way up in a 0-100 space; this transform does the moving.
    ctx.translate(576, 789);
    ctx.rotate(Math.PI);
    ctx.scale(0.5, 0.48);

    // Underglow first, so the hull sits inside its own pool of light.
    bloom(ctx, { x: 50 * unit, y: 70 * unit, radius: 42 * unit, color: NEON.cyan, alpha: 0.3 });
    bloom(ctx, { x: 50 * unit, y: 74 * unit, radius: 26 * unit, color: NEON.magenta, alpha: 0.22 });

    // Sail — a taut dark triangle with a lit leading edge.
    const sail = () => {
        ctx.beginPath();
        ctx.moveTo(50 * unit, 14 * unit);
        ctx.quadraticCurveTo(72 * unit, 40 * unit, 64 * unit, 60 * unit);
        ctx.lineTo(40 * unit, 60 * unit);
        ctx.closePath();
    };

    sail();
    const cloth = ctx.createLinearGradient(38 * unit, 14 * unit, 68 * unit, 60 * unit);
    cloth.addColorStop(0, 'rgba(38, 20, 56, 0.97)');
    cloth.addColorStop(1, 'rgba(14, 8, 24, 0.99)');
    ctx.fillStyle = cloth;
    ctx.fill();

    glowing(ctx, { color: NEON.magenta, blur: 22, alpha: 0.6 }, () => {
        sail();
        ctx.strokeStyle = rgba(NEON.magenta, 0.5);
        ctx.lineWidth = 2.4 * unit;
        ctx.stroke();
    });

    // Mast.
    ctx.beginPath();
    ctx.moveTo(50 * unit, 12 * unit);
    ctx.lineTo(50 * unit, 66 * unit);
    ctx.strokeStyle = 'rgba(96, 80, 128, 0.85)';
    ctx.lineWidth = 1.8 * unit;
    ctx.stroke();

    // Hull — a crescent, wide at the waterline.
    const hull = () => {
        ctx.beginPath();
        ctx.moveTo(18 * unit, 64 * unit);
        ctx.quadraticCurveTo(50 * unit, 90 * unit, 82 * unit, 64 * unit);
        ctx.quadraticCurveTo(50 * unit, 74 * unit, 18 * unit, 64 * unit);
        ctx.closePath();
    };

    hull();
    const timber = ctx.createLinearGradient(0, 62 * unit, 0, 86 * unit);
    timber.addColorStop(0, 'rgba(30, 18, 44, 1)');
    timber.addColorStop(1, 'rgba(8, 4, 14, 1)');
    ctx.fillStyle = timber;
    ctx.fill();

    glowing(ctx, { color: NEON.cyan, blur: 26, alpha: 0.7 }, () => {
        hull();
        ctx.strokeStyle = rgba(NEON.cyan, 0.55);
        ctx.lineWidth = 2.2 * unit;
        ctx.stroke();
    });

    return canvas;
}

/**
 * Resource glyphs stamped onto the sail. Neon line-art on a clear background,
 * bold enough to read at a fraction of the boat's width.
 */
const GLYPHS = {
    wood: { color: NEON.mint, draw: drawWoodGlyph },
    sheep: { color: NEON.white, draw: drawSheepGlyph },
    wheat: { color: NEON.gold, draw: drawWheatGlyph },
    ore: { color: NEON.cyan, draw: drawOreGlyph },
    brick: { color: NEON.ember, draw: drawBrickGlyph },
    generic: { color: NEON.magenta, draw: drawGenericGlyph },
};

function drawWoodGlyph(ctx, u) {
    // A pine: three stacked boughs over a trunk.
    [0, 1, 2].forEach(tier => {
        const top = (22 + tier * 18) * u;
        const spread = (14 + tier * 8) * u;
        ctx.beginPath();
        ctx.moveTo(50 * u, top);
        ctx.lineTo(50 * u + spread, top + 22 * u);
        ctx.lineTo(50 * u - spread, top + 22 * u);
        ctx.closePath();
        ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(50 * u, 76 * u);
    ctx.lineTo(50 * u, 88 * u);
    ctx.stroke();
}

function drawSheepGlyph(ctx, u) {
    // One scalloped outline for the fleece — separate circles flood into a
    // blob once the neon pass widens them, a single contour does not.
    ctx.beginPath();
    ctx.arc(36 * u, 46 * u, 13 * u, Math.PI * 0.75, Math.PI * 1.75);
    ctx.arc(52 * u, 38 * u, 14 * u, Math.PI * 1.15, Math.PI * 1.95);
    ctx.arc(66 * u, 47 * u, 12 * u, Math.PI * 1.45, Math.PI * 0.3);
    ctx.arc(58 * u, 60 * u, 12 * u, Math.PI * 1.85, Math.PI * 0.75);
    ctx.arc(40 * u, 60 * u, 12 * u, Math.PI * 0.25, Math.PI * 1.05);
    ctx.closePath();
    ctx.stroke();

    // Head and legs, so the fleece reads as an animal.
    ctx.beginPath();
    ctx.arc(74 * u, 62 * u, 7 * u, 0, Math.PI * 2);
    ctx.stroke();

    [44, 58].forEach(x => {
        ctx.beginPath();
        ctx.moveTo(x * u, 70 * u);
        ctx.lineTo(x * u, 82 * u);
        ctx.stroke();
    });
}

function drawWheatGlyph(ctx, u) {
    // A sheaf: a central stem with grains paired off it.
    ctx.beginPath();
    ctx.moveTo(50 * u, 22 * u);
    ctx.lineTo(50 * u, 84 * u);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
        const y = (32 + i * 13) * u;
        [-1, 1].forEach(side => {
            ctx.beginPath();
            ctx.moveTo(50 * u, y + 8 * u);
            ctx.quadraticCurveTo(50 * u + side * 18 * u, y + 2 * u, 50 * u + side * 20 * u, y - 8 * u);
            ctx.stroke();
        });
    }
}

function drawOreGlyph(ctx, u) {
    // A cut crystal.
    ctx.beginPath();
    ctx.moveTo(50 * u, 20 * u);
    ctx.lineTo(76 * u, 44 * u);
    ctx.lineTo(62 * u, 84 * u);
    ctx.lineTo(38 * u, 84 * u);
    ctx.lineTo(24 * u, 44 * u);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(24 * u, 44 * u);
    ctx.lineTo(50 * u, 56 * u);
    ctx.lineTo(76 * u, 44 * u);
    ctx.moveTo(50 * u, 56 * u);
    ctx.lineTo(50 * u, 84 * u);
    ctx.stroke();
}

function drawBrickGlyph(ctx, u) {
    // Three courses, offset like a wall.
    const rows = [
        { y: 32, offset: 0 },
        { y: 50, offset: 12 },
        { y: 68, offset: 0 },
    ];
    rows.forEach(row => {
        for (let i = -1; i < 2; i++) {
            const x = 50 * u + (i * 26 + row.offset) * u - 13 * u;
            ctx.beginPath();
            ctx.rect(x, row.y * u, 24 * u, 14 * u);
            ctx.stroke();
        }
    });
}

function drawGenericGlyph(ctx, u) {
    // A compass rose — trades in anything, points anywhere.
    ctx.beginPath();
    ctx.arc(50 * u, 52 * u, 28 * u, 0, Math.PI * 2);
    ctx.stroke();

    [0, 1, 2, 3].forEach(quarter => {
        const angle = (quarter / 4) * Math.PI * 2 - Math.PI / 2;
        const tip = 34 * u;
        const waist = 11 * u;
        ctx.beginPath();
        ctx.moveTo(50 * u + Math.cos(angle) * tip, 52 * u + Math.sin(angle) * tip);
        ctx.lineTo(50 * u + Math.cos(angle + Math.PI / 2) * waist, 52 * u + Math.sin(angle + Math.PI / 2) * waist);
        ctx.lineTo(50 * u + Math.cos(angle + Math.PI) * waist * 0.4, 52 * u + Math.sin(angle + Math.PI) * waist * 0.4);
        ctx.lineTo(50 * u + Math.cos(angle - Math.PI / 2) * waist, 52 * u + Math.sin(angle - Math.PI / 2) * waist);
        ctx.closePath();
        ctx.stroke();
    });
}

function drawGlyph(name) {
    const canvas = createCanvas(GLYPH, GLYPH);
    const ctx = canvas.getContext('2d');
    const u = GLYPH / 100;
    const { color, draw } = GLYPHS[name];

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // A dim wide pass under a bright narrow one reads as a lit neon tube.
    glowing(ctx, { color, blur: 34, alpha: 0.8 }, () => {
        ctx.strokeStyle = rgba(color, 0.55);
        ctx.lineWidth = 7 * u;
        draw(ctx, u);
    });

    ctx.strokeStyle = rgba(NEON.white, 0.92);
    ctx.lineWidth = 2.6 * u;
    draw(ctx, u);

    return canvas;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const FILES = [
    ['catan_water_nights.png', drawWater],
    ['catan_woods_nights.png', drawForest],
    ['catan_sheep_nights.png', drawPasture],
    ['catan_wheat_nights.png', drawField],
    ['catan_rock_nights.png', drawMountain],
    ['catan_brick_nights.png', drawHill],
    ['catan_desert_nights.png', drawDesert],
    ['catan_gold_nights.png', drawGold],
    ['catan_fog_nights.png', drawFog],
    ['catan_boat_nights.png', drawBoat],
    ['catan_wood_logo_nights.png', () => drawGlyph('wood')],
    ['catan_sheep_logo_nights.png', () => drawGlyph('sheep')],
    ['catan_wheat_logo_nights.png', () => drawGlyph('wheat')],
    ['catan_rock_logo_nights.png', () => drawGlyph('ore')],
    ['catan_brick_logo_nights.png', () => drawGlyph('brick')],
    ['catan_generic_logo_nights.png', () => drawGlyph('generic')],
];

console.log('Dangerous Nights\n');

FILES.forEach(([file, draw]) => {
    const canvas = draw();
    const buffer = canvas.toBuffer('image/png', { compressionLevel: 9 });
    fs.writeFileSync(path.join(OUT, file), buffer);
    console.log(
        `  ${file.padEnd(30)} ${canvas.width}x${canvas.height}  ${(buffer.length / 1024).toFixed(0)}KB`
    );
});

console.log('\nRun `npm run optimize-images` afterwards to refresh the manifest.');
