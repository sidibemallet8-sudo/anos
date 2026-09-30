import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { deflateRawSync, inflateRawSync, gzipSync, gunzipSync } from 'node:zlib';
import { computeCarbonImpact, generateCarbonPassport } from './carbon';

const MAGIC = 'ANOS1';

export function detectMime(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.pt': 'ai-model-pytorch',
    '.pth': 'ai-model-pytorch',
    '.onnx': 'ai-model-onnx',
    '.h5': 'ai-model-tensorflow',
    '.gguf': 'ai-model-gguf',
    '.safetensors': 'ai-model-safetensors',
    '.json': 'json-data',
    '.csv': 'dataset-csv',
    '.parquet': 'dataset-parquet',
    '.zip': 'archive',
    '.tar': 'archive',
    '.gz': 'archive',
    '.pdf': 'document-pdf',
    '.md': 'markdown',
    '.txt': 'text',
    '.js': 'code-javascript',
    '.ts': 'code-typescript',
    '.py': 'code-python',
    '.png': 'graphic-image',
    '.jpg': 'graphic-image',
    '.jpeg': 'graphic-image',
    '.mp4': 'video',
    '.mp3': 'audio',
  };
  return map[ext] || 'generic';
}

export function analyzeFile(filePath: string): { mime: string; recommendedStrategy: 'gzip' | 'brotli' | 'deflate'; compressionPotential: 'low' | 'medium' | 'high'; aiOptimized: boolean; recommendation: string; } {
  const mime = detectMime(filePath);
  const size = fs.statSync(filePath).size;

  if (mime.includes('ai-model')) {
    return {
      mime,
      recommendedStrategy: size > 1024 * 1024 * 100 ? 'gzip' : 'deflate',
      compressionPotential: 'high',
      aiOptimized: true,
      recommendation: 'Layer-aware adaptive quantization recommended',
    };
  }

  if (mime.includes('dataset') || mime.includes('json')) {
    return {
      mime,
      recommendedStrategy: 'gzip',
      compressionPotential: 'high',
      aiOptimized: true,
      recommendation: 'Deduplication + columnar-aware compression recommended',
    };
  }

  if (mime.includes('code') || mime.includes('markdown')) {
    return {
      mime,
      recommendedStrategy: 'brotli',
      compressionPotential: 'medium',
      aiOptimized: true,
      recommendation: 'Text structure compression recommended',
    };
  }

  return {
    mime,
    recommendedStrategy: 'gzip',
    compressionPotential: size > 1024 * 1024 ? 'high' : 'medium',
    aiOptimized: false,
    recommendation: 'Balanced compression selected',
  };
}

export function walkDirectory(rootDir: string): string[] {
  const files: string[] = [];
  for (const dirent of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, dirent.name);
    if (dirent.isDirectory()) {
      if (['.git', 'node_modules', 'dist', '.next', '.cache'].includes(dirent.name)) continue;
      files.push(...walkDirectory(fullPath));
    } else if (dirent.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function compressPayload(data: Buffer, strategy: 'gzip' | 'brotli' | 'deflate' = 'gzip'): Buffer {
  switch (strategy) {
    case 'brotli':
      return require('node:zlib').brotliCompressSync(data);
    case 'deflate':
      return deflateRawSync(data);
    case 'gzip':
    default:
      return gzipSync(data);
  }
}

export function decompressPayload(data: Buffer, strategy: 'gzip' | 'brotli' | 'deflate' = 'gzip'): Buffer {
  switch (strategy) {
    case 'brotli':
      return require('node:zlib').brotliDecompressSync(data);
    case 'deflate':
      return inflateRawSync(data);
    case 'gzip':
    default:
      return gunzipSync(data);
  }
}

export function encryptBytes(data: Buffer, password: string): Buffer {
  const salt = require('node:crypto').randomBytes(16);
  const iv = require('node:crypto').randomBytes(12);
  const key = require('node:crypto').pbkdf2Sync(password, salt, 200000, 32, 'sha256');
  const cipher = require('node:crypto').createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, encrypted]);
}

export function decryptBytes(data: Buffer, password: string): Buffer {
  const salt = data.subarray(0, 16);
  const iv = data.subarray(16, 28);
  const tag = data.subarray(28, 44);
  const payload = data.subarray(44);
  const key = require('node:crypto').pbkdf2Sync(password, salt, 200000, 32, 'sha256');
  const decipher = require('node:crypto').createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(payload), decipher.final()]);
}

