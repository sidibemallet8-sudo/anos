#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { writeArchive, extractArchive, infoArchive } = require('./anos');

const testDir = path.join(__dirname, '..', 'test-data');
const archiveFile = path.join(__dirname, '..', 'test.anos');

// Setup
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'file1.txt'), 'Hello World!');
  fs.writeFileSync(path.join(testDir, 'file2.txt'), 'ANOS is great!');
  console.log('Created test data.');
}

// Compress
if (!fs.existsSync(archiveFile)) {
  const archive = writeArchive(testDir, archiveFile);
  console.log(`✓ Compressed: ${archive}`);
}

// Info
const info = infoArchive(archiveFile);
console.log(`✓ Archive info:`, info);

// Extract
const extractDir = path.join(__dirname, '..', 'test-extracted');
const manifest = extractArchive(archiveFile, extractDir);
console.log(`✓ Extracted to ${extractDir}`);
console.log(`  Files: ${manifest.files.length}`);
