// src/security/security.ts - Security and encryption

import * as crypto from 'crypto';

export class SecurityManager {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32;
  private readonly IV_LENGTH = 16;
  private readonly SALT_LENGTH = 64;
  private readonly TAG_LENGTH = 16;
  private readonly ITERATIONS = 100000;

  encrypt(data: Buffer, password: string): EncryptedData {
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const key = crypto.pbkdf2Sync(password, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256');
    
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    return {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: encrypted.toString('hex')
    };
  }

  decrypt(encryptedData: EncryptedData, password: string): Buffer {
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    const encrypted = Buffer.from(encryptedData.data, 'hex');
    
    const key = crypto.pbkdf2Sync(password, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  generateHash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  verifyHash(data: Buffer, hash: string): boolean {
    return this.generateHash(data) === hash;
  }

  generateWatermark(modelHash: string): Watermark {
    const timestamp = Date.now();
    const signature = crypto.createHmac('sha256', modelHash).update(timestamp.toString()).digest('hex');
    
    return {
      modelHash,
      timestamp,
      signature,
      version: '1.0'
    };
  }
}

export interface EncryptedData {
  salt: string;
  iv: string;
  tag: string;
  data: string;
}

export interface Watermark {
  modelHash: string;
  timestamp: number;
  signature: string;
  version: string;
}
