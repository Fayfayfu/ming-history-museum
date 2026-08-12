import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourceDir = 'data/media-originals/portraits/batch-20';
const outputDir = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/portraits/batch-20';

const rows = [
  ['2001_傅山_AI想象像.png', '2001_傅山_AI想象像.webp'],
  ['2002_王保保_AI想象像.png', '2002_王保保_AI想象像.webp'],
];

await fs.mkdir(outputDir, {recursive: true});

for (const [sourceName, outputName] of rows) {
  const source = path.join(sourceDir, sourceName);
  const output = path.join(outputDir, outputName);
  await sharp(source)
    .rotate()
    .resize({width: 720, height: 900, fit: 'cover', position: 'centre'})
    .webp({quality: 86, alphaQuality: 90, effort: 6, smartSubsample: true})
    .toFile(output);
  const metadata = await sharp(output).metadata();
  console.log(`${outputName}: ${metadata.width}×${metadata.height}`);
}
