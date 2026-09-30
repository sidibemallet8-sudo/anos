const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeArchive, extractArchive, infoArchive, verifyArchive } = require('../src/anos');

test('compresses and extracts a directory', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anos-'));
  const sourceDir = path.join(tmpDir, 'project');
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'hello.txt'), 'hello world from anos');
  fs.writeFileSync(path.join(sourceDir, 'notes.md'), '# demo\n\nThis is a sample project.');

  const archivePath = path.join(tmpDir, 'project.anos');
  const output = writeArchive(sourceDir, archivePath, { level: 'balanced' });
  assert.ok(fs.existsSync(output));

  const info = infoArchive(output);
  assert.ok(info.fileCount >= 2);

  const extractDir = path.join(tmpDir, 'restored');
  const manifest = extractArchive(output, extractDir);
  assert.equal(manifest.fileCount, 2);
  assert.ok(fs.existsSync(path.join(extractDir, 'hello.txt')));

  const verification = verifyArchive(output);
  assert.strictEqual(verification.valid, true);
});

test('can encrypt and decrypt archive content', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anos-'));
  const source = path.join(tmpDir, 'secret.txt');
  fs.writeFileSync(source, 'Top secret document for AI workflow.');

  const archivePath = path.join(tmpDir, 'secret.anos');
  const output = writeArchive(source, archivePath, { password: 'super-secret-key', encrypt: true });
  const info = infoArchive(output);
  assert.strictEqual(info.encrypted, true);

  const extractDir = path.join(tmpDir, 'restored-secret');
  extractArchive(output, extractDir, { password: 'super-secret-key' });
  const restored = fs.readFileSync(path.join(extractDir, 'secret.txt'), 'utf8');
  assert.strictEqual(restored, 'Top secret document for AI workflow.');
});
