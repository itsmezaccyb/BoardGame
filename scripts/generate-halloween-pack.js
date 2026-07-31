#!/usr/bin/env node

/**
 * Draws the "All Hallows" texture pack.
 *
 * A board that has gone bad. Dead woods under a sick moon, a cornfield with
 * something standing in it, crypt walls weeping, cursed gold, and eyes in the
 * fog watching you decide where to build. Cobwebs and things with too many
 * legs are strung across the lot of it.
 *
 * Deliberately NOT lit like the Nights pack. Nothing here glows as a tube of
 * light — `bloom`/`glowing` are additive and blow out to white, which reads as
 * neon signage rather than as horror. Light in this pack is firelight, moon and
 * wet gleam: `emberGlow` composites normally, so it stays dim and dirty. Solid
 * shapes with hard black outlines do the rest of the work.
 *
 * Deterministic, so re-running produces byte-identical files.
 *
 *     node scripts/generate-halloween-pack.js
 *     npm run optimize-images     # refresh the manifest afterwards
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const {
    grain, portCorners, rgba, ridge, rng, vignette, wash,
} = require('./texture-kit');

const OUT = path.join(__dirname, '..', 'public', 'images');

const TILE = 768;
const BACKDROP = { width: 1920, height: 1080 };
const BOAT = 768;
const GLYPH = 384;

/** Must match `sizeFactor` for `halloween` in styles.ts — see `portCorners`. */
const PORT_SIZE_FACTOR = 1.66;

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const ROT = {
    bone: '223, 214, 190',
    blood: '158, 18, 28',
    gore: '104, 8, 16',
    slime: '132, 214, 74',
    bile: '176, 196, 62',
    pumpkin: '255, 122, 26',
    moon: '198, 210, 180',
    rust: '124, 58, 22',
    web: '196, 202, 196',
};

/** Not quite black — true black kills the grain. */
const PITCH = '5, 4, 7';

/**
 * A close, dirty pool of light — a candle, a wet gleam, the moon behind cloud.
 *
 * Composites normally rather than additively. That is the whole difference
 * between this pack and a neon one: additive light stacks to white and glares,
 * this just lifts what is under it.
 */
function emberGlow(ctx, { x, y, radius, color, alpha }) {
    const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
    light.addColorStop(0, rgba(color, alpha));
    light.addColorStop(0.45, rgba(color, alpha * 0.32));
    light.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

/** Thrown blood. A main spatter and the droplets that carried past it. */
function splatter(ctx, { x, y, size, count, random, color = ROT.blood, alpha = 0.8 }) {
    ctx.fillStyle = rgba(color, alpha);
    for (let i = 0; i < count; i++) {
        const a = random() * Math.PI * 2;
        const d = random() * size;
        const r = size * (0.04 + random() * 0.16) * (1 - d / size / 1.4);
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, r, r * (0.6 + random() * 0.7),
            a, 0, Math.PI * 2);
        ctx.fill();
    }
}

/** A skeletal hand, come up out of the ground. */
function boneHand(ctx, { x, baseY, size, lean = 0, color = ROT.bone, alpha = 0.9 }) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.rotate(lean);
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineCap = 'round';

    ctx.lineWidth = size * 0.15;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -size * 0.55);
    ctx.stroke();

    // Four fingers and a thumb, all cupped as if grasping.
    ctx.lineWidth = size * 0.1;
    [-0.62, -0.28, 0.06, 0.4].forEach((spread, i) => {
        const len = size * (0.42 + (i === 1 || i === 2 ? 0.12 : 0));
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.52);
        ctx.quadraticCurveTo(spread * size * 0.5, -size * 0.52 - len * 0.7,
            spread * size * 0.85, -size * 0.5 - len);
        ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.46);
    ctx.quadraticCurveTo(-size * 0.42, -size * 0.5, -size * 0.5, -size * 0.76);
    ctx.stroke();

    ctx.restore();
}

/** A ribcage, half out of the ground. */
function ribcage(ctx, { x, y, size, color = ROT.bone, alpha = 0.75 }) {
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineCap = 'round';
    ctx.lineWidth = size * 0.06;

    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.5);
    ctx.lineTo(x, y + size * 0.5);
    ctx.stroke();

    ctx.lineWidth = size * 0.05;
    for (let i = 0; i < 5; i++) {
        const ry = y - size * 0.38 + i * size * 0.2;
        const reach = size * (0.46 - Math.abs(i - 1.6) * 0.05);
        [-1, 1].forEach(side => {
            ctx.beginPath();
            ctx.moveTo(x, ry);
            ctx.quadraticCurveTo(x + side * reach, ry + size * 0.04,
                x + side * reach * 0.72, ry + size * 0.24);
            ctx.stroke();
        });
    }
}

/** A bird on a branch, or circling. Pure silhouette. */
function raven(ctx, { x, y, size, wings = false }) {
    ctx.fillStyle = rgba(PITCH, 0.95);
    if (wings) {
        ctx.beginPath();
        ctx.moveTo(x - size, y);
        ctx.quadraticCurveTo(x - size * 0.5, y - size * 0.5, x, y - size * 0.08);
        ctx.quadraticCurveTo(x + size * 0.5, y - size * 0.5, x + size, y);
        ctx.quadraticCurveTo(x + size * 0.5, y - size * 0.16, x, y + size * 0.12);
        ctx.quadraticCurveTo(x - size * 0.5, y - size * 0.16, x - size, y);
        ctx.closePath();
        ctx.fill();
        return;
    }
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.34, size * 0.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - size * 0.2, y - size * 0.5, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.36, y - size * 0.54);
    ctx.lineTo(x - size * 0.72, y - size * 0.46);
    ctx.lineTo(x - size * 0.34, y - size * 0.38);
    ctx.closePath();
    ctx.fill();
    // Tail.
    ctx.beginPath();
    ctx.moveTo(x + size * 0.16, y + size * 0.4);
    ctx.lineTo(x + size * 0.66, y + size * 0.78);
    ctx.lineTo(x + size * 0.08, y + size * 0.56);
    ctx.closePath();
    ctx.fill();
}

function tileCanvas() {
    const canvas = createCanvas(TILE, TILE);
    return { canvas, ctx: canvas.getContext('2d'), size: { width: TILE, height: TILE } };
}

// ---------------------------------------------------------------------------
// Horrors
// ---------------------------------------------------------------------------

/**
 * A bare tree, grown by recursion.
 *
 * Branching angles come from the seeded source, so the wood is gnarled and
 * different every trunk but identical every run.
 */
function deadTree(ctx, { x, y, length, angle, width, depth, random }) {
    if (depth <= 0 || length < 7) return;

    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = width;
    ctx.stroke();

    const limbs = random() < 0.28 ? 3 : 2;
    for (let i = 0; i < limbs; i++) {
        deadTree(ctx, {
            x: x2,
            y: y2,
            length: length * (0.58 + random() * 0.24),
            // Wide, uneven forks — the reason bare trees read as clawing.
            angle: angle + (random() - 0.5) * 1.7,
            width: width * 0.64,
            depth: depth - 1,
            random,
        });
    }
}

