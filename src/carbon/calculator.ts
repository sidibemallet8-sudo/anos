// src/carbon/calculator.ts - Carbon impact calculation

export class CarbonCalculator {
  private readonly GRID_EMISSIONS = 0.0004; // kg CO2e per kWh (average US grid)
  private readonly STORAGE_POWER = 0.00005; // kW per GB stored annually
  private readonly BANDWIDTH_POWER = 0.0003; // kWh per GB transferred
  private readonly DATA_CENTER_PUE = 1.2; // Power Usage Effectiveness

  calculate(input: CarbonInput): CarbonImpact {
    const savedBytes = input.originalBytes - input.compressedBytes;
    const savedGB = savedBytes / (1024 * 1024 * 1024);
    
    // Storage impact (annual)
    const storagePowerSaved = savedGB * this.STORAGE_POWER * this.DATA_CENTER_PUE;
    const storageCo2Saved = storagePowerSaved * this.GRID_EMISSIONS;
    
    // Bandwidth impact (per transfer)
    const bandwidthPowerSaved = savedGB * this.BANDWIDTH_POWER * this.DATA_CENTER_PUE;
    const bandwidthCo2Saved = bandwidthPowerSaved * this.GRID_EMISSIONS;
    
    // Financial impact
    const costSavedBandwidth = savedGB * 0.085; // AWS typical rate
    const costSavedStorage = savedGB * 0.023 * 12; // Annual S3 storage
    
    return {
      originalBytes: input.originalBytes,
      compressedBytes: input.compressedBytes,
      savedBytes,
      savedGB,
      storageCo2SgPerYear: storageCo2Saved,
      bandwidthCo2SgPerTransfer: bandwidthCo2Saved,
      totalCo2SavedKg: storageCo2Saved + bandwidthCo2Saved,
      energySavedKwh: storagePowerSaved + bandwidthPowerSaved,
      costSavedUsd: costSavedBandwidth + costSavedStorage,
      equivalents: {
        treesSaved: Math.round((storageCo2Saved + bandwidthCo2Saved) / 21), // Average tree absorbs 21kg CO2/year
        milesNotDriven: Math.round((storageCo2Saved + bandwidthCo2Saved) / 0.41), // Average car emits 0.41kg CO2/mile
        hoursOfElectricityForHome: Math.round((storagePowerSaved + bandwidthPowerSaved) / 1.2) // Average US home uses 1.2kW
      }
    };
  }

  generateCarbonPassport(input: PassportInput): CarbonPassport {
    const impact = this.calculate({
      originalBytes: input.originalBytes,
      compressedBytes: input.compressedBytes
    });

    return {
      id: this.generateId(),
      modelName: input.modelName,
      modelHash: input.modelHash,
      originalBytes: input.originalBytes,
      compressedBytes: input.compressedBytes,
      compressionRatio: 1 - (input.compressedBytes / input.originalBytes),
      carbonImpact: impact,
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      signature: this.generateSignature(input)
    };
  }

  private generateId(): string {
    return `ANOS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSignature(input: PassportInput): string {
    const crypto = require('crypto');
    const data = JSON.stringify(input);
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export interface CarbonInput {
  originalBytes: number;
  compressedBytes: number;
}

export interface CarbonImpact {
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  savedGB: number;
  storageCo2SgPerYear: number;
  bandwidthCo2SgPerTransfer: number;
  totalCo2SavedKg: number;
  energySavedKwh: number;
  costSavedUsd: number;
  equivalents: {
    treesSaved: number;
    milesNotDriven: number;
    hoursOfElectricityForHome: number;
  };
}

export interface PassportInput {
  modelName: string;
  originalBytes: number;
  compressedBytes: number;
  modelHash: string;
}

export interface CarbonPassport {
  id: string;
  modelName: string;
  modelHash: string;
  originalBytes: number;
  compressedBytes: number;
  compressionRatio: number;
  carbonImpact: CarbonImpact;
  generatedAt: string;
  expiresAt: string;
  signature: string;
}
