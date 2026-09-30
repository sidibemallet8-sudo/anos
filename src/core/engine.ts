// src/core/engine.ts - High-performance compression engine

import * as fs from 'fs';
import * as zlib from 'zlib';
import { AnosLogger } from '../utils/logger';

export class AnosCompressionEngine {
  private logger: AnosLogger;
  private algorithmsMap: Map<string, CompressionAlgorithm> = new Map();

  constructor(logger: AnosLogger) {
    this.logger = logger;
    this.initializeAlgorithms();
  }

  private initializeAlgorithms(): void {
    this.algorithmsMap.set('deflate', new DeflateAlgorithm());
    this.algorithmsMap.set('gzip', new GzipAlgorithm());
    this.algorithmsMap.set('brotli', new BrotliAlgorithm());
    this.algorithmsMap.set('lz4', new LZ4Algorithm());
  }

  async analyzeFile(filePath: string): Promise<FileAnalysis> {
    const stats = fs.statSync(filePath);
    const ext = this.getExtension(filePath);
    const mimeType = this.detectMimeType(ext);
    const sampleData = await this.readSample(filePath);
    
    return {
      path: filePath,
      size: stats.size,
      mimeType,
      extension: ext,
      entropy: this.calculateEntropy(sampleData),
      recommendedStrategy: this.recommendStrategy(mimeType, stats.size),
      estimatedCompression: this.estimateCompressionRatio(mimeType, stats.size)
    };
  }

  async compress(filePath: string, options: any): Promise<CompressionOutput> {
    const algorithm = this.algorithmsMap.get(options.strategy?.algorithm || 'gzip');
    
    if (!algorithm) {
      throw new Error(`Unknown compression algorithm: ${options.strategy?.algorithm}`);
    }
    
    const data = fs.readFileSync(filePath);
    const compressed = await algorithm.compress(data);
    
    return {
      buffer: compressed,
      algorithm: algorithm.name,
      originalSize: data.length,
      compressedSize: compressed.length
    };
  }

  async decompress(archive: any, outputPath: string, options?: any): Promise<DecompressionResult> {
    let fileCount = 0;
    let totalSize = 0;

    for (const file of archive.files) {
      const algorithm = this.algorithmsMap.get(file.algorithm);
      if (!algorithm) {
        this.logger.warn(`Unknown algorithm: ${file.algorithm}, using gzip`);
        continue;
      }

      const compressed = Buffer.from(file.data, 'base64');
      const decompressed = await algorithm.decompress(compressed);
      
      const outputFile = `${outputPath}/${file.path}`;
      fs.mkdirSync(fs.dirname(outputFile), { recursive: true });
      fs.writeFileSync(outputFile, decompressed);
      
      fileCount++;
      totalSize += decompressed.length;
    }

    return { fileCount, totalSize };
  }

  private detectMimeType(ext: string): string {
    const mimeMap: { [key: string]: string } = {
      '.pt': 'ai-model-pytorch',
      '.pth': 'ai-model-pytorch',
      '.onnx': 'ai-model-onnx',
      '.h5': 'ai-model-tensorflow',
      '.json': 'application-json',
      '.csv': 'dataset-csv',
      '.py': 'code-python',
      '.js': 'code-javascript',
      '.ts': 'code-typescript'
    };
    return mimeMap[ext] || 'application-octet-stream';
  }

  private recommendStrategy(mimeType: string, fileSize: number): any {
    if (mimeType.includes('ai-model')) {
      return { algorithm: 'gzip', level: 9 };
    }
    if (mimeType.includes('code')) {
      return { algorithm: 'brotli', level: 11 };
    }
    if (mimeType.includes('dataset')) {
      return { algorithm: 'lz4', level: 3 };
    }
    return { algorithm: 'gzip', level: 6 };
  }

  private estimateCompressionRatio(mimeType: string, fileSize: number): number {
    if (mimeType.includes('ai-model')) return 0.25;
    if (mimeType.includes('code')) return 0.35;
    if (mimeType.includes('dataset')) return 0.40;
    return 0.50;
  }

  private calculateEntropy(data: Buffer): number {
    const freq: { [key: number]: number } = {};
    for (const byte of data) {
      freq[byte] = (freq[byte] || 0) + 1;
    }
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / data.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private async readSample(filePath: string): Promise<Buffer> {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8192);
    fs.readSync(fd, buffer, 0, 8192, 0);
    fs.closeSync(fd);
    return buffer;
  }

  private getExtension(filePath: string): string {
    return filePath.slice((filePath.lastIndexOf('.') - 1 >>> 0) + 2);
  }
}

interface CompressionAlgorithm {
  name: string;
  compress(data: Buffer): Promise<Buffer>;
  decompress(data: Buffer): Promise<Buffer>;
}

class DeflateAlgorithm implements CompressionAlgorithm {
  name = 'deflate';
  async compress(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.deflate(data, (err, result) => err ? reject(err) : resolve(result));
    });
  }
  async decompress(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.inflate(data, (err, result) => err ? reject(err) : resolve(result));
    });
  }
}

class GzipAlgorithm implements CompressionAlgorithm {
  name = 'gzip';
  async compress(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (err, result) => err ? reject(err) : resolve(result));
    });
  }
  async decompress(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (err, result) => err ? reject(err) : resolve(result));
    });
  }
}

class BrotliAlgorithm implements CompressionAlgorithm {
  name = 'brotli';
  async compress(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.brotliCompress(data, (err, result) => err ? reject(err) : resolve(result));
    });
  }
  async decompress(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.brotliDecompress(data, (err, result) => err ? reject(err) : resolve(result));
    });
  }
}

class LZ4Algorithm implements CompressionAlgorithm {
  name = 'lz4';
  async compress(data: Buffer): Promise<Buffer> {
    // Placeholder for LZ4 implementation
    return data;
  }
  async decompress(data: Buffer): Promise<Buffer> {
    return data;
  }
}

export interface FileAnalysis {
  path: string;
  size: number;
  mimeType: string;
  extension: string;
  entropy: number;
  recommendedStrategy: any;
  estimatedCompression: number;
}

export interface CompressionOutput {
  buffer: Buffer;
  algorithm: string;
  originalSize: number;
  compressedSize: number;
}

export interface DecompressionResult {
  fileCount: number;
  totalSize: number;
}
