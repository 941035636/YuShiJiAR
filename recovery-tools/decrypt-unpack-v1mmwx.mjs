#!/usr/bin/env node
/**
 * Local V1MMWX decryptor/unpacker for an authorized recovery.
 *
 * Algorithm cross-checked against:
 * https://github.com/Ccccccccvvm/unpack-wxapkg/blob/main/unpack_wxapkg.py
 * No package contents leave this machine.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function fail(message) {
  throw new Error(message);
}

function decryptV1MMWX(raw, appid) {
  if (!raw.subarray(0, 6).equals(Buffer.from('V1MMWX'))) {
    fail('Input does not start with V1MMWX');
  }
  if (raw.length < 1030) fail('Input is too short for a V1MMWX package');
  const key = crypto.pbkdf2Sync(appid, 'saltiest', 1000, 32, 'sha1');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from('the iv: 16 bytes'));
  decipher.setAutoPadding(false);
  const decryptedHead = Buffer.concat([
    decipher.update(raw.subarray(6, 6 + 1024)),
    decipher.final(),
  ]).subarray(0, 1023);
  const xorKey = appid.length >= 2 ? appid.charCodeAt(appid.length - 2) : 0x66;
  const encryptedTail = raw.subarray(6 + 1024);
  const decryptedTail = Buffer.allocUnsafe(encryptedTail.length);
  for (let i = 0; i < encryptedTail.length; i += 1) {
    decryptedTail[i] = encryptedTail[i] ^ xorKey;
  }
  return Buffer.concat([decryptedHead, decryptedTail]);
}

function parseIndex(buf) {
  if (buf.length < 18) fail('Decrypted package is too short');
  if (buf[0] !== 0xbe) fail(`Bad wxapkg first marker: 0x${buf[0].toString(16)} (expected 0xbe)`);
  if (buf[13] !== 0xed) fail(`Bad wxapkg index marker: 0x${buf[13].toString(16)} (expected 0xed)`);
  const indexLength = buf.readUInt32BE(5);
  const bodyLength = buf.readUInt32BE(9);
  const count = buf.readUInt32BE(14);
  if (indexLength + bodyLength + 14 !== buf.length) {
    fail(`Length mismatch: 14 + ${indexLength} + ${bodyLength} != ${buf.length}`);
  }
  if (count > 100000) fail(`Unreasonable file count: ${count}`);
  let cursor = 18;
  const files = [];
  for (let i = 0; i < count; i += 1) {
    if (cursor + 4 > buf.length) fail(`Truncated index at entry ${i}`);
    const nameLength = buf.readUInt32BE(cursor);
    cursor += 4;
    if (nameLength === 0 || cursor + nameLength + 8 > buf.length) fail(`Invalid name length at entry ${i}`);
    const name = buf.subarray(cursor, cursor + nameLength).toString('utf8');
    cursor += nameLength;
    const offset = buf.readUInt32BE(cursor);
    const size = buf.readUInt32BE(cursor + 4);
    cursor += 8;
    if (offset + size > buf.length) fail(`Out-of-bounds file entry: ${name}`);
    files.push({ name, offset, size });
  }
  if (cursor !== 14 + indexLength) {
    fail(`Index cursor mismatch: ${cursor} != ${14 + indexLength}`);
  }
  return { indexLength, bodyLength, count, files };
}

function safeDestination(root, packageName) {
  const relative = packageName.replaceAll('\\', '/').replace(/^\/+/, '');
  if (!relative || relative.split('/').includes('..')) fail(`Unsafe package path: ${packageName}`);
  const destination = path.resolve(root, ...relative.split('/'));
  const resolvedRoot = path.resolve(root) + path.sep;
  if (!destination.startsWith(resolvedRoot)) fail(`Package path escapes output directory: ${packageName}`);
  return destination;
}

function main() {
  const [input, appid, decryptedOutput, extractedOutput, manifestOutput] = process.argv.slice(2);
  if (!input || !appid || !decryptedOutput || !extractedOutput || !manifestOutput) {
    fail('Usage: node decrypt-unpack-v1mmwx.mjs INPUT APPID DECRYPTED EXTRACTED_DIR MANIFEST_JSON');
  }
  const raw = fs.readFileSync(input);
  const decrypted = decryptV1MMWX(raw, appid);
  const parsed = parseIndex(decrypted);
  fs.mkdirSync(path.dirname(decryptedOutput), { recursive: true });
  fs.writeFileSync(decryptedOutput, decrypted);
  fs.mkdirSync(extractedOutput, { recursive: true });
  for (const entry of parsed.files) {
    const destination = safeDestination(extractedOutput, entry.name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, decrypted.subarray(entry.offset, entry.offset + entry.size));
  }
  const manifest = {
    source: path.resolve(input),
    appid,
    encryptedSize: raw.length,
    decryptedSize: decrypted.length,
    decryptedSha256: crypto.createHash('sha256').update(decrypted).digest('hex'),
    firstMarker: `0x${decrypted[0].toString(16).padStart(2, '0')}`,
    indexMarker: `0x${decrypted[13].toString(16).padStart(2, '0')}`,
    indexLength: parsed.indexLength,
    bodyLength: parsed.bodyLength,
    fileCount: parsed.count,
    files: parsed.files,
  };
  fs.mkdirSync(path.dirname(manifestOutput), { recursive: true });
  fs.writeFileSync(manifestOutput, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ ...manifest, files: undefined }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.stack || String(error));
  process.exitCode = 1;
}
