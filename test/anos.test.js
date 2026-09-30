#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { writeArchive, extractArchive, infoArchive, verifyArchive } = require('../src/anos');

const root = path.join(__dirname, '..');
const sampleDir = path.join(root, 'demo-data');
const archivePath = path.join(root, 'demo-data.anos');
const extractDir = path.join(root, 'demo-extracted');

fs.mkdirSync(sampleDir, { recursive: true });
fs.writeFileSync(path.join(sampleDir, 'README.md'), '# Demo\n\nANOS compresses AI models, projects, and data efficiently.\n');
fs.writeFileSync(path.join(sampleDir, 'model.txt'), 'This is a sample AI asset designed for compression testing. '.repeat(100));

const out = writeArchive(sampleDir, archivePath, { level: 'aggressive' });
console.log(`Created archive: ${out}`);
console.log(JSON.stringify(infoArchive(out), null, 2));

const verdict = verifyArchive(out);
console.log('Verification:', verdict);

extractArchive(out, extractDir);
console.log(`Extracted to: ${extractDir}`);
