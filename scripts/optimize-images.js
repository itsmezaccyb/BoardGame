#!/usr/bin/env node

/**
 * Generates display-sized copies of the board artwork.
 *
 * The source art is far larger than anything ever drawn on screen — the legend
 * icons are 1536x1024 files rendered at about 58 pixels — which costs both
 * bandwidth and, on a Raspberry Pi, a lot of decode time on every repaint.
 *
 * This writes downscaled copies to public/images/optimized/ and records a
 * manifest that `assetUrl()` reads, so the originals stay untouched and the app
 * automatically prefers the smaller file when one exists.
 *
 * Run after changing any board artwork:
 *     node scripts/optimize-images.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createCanvas, loadImage } = require('canvas');

const ROOT = path.join(__dirname, '..');
const IMAGES = path.join(ROOT, 'public', 'images');
const OUT_DIR = path.join(IMAGES, 'optimized');
const MANIFEST = path.join(ROOT, 'lib', 'generated', 'optimized-images.json');

/** Source files to scan for `/images/...` references. */
const SOURCE_GLOBS = [
    path.join(ROOT, 'lib', 'catan'),
    path.join(ROOT, 'lib', 'building-costs.ts'),
];

/**
 * Largest dimension to keep, by filename pattern. Roughly 2x the on-screen size
 * so the art still looks crisp on a high-density panel or if PIXELS_PER_INCH
 * is raised.
 */
const SIZE_RULES = [
    // Legend icons are only drawn at ~58px, but downscaling in two steps
    // (source -> file -> screen) softens detail, so keep plenty of headroom.
    // At this size they are a few tens of KB either way.
    { match: /_logo(_style|_stle|_nights|_halloween)?\.(png|jpg|jpeg)$/i, maxDimension: 384 },
    { match: /catan_water(_style|_nights|_halloween)?\.(png|jpg|jpeg)$/i, maxDimension: 1920 }, // full-page background
    { match: /catan_boat/i, maxDimension: 768 },                             // port boats, ~419px
    { match: /./, maxDimension: 768 },                                       // hex tiles, ~345px
];

const JPEG_QUALITY = 0.9;

function maxDimensionFor(file) {
    return SIZE_RULES.find(rule => rule.match.test(file)).maxDimension;
}

/** Collects every `/images/...` path referenced by the board code. */
function referencedImages() {
    const found = new Set();

    const scan = target => {
        const stat = fs.statSync(target);
        if (stat.isDirectory()) {
            fs.readdirSync(target).forEach(entry => scan(path.join(target, entry)));
            return;
        }
        if (!/\.tsx?$/.test(target)) return;
        const source = fs.readFileSync(target, 'utf8');
        for (const match of source.matchAll(/['"](\/images\/[^'"]+\.(?:png|jpg|jpeg))['"]/gi)) {
            found.add(match[1]);
        }
    };

    SOURCE_GLOBS.forEach(scan);
    return [...found].sort();
}

/** True when any pixel is not fully opaque, in which case JPEG is not an option. */
function hasTransparency(ctx, width, height) {
    const { data } = ctx.getImageData(0, 0, width, height);
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) return true;
    }
    return false;
}

async function optimize(imagePath) {
    const name = path.basename(imagePath);
    const source = path.join(IMAGES, name);

    if (!fs.existsSync(source)) {
        console.warn(`  skip ${name} — not found`);
        return null;
    }

    const image = await loadImage(source);
    const limit = maxDimensionFor(name);
    const scale = Math.min(1, limit / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.quality = 'best';
    ctx.drawImage(image, 0, 0, width, height);

    // Opaque art compresses far better as JPEG; anything with soft edges or a
    // cut-out background has to stay PNG.
    const transparent = hasTransparency(ctx, width, height);
    const extension = transparent ? '.png' : '.jpg';

    const buffer = transparent
        ? canvas.toBuffer('image/png', { compressionLevel: 9 })
        : canvas.toBuffer('image/jpeg', { quality: JPEG_QUALITY });

    // The content hash in the filename is what makes `immutable` caching safe:
    // edited artwork produces a new name, so browsers fetch it without anyone
    // needing to clear a cache.
    const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 8);
    const outName = name.replace(/\.(png|jpg|jpeg)$/i, `.${hash}${extension}`);
    const outPath = path.join(OUT_DIR, outName);

    const before = fs.statSync(source).size;
    const after = buffer.length;

    // Re-encoding an already-small file can make it bigger; keep the original.
    if (after >= before) {
        console.log(`  ${name.padEnd(32)} already optimal (${(before / 1024).toFixed(0)}KB) — keeping original`);
        return null;
    }

    fs.writeFileSync(outPath, buffer);

    console.log(
        `  ${name.padEnd(32)} ${String(image.width).padStart(4)}x${String(image.height).padEnd(4)}` +
        ` -> ${String(width).padStart(4)}x${String(height).padEnd(4)}` +
        ` ${transparent ? 'png' : 'jpg'}  ` +
        `${(before / 1024).toFixed(0).padStart(5)}KB -> ${(after / 1024).toFixed(0).padStart(5)}KB` +
        `  (${(100 - (after / before) * 100).toFixed(1)}% smaller)`
    );

    return { from: imagePath, to: `/images/optimized/${outName}`, before, after };
}

async function main() {
    // Rebuilt from scratch each run so renamed/hashed files never accumulate.
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });

    const images = referencedImages();
    console.log(`Optimizing ${images.length} board images\n`);

    const manifest = {};
    let before = 0;
    let after = 0;

    for (const image of images) {
        const result = await optimize(image);
        if (!result) continue;
        manifest[result.from] = result.to;
        before += result.before;
        after += result.after;
    }

    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

    console.log(
        `\nTotal ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(2)}MB` +
        ` (${(100 - (after / before) * 100).toFixed(1)}% smaller)`
    );
    console.log(`Manifest: ${path.relative(ROOT, MANIFEST)}`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
