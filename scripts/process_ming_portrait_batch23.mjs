import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourceDir = 'data/media-originals/portraits/batch-23';
const outputDir = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/portraits/batch-23';
const rows = [
  ['朱由崧_AI想象像.png', '朱由崧_AI想象像.webp'],
  ['朱聿键_清代后世传绘.jpg', '朱聿键_清代后世传绘.webp'],
  ['朱由榔_AI想象像.png', '朱由榔_AI想象像.webp'],
];

await fs.mkdir(outputDir, { recursive: true });
for (const [sourceName, outputName] of rows) {
  await sharp(path.join(sourceDir, sourceName))
    .rotate()
    .resize({ width: 720, height: 900, fit: 'cover', position: 'centre' })
    .webp({ quality: 86, effort: 6 })
    .toFile(path.join(outputDir, outputName));
}