/** A web slung across a corner, with sag in every thread. */
function cobweb(ctx, { x, y, radius, from, to, alpha }) {
    const spokes = 7;
    ctx.strokeStyle = rgba(ROT.web, alpha);
    ctx.lineWidth = 2;

    for (let i = 0; i <= spokes; i++) {
        const a = from + (to - from) * (i / spokes);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
        ctx.stroke();
    }

    for (let r = radius * 0.24; r < radius; r += radius * 0.2) {
        ctx.beginPath();
        for (let i = 0; i <= spokes; i++) {
            const a = from + (to - from) * (i / spokes);
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                // Pull the thread in between spokes so it hangs rather than
                // sitting as a clean polygon.
                const mid = from + (to - from) * ((i - 0.5) / spokes);
                ctx.quadraticCurveTo(
                    x + Math.cos(mid) * r * 0.85,
                    y + Math.sin(mid) * r * 0.85,
                    px, py
                );
            }
        }
        ctx.stroke();
    }
}

/** Eight legs and a body, in silhouette. */
function spider(ctx, { x, y, size, color = PITCH, alpha = 0.95 }) {
    ctx.strokeStyle = rgba(color, alpha);
    ctx.fillStyle = rgba(color, alpha);
    ctx.lineWidth = Math.max(1.4, size * 0.1);
    ctx.lineCap = 'round';

    for (let i = 0; i < 4; i++) {
        const reach = 0.55 + i * 0.4;
        [-1, 1].forEach(side => {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(
                x + side * size * reach * 0.95, y - size * 0.75,
                x + side * size * reach, y + size * 0.8
            );
            ctx.stroke();
        });
    }

    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.2, size * 0.44, size * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - size * 0.36, size * 0.27, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * A pair of eyes, open, at you.
 *
 * A tight dirty halo and a slit pupil — an animal catching what light there is,
 * not two lamps. The slit is what stops them reading as glowing dots.
 */
function watchingEyes(ctx, { x, y, size, color, alpha = 0.9 }) {
    [-1, 1].forEach(side => {
        const ex = x + side * size * 0.95;
        emberGlow(ctx, { x: ex, y, radius: size * 1.7, color, alpha: alpha * 0.3 });

        ctx.beginPath();
        ctx.ellipse(ex, y, size * 0.42, size * 0.27, 0, 0, Math.PI * 2);
        ctx.fillStyle = rgba(color, alpha);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(ex, y, size * 0.09, size * 0.21, 0, 0, Math.PI * 2);
        ctx.fillStyle = rgba(PITCH, 0.92);
        ctx.fill();
    });
}

/** A skull, front on. */
function skull(ctx, { x, y, size, color = ROT.bone, alpha = 1 }) {
    ctx.fillStyle = rgba(color, alpha);

    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.5, size * 0.46, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.5, y);
    ctx.lineTo(x - size * 0.32, y + size * 0.44);
    ctx.lineTo(x + size * 0.32, y + size * 0.44);
    ctx.lineTo(x + size * 0.5, y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.rect(x - size * 0.23, y + size * 0.4, size * 0.46, size * 0.17);
    ctx.fill();

    // Sockets and nose, punched back out to black.
    ctx.fillStyle = rgba(PITCH, 0.95);
    [-1, 1].forEach(side => {
        ctx.beginPath();
        ctx.ellipse(x + side * size * 0.22, y - size * 0.02, size * 0.16, size * 0.19, 0, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.1);
    ctx.lineTo(x + size * 0.09, y + size * 0.3);
    ctx.lineTo(x - size * 0.09, y + size * 0.3);
    ctx.closePath();
    ctx.fill();
}

/** A leaning gravestone. */
function headstone(ctx, { x, baseY, width, height, lean, fill, rim }) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.rotate(lean);

    ctx.beginPath();
    ctx.moveTo(-width / 2, 0);
    ctx.lineTo(-width / 2, -height * 0.7);
    ctx.quadraticCurveTo(0, -height * 1.08, width / 2, -height * 0.7);
    ctx.lineTo(width / 2, 0);
    ctx.closePath();

    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = rgba(rim, 0.4);
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
}

/** Blood, run down from a point until it stops. */
function drip(ctx, { x, y, length, width, color }) {
    const run = ctx.createLinearGradient(x, y, x, y + length);
    run.addColorStop(0, rgba(color, 0.85));
    run.addColorStop(0.75, rgba(color, 0.5));
    run.addColorStop(1, rgba(color, 0));

    ctx.strokeStyle = run;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + length);
    ctx.stroke();

    // The bead at the bottom of the run.
    ctx.fillStyle = rgba(color, 0.6);
    ctx.beginPath();
    ctx.arc(x, y + length, width * 0.75, 0, Math.PI * 2);
    ctx.fill();
}

/** A carved pumpkin, lit from the inside. */
function jackOLantern(ctx, { x, y, size }) {
    emberGlow(ctx, { x, y, radius: size * 2.4, color: ROT.pumpkin, alpha: 0.4 });

    // Body: overlapping lobes so the outline is not a plain circle.
    ctx.fillStyle = 'rgba(96, 40, 8, 1)';
    [-0.6, 0, 0.6].forEach(off => {
        ctx.beginPath();
        ctx.ellipse(x + off * size * 0.42, y, size * (off ? 0.34 : 0.5), size * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.fillStyle = 'rgba(38, 46, 22, 1)';
    ctx.fillRect(x - size * 0.07, y - size * 0.72, size * 0.14, size * 0.24);

    // The face, cut out and lit.
    const face = () => {
        ctx.beginPath();
        [-1, 1].forEach(side => {
            ctx.moveTo(x + side * size * 0.34, y - size * 0.28);
            ctx.lineTo(x + side * size * 0.1, y - size * 0.02);
            ctx.lineTo(x + side * size * 0.4, y - size * 0.02);
            ctx.closePath();
        });
        // A mouth with teeth in it.
        ctx.moveTo(x - size * 0.44, y + size * 0.16);
        for (let i = 0; i <= 6; i++) {
            const tx = x - size * 0.44 + (size * 0.88 * i) / 6;
            ctx.lineTo(tx, y + size * (i % 2 === 0 ? 0.16 : 0.38));
        }
        ctx.lineTo(x + size * 0.44, y + size * 0.16);
        ctx.closePath();
    };

    // Cut out to the candle behind it, with the light spilling onto the rind
    // rather than radiating off the tile.
    face();
    ctx.fillStyle = 'rgba(255, 170, 60, 0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 22, 4, 0.9)';
    ctx.lineWidth = size * 0.035;
    ctx.stroke();
}

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------

/** Forest — dead woods, and something low down watching. */
function drawForest() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(31013);

    wash(ctx, size, '#16261F', '#020604');
    emberGlow(ctx, { x: TILE * 0.68, y: TILE * 0.16, radius: TILE * 0.58, color: ROT.moon, alpha: 0.5 });
    emberGlow(ctx, { x: TILE * 0.4, y: TILE * 0.7, radius: TILE * 0.5, color: ROT.slime, alpha: 0.16 });

    ctx.lineCap = 'round';

    // Far stand: thin, hazy, low contrast.
    ctx.strokeStyle = 'rgba(26, 38, 32, 0.95)';
    for (let i = 0; i < 10; i++) {
        deadTree(ctx, {
            x: (i / 10) * TILE + random() * 60,
            y: TILE * 0.72,
            length: TILE * 0.1,
            angle: -Math.PI / 2 + (random() - 0.5) * 0.3,
            width: 7,
            depth: 4,
            random,
        });
    }

    // Near stand: big, black, and reaching across the whole tile.
    ctx.strokeStyle = rgba(PITCH, 1);
    for (let i = 0; i < 4; i++) {
        deadTree(ctx, {
            x: (i / 4) * TILE + 60 + random() * 80,
            y: TILE * 1.02,
            length: TILE * 0.19,
            angle: -Math.PI / 2 + (random() - 0.5) * 0.34,
            width: 20,
            depth: 5,
            random,
        });
    }

    watchingEyes(ctx, { x: TILE * 0.3, y: TILE * 0.62, size: 16, color: ROT.slime });
    watchingEyes(ctx, { x: TILE * 0.74, y: TILE * 0.76, size: 11, color: ROT.blood, alpha: 0.85 });
    watchingEyes(ctx, { x: TILE * 0.5, y: TILE * 0.86, size: 8, color: ROT.slime, alpha: 0.6 });

    // Something was hanged here, and the birds came.
    ctx.strokeStyle = rgba('44, 36, 24', 0.9);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(TILE * 0.86, TILE * 0.3);
    ctx.lineTo(TILE * 0.86, TILE * 0.46);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(TILE * 0.86, TILE * 0.5, TILE * 0.035, TILE * 0.045, 0, 0, Math.PI * 2);
    ctx.stroke();

    raven(ctx, { x: TILE * 0.16, y: TILE * 0.42, size: 34 });
    raven(ctx, { x: TILE * 0.62, y: TILE * 0.2, size: 22, wings: true });
    raven(ctx, { x: TILE * 0.44, y: TILE * 0.14, size: 16, wings: true });

    skull(ctx, { x: TILE * 0.62, y: TILE * 0.93, size: 56, color: ROT.bone, alpha: 0.7 });
    boneHand(ctx, { x: TILE * 0.9, baseY: TILE * 0.97, size: 76, lean: 0.2, alpha: 0.65 });

    cobweb(ctx, { x: TILE * 0.02, y: TILE * 0.02, radius: TILE * 0.4, from: -0.1, to: 1.67, alpha: 0.26 });
    cobweb(ctx, { x: TILE * 0.98, y: TILE * 0.02, radius: TILE * 0.3, from: 1.48, to: 3.24, alpha: 0.2 });
    spider(ctx, { x: TILE * 0.24, y: TILE * 0.24, size: 30 });
    spider(ctx, { x: TILE * 0.8, y: TILE * 0.14, size: 16 });

    vignette(ctx, size, 0.68, PITCH);
    grain(ctx, size, 13, 7711);
    return canvas;
}

/** Pasture — the field they buried it in. */
function drawPasture() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(80231);

    wash(ctx, size, '#2A2A1C', '#050503');
    emberGlow(ctx, { x: TILE * 0.5, y: TILE * 0.12, radius: TILE * 0.5, color: ROT.moon, alpha: 0.2 });

    const crests = [
        { baseline: TILE * 0.34, amplitude: 30, wavelength: 240, phase: 0.6, fill: 'rgba(46, 62, 40, 0.95)' },
        { baseline: TILE * 0.54, amplitude: 40, wavelength: 280, phase: 2.4, fill: 'rgba(33, 46, 30, 0.96)' },
        { baseline: TILE * 0.76, amplitude: 34, wavelength: 190, phase: 4.6, fill: 'rgba(20, 29, 19, 0.98)' },
        { baseline: TILE * 0.96, amplitude: 26, wavelength: 150, phase: 5.9, fill: 'rgba(10, 15, 10, 0.99)' },
    ];

    crests.forEach((crest, index) => {
        ridge(ctx, size, crest);

        // Dead grass — brittle, upright, no sheen on it at all.
        for (let i = 0; i < 90; i++) {
            const x = random() * TILE;
            const y = crest.baseline + Math.sin(x / crest.wavelength + crest.phase) * crest.amplitude;
            const height = 10 + random() * 24;
            ctx.beginPath();
            ctx.moveTo(x, y + 5);
            ctx.quadraticCurveTo(x + (random() - 0.5) * 6, y - height / 2, x + (random() - 0.5) * 18, y - height);
            ctx.strokeStyle = rgba(ROT.bile, 0.05 + random() * 0.1);
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // A stone or two leaning out of each rise.
        if (index < 3) {
            for (let i = 0; i < 2; i++) {
                const x = TILE * (0.12 + random() * 0.76);
                const y = crest.baseline + Math.sin(x / crest.wavelength + crest.phase) * crest.amplitude;
                headstone(ctx, {
                    x,
                    baseY: y + 6,
                    width: 44 + random() * 26,
                    height: 70 + random() * 46,
                    lean: (random() - 0.5) * 0.34,
                    fill: `rgba(${18 + index * 8}, ${20 + index * 8}, ${18 + index * 7}, 0.98)`,
                    rim: ROT.moon,
                });
            }
        }
    });

    // Ground mist, sitting in the dips.
    emberGlow(ctx, { x: TILE * 0.36, y: TILE * 0.66, radius: TILE * 0.34, color: ROT.moon, alpha: 0.14 });
    emberGlow(ctx, { x: TILE * 0.74, y: TILE * 0.84, radius: TILE * 0.3, color: ROT.moon, alpha: 0.12 });

    // They are not staying down.
    boneHand(ctx, { x: TILE * 0.34, baseY: TILE * 0.82, size: 92, lean: -0.16 });
    boneHand(ctx, { x: TILE * 0.56, baseY: TILE * 0.95, size: 110, lean: 0.12 });
    boneHand(ctx, { x: TILE * 0.08, baseY: TILE * 0.7, size: 62, lean: -0.3, alpha: 0.75 });

    // Two crosses among the stones.
    ctx.strokeStyle = 'rgba(30, 28, 22, 0.98)';
    ctx.lineWidth = 13;
    [[0.46, 0.5, 1], [0.9, 0.62, 0.8]].forEach(([cx, cy, scale]) => {
        ctx.save();
        ctx.translate(TILE * cx, TILE * cy);
        ctx.rotate(scale > 0.9 ? 0.1 : -0.16);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -110 * scale);
        ctx.moveTo(-38 * scale, -78 * scale);
        ctx.lineTo(38 * scale, -78 * scale);
        ctx.stroke();
        ctx.restore();
    });

    jackOLantern(ctx, { x: TILE * 0.76, y: TILE * 0.82, size: 104 });
    skull(ctx, { x: TILE * 0.16, y: TILE * 0.92, size: 62, color: ROT.bone, alpha: 0.82 });
    skull(ctx, { x: TILE * 0.66, y: TILE * 0.66, size: 40, color: ROT.bone, alpha: 0.6 });
    ribcage(ctx, { x: TILE * 0.9, y: TILE * 0.92, size: 100, alpha: 0.55 });
    raven(ctx, { x: TILE * 0.46, y: TILE * 0.34, size: 26 });
    spider(ctx, { x: TILE * 0.88, y: TILE * 0.22, size: 22 });

    vignette(ctx, size, 0.62, PITCH);
    grain(ctx, size, 12, 20304);
    return canvas;
}

/** Field — a cornfield with something standing in it. */
function drawField() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(55501);

    wash(ctx, size, '#241505', '#060301');
    // Blood moon, low and enormous, so the stalks read as silhouette.
    emberGlow(ctx, { x: TILE * 0.5, y: TILE * 0.24, radius: TILE * 0.62, color: ROT.blood, alpha: 0.85 });
    emberGlow(ctx, { x: TILE * 0.5, y: TILE * 0.22, radius: TILE * 0.26, color: ROT.pumpkin, alpha: 0.5 });

    ctx.lineCap = 'round';

    // Back rows, then the scarecrow, then front rows over the top of it, so it
    // is standing IN the crop rather than on it.
    const rows = (count, from, alpha, width) => {
        for (let i = 0; i < count; i++) {
            const x = (i / count) * TILE + (random() - 0.5) * 18;
            const top = TILE * from + random() * 90;
            const lean = (random() - 0.5) * 30;
            ctx.beginPath();
            ctx.moveTo(x, TILE);
            ctx.quadraticCurveTo(x + lean * 0.4, (top + TILE) / 2, x + lean, top);
            ctx.strokeStyle = rgba(PITCH, alpha);
            ctx.lineWidth = width;
            ctx.stroke();

            // Leaves off the stalk.
            for (let l = 0; l < 2; l++) {
                const ly = top + (TILE - top) * (0.25 + l * 0.3);
                const side = random() < 0.5 ? -1 : 1;
                ctx.beginPath();
                ctx.moveTo(x + lean * 0.5, ly);
                ctx.quadraticCurveTo(x + side * 28, ly - 14, x + side * 44, ly + 12);
                ctx.lineWidth = width * 0.7;
                ctx.stroke();
            }
        }
    };

    rows(34, 0.3, 0.72, 4);

    // The scarecrow: cross-post, sack head, rags.
    const sx = TILE * 0.52;
    const sy = TILE * 0.34;
    ctx.strokeStyle = rgba(PITCH, 1);
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 40);
    ctx.lineTo(sx, TILE * 0.94);
    ctx.stroke();
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(sx - 128, sy + 30);
    ctx.lineTo(sx + 128, sy + 14);
    ctx.stroke();

    ctx.fillStyle = rgba(PITCH, 1);
    ctx.beginPath();
    ctx.ellipse(sx, sy - 58, 40, 46, 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Two lit slits where a face would be.
    watchingEyes(ctx, { x: sx, y: sy - 64, size: 13, color: ROT.pumpkin, alpha: 0.95 });

    // Rags hanging off the crossbar.
    for (let i = 0; i < 7; i++) {
        const rx = sx - 110 + i * 36;
        ctx.beginPath();
        ctx.moveTo(rx, sy + 22);
        ctx.lineTo(rx - 8 + random() * 16, sy + 70 + random() * 50);
        ctx.strokeStyle = rgba(PITCH, 0.9);
        ctx.lineWidth = 7;
        ctx.stroke();
    }

    rows(22, 0.44, 0.95, 6);

    // Crows on it, and blood up the stalks.
    raven(ctx, { x: sx - 96, y: sy + 6, size: 30 });
    raven(ctx, { x: sx + 104, y: sy - 4, size: 26 });
    raven(ctx, { x: TILE * 0.2, y: TILE * 0.16, size: 20, wings: true });
    raven(ctx, { x: TILE * 0.82, y: TILE * 0.2, size: 16, wings: true });

    splatter(ctx, { x: sx - 20, y: TILE * 0.66, size: 150, count: 34, random });
    splatter(ctx, { x: TILE * 0.2, y: TILE * 0.86, size: 110, count: 22, random });
    boneHand(ctx, { x: TILE * 0.86, baseY: TILE * 0.98, size: 84, lean: 0.22, alpha: 0.7 });

    vignette(ctx, size, 0.66, PITCH);
    grain(ctx, size, 13, 91177);
    return canvas;
}

/** Mountain — black crags, and bone coming through them. */
function drawMountain() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(64422);

    wash(ctx, size, '#1A1D24', '#040507');
    emberGlow(ctx, { x: TILE * 0.32, y: TILE * 0.16, radius: TILE * 0.5, color: ROT.moon, alpha: 0.24 });

    const peaks = [
        { x: 0.22, base: 0.92, height: 0.56, width: 0.32, lit: '#3C4250', dark: '#151920' },
        { x: 0.79, base: 0.94, height: 0.5, width: 0.3, lit: '#333947', dark: '#11141A' },
        { x: 0.5, base: 1.04, height: 0.8, width: 0.42, lit: '#272C38', dark: '#080A0E' },
    ];

    peaks.forEach(peak => {
        const apexX = TILE * peak.x;
        const apexY = TILE * (peak.base - peak.height);
        const left = apexX - TILE * peak.width;
        const right = apexX + TILE * peak.width;
        const baseY = TILE * peak.base;

        ctx.beginPath();
        ctx.moveTo(apexX, apexY);
        ctx.lineTo(apexX, baseY);
        ctx.lineTo(left, baseY);
        ctx.closePath();
        const face = ctx.createLinearGradient(left, apexY, apexX, baseY);
        face.addColorStop(0, peak.lit);
        face.addColorStop(1, peak.dark);
        ctx.fillStyle = face;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(apexX, apexY);
        ctx.lineTo(right, baseY);
        ctx.lineTo(apexX, baseY);
        ctx.closePath();
        ctx.fillStyle = peak.dark;
        ctx.fill();

        // Bone-pale rim where the moon catches the ridge.
        ctx.beginPath();
        ctx.moveTo(left, baseY);
        ctx.lineTo(apexX, apexY);
        ctx.strokeStyle = rgba(ROT.bone, 0.35);
        ctx.lineWidth = 3.5;
        ctx.stroke();

        for (let i = 0; i < 7; i++) {
            const t = 0.12 + random() * 0.76;
            ctx.beginPath();
            ctx.moveTo(apexX, apexY);
            ctx.lineTo(left + (right - left) * t, baseY);
            ctx.strokeStyle = rgba(PITCH, 0.3 + random() * 0.3);
            ctx.lineWidth = 1.5 + random() * 2.5;
            ctx.stroke();
        }
    });

    // Ribs and a skull half out of the scree.
    skull(ctx, { x: TILE * 0.7, y: TILE * 0.76, size: 130, color: ROT.bone, alpha: 0.9 });
    ribcage(ctx, { x: TILE * 0.2, y: TILE * 0.84, size: 190, alpha: 0.6 });
    skull(ctx, { x: TILE * 0.44, y: TILE * 0.93, size: 56, color: ROT.bone, alpha: 0.6 });
    boneHand(ctx, { x: TILE * 0.9, baseY: TILE * 0.99, size: 78, lean: 0.26, alpha: 0.7 });

    // Bones wedged upright in the scree, and blood down the rock.
    ctx.strokeStyle = rgba(ROT.bone, 0.5);
    ctx.lineCap = 'round';
    ctx.lineWidth = 11;
    [[0.56, 0.86, -0.3], [0.62, 0.9, 0.25]].forEach(([bx, by, tilt]) => {
        ctx.save();
        ctx.translate(TILE * bx, TILE * by);
        ctx.rotate(tilt);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -90);
        ctx.stroke();
        ctx.restore();
    });

    splatter(ctx, { x: TILE * 0.72, y: TILE * 0.62, size: 120, count: 24, random, alpha: 0.65 });

    vignette(ctx, size, 0.62, PITCH);
    grain(ctx, size, 13, 40119);
    return canvas;
}

