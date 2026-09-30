const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const MAGIC = 'ANOS1';

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function normalizeOutPath(inputPath, fallbackExt = '.anos') {
  if (!inputPath) {
    const baseName = path.basename(path.resolve(inputPath || '.')) || 'archive';
    return `${baseName}${fallbackExt}`;
  }
  return inputPath;
}

function walkDirectory(rootDir) {
  const results = [];

  function visit(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') {
          continue;
        }
        visit(fullPath);
      } else {
        results.push(fullPath);
      }
    }
  }

  visit(rootDir);
  return results;
}

function createManifestForTarget(targetPath) {
  const absPath = path.resolve(targetPath);
  const stats = fs.statSync(absPath);

  if (stats.isFile()) {
    const data = fs.readFileSync(absPath);
    const compressed = zlib.deflateRawSync(data);
    return {
      magic: MAGIC,
      version: 1,
      createdAt: new Date().toISOString(),
      type: 'file',
      name: path.basename(absPath),
      files: [
        {
          path: path.basename(absPath),
          size: data.length,
          compressedSize: compressed.length,
          hash: sha256(data),
          data: compressed.toString('base64'),
          algorithm: 'deflateRaw'
        }
      ]
    };
  }

  if (!stats.isDirectory()) {
    throw new Error(`Unsupported target: ${targetPath}`);
  }

  const files = walkDirectory(absPath).map((filePath) => {
    const relativePath = path.relative(absPath, filePath).split(path.sep).join('/');
    const data = fs.readFileSync(filePath);
    const compressed = zlib.deflateRawSync(data);
    return {
      path: relativePath,
      size: data.length,
      compressedSize: compressed.length,
      hash: sha256(data),
      data: compressed.toString('base64'),
      algorithm: 'deflateRaw'
    };
  });

  return {
    magic: MAGIC,
    version: 1,
    createdAt: new Date().toISOString(),
    type: 'directory',
    name: path.basename(absPath),
    files
  };
}

function writeArchive(targetPath, customOutputPath) {
  const absTargetPath = path.resolve(targetPath);
  const manifest = createManifestForTarget(absTargetPath);

  const archiveBuffer = zlib.gzipSync(Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

  const outputPath = customOutputPath
    ? path.resolve(customOutputPath)
    : (() => {
        const basename = path.basename(absTargetPath);
        const base = basename.endsWith('.anos') ? basename : `${basename}.anos`;
        return path.join(path.dirname(absTargetPath), base);
      })();

  fs.writeFileSync(outputPath, archiveBuffer);
  return outputPath;
}

function readArchive(archivePath) {
  const absArchive = path.resolve(archivePath);
  const archiveData = fs.readFileSync(absArchive);
  const json = zlib.gunzipSync(archiveData).toString('utf8');
  const manifest = JSON.parse(json);

  if (!manifest || manifest.magic !== MAGIC) {
    throw new Error(`Invalid ANOS archive: ${archivePath}`);
  }

  return manifest;
}

function extractArchive(archivePath, targetDir) {
  const manifest = readArchive(archivePath);
  const outputDir = path.resolve(targetDir || path.join(path.dirname(archivePath), 'extracted'));
  fs.mkdirSync(outputDir, { recursive: true });

  for (const entry of manifest.files) {
    const resolvedPath = path.join(outputDir, entry.path);
    const data = Buffer.from(entry.data, 'base64');
    const raw = zlib.inflateRawSync(data);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, raw);
  }

  return manifest;
}

function infoArchive(archivePath) {
  const manifest = readArchive(archivePath);

  const totalOriginalSize = manifest.files.reduce((sum, file) => sum + file.size, 0);
  const totalCompressedSize = manifest.files.reduce((sum, file) => sum + file.compressedSize, 0);
  const ratio = totalOriginalSize > 0 ? ((totalCompressedSize / totalOriginalSize) * 100).toFixed(2) : '0.00';

  return {
    type: manifest.type,
    name: manifest.name,
    createdAt: manifest.createdAt,
    version: manifest.version,
    fileCount: manifest.files.length,
    totalOriginalSize,
    totalCompressedSize,
    compressionRatioPercent: Number(ratio),
    algorithm: 'deflateRaw',
    magic: manifest.magic
  };
}

module.exports = {
  writeArchive,
  extractArchive,
  infoArchive,
  readArchive,
  createManifestForTarget
};
