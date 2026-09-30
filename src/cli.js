#!/usr/bin/env node

const { writeArchive, extractArchive, infoArchive } = require('./anos');
const path = require('node:path');
const fs = require('node:fs');

function printUsage() {
  console.log(`ANOS CLI\n\nUsage:\n  anos compress <path> [output.anos]\n  anos extract <archive.anos> [output-dir]\n  anos info <archive.anos>\n`);
}

function main() {
  const [, , command, ...args] = process.argv;

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  try {
    switch (command) {
      case 'compress': {
        const sourcePath = path.resolve(args[0]);
        const outPath = args[1] ? path.resolve(args[1]) : undefined;
        if (!sourcePath) {
          throw new Error('Source path is required.');
        }
        const archivePath = writeArchive(sourcePath, outPath);
        console.log(`Compressed successfully: ${archivePath}`);
        break;
      }

      case 'extract': {
        const archivePath = path.resolve(args[0]);
        const targetDir = args[1] ? path.resolve(args[1]) : path.join(path.dirname(archivePath), 'extracted');
        if (!archivePath) {
          throw new Error('Archive path is required.');
        }
        const manifest = extractArchive(archivePath, targetDir);
        console.log(`Extracted successfully to: ${targetDir}`);
        console.log(`Files: ${manifest.files.length}`);
        break;
      }

      case 'info': {
        const archivePath = path.resolve(args[0]);
        const info = infoArchive(archivePath);
        console.log(JSON.stringify(info, null, 2));
        break;
      }

      default:
        printUsage();
        break;
    }
  } catch (error) {
    console.error(`ANOS error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
