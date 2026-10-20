#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [analysisPath, outputPath] = process.argv.slice(2);
if (!analysisPath || !outputPath) throw new Error('Usage: node probe-remote-assets.mjs ANALYSIS_JSON OUTPUT_JSON');
const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
const allowedHost = '7973-ysj-2gufe9z9f9118b4f-1326910532.tcb.qcloud.la';
const groups = new Map();
for (const entry of analysis.urls.entries) {
  const parsed = new URL(entry.url);
  if (parsed.hostname !== allowedHost) continue;
  const key = parsed.origin + parsed.pathname;
  if (!groups.has(key)) groups.set(key, { canonicalUrl: key, decodedPath: decodeURIComponent(parsed.pathname), category: entry.category, candidates: [] });
  groups.get(key).candidates.push(entry.url);
}

async function probe(group) {
  const candidates = [...new Set([...group.candidates, group.canonicalUrl])];
  const attempts = [];
  for (const url of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
      const attempt = {
        url,
        status: response.status,
        ok: response.ok,
        finalUrl: response.url,
        contentType: response.headers.get('content-type'),
        contentLength: Number(response.headers.get('content-length')) || null,
        etag: response.headers.get('etag'),
      };
      attempts.push(attempt);
      if (response.ok) return { ...group, accessible: true, selectedUrl: url, ...attempt, attempts };
    } catch (error) {
      attempts.push({ url, ok: false, error: String(error) });
    } finally {
      clearTimeout(timer);
    }
  }
  return { ...group, accessible: false, selectedUrl: null, attempts };
}

const pending = [...groups.values()].sort((a, b) => a.decodedPath.localeCompare(b.decodedPath));
const results = [];
const workers = Array.from({ length: 4 }, async () => {
  while (pending.length) {
    const group = pending.shift();
    results.push(await probe(group));
  }
});
await Promise.all(workers);
results.sort((a, b) => a.decodedPath.localeCompare(b.decodedPath));
const report = {
  generatedAt: new Date().toISOString(),
  allowedHost,
  canonicalResourceCount: results.length,
  accessibleCount: results.filter((item) => item.accessible).length,
  inaccessibleCount: results.filter((item) => !item.accessible).length,
  declaredAccessibleBytes: results.filter((item) => item.accessible).reduce((sum, item) => sum + (item.contentLength || 0), 0),
  results,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  canonicalResourceCount: report.canonicalResourceCount,
  accessibleCount: report.accessibleCount,
  inaccessibleCount: report.inaccessibleCount,
  declaredAccessibleBytes: report.declaredAccessibleBytes,
}, null, 2));
for (const item of results) console.log(`${item.accessible ? 'OK' : 'FAIL'}\t${item.status || ''}\t${item.contentLength || ''}\t${item.decodedPath}`);
