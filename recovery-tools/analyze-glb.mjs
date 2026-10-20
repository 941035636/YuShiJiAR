#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [modelsRoot, textureRoot, outputPath] = process.argv.slice(2);
if (!modelsRoot || !textureRoot || !outputPath) throw new Error('Usage: node analyze-glb.mjs MODELS_DIR TEXTURE_DIR OUTPUT_JSON');

const modelPaths = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.toLowerCase().endsWith('.glb')) modelPaths.push(full);
  }
}
walk(modelsRoot);

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '') || 'image';
}

function parseGlb(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes.subarray(0, 4).toString('ascii') !== 'glTF') throw new Error('Invalid GLB magic');
  const version = bytes.readUInt32LE(4);
  const declaredLength = bytes.readUInt32LE(8);
  const chunks = [];
  let cursor = 12;
  while (cursor + 8 <= bytes.length) {
    const length = bytes.readUInt32LE(cursor);
    const type = bytes.readUInt32LE(cursor + 4);
    const dataOffset = cursor + 8;
    if (dataOffset + length > bytes.length) throw new Error('Chunk exceeds file bounds');
    chunks.push({ type, length, dataOffset });
    cursor = dataOffset + length;
  }
  const jsonChunk = chunks.find((chunk) => chunk.type === 0x4e4f534a);
  const binChunk = chunks.find((chunk) => chunk.type === 0x004e4942);
  if (!jsonChunk) throw new Error('Missing JSON chunk');
  const json = JSON.parse(bytes.subarray(jsonChunk.dataOffset, jsonChunk.dataOffset + jsonChunk.length).toString('utf8').replace(/\u0000+$/g, '').trim());
  return { bytes, version, declaredLength, chunks, json, binChunk };
}

const reports = [];
for (const modelPath of modelPaths.sort()) {
  const relative = path.relative(modelsRoot, modelPath).replaceAll('\\', '/');
  const parsed = parseGlb(modelPath);
  const json = parsed.json;
  const extractedImages = [];
  for (const [index, image] of (json.images || []).entries()) {
    if (image.uri) {
      extractedImages.push({ index, name: image.name || null, uri: image.uri, embedded: image.uri.startsWith('data:') });
      continue;
    }
    if (image.bufferView === undefined || !parsed.binChunk) continue;
    const view = json.bufferViews?.[image.bufferView];
    if (!view || (view.buffer || 0) !== 0) continue;
    const start = parsed.binChunk.dataOffset + (view.byteOffset || 0);
    const end = start + view.byteLength;
    const content = parsed.bytes.subarray(start, end);
    const extension = image.mimeType === 'image/jpeg' ? '.jpg' : image.mimeType === 'image/webp' ? '.webp' : '.png';
    const modelStem = relative.replace(/\.glb$/i, '');
    const outputDir = path.join(textureRoot, ...modelStem.split('/'));
    const filename = `${String(index).padStart(2, '0')}-${sanitize(image.name || `image-${index}`)}${extension}`;
    const destination = path.join(outputDir, filename);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(destination, content);
    extractedImages.push({
      index,
      name: image.name || null,
      mimeType: image.mimeType || null,
      embedded: true,
      output: path.relative(textureRoot, destination).replaceAll('\\', '/'),
      size: content.length,
      sha256: crypto.createHash('sha256').update(content).digest('hex'),
    });
  }
  reports.push({
    path: relative,
    size: parsed.bytes.length,
    sha256: crypto.createHash('sha256').update(parsed.bytes).digest('hex'),
    gltfVersion: parsed.version,
    generator: json.asset?.generator || null,
    sceneCount: (json.scenes || []).length,
    nodeCount: (json.nodes || []).length,
    meshCount: (json.meshes || []).length,
    primitiveCount: (json.meshes || []).reduce((sum, mesh) => sum + (mesh.primitives || []).length, 0),
    materialCount: (json.materials || []).length,
    textureCount: (json.textures || []).length,
    imageCount: (json.images || []).length,
    skinCount: (json.skins || []).length,
    animationCount: (json.animations || []).length,
    animationNames: (json.animations || []).map((animation, index) => animation.name || `animation-${index}`),
    extensionsUsed: json.extensionsUsed || [],
    extensionsRequired: json.extensionsRequired || [],
    externalBufferUris: (json.buffers || []).map((buffer) => buffer.uri).filter(Boolean),
    extractedImages,
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  modelCount: reports.length,
  totalBytes: reports.reduce((sum, model) => sum + model.size, 0),
  totalMeshes: reports.reduce((sum, model) => sum + model.meshCount, 0),
  totalMaterials: reports.reduce((sum, model) => sum + model.materialCount, 0),
  totalEmbeddedImages: reports.reduce((sum, model) => sum + model.extractedImages.filter((image) => image.embedded).length, 0),
  modelsWithAnimations: reports.filter((model) => model.animationCount > 0).length,
  totalAnimations: reports.reduce((sum, model) => sum + model.animationCount, 0),
  models: reports,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  modelCount: report.modelCount,
  totalBytes: report.totalBytes,
  totalMeshes: report.totalMeshes,
  totalMaterials: report.totalMaterials,
  totalEmbeddedImages: report.totalEmbeddedImages,
  modelsWithAnimations: report.modelsWithAnimations,
  totalAnimations: report.totalAnimations,
}, null, 2));