/** Hill — a crypt wall, and it is wet. */
function drawHill() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(12876);

    wash(ctx, size, '#231210', '#060202');
    emberGlow(ctx, { x: TILE * 0.5, y: TILE * 0.5, radius: TILE * 0.56, color: ROT.gore, alpha: 0.28 });

    const courses = 7;
    for (let row = 0; row < courses; row++) {
        const y = (row / courses) * TILE;
        const height = TILE / courses;
        const offset = row % 2 === 0 ? 0 : TILE / 8;

        for (let col = -1; col < 5; col++) {
            const x = col * (TILE / 4) + offset;
            const inset = 6 + random() * 6;
            const shade = 0.45 + random() * 0.4;

            ctx.beginPath();
            ctx.rect(x + inset, y + inset, TILE / 4 - inset * 2, height - inset * 2);
            ctx.fillStyle = `rgba(${Math.round(78 * shade)}, ${Math.round(52 * shade)}, ${Math.round(46 * shade)}, 1)`;
            ctx.fill();
            ctx.strokeStyle = rgba(PITCH, 0.5);
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    // Blood coming out of the joints.
    for (let i = 0; i < 26; i++) {
        drip(ctx, {
            x: TILE * (0.03 + random() * 0.94),
            y: TILE * random() * 0.72,
            length: 90 + random() * 240,
            width: 7 + random() * 14,
            color: ROT.blood,
        });
    }

    // Pooling along the bottom, where it has all run to.
    const pool = ctx.createLinearGradient(0, TILE * 0.78, 0, TILE);
    pool.addColorStop(0, rgba(ROT.blood, 0));
    pool.addColorStop(1, rgba(ROT.gore, 0.75));
    ctx.fillStyle = pool;
    ctx.fillRect(0, TILE * 0.78, TILE, TILE * 0.22);

    // Something was dragged down this wall.
    ctx.strokeStyle = rgba(ROT.gore, 0.5);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
        const x = TILE * 0.6 + i * 26;
        ctx.beginPath();
        ctx.moveTo(x, TILE * 0.18);
        ctx.quadraticCurveTo(x + 16, TILE * 0.45, x + 6, TILE * 0.72);
        ctx.stroke();
    }

    // Hand prints, going down.
    for (let i = 0; i < 5; i++) {
        const hx = TILE * (0.12 + random() * 0.76);
        const hy = TILE * (0.2 + random() * 0.5);
        ctx.fillStyle = rgba(ROT.gore, 0.55);
        ctx.beginPath();
        ctx.ellipse(hx, hy, 20, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        for (let f = 0; f < 4; f++) {
            ctx.beginPath();
            ctx.ellipse(hx - 15 + f * 10, hy - 32, 5, 14, (f - 1.5) * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    splatter(ctx, { x: TILE * 0.3, y: TILE * 0.3, size: 190, count: 44, random });
    splatter(ctx, { x: TILE * 0.78, y: TILE * 0.56, size: 150, count: 32, random });

    cobweb(ctx, { x: TILE * 0.98, y: TILE * 0.02, radius: TILE * 0.32, from: 1.48, to: 3.24, alpha: 0.2 });
    spider(ctx, { x: TILE * 0.8, y: TILE * 0.2, size: 26 });

    vignette(ctx, size, 0.64, PITCH);
    grain(ctx, size, 14, 66600);
    return canvas;
}

/** Desert — cracked ground picked clean. */
function drawDesert() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(70707);

    wash(ctx, size, '#2A2418', '#070604');
    emberGlow(ctx, { x: TILE * 0.7, y: TILE * 0.16, radius: TILE * 0.5, color: ROT.moon, alpha: 0.2 });

    const dunes = [
        { baseline: TILE * 0.36, amplitude: 34, wavelength: 320, phase: 1.4, fill: 'rgba(86, 74, 52, 0.95)' },
        { baseline: TILE * 0.58, amplitude: 42, wavelength: 250, phase: 3.6, fill: 'rgba(62, 53, 38, 0.96)' },
        { baseline: TILE * 0.8, amplitude: 34, wavelength: 190, phase: 5.2, fill: 'rgba(40, 34, 25, 0.98)' },
        { baseline: TILE * 0.99, amplitude: 24, wavelength: 150, phase: 2.6, fill: 'rgba(20, 17, 13, 0.99)' },
    ];
    dunes.forEach(dune => ridge(ctx, size, dune));

    // The ground has split open.
    ctx.strokeStyle = rgba(PITCH, 0.95);
    for (let i = 0; i < 32; i++) {
        let x = random() * TILE;
        let y = TILE * (0.35 + random() * 0.6);
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 5; s++) {
            x += (random() - 0.5) * 110;
            y += (random() - 0.3) * 46;
            ctx.lineTo(x, y);
        }
        ctx.lineWidth = 1.5 + random() * 3.5;
        ctx.stroke();
    }

    // Bones, and the rest of whoever it was.
    skull(ctx, { x: TILE * 0.36, y: TILE * 0.62, size: 138, color: ROT.bone, alpha: 0.92 });
    ctx.strokeStyle = rgba(ROT.bone, 0.5);
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    [[0.62, 0.78, 0.82, 0.7], [0.6, 0.86, 0.86, 0.82], [0.18, 0.9, 0.34, 0.94],
     [0.7, 0.9, 0.9, 0.86], [0.08, 0.74, 0.2, 0.8]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(TILE * x1, TILE * y1);
        ctx.lineTo(TILE * x2, TILE * y2);
        ctx.stroke();
    });

    // The rest of them.
    ribcage(ctx, { x: TILE * 0.37, y: TILE * 0.86, size: 170, alpha: 0.65 });
    skull(ctx, { x: TILE * 0.78, y: TILE * 0.5, size: 62, color: ROT.bone, alpha: 0.72 });
    skull(ctx, { x: TILE * 0.12, y: TILE * 0.55, size: 44, color: ROT.bone, alpha: 0.6 });
    boneHand(ctx, { x: TILE * 0.62, baseY: TILE * 0.98, size: 80, lean: -0.2, alpha: 0.7 });
    raven(ctx, { x: TILE * 0.82, y: TILE * 0.22, size: 24, wings: true });

    vignette(ctx, size, 0.6, PITCH);
    grain(ctx, size, 13, 31813);
    return canvas;
}

/** Gold — a hoard nobody walked away from. */
function drawGold() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(13337);

    wash(ctx, size, '#2A2008', '#070501');
    emberGlow(ctx, { x: TILE * 0.5, y: TILE * 0.5, radius: TILE * 0.6, color: ROT.pumpkin, alpha: 0.32 });
    // The curse on it — a sick green light under the gold.
    emberGlow(ctx, { x: TILE * 0.38, y: TILE * 0.62, radius: TILE * 0.4, color: ROT.slime, alpha: 0.26 });

    // Coins, piled up the tile.
    for (let i = 0; i < 130; i++) {
        const x = random() * TILE;
        const y = TILE * (0.16 + random() * 0.84);
        const r = 20 + random() * 26;
        const tilt = (random() - 0.5) * 1.2;

        ctx.beginPath();
        ctx.ellipse(x, y, r, r * (0.34 + random() * 0.3), tilt, 0, Math.PI * 2);
        const coin = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
        const heat = 0.3 + random() * 0.45;
        coin.addColorStop(0, rgba(ROT.pumpkin, heat));
        coin.addColorStop(1, rgba(ROT.rust, heat * 0.7));
        ctx.fillStyle = coin;
        ctx.fill();
        ctx.strokeStyle = rgba(ROT.bone, 0.1 + random() * 0.12);
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // Whoever came for it. Set off to one side: a number token covers the
    // middle of every tile, and this is the thing worth seeing on this one.
    skull(ctx, { x: TILE * 0.27, y: TILE * 0.6, size: 168, color: ROT.bone, alpha: 0.95 });
    watchingEyes(ctx, { x: TILE * 0.27, y: TILE * 0.59, size: 20, color: ROT.slime, alpha: 0.85 });

    // Still reaching for it.
    boneHand(ctx, { x: TILE * 0.72, baseY: TILE * 0.96, size: 130, lean: -0.28 });
    skull(ctx, { x: TILE * 0.84, y: TILE * 0.32, size: 62, color: ROT.bone, alpha: 0.8 });
    skull(ctx, { x: TILE * 0.12, y: TILE * 0.9, size: 46, color: ROT.bone, alpha: 0.65 });
    splatter(ctx, { x: TILE * 0.34, y: TILE * 0.82, size: 150, count: 30, random, alpha: 0.7 });

    cobweb(ctx, { x: TILE * 0.02, y: TILE * 0.02, radius: TILE * 0.3, from: -0.1, to: 1.67, alpha: 0.2 });
    spider(ctx, { x: TILE * 0.8, y: TILE * 0.74, size: 34 });

    vignette(ctx, size, 0.58, PITCH);
    grain(ctx, size, 11, 24680);
    return canvas;
}

/** Fog — you cannot see it, but it can see you. */
function drawFog() {
    const { canvas, ctx, size } = tileCanvas();
    const random = rng(90909);

    wash(ctx, size, '#1A211B', '#050705');

    // A shape standing in it, before the fog goes over the top.
    ctx.fillStyle = rgba(PITCH, 0.9);
    ctx.beginPath();
    ctx.ellipse(TILE * 0.5, TILE * 0.36, TILE * 0.09, TILE * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(TILE * 0.5, TILE * 0.44);
    ctx.quadraticCurveTo(TILE * 0.74, TILE * 0.72, TILE * 0.68, TILE * 1.02);
    ctx.lineTo(TILE * 0.32, TILE * 1.02);
    ctx.quadraticCurveTo(TILE * 0.26, TILE * 0.72, TILE * 0.5, TILE * 0.44);
    ctx.closePath();
    ctx.fill();

    for (let i = 0; i < 26; i++) {
        const progress = i / 26;
        emberGlow(ctx, {
            x: TILE * (0.08 + random() * 0.84),
            y: TILE * (0.12 + random() * 0.78),
            radius: TILE * (0.44 - progress * 0.26) * (0.7 + random() * 0.6),
            color: i % 5 === 0 ? ROT.slime : ROT.moon,
            alpha: 0.05 + progress * 0.1,
        });
    }

    watchingEyes(ctx, { x: TILE * 0.5, y: TILE * 0.35, size: 17, color: ROT.blood, alpha: 0.85 });
    watchingEyes(ctx, { x: TILE * 0.16, y: TILE * 0.62, size: 11, color: ROT.slime, alpha: 0.6 });
    watchingEyes(ctx, { x: TILE * 0.84, y: TILE * 0.5, size: 10, color: ROT.slime, alpha: 0.5 });
    watchingEyes(ctx, { x: TILE * 0.3, y: TILE * 0.86, size: 8, color: ROT.blood, alpha: 0.45 });
    watchingEyes(ctx, { x: TILE * 0.72, y: TILE * 0.8, size: 7, color: ROT.slime, alpha: 0.4 });
    watchingEyes(ctx, { x: TILE * 0.9, y: TILE * 0.24, size: 6, color: ROT.slime, alpha: 0.32 });

    vignette(ctx, size, 0.56, PITCH);
    grain(ctx, size, 12, 45454);
    return canvas;
}

/** The sea — black swamp water under a blood moon. */
function drawWater() {
    const canvas = createCanvas(BACKDROP.width, BACKDROP.height);
    const ctx = canvas.getContext('2d');
    const size = BACKDROP;
    const random = rng(19660606);

    wash(ctx, size, '#0C0E0C', '#020302');

    const moon = { x: 0.72, y: 0.2 };
    emberGlow(ctx, {
        x: size.width * moon.x, y: size.height * moon.y,
        radius: size.width * 0.3, color: ROT.blood, alpha: 0.42,
    });
    emberGlow(ctx, {
        x: size.width * moon.x, y: size.height * moon.y,
        radius: size.width * 0.08, color: ROT.pumpkin, alpha: 0.5,
    });
    emberGlow(ctx, {
        x: size.width * 0.2, y: size.height * 0.7,
        radius: size.width * 0.34, color: ROT.slime, alpha: 0.1,
    });

    // The moon, dragged down the water.
    for (let i = 0; i < 200; i++) {
        const y = size.height * (moon.y + random() * (1 - moon.y));
        const spread = (y / size.height) * 340;
        const x = size.width * moon.x + (random() - 0.5) * spread;
        const length = 30 + random() * 240;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const streak = ctx.createLinearGradient(x, y, x + length, y);
        streak.addColorStop(0, rgba(ROT.blood, 0));
        streak.addColorStop(0.5, rgba(ROT.blood, 0.06 + random() * 0.16));
        streak.addColorStop(1, rgba(ROT.blood, 0));
        ctx.strokeStyle = streak;
        ctx.lineWidth = 1 + random() * 3.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + length, y + (random() - 0.5) * 4);
        ctx.stroke();
        ctx.restore();
    }

    // Mist lying on the surface.
    for (let i = 0; i < 26; i++) {
        emberGlow(ctx, {
            x: size.width * random(),
            y: size.height * (0.3 + random() * 0.7),
            radius: size.width * (0.06 + random() * 0.13),
            color: ROT.moon,
            alpha: 0.035 + random() * 0.045,
        });
    }

    // Dead wood breaking the surface.
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(PITCH, 0.85);
    for (let i = 0; i < 9; i++) {
        deadTree(ctx, {
            x: size.width * random(),
            y: size.height * (0.55 + random() * 0.45),
            length: 40 + random() * 40,
            angle: -Math.PI / 2 + (random() - 0.5) * 0.9,
            width: 6,
            depth: 3,
            random,
        });
    }

    vignette(ctx, size, 0.75, PITCH);
    grain(ctx, size, 10, 13131);
    return canvas;
}

// ---------------------------------------------------------------------------
// Ports
// ---------------------------------------------------------------------------

/** A ghost ship: bone mast, rags for a sail, and web between the two. */
function drawBoat() {
    const canvas = createCanvas(BOAT, BOAT);
    const ctx = canvas.getContext('2d');
    const unit = BOAT / 100;

    // Lines out to the two corners this port trades from, ending on the corner
    // itself — see `portCorners`.
    const corners = portCorners(BOAT, PORT_SIZE_FACTOR);
    const hullTips = [
        { x: BOAT * 0.34, y: BOAT * 0.72 },
        { x: BOAT * 0.66, y: BOAT * 0.72 },
    ];

    corners.forEach((corner, i) => {
        // Rope, not light. Dark, frayed, with a bone peg driven into the corner.
        ctx.strokeStyle = rgba('58, 16, 14', 0.95);
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hullTips[i].x, hullTips[i].y);
        ctx.lineTo(corner.x, corner.y);
        ctx.stroke();

        ctx.strokeStyle = rgba(ROT.blood, 0.9);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(hullTips[i].x, hullTips[i].y);
        ctx.lineTo(corner.x, corner.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(corner.x, corner.y, 13, 0, Math.PI * 2);
        ctx.fillStyle = rgba(ROT.bone, 0.95);
        ctx.fill();
        ctx.strokeStyle = rgba(PITCH, 0.9);
        ctx.lineWidth = 3;
        ctx.stroke();
    });

    // Same trick as the other packs: the image's lower half is the one facing
    // open water, so the boat is drawn a half-turn round and inside it.
    ctx.save();
    ctx.translate(576, 789);
    ctx.rotate(Math.PI);
    ctx.scale(0.5, 0.48);

    emberGlow(ctx, { x: 50 * unit, y: 74 * unit, radius: 40 * unit, color: ROT.gore, alpha: 0.3 });

    // Sail, torn along the foot.
    const sail = () => {
        ctx.beginPath();
        ctx.moveTo(50 * unit, 14 * unit);
        ctx.quadraticCurveTo(72 * unit, 40 * unit, 64 * unit, 60 * unit);
        // Ragged hem rather than a clean edge.
        for (let i = 0; i < 6; i++) {
            const t = i / 6;
            const x = (64 - t * 24) * unit;
            ctx.lineTo(x, (60 - (i % 2) * 6) * unit);
        }
        ctx.lineTo(40 * unit, 60 * unit);
        ctx.closePath();
    };

    sail();
    const cloth = ctx.createLinearGradient(38 * unit, 14 * unit, 68 * unit, 60 * unit);
    cloth.addColorStop(0, 'rgba(58, 58, 48, 0.9)');
    cloth.addColorStop(1, 'rgba(20, 20, 16, 0.95)');
    ctx.fillStyle = cloth;
    ctx.fill();

    sail();
    ctx.strokeStyle = rgba(PITCH, 0.9);
    ctx.lineWidth = 3.2 * unit;
    ctx.stroke();
    sail();
    ctx.strokeStyle = rgba(ROT.bone, 0.5);
    ctx.lineWidth = 1.4 * unit;
    ctx.stroke();

    // Holes rotted through the cloth.
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.globalCompositeOperation = 'destination-out';
    [[54, 30, 4], [58, 44, 5.5], [47, 50, 3.5]].forEach(([hx, hy, hr]) => {
        ctx.beginPath();
        ctx.arc(hx * unit, hy * unit, hr * unit, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';

    // Mast.
    ctx.beginPath();
    ctx.moveTo(50 * unit, 12 * unit);
    ctx.lineTo(50 * unit, 66 * unit);
    ctx.strokeStyle = rgba(ROT.bone, 0.7);
    ctx.lineWidth = 1.8 * unit;
    ctx.stroke();

    const hull = () => {
        ctx.beginPath();
        ctx.moveTo(18 * unit, 64 * unit);
        ctx.quadraticCurveTo(50 * unit, 90 * unit, 82 * unit, 64 * unit);
        ctx.quadraticCurveTo(50 * unit, 74 * unit, 18 * unit, 64 * unit);
        ctx.closePath();
    };

    hull();
    const timber = ctx.createLinearGradient(0, 62 * unit, 0, 86 * unit);
    timber.addColorStop(0, 'rgba(34, 30, 24, 1)');
    timber.addColorStop(1, 'rgba(8, 6, 5, 1)');
    ctx.fillStyle = timber;
    ctx.fill();

    // A wreck still sailing: hard black outline, pale bone strake, planks.
    hull();
    ctx.strokeStyle = rgba(PITCH, 0.95);
    ctx.lineWidth = 3.4 * unit;
    ctx.stroke();
    hull();
    ctx.strokeStyle = rgba(ROT.bone, 0.55);
    ctx.lineWidth = 1.5 * unit;
    ctx.stroke();

    ctx.strokeStyle = rgba(PITCH, 0.6);
    ctx.lineWidth = 1.1 * unit;
    for (let i = 1; i < 5; i++) {
        const px = (26 + i * 10) * unit;
        ctx.beginPath();
        ctx.moveTo(px, 66 * unit);
        ctx.lineTo(px, 78 * unit);
        ctx.stroke();
    }

    // A skull lashed to the bow, because why not.
    skull(ctx, { x: 26 * unit, y: 58 * unit, size: 15 * unit, color: ROT.bone, alpha: 0.95 });

    ctx.restore();
    return canvas;
}

/** Resource marks, stamped on the sail. */
const GLYPHS = {
    wood: { color: ROT.bone, draw: drawWoodGlyph },
    sheep: { color: ROT.bone, draw: drawSheepGlyph },
    wheat: { color: ROT.bile, draw: drawWheatGlyph },
    ore: { color: ROT.moon, draw: drawOreGlyph },
    brick: { color: ROT.rust, draw: drawBrickGlyph },
    generic: { color: ROT.blood, draw: drawGenericGlyph },
};

function drawWoodGlyph(ctx, u) {
    // A bare tree, not a healthy one.
    ctx.beginPath();
    ctx.moveTo(50 * u, 88 * u);
    ctx.lineTo(50 * u, 44 * u);
    ctx.stroke();
    [[-1, 0.9], [1, 0.75], [-1, 0.45], [1, 0.35]].forEach(([side, t], i) => {
        const y = (44 + i * 6) * u;
        ctx.beginPath();
        ctx.moveTo(50 * u, y);
        ctx.quadraticCurveTo(50 * u + side * 20 * u, y - 16 * u, 50 * u + side * 30 * u * t, y - 34 * u);
        ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(50 * u, 44 * u);
    ctx.lineTo(50 * u, 20 * u);
    ctx.stroke();
}

function drawSheepGlyph(ctx, u) {
    // A ram's skull — still a sheep, just past its best.
    ctx.beginPath();
    ctx.moveTo(38 * u, 44 * u);
    ctx.lineTo(62 * u, 44 * u);
    ctx.lineTo(58 * u, 74 * u);
    ctx.lineTo(50 * u, 82 * u);
    ctx.lineTo(42 * u, 74 * u);
    ctx.closePath();
    ctx.stroke();

    // Horns, curling.
    [-1, 1].forEach(side => {
        ctx.beginPath();
        ctx.moveTo(50 * u + side * 11 * u, 45 * u);
        ctx.quadraticCurveTo(50 * u + side * 34 * u, 34 * u, 50 * u + side * 28 * u, 58 * u);
        ctx.stroke();
    });

    // Sockets.
    [-1, 1].forEach(side => {
        ctx.beginPath();
        ctx.arc(50 * u + side * 7 * u, 55 * u, 4.5 * u, 0, Math.PI * 2);
        ctx.stroke();
    });
}

function drawWheatGlyph(ctx, u) {
    ctx.beginPath();
    ctx.moveTo(50 * u, 24 * u);
    ctx.lineTo(50 * u, 86 * u);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
        const y = (34 + i * 13) * u;
        [-1, 1].forEach(side => {
            ctx.beginPath();
            ctx.moveTo(50 * u, y + 8 * u);
            ctx.quadraticCurveTo(50 * u + side * 18 * u, y + 2 * u, 50 * u + side * 20 * u, y - 8 * u);
            ctx.stroke();
        });
    }
}

function drawOreGlyph(ctx, u) {
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
    const rows = [{ y: 32, offset: 0 }, { y: 50, offset: 12 }, { y: 68, offset: 0 }];
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
    // Anything, from anyone. A spider takes what it likes.
    for (let i = 0; i < 4; i++) {
        const reach = 16 + i * 11;
        [-1, 1].forEach(side => {
            ctx.beginPath();
            ctx.moveTo(50 * u, 54 * u);
            ctx.quadraticCurveTo(
                (50 + side * reach * 0.9) * u, 30 * u,
                (50 + side * reach) * u, (54 + 26) * u
            );
            ctx.stroke();
        });
    }
    ctx.beginPath();
    ctx.ellipse(50 * u, 60 * u, 12 * u, 15 * u, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(50 * u, 42 * u, 8 * u, 0, Math.PI * 2);
    ctx.stroke();
}

function drawGlyph(name) {
    const canvas = createCanvas(GLYPH, GLYPH);
    const ctx = canvas.getContext('2d');
    const u = GLYPH / 100;
    const { color, draw } = GLYPHS[name];

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Heavy black outline under a solid stroke — a mark daubed on the sail,
    // not a lit tube. Then blood flicked over the top of it.
    ctx.strokeStyle = rgba(PITCH, 0.95);
    ctx.lineWidth = 11 * u;
    draw(ctx, u);

    ctx.strokeStyle = rgba(color, 1);
    ctx.lineWidth = 5.5 * u;
    draw(ctx, u);

    splatter(ctx, {
        x: 56 * u, y: 60 * u, size: 30 * u, count: 14,
        random: rng(name.length * 9161), alpha: 0.75,
    });

    return canvas;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const FILES = [
    ['catan_water_halloween.png', drawWater],
    ['catan_woods_halloween.png', drawForest],
    ['catan_sheep_halloween.png', drawPasture],
    ['catan_wheat_halloween.png', drawField],
    ['catan_rock_halloween.png', drawMountain],
    ['catan_brick_halloween.png', drawHill],
    ['catan_desert_halloween.png', drawDesert],
    ['catan_gold_halloween.png', drawGold],
    ['catan_fog_halloween.png', drawFog],
    ['catan_boat_halloween.png', drawBoat],
    ['catan_wood_logo_halloween.png', () => drawGlyph('wood')],
    ['catan_sheep_logo_halloween.png', () => drawGlyph('sheep')],
    ['catan_wheat_logo_halloween.png', () => drawGlyph('wheat')],
    ['catan_rock_logo_halloween.png', () => drawGlyph('ore')],
    ['catan_brick_logo_halloween.png', () => drawGlyph('brick')],
    ['catan_generic_logo_halloween.png', () => drawGlyph('generic')],
];

console.log('All Hallows\n');

FILES.forEach(([file, draw]) => {
    const canvas = draw();
    const buffer = canvas.toBuffer('image/png', { compressionLevel: 9 });
    fs.writeFileSync(path.join(OUT, file), buffer);
    console.log(
        `  ${file.padEnd(32)} ${canvas.width}x${canvas.height}  ${(buffer.length / 1024).toFixed(0)}KB`
    );
});

console.log('\nRun `npm run optimize-images` afterwards to refresh the manifest.');