export function createArchive(sourcePath: string, outputPath?: string, options: { password?: string; encrypt?: boolean; level?: 'fast' | 'balanced' | 'aggressive' } = {}): string {
  const resolvedSource = path.resolve(sourcePath);
  const stat = fs.statSync(resolvedSource);
  const archivePath = outputPath ? path.resolve(outputPath) : `${resolvedSource}${resolvedSource.endsWith('.anos') ? '' : '.anos'}`;

  const files: any[] = [];
  const targetFiles = stat.isDirectory() ? walkDirectory(resolvedSource) : [resolvedSource];

  for (const file of targetFiles) {
    const relPath = stat.isDirectory() ? path.relative(resolvedSource, file).split(path.sep).join('/') : path.basename(file);
    const raw = fs.readFileSync(file);
    const analysis = analyzeFile(file);
    const strategy = analysis.recommendedStrategy;
    const compressed = compressPayload(raw, strategy);
    const encryptedData = options.encrypt && options.password ? encryptBytes(compressed, options.password) : compressed;

    files.push({
      path: relPath,
      size: raw.length,
      compressedSize: encryptedData.length,
      hash: sha256(raw),
      mime: analysis.mime,
      algorithm: strategy,
      aiOptimized: analysis.aiOptimized,
      aiRecommendation: analysis.recommendation,
      data: encryptedData.toString('base64'),
    });
  }

  const manifest = {
    magic: MAGIC,
    version: 2,
    createdAt: new Date().toISOString(),
    sourceType: stat.isDirectory() ? 'directory' : 'file',
    name: path.basename(resolvedSource),
    encrypted: !!(options.encrypt && options.password),
    recommendation: 'balanced',
    fileCount: files.length,
    files,
    totalOriginalSize: files.reduce((s, f) => s + f.size, 0),
    totalCompressedSize: files.reduce((s, f) => s + f.compressedSize, 0),
  };

  const payload = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
  const finalArchive = compressPayload(payload, 'gzip');

  fs.mkdirSync(path.dirname(archivePath), { recursive: true });
  fs.writeFileSync(archivePath, finalArchive);
  return archivePath;
}

export function extractArchive(archivePath: string, outDir: string, password?: string): any {
  const raw = fs.readFileSync(archivePath);
  const manifest = JSON.parse(decompressPayload(raw, 'gzip').toString('utf8'));
  if (!manifest || manifest.magic !== MAGIC) throw new Error('Invalid ANOS archive');

  fs.mkdirSync(outDir, { recursive: true });

  for (const file of manifest.files) {
    const decoded = Buffer.from(file.data, 'base64');
    const decrypted = password ? decryptBytes(decoded, password) : decoded;
    const original = decompressPayload(decrypted, file.algorithm || 'gzip');
    const target = path.join(outDir, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, original);
  }

  return manifest;
}

export function readArchive(archivePath: string): any {
  const raw = fs.readFileSync(archivePath);
  return JSON.parse(decompressPayload(raw, 'gzip').toString('utf8'));
}

export function infoArchive(archivePath: string): any {
  const manifest = readArchive(archivePath);
  const totalOriginal = manifest.totalOriginalSize ?? manifest.files.reduce((sum: number, f: any) => sum + f.size, 0);
  const totalCompressed = manifest.totalCompressedSize ?? manifest.files.reduce((sum: number, f: any) => sum + f.compressedSize, 0);
  const impact = computeCarbonImpact(totalOriginal, totalCompressed);

  return {
    name: manifest.name,
    fileCount: manifest.fileCount,
    encrypted: manifest.encrypted,
    totalOriginalSize: totalOriginal,
    totalCompressedSize: totalCompressed,
    reductionPercent: impact.reductionPercent,
    carbonImpact: impact,
    passport: generateCarbonPassport(manifest.name, totalOriginal, totalCompressed),
  };
}

export function verifyArchive(archivePath: string, password?: string): { valid: boolean; errors: string[] } {
  const manifest = readArchive(archivePath);
  const errors: string[] = [];

  for (const file of manifest.files) {
    const decoded = Buffer.from(file.data, 'base64');
    const decrypted = password ? decryptBytes(decoded, password) : decoded;
    const original = decompressPayload(decrypted, file.algorithm || 'gzip');
    const hash = sha256(original);
    if (hash !== file.hash) errors.push(`Hash mismatch: ${file.path}`);
  }

  return { valid: errors.length === 0, errors };
}
