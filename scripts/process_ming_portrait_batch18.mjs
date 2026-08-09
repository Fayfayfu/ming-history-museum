import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourceDir = 'data/media-originals/portraits/batch-18';
const outputDir = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/portraits/batch-18';

const portraits = [
  ['1801_何心隐_AI想象像.png', '1801_何心隐_AI想象像.webp'],
  ['1802_蒋瓛_AI想象像.png', '1802_蒋瓛_AI想象像.webp'],
  ['1803_纪纲_AI想象像.png', '1803_纪纲_AI想象像.webp'],
  ['1804_钱宁_AI想象像.png', '1804_钱宁_AI想象像.webp'],
  ['1805_陆炳_AI想象像.png', '1805_陆炳_AI想象像.webp'],
  ['1806_田尔耕_AI想象像.png', '1806_田尔耕_AI想象像.webp']
];

await fs.mkdir(outputDir, {recursive: true});
for (const [sourceName, outputName] of portraits) {
  const source = path.join(sourceDir, sourceName);
  const output = path.join(outputDir, outputName);
  await sharp(source)
    .rotate()
    .resize({width: 720, height: 960, fit: 'inside', withoutEnlargement: true})
    .webp({quality: 82, alphaQuality: 90, effort: 6, smartSubsample: true})
    .toFile(output);
  const metadata = await sharp(output).metadata();
  console.log(`${outputName}: ${metadata.width}×${metadata.height}`);
}
