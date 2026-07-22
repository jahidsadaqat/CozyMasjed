import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const MESHOPT_EXTENSION = 'EXT_meshopt_compression';
const MEBIBYTE = 1024 * 1024;
const modelRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../assets/models/optimized',
);

async function listModels(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return listModels(absolute);
      return entry.isFile() && entry.name.toLowerCase().endsWith('.glb')
        ? [absolute]
        : [];
    }),
  );

  return nested.flat();
}

function readGlbJson(bytes, relativePath) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (bytes.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error(`${relativePath}: invalid GLB header`);
  }

  const declaredLength = view.getUint32(8, true);
  if (declaredLength !== bytes.byteLength) {
    throw new Error(`${relativePath}: GLB length does not match its header`);
  }

  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;

    if (chunkEnd > bytes.byteLength) {
      throw new Error(`${relativePath}: GLB chunk exceeds file bounds`);
    }

    if (chunkType === JSON_CHUNK) {
      const json = new TextDecoder()
        .decode(bytes.subarray(chunkStart, chunkEnd))
        .replace(/[\u0000\u0020]+$/u, '');
      return JSON.parse(json);
    }

    offset = chunkEnd;
  }

  throw new Error(`${relativePath}: missing JSON chunk`);
}

const files = (await listModels(modelRoot)).sort();
const failures = [];
let totalBytes = 0;

for (const file of files) {
  const relativePath = path.relative(modelRoot, file);
  const bytes = await fs.readFile(file);
  const json = readGlbJson(bytes, relativePath);
  const requiredExtensions = json.extensionsRequired ?? [];
  const budget = relativePath.startsWith(`buildings${path.sep}`)
    ? 4 * MEBIBYTE
    : 2 * MEBIBYTE;

  totalBytes += bytes.byteLength;

  if (requiredExtensions.includes(MESHOPT_EXTENSION)) {
    failures.push(
      `${relativePath}: ${MESHOPT_EXTENSION} requires WebAssembly and cannot be used by native Hermes`,
    );
  }

  if (bytes.byteLength > budget) {
    failures.push(
      `${relativePath}: ${(bytes.byteLength / MEBIBYTE).toFixed(2)} MB exceeds the ${(budget / MEBIBYTE).toFixed(0)} MB mobile budget`,
    );
  }
}

if (files.length === 0) {
  failures.push('No GLB models were found.');
}

if (failures.length > 0) {
  console.error(`Native model preflight failed (${failures.length} issue(s)):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Native model preflight passed: ${files.length} GLBs, ${(totalBytes / MEBIBYTE).toFixed(2)} MB, no runtime Meshopt.`,
);
