import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourceDir = 'data/media-originals/portraits/batch-17';
const outputDir = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/portraits/batch-17';

const portraits = [
  ['1701_宋礼_AI想象像.png', '1701_宋礼_AI想象像.webp'],
  ['1702_潘季驯_AI想象像.png', '1702_潘季驯_AI想象像.webp'],
  ['1703_李舜臣_朝鲜时代忠武公图.jpg', '1703_李舜臣_朝鲜时代忠武公图.webp'],
  ['1704_丰臣秀吉_约1602年狩野派画像.png', '1704_丰臣秀吉_约1602年狩野派画像.webp'],
  ['1705_多尔衮_17世纪传像.jpg', '1705_多尔衮_17世纪传像.webp']
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
