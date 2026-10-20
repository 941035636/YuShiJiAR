#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const [probePath, assetsRoot, outputPath] = process.argv.slice(2);
if (!probePath || !assetsRoot || !outputPath) throw new Error('Usage: node download-remote-assets.mjs PROBE_JSON ASSETS_DIR OUTPUT_JSON');
const probe = JSON.parse(fs.readFileSync(probePath, 'utf8'));

function relativeDestination(item) {
  const parts = item.decodedPath.replace(/^\/+/, '').split('/');
  if (parts[0] === 'AR-YSJ') parts.shift();
  const top = parts.shift() || 'unknown';
  let categoryDir;
  if (top.toLowerCase() === 'ui') categoryDir = 'ui';
  else if (top.toLowerCase() === 'audio') categoryDir = 'audio';
  else if (item.category === 'model') categoryDir = 'models';
  else categoryDir = 'textures';
  return path.join(categoryDir, top, ...parts);
}

function validateMagic(filePath) {
  const bytes = fs.readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();
  let valid = true;
  let detail = 'not checked';
  if (extension === '.glb') {
    valid = bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'glTF' && bytes.readUInt32LE(8) === bytes.length;
    detail = valid ? `glTF v${bytes.readUInt32LE(4)}, declared length matches` : 'invalid GLB header or declared length';
  } else if (extension === '.png') {
    valid = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    detail = valid ? 'PNG signature' : 'invalid PNG signature';
  } else if (['.jpg', '.jpeg'].includes(extension)) {
    valid = bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
    detail = valid ? 'JPEG SOI/EOI markers' : 'invalid JPEG markers';
  } else if (extension === '.gif') {
    valid = ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'));
    detail = valid ? `${bytes.subarray(0, 6).toString('ascii')} signature` : 'invalid GIF signature';
  } else if (['.mp3', '.mp3'.toUpperCase()].includes(extension)) {
    valid = bytes.subarray(0, 3).toString('ascii') === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
    detail = valid ? 'MP3 ID3/frame signature' : 'invalid MP3 signature';
  }
  return { valid, detail, size: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

async function download(item) {
  const relativePath = relativeDestination(item);
  const destination = path.resolve(assetsRoot, relativePath);
  const rootPrefix = path.resolve(assetsRoot) + path.sep;
  if (!destination.startsWith(rootPrefix)) throw new Error(`Unsafe output path: ${relativePath}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination)) {
    const validation = validateMagic(destination);
    if (validation.valid && (!item.contentLength || validation.size === item.contentLength)) {
      return { decodedPath: item.decodedPath, relativePath: relativePath.replaceAll('\\', '/'), status: 'reused', ...validation };
    }
  }
  const temporary = destination + '.part';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(item.selectedUrl, { redirect: 'follow', signal: controller.signal });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(temporary));
    const validation = validateMagic(temporary);
    if (!validation.valid) throw new Error(validation.detail);
    if (item.contentLength && validation.size !== item.contentLength) throw new Error(`Length mismatch ${validation.size} != ${item.contentLength}`);
    fs.renameSync(temporary, destination);
    return { decodedPath: item.decodedPath, relativePath: relativePath.replaceAll('\\', '/'), status: 'downloaded', sourceUrl: item.selectedUrl, ...validation };
  } catch (error) {
    if (fs.existsSync(temporary)) fs.rmSync(temporary);
    return { decodedPath: item.decodedPath, relativePath: relativePath.replaceAll('\\', '/'), status: 'failed', error: String(error) };
  } finally {
    clearTimeout(timer);
  }
}

const queue = probe.results.filter((item) => item.accessible && item.selectedUrl);
const results = [];
const workers = Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const item = queue.shift();
    const result = await download(item);
    results.push(result);
    console.log(`${result.status.toUpperCase()}\t${result.size || ''}\t${result.decodedPath}`);
  }
});
await Promise.all(workers);
results.sort((a, b) => a.decodedPath.localeCompare(b.decodedPath));
const report = {
  generatedAt: new Date().toISOString(),
  attempted: results.length,
  downloaded: results.filter((item) => item.status === 'downloaded').length,
  reused: results.filter((item) => item.status === 'reused').length,
  failed: results.filter((item) => item.status === 'failed').length,
  verifiedBytes: results.filter((item) => item.valid).reduce((sum, item) => sum + item.size, 0),
  results,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ attempted: report.attempted, downloaded: report.downloaded, reused: report.reused, failed: report.failed, verifiedBytes: report.verifiedBytes }, null, 2));
if (report.failed) process.exitCode = 1;
