import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const portraits = JSON.parse(fs.readFileSync('data/ming_portraits.json', 'utf8'));
const promptText = fs.readFileSync('data/portrait_prompts_batch20.md', 'utf8');
const museumRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';

for (const [name, expected] of Object.entries({
  傅山: 'assets/portraits/batch-20/2001_傅山_AI想象像.webp',
  王保保: 'assets/portraits/batch-20/2002_王保保_AI想象像.webp',
})) {
  const record = portraits.people[name];
  assert.ok(record, `missing portrait registry for ${name}`);
  assert.equal(record.status, 'imagined');
  assert.equal(record.portraitKind, 'AI想象像');
  assert.equal(record.confidence, '未知');
  assert.equal(record.file, expected);
  assert.ok(record.evidence.length >= 2, `${name} must retain at least two evidence links`);
  assert.match(promptText, new RegExp(`\\| ${name} \\|`));

  const webFile = path.join(museumRoot, record.file);
  const originalFile = record.originalFile;
  assert.ok(fs.existsSync(webFile), `missing web portrait ${webFile}`);
  assert.ok(fs.existsSync(originalFile), `missing original portrait ${originalFile}`);
  const metadata = await sharp(webFile).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 720);
  assert.equal(metadata.height, 900);
}

console.log('Portrait batch 20 verified: 傅山、王保保 AI想象像 and evidence metadata.');
