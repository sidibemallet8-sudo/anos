#!/usr/bin/env node

import * as path from 'node:path';
import { createArchive, extractArchive, infoArchive, verifyArchive } from './anos';

function parseFlags(args: string[]) {
  const options: Record<string, any> = { level: 'balanced' };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--password') options.password = args[++i];
    else if (arg === '--encrypt') options.encrypt = true;
    else if (arg === '--level') options.level = args[++i] || 'balanced';
    else if (arg === '--output') options.output = args[++i];
  }
  return options;
}

function printUsage() {
  console.log(`ANOS CLI\nUsage:\n  anos compress <path> [--output out.anos] [--encrypt --password secret] [--level aggressive]\n  anos extract <archive.anos> [output-dir] [--password secret]\n  anos info <archive.anos>\n  anos verify <archive.anos> [--password secret]\n`);
}

function main() {
  const [, , command, ...args] = process.argv;
  if (!command) {
    printUsage();
    return;
  }

  try {
    switch (command) {
      case 'compress': {
        const source = path.resolve(args[0]);
        const flags = parseFlags(args.slice(1));
        const output = createArchive(source, flags.output, {
          encrypt: !!flags.encrypt,
          password: flags.password,
          level: flags.level,
        });
        console.log(`Compressed: ${output}`);
        break;
      }
      case 'extract': {
        const archive = path.resolve(args[0]);
        const outDir = args[1] && !args[1].startsWith('--') ? path.resolve(args[1]) : path.join(path.dirname(archive), 'extracted');
        const flags = parseFlags(args.slice(1));
        const manifest = extractArchive(archive, outDir, flags.password);
        console.log(`Extracted ${manifest.fileCount} files to ${outDir}`);
        break;
      }
      case 'info': {
        const archive = path.resolve(args[0]);
        console.log(JSON.stringify(infoArchive(archive), null, 2));
        break;
      }
      case 'verify': {
        const archive = path.resolve(args[0]);
        const flags = parseFlags(args.slice(1));
        const result = verifyArchive(archive, flags.password);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case '--help':
      case '-h':
      default:
        printUsage();
        break;
    }
  } catch (error: any) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}

main();
