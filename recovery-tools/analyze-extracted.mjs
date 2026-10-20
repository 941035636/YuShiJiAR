#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [inputRoot, outputJson] = process.argv.slice(2);
if (!inputRoot || !outputJson) {
  throw new Error('Usage: node analyze-extracted.mjs EXTRACTED_DIR OUTPUT_JSON');
}

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else files.push(fullPath);
  }
}
walk(inputRoot);

const urlMap = new Map();
for (const file of files) {
  if (!/\.(?:js|html|json)$/i.test(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  content = content
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, value) => String.fromCharCode(Number.parseInt(value, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, value) => String.fromCharCode(Number.parseInt(value, 16)));
  for (const match of content.matchAll(/https?:\/\/[^\s"'<>\\]+/g)) {
    const url = match[0]
      .replace(/\\n.*$/, '')
      .replace(/(\.(?:gif|png|jpe?g|glb|gltf|mp3))\).*/i, '$1')
      .replace(/\\$/, '');
    if (!urlMap.has(url)) urlMap.set(url, new Set());
    urlMap.get(url).add(path.relative(inputRoot, file).replaceAll('\\', '/'));
  }
}

function classifyUrl(url) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(url).pathname); }
  catch { pathname = url; }
  const extension = path.extname(pathname).toLowerCase();
  if (['.glb', '.gltf', '.obj', '.fbx', '.bin'].includes(extension)) return 'model';
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ktx', '.ktx2'].includes(extension)) {
    return pathname.toLowerCase().includes('/card/') ? 'tracking-image' : 'image';
  }
  if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(extension)) return 'audio';
  return 'other';
}

const urls = [...urlMap.entries()].map(([url, sourceFiles]) => {
  let decodedPath = url;
  let hasSignedQuery = false;
  try {
    const parsed = new URL(url);
    decodedPath = decodeURIComponent(parsed.pathname);
    hasSignedQuery = parsed.searchParams.has('sign') || parsed.searchParams.has('t');
  } catch {}
  return {
    url,
    decodedPath,
    category: classifyUrl(url),
    hasSignedQuery,
    sourceFiles: [...sourceFiles].sort(),
  };
}).sort((a, b) => a.url.localeCompare(b.url));

const localFiles = files.map((file) => {
  const bytes = fs.readFileSync(file);
  return {
    path: path.relative(inputRoot, file).replaceAll('\\', '/'),
    size: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}).sort((a, b) => a.path.localeCompare(b.path));

const result = {
  generatedAt: new Date().toISOString(),
  inputRoot: path.resolve(inputRoot),
  fileCount: localFiles.length,
  urls: {
    total: urls.length,
    byCategory: Object.fromEntries(
      [...new Set(urls.map((item) => item.category))]
        .sort()
        .map((category) => [category, urls.filter((item) => item.category === category).length]),
    ),
    entries: urls,
  },
  localFiles,
};
fs.mkdirSync(path.dirname(outputJson), { recursive: true });
fs.writeFileSync(outputJson, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ fileCount: result.fileCount, urlCount: urls.length, byCategory: result.urls.byCategory }, null, 2));
