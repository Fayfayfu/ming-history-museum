import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourceDir = 'data/media-originals/portraits/batch-21';
const outputDir = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/portraits/batch-21';
const rows = [
  ['杨慎_钱杜1810.jpg', '杨慎.jpg'],
  ['杨博_AI想象像.png', '杨博.png'],
  ['俺答_AI想象像.png', '俺答.png'],
  ['王崇古_AI想象像.png', '王崇古.png'],
  ['赵南星_AI想象像.png', '赵南星.png'],
  ['熊廷弼_AI想象像.png', '熊廷弼.png'],
];
await fs.mkdir(outputDir, {recursive: true});
for (const [sourceName, outputName] of rows) {
  await sharp(path.join(sourceDir, sourceName)).rotate().resize({width:720,height:900,fit:'cover',position:'centre'}).webp({quality:86,effort:6}).toFile(path.join(outputDir, outputName.replace(/\.(jpg|png)$/i,'.webp')));
}
