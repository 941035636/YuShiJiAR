#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [projectRoot, outputPath] = process.argv.slice(2);
if (!projectRoot || !outputPath) throw new Error('Usage: node validate-recovered-project.mjs PROJECT_DIR OUTPUT_JSON');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
}
walk(projectRoot);

const errors = [];
const warnings = [];
for (const file of files) {
  const relative = path.relative(projectRoot, file).replaceAll('\\', '/');
  if (file.endsWith('.json')) {
    try { JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (error) { errors.push({ file: relative, type: 'json-syntax', message: String(error) }); }
  }
  if (file.endsWith('.js')) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) errors.push({ file: relative, type: 'js-syntax', message: (result.stderr || result.stdout).trim() });
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/require\(["']([^"']+)["']\)/g)) {
      const requested = match[1];
      if (!requested.startsWith('.')) continue;
      const candidate = path.resolve(path.dirname(file), requested);
      const exists = fs.existsSync(candidate) || fs.existsSync(candidate + '.js') || fs.existsSync(path.join(candidate, 'index.js'));
      if (!exists) errors.push({ file: relative, type: 'missing-require', message: requested });
    }
  }
  if (file.endsWith('.wxml')) {
    const source = fs.readFileSync(file, 'utf8');
    const stack = [];
    for (const match of source.matchAll(/<\/?([A-Za-z][\w-]*)(?:\s[^<>]*?)?\s*\/?>/g)) {
      const token = match[0];
      const tag = match[1];
      if (token.startsWith('</')) {
        const open = stack.pop();
        if (open !== tag) errors.push({ file: relative, type: 'wxml-balance', message: `Expected </${open}> but found </${tag}>` });
      } else if (!token.endsWith('/>')) stack.push(tag);
    }
    if (stack.length) errors.push({ file: relative, type: 'wxml-balance', message: `Unclosed tags: ${stack.join(', ')}` });
    for (const match of source.matchAll(/\s(?:src|icon-path)="(\/[^"{}]+)"/g)) {
      const localPath = path.join(projectRoot, ...match[1].slice(1).split('/'));
      if (!fs.existsSync(localPath)) errors.push({ file: relative, type: 'missing-local-asset', message: match[1] });
    }
  }
}

let appJson;
try { appJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8')); }
catch {}
for (const page of appJson?.pages || []) {
  for (const extension of ['.js', '.json', '.wxml', '.wxss']) {
    if (!fs.existsSync(path.join(projectRoot, ...`${page}${extension}`.split('/')))) {
      errors.push({ file: 'app.json', type: 'missing-page-file', message: `${page}${extension}` });
    }
  }
  const configPath = path.join(projectRoot, ...`${page}.json`.split('/'));
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    for (const [name, target] of Object.entries(config.usingComponents || {})) {
      const targetBase = path.join(projectRoot, ...target.replace(/^\//, '').split('/'));
      if (!fs.existsSync(targetBase + '.js') || !fs.existsSync(targetBase + '.wxml') || !fs.existsSync(targetBase + '.json')) {
        errors.push({ file: path.relative(projectRoot, configPath).replaceAll('\\', '/'), type: 'missing-component', message: `${name}: ${target}` });
      }
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  projectRoot: path.resolve(projectRoot),
  fileCount: files.length,
  pageCount: appJson?.pages?.length || 0,
  checks: ['JSON parse', 'JavaScript syntax', 'relative require targets', 'WXML tag balance', 'local asset references', 'page file completeness', 'usingComponents targets'],
  errorCount: errors.length,
  warningCount: warnings.length,
  errors,
  warnings,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
