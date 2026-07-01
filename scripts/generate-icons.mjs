#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, "../public/icons");

const PAIRS = [
  ["icon-192.svg", "icon-192.png", 192],
  ["icon-512.svg", "icon-512.png", 512],
  ["icon-maskable.svg", "icon-maskable-512.png", 512],
  ["icon-512.svg", "apple-touch-icon.png", 180],
];

async function main() {
  for (const [src, dest, size] of PAIRS) {
    const input = path.join(ICONS_DIR, src);
    const output = path.join(ICONS_DIR, dest);
    const svg = await readFile(input);
    await sharp(svg, { density: 300 })
      .resize(size, size)
      .png()
      .toFile(output);
    console.log(`Wrote ${dest} (${size}x${size})`);
  }

  const width = 1200;
  const height = 630;
  const iconPath = path.join(ICONS_DIR, "icon-512.png");
  const ogSvg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0A0E14"/>
      <stop offset="100%" stop-color="#131922"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="0" y="0" width="6" height="100%" fill="#E8475A"/>
  <text x="80" y="280" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="700" fill="#F4F6F8">Siren Watch</text>
  <text x="80" y="360" font-family="system-ui, -apple-system, sans-serif" font-size="32" fill="#8B98A8">Live emergency siren detection</text>
  <text x="80" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="#5C6B7A">On-device • Flash &amp; vibration alerts</text>
</svg>`);

  const icon = await readFile(iconPath);
  await sharp(ogSvg)
    .composite([{ input: icon, top: 195, left: 900, width: 240, height: 240 }])
    .png()
    .toFile(path.join(ICONS_DIR, "og-image.png"));
  console.log("Wrote og-image.png (1200x630)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
