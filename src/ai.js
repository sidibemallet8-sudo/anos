const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { analyzeOptimization } = require('./ai');

const MAGIC = 'ANOS1';

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function detectMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.pt': 'ai-model-pytorch',
    '.pth': 'ai-model-pytorch',
    '.onnx': 'ai-model-onnx',
    '.h5': 'ai-model-tensorflow',
    '.keras': 'ai-model-keras',
    '.bin': 'binary',
    '.json': 'json-document',
    '.csv': 'dataset-csv',
    '.parquet': 'dataset-parquet',
    '.zip': 'archive',
    '.tar': 'archive',
    '.gz': 'archive',
    '.pdf': 'document-pdf',
    '.docx': 'document-office',
    '.txt': 'text',
    '.md': 'markdown',
    '.js': 'code-javascript',
    '.ts': 'code-typescript',
    '.py': 'code-python',
    '.tsx': 'code-typescript',
    '.jsx': 'code-javascript',
    '.svg': 'graphic-vector',
    '.png': 'graphic-image',
    '.jpg': 'graphic-image',
    '.jpeg': 'graphic-image',
    '.webp': 'graphic-image',
    '.mp4': 'video',
    '.mp3': 'audio'
  };

  return map[ext] || 'generic';
}

function normalizeLevel(level = 'balanced') {
  const normalized = String(level).toLowerCase();
  return ['fast', 'balanced', 'aggressive'].includes(normalized) ? normalized : 'balanced';
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getDefaultArchivePath(targetPath, customPath) {
  if (customPath) return path.resolve(customPath);
  const base = path.basename(targetPath);
  const clean = base.endsWith('.anos') ? base : `${base}.anos`;
  return path.join(path.dirname(targetPath), clean);
}

function walkDirectory(rootDir) {
  const results = [];
  function visit(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') {
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

function encryptBuffer(buffer, password) {
  if (!password) return buffer;
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, 200000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, encrypted]);
}

function decryptBuffer(buffer, password) {
  if (!password) return buffer;
  const salt = buffer.subarray(0, 16);
  const iv = buffer.subarray(16, 28);
  const tag = buffer.subarray(28, 44);
  const ciphertext = buffer.subarray(44);
  const key = crypto.pbkdf2Sync(password, salt, 200000, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function compressPayload(buffer, algorithmName = 'deflateRaw') {
  switch (algorithmName) {
    case 'gzip':
      return zlib.gzipSync(buffer);
    case 'brotli':
      return zlib.brotliCompressSync(buffer);
    case 'deflateRaw':
    default:
      return zlib.deflateRawSync(buffer);
  }
}

function decompressPayload(buffer, algorithmName = 'deflateRaw') {
  switch (algorithmName) {
    case 'gzip':
      return zlib.gunzipSync(buffer);
    case 'brotli':
      return zlib.brotliDecompressSync(buffer);
    case 'deflateRaw':
    default:
      return zlib.inflateRawSync(buffer);
  }
}

function buildFileEntry(filePath, rootDir, options = {}) {
  const relPath = path.relative(rootDir, filePath).split(path.sep).join('/');
  const original = fs.readFileSync(filePath);
  const mime = detectMime(filePath);
  const aiAnalysis = analyzeOptimization({ mime, fileSize: original.length, level: normalizeLevel(options.level) });
  const algorithm = aiAnalysis.recommendedAlgorithm || 'deflateRaw';
  const compressed = compressPayload(original, algorithm);
  const finalBytes = options.password ? encryptBuffer(compressed, options.password) : compressed;

  return {
    path: relPath,
    size: original.length,
    compressedSize: finalBytes.length,
    hash: sha256(original),
    mime,
    algorithm,
    aiOptimized: aiAnalysis.aiOptimized,
    aiRecommendation: aiAnalysis.recommendation,
    data: finalBytes.toString('base64')
  };
}

function buildManifest(targetPath, options = {}) {
  const absTargetPath = path.resolve(targetPath);
  const stats = fs.statSync(absTargetPath);

  if (stats.isFile()) {
    const mime = detectMime(absTargetPath);
    const original = fs.readFileSync(absTargetPath);
    const aiAnalysis = analyzeOptimization({ mime, fileSize: original.length, level: normalizeLevel(options.level) });
    const algorithm = aiAnalysis.recommendedAlgorithm || 'deflateRaw';
    const compressed = compressPayload(original, algorithm);
    const finalBytes = options.password ? encryptBuffer(compressed, options.password) : compressed;

    return {
      magic: MAGIC,
      version: 2,
      createdAt: new Date().toISOString(),
      sourceType: 'file',
      name: path.basename(absTargetPath),
      mime,
      encrypted: !!options.password,
      aiOptimized: aiAnalysis.aiOptimized,
      recommendation: aiAnalysis.recommendation,
      fileCount: 1,
      files: [
        {
          path: path.basename(absTargetPath),
          size: original.length,
          compressedSize: finalBytes.length,
          hash: sha256(original),
          mime,
          algorithm,
          aiOptimized: aiAnalysis.aiOptimized,
          aiRecommendation: aiAnalysis.recommendation,
          data: finalBytes.toString('base64')
        }
      ]
    };
  }

  if (stats.isDirectory()) {
    const files = walkDirectory(absTargetPath).map((filePath) => buildFileEntry(filePath, absTargetPath, options));
    const totalOriginalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalCompressedSize = files.reduce((sum, file) => sum + file.compressedSize, 0);
    const aiAnalysis = analyzeOptimization({ mime: 'project-directory', fileSize: totalOriginalSize, level: normalizeLevel(options.level) });

    return {
      magic: MAGIC,
      version: 2,
      createdAt: new Date().toISOString(),
      sourceType: 'directory',
      name: path.basename(absTargetPath),
      mime: 'project-directory',
      encrypted: !!options.password,
      aiOptimized: aiAnalysis.aiOptimized,
      recommendation: aiAnalysis.recommendation,
      fileCount: files.length,
      totalOriginalSize,
      totalCompressedSize,
      files
    };
  }

  throw new Error(`Unsupported file type: ${targetPath}`);
}

function writeArchive(targetPath, customOutputPath, options = {}) {
  const absTargetPath = path.resolve(targetPath);
  const manifest = buildManifest(absTargetPath, options);
  const payload = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
  const archivePayload = zlib.gzipSync(payload);
  const outputPath = getDefaultArchivePath(absTargetPath, customOutputPath);
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, archivePayload);
  return outputPath;
}

function readArchive(archivePath, password) {
  const archiveData = fs.readFileSync(path.resolve(archivePath));
  const jsonText = zlib.gunzipSync(archiveData).toString('utf8');
  const manifest = JSON.parse(jsonText);

  if (!manifest || manifest.magic !== MAGIC) {
    throw new Error(`Invalid ANOS archive: ${archivePath}`);
  }

  if (manifest.encrypted) {
    if (!password) {
      throw new Error('This archive is encrypted. Please provide --password.');
    }
    const payload = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
    // For encrypted archives, the manifest itself is still plain JSON in this format.
    // The file payloads are encrypted, but the metadata is available.
  }

  return manifest;
}

function extractArchive(archivePath, targetDir, options = {}) {
  const manifest = readArchive(archivePath, options.password);
  const outputDir = path.resolve(targetDir || path.join(path.dirname(archivePath), 'extracted'));
  ensureDir(outputDir);

  for (const entry of manifest.files) {
    const encoded = Buffer.from(entry.data, 'base64');
    const maybeEncrypted = options.password ? decryptBuffer(encoded, options.password) : encoded;
    const raw = decompressPayload(maybeEncrypted, entry.algorithm || 'deflateRaw');
    const resolvedPath = path.join(outputDir, entry.path);
    ensureDir(path.dirname(resolvedPath));
    fs.writeFileSync(resolvedPath, raw);
  }

  return manifest;
}

function infoArchive(archivePath) {
  const manifest = readArchive(archivePath);
  const totalOriginalSize = (manifest.totalOriginalSize || manifest.files.reduce((sum, file) => sum + file.size, 0));
  const totalCompressedSize = (manifest.totalCompressedSize || manifest.files.reduce((sum, file) => sum + file.compressedSize, 0));
  const ratio = totalOriginalSize > 0 ? Number(((totalCompressedSize / totalOriginalSize) * 100).toFixed(2)) : 0;

  return {
    type: manifest.sourceType,
    name: manifest.name,
    createdAt: manifest.createdAt,
    version: manifest.version,
    fileCount: manifest.fileCount,
    totalOriginalSize,
    totalCompressedSize,
    compressionRatioPercent: ratio,
    algorithms: [...new Set(manifest.files.map((item) => item.algorithm || 'deflateRaw'))],
    encrypted: !!manifest.encrypted,
    aiOptimized: !!manifest.aiOptimized,
    recommendation: manifest.recommendation || 'balanced'
  };
}

function verifyArchive(archivePath, options = {}) {
  const manifest = readArchive(archivePath, options.password);
  let valid = true;
  const errors = [];

  for (const entry of manifest.files) {
    const data = Buffer.from(entry.data, 'base64');
    const processed = options.password ? decryptBuffer(data, options.password) : data;
    const raw = decompressPayload(processed, entry.algorithm || 'deflateRaw');
    const hash = sha256(raw);
    if (hash !== entry.hash) {
      valid = false;
      errors.push(`Hash mismatch: ${entry.path}`);
    }
  }

  return { valid, errors };
}

module.exports = {
  writeArchive,
  extractArchive,
  infoArchive,
  verifyArchive,
  readArchive,
  buildManifest,
  encryptBuffer,
  decryptBuffer,
  detectMime,
  analyzeOptimization: require('./ai').analyzeOptimization
};
