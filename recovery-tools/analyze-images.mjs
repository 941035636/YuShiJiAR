#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [assetsRoot, outputPath] = process.argv.slice(2);
if (!assetsRoot || !outputPath) throw new Error('Usage: node analyze-images.mjs ASSETS_DIR OUTPUT_JSON');

function dimensions(bytes, extension) {
  if (extension === '.png' && bytes.length >= 24) return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (extension === '.gif' && bytes.length >= 10) return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  if (['.jpg', '.jpeg'].includes(extension)) {
    let cursor = 2;
    while (cursor + 9 < bytes.length) {
      if (bytes[cursor] !== 0xff) { cursor += 1; continue; }
      const marker = bytes[cursor + 1];
      const length = bytes.readUInt16BE(cursor + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: bytes.readUInt16BE(cursor + 7), height: bytes.readUInt16BE(cursor + 5) };
      }
      if (length < 2) break;
      cursor += 2 + length;
    }
  }
  return { width: null, height: null };
}

const entries = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full);
    else if (/\.(png|jpe?g|gif|webp)$/i.test(item.name)) {
      const bytes = fs.readFileSync(full);
      const extension = path.extname(item.name).toLowerCase();
      entries.push({
        path: path.relative(assetsRoot, full).replaceAll('\\', '/'),
        size: bytes.length,
        ...dimensions(bytes, extension),
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      });
    }
  }
}
walk(assetsRoot);
entries.sort((a, b) => a.path.localeCompare(b.path));
const report = {
  generatedAt: new Date().toISOString(),
  imageCount: entries.length,
  uiImageCount: entries.filter((entry) => entry.path.startsWith('ui/')).length,
  trackingImageCount: entries.filter((entry) => entry.path.startsWith('textures/Card/')).length,
  extractedGlbTextureCount: entries.filter((entry) => entry.path.startsWith('textures/extracted-from-glb/')).length,
  entries,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ imageCount: report.imageCount, uiImageCount: report.uiImageCount, trackingImageCount: report.trackingImageCount, extractedGlbTextureCount: report.extractedGlbTextureCount }, null, 2));
