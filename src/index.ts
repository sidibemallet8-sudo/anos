// src/index.ts - Main API entry point for ANOS

import { AnosCompressionEngine } from './core/engine';
import { AnosFormat } from './formats/anos-format';
import { CarbonCalculator } from './carbon/calculator';
import { AnosLogger } from './utils/logger';
import { SecurityManager } from './security/security';

export class AnosCore {
  private engine: AnosCompressionEngine;
  private format: AnosFormat;
  private carbon: CarbonCalculator;
  private logger: AnosLogger;
  private security: SecurityManager;

  constructor() {
    this.logger = new AnosLogger('ANOS-CORE');
    this.engine = new AnosCompressionEngine(this.logger);
    this.format = new AnosFormat(this.logger);
    this.carbon = new CarbonCalculator();
    this.security = new SecurityManager();
  }

  async compressFile(filePath: string, options?: CompressionOptions): Promise<CompressionResult> {
    this.logger.info(`Starting compression: ${filePath}`);
    
    const startTime = Date.now();
    const originalSize = await this.getFileSize(filePath);
    
    // Analyze file type
    const analysis = await this.engine.analyzeFile(filePath);
    
    // Apply compression with AI optimization
    const compressed = await this.engine.compress(filePath, {
      ...options,
      strategy: analysis.recommendedStrategy
    });
    
    const compressedSize = compressed.buffer.length;
    const duration = Date.now() - startTime;
    
    // Calculate carbon savings
    const carbonImpact = this.carbon.calculate({
      originalBytes: originalSize,
      compressedBytes: compressedSize
    });
    
    this.logger.info(`Compression complete: ${originalSize} → ${compressedSize} (${((1 - compressedSize/originalSize)*100).toFixed(2)}% reduction)`);
    
    return {
      success: true,
      originalSize,
      compressedSize,
      compressionRatio: 1 - (compressedSize / originalSize),
      duration,
      carbonImpact,
      analysis
    };
  }

  async extractFile(archivePath: string, outputPath: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    this.logger.info(`Starting extraction: ${archivePath}`);
    
    // Verify archive integrity
    const verification = await this.format.verify(archivePath);
    if (!verification.valid) {
      throw new Error(`Archive verification failed: ${verification.errors.join(', ')}`);
    }
    
    // Read ANOS archive
    const archive = await this.format.read(archivePath);
    
    // Decrypt if necessary
    if (archive.encrypted && options?.password) {
      await this.security.decrypt(archive, options.password);
    }
    
    // Extract files
    const extracted = await this.engine.decompress(archive, outputPath, options);
    
    this.logger.info(`Extraction complete: ${extracted.fileCount} files extracted`);
    
    return {
      success: true,
      outputPath,
      fileCount: extracted.fileCount,
      totalSize: extracted.totalSize,
      timestamp: new Date()
    };
  }

  async getCompressionInfo(archivePath: string): Promise<ArchiveInfo> {
    const archive = await this.format.read(archivePath);
    const stats = this.calculateStats(archive);
    const carbonImpact = this.carbon.calculate({
      originalBytes: stats.totalOriginalSize,
      compressedBytes: stats.totalCompressedSize
    });
    
    return {
      name: archive.name,
      type: archive.type,
      fileCount: archive.files.length,
      originalSize: stats.totalOriginalSize,
      compressedSize: stats.totalCompressedSize,
      compressionRatio: stats.compressionRatio,
      encrypted: archive.encrypted,
      algorithms: [...new Set(archive.files.map(f => f.algorithm))],
      carbonImpact,
      createdAt: archive.createdAt
    };
  }

  private async getFileSize(filePath: string): Promise<number> {
    // Implementation
    return 0;
  }

  private calculateStats(archive: any): any {
    // Implementation
    return {};
  }
}

export interface CompressionOptions {
  level?: 'fast' | 'balanced' | 'aggressive';
  algorithm?: string;
  password?: string;
  encrypt?: boolean;
  excludePatterns?: string[];
  includePatterns?: string[];
}

export interface CompressionResult {
  success: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
  carbonImpact: any;
  analysis: any;
}

export interface ExtractionResult {
  success: boolean;
  outputPath: string;
  fileCount: number;
  totalSize: number;
  timestamp: Date;
}

export interface ArchiveInfo {
  name: string;
  type: string;
  fileCount: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  encrypted: boolean;
  algorithms: string[];
  carbonImpact: any;
  createdAt: Date;
}

export default new AnosCore();
