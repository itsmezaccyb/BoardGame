#!/usr/bin/env node

/**
 * Draws the fog tile used by the Fog Island and New World scenarios.
 *
 * These represent face-down hexes — territory nobody has explored yet — so
 * rather than shipping a photograph, the texture is generated: layered soft
 * blobs over a cool base, which reads as cloud at any size and matches the
 * flat/painted split of the two tile styles.
 *
 * Deterministic, so re-running produces byte-identical files.
 *
 *     node scripts/generate-fog-tile.js
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const OUT = path.join(__dirname, '..', 'public', 'images');
const SIZE = 768;

/** Small deterministic PRNG so the clouds are the same every run. */
function rng(seed) {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

function drawFog({ base, blobs, highlight, shadow, blobCount, seed, vignette }) {
    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');
    const random = rng(seed);

    // Base wash, slightly darker towards the bottom so the tile has weight.
    const wash = ctx.createLinearGradient(0, 0, 0, SIZE);
    wash.addColorStop(0, base[0]);
    wash.addColorStop(1, base[1]);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Soft banks of cloud. Bigger, fainter ones first so later blobs read as
    // nearer and catch more light.
    for (let i = 0; i < blobCount; i++) {
        const progress = i / blobCount;
        const radius = SIZE * (0.42 - progress * 0.24) * (0.7 + random() * 0.6);
        const x = SIZE * (0.1 + random() * 0.8);
        const y = SIZE * (0.15 + random() * 0.7);
        const alpha = 0.10 + progress * 0.22;

        const blob = ctx.createRadialGradient(x, y, 0, x, y, radius);
        blob.addColorStop(0, `rgba(${blobs}, ${alpha.toFixed(3)})`);
        blob.addColorStop(0.55, `rgba(${blobs}, ${(alpha * 0.45).toFixed(3)})`);
        blob.addColorStop(1, `rgba(${blobs}, 0)`);

        ctx.fillStyle = blob;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // A brighter core so the middle of the tile is where the eye lands.
    const core = ctx.createRadialGradient(
        SIZE * 0.5, SIZE * 0.44, 0,
        SIZE * 0.5, SIZE * 0.44, SIZE * 0.5
    );
    core.addColorStop(0, `rgba(${highlight}, 0.34)`);
    core.addColorStop(0.6, `rgba(${highlight}, 0.10)`);
    core.addColorStop(1, `rgba(${highlight}, 0)`);
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (vignette) {
        const edge = ctx.createRadialGradient(
            SIZE / 2, SIZE / 2, SIZE * 0.3,
            SIZE / 2, SIZE / 2, SIZE * 0.72
        );
        edge.addColorStop(0, `rgba(${shadow}, 0)`);
        edge.addColorStop(1, `rgba(${shadow}, 0.45)`);
        ctx.fillStyle = edge;
        ctx.fillRect(0, 0, SIZE, SIZE);
    }

    return canvas;
}

const VARIANTS = [
    {
        file: 'catan_fog.png',
        // Painted style: deeper, moodier, with a vignette to match the
        // illustrated tiles.
        base: ['#5d6b7a', '#3d4854'],
        blobs: '226, 233, 240',
        highlight: '245, 249, 252',
        shadow: '22, 28, 36',
        blobCount: 22,
        seed: 20260729,
        vignette: true,
    },
    {
        file: 'catan_fog_style.png',
        // Flat style: lighter and cleaner, no vignette.
        base: ['#9aa8b5', '#7d8b99'],
        blobs: '248, 250, 252',
        highlight: '255, 255, 255',
        shadow: '90, 100, 112',
        blobCount: 14,
        seed: 99001122,
        vignette: false,
    },
];

VARIANTS.forEach(variant => {
    const canvas = drawFog(variant);
    const buffer = canvas.toBuffer('image/png', { compressionLevel: 9 });
    const target = path.join(OUT, variant.file);
    fs.writeFileSync(target, buffer);
    console.log(`  ${variant.file.padEnd(24)} ${SIZE}x${SIZE}  ${(buffer.length / 1024).toFixed(0)}KB`);
});

console.log('\nRun `npm run optimize-images` afterwards to refresh the manifest.');
