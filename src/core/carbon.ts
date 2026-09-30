export type CompressionLevel = 'fast' | 'balanced' | 'aggressive';
export type CompressionStrategy = 'gzip' | 'brotli' | 'deflate' | 'lz4';

export interface CarbonImpact {
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  savedGB: number;
  savedKwh: number;
  savedCo2Kg: number;
  reductionPercent: number;
  costSavedUsd: number;
}

export interface CarbonPassport {
  id: string;
  artifactName: string;
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  savedKwh: number;
  savedCo2Kg: number;
  reductionPercent: number;
  generatedAt: string;
  signature: string;
}

export interface ArchiveEntry {
  path: string;
  size: number;
  compressedSize: number;
  hash: string;
  mime: string;
  algorithm: CompressionStrategy;
  aiOptimized: boolean;
  aiRecommendation: string;
  data: string;
}

export interface AnosManifest {
  magic: string;
  version: number;
  createdAt: string;
  sourceType: 'file' | 'directory';
  name: string;
  fileCount: number;
  encrypted: boolean;
  recommendation: string;
  files: ArchiveEntry[];
  totalOriginalSize?: number;
  totalCompressedSize?: number;
}

export interface CompressionOptions {
  level?: CompressionLevel;
  password?: string;
  encrypt?: boolean;
  include?: string[];
  exclude?: string[];
}

export interface FileAnalysis {
  path: string;
  mime: string;
  size: number;
  recommendedStrategy: CompressionStrategy;
  compressionPotential: 'low' | 'medium' | 'high';
  aiOptimized: boolean;
  recommendation: string;
}

export function computeCarbonImpact(originalBytes: number, compressedBytes: number): CarbonImpact {
  const originalGB = originalBytes / (1024 * 1024 * 1024);
  const compressedGB = compressedBytes / (1024 * 1024 * 1024);
  const savedGB = Math.max(0, originalGB - compressedGB);
  const savedKwh = savedGB * 0.02;
  const savedCo2Kg = savedKwh * 0.0004;
  const costSavedUsd = savedGB * 0.085 + savedGB * 0.023 * 12;

  return {
    originalBytes,
    compressedBytes,
    savedBytes: Math.max(0, originalBytes - compressedBytes),
    savedGB,
    savedKwh,
    savedCo2Kg,
    reductionPercent: originalGB > 0 ? (1 - compressedGB / originalGB) * 100 : 0,
    costSavedUsd,
  };
}

export function generateCarbonPassport(artifactName: string, originalBytes: number, compressedBytes: number): CarbonPassport {
  const impact = computeCarbonImpact(originalBytes, compressedBytes);
  const id = `ANOS-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const signature = `sig-${id}-${impact.savedCo2Kg.toFixed(6)}`;

  return {
    id,
    artifactName,
    originalBytes,
    compressedBytes,
    savedBytes: impact.savedBytes,
    savedKwh: impact.savedKwh,
    savedCo2Kg: impact.savedCo2Kg,
    reductionPercent: impact.reductionPercent,
    generatedAt: new Date().toISOString(),
    signature,
  };
}

export function buildCarbonBadgeMarkdown(savedCo2Kg: number): string {
  const badgeUrl = `https://img.shields.io/badge/ANOS-Saved_${Number(savedCo2Kg).toFixed(1)}kg_CO2-brightgreen`;
  return `[![ANOS Carbon Saver](${badgeUrl})](https://github.com/sidibemallet8-sudo/anos)`;
}
