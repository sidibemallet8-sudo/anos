#!/usr/bin/env node

const path = require('node:path');
const { writeArchive, extractArchive, infoArchive, verifyArchive } = require('./anos');

function printUsage() {
  console.log(`ANOS CLI\n\nUsage:\n  anos compress <path> [output.anos] [--level fast|balanced|aggressive] [--password secret] [--encrypt]\n  anos extract <archive.anos> [output-dir] [--password secret]\n  anos info <archive.anos>\n  anos verify <archive.anos> [--password secret]\n`);
}

function parseFlags(args) {
  const options = {
    password: undefined,
    encrypt: false,
    level: 'balanced'
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--password') {
      options.password = args[i + 1];
      i += 1;
    } else if (arg === '--encrypt') {
      options.encrypt = true;
    } else if (arg === '--level') {
      options.level = args[i + 1] || 'balanced';
      i += 1;
    }
  }

  return options;
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
        const outputPath = args[1] && !args[1].startsWith('--') ? path.resolve(args[1]) : undefined;
        const flags = parseFlags(args.slice(outputPath ? 2 : 1));
        const effectivePassword = flags.encrypt ? (flags.password || 'anos-default-password') : flags.password;

        if (!sourcePath) {
          throw new Error('Source path is required.');
        }

        const archivePath = writeArchive(sourcePath, outputPath, {
          password: effectivePassword,
          level: flags.level,
          encrypt: flags.encrypt
        });

        console.log(`Compressed successfully: ${archivePath}`);
        break;
      }

      case 'extract': {
        const archivePath = path.resolve(args[0]);
        const targetDir = args[1] && !args[1].startsWith('--') ? path.resolve(args[1]) : undefined;
        const flags = parseFlags(args.slice(targetDir ? 2 : 1));
        const manifest = extractArchive(archivePath, targetDir, { password: flags.password });
        console.log(`Extracted successfully to: ${targetDir || path.join(path.dirname(archivePath), 'extracted')}`);
        console.log(`Files: ${manifest.files.length}`);
        break;
      }

      case 'info': {
        const archivePath = path.resolve(args[0]);
        const info = infoArchive(archivePath);
        console.log(JSON.stringify(info, null, 2));
        break;
      }

      case 'verify': {
        const archivePath = path.resolve(args[0]);
        const flags = parseFlags(args.slice(1));
        const result = verifyArchive(archivePath, { password: flags.password });
        console.log(JSON.stringify(result, null, 2));
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
