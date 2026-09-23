import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourceDir = 'data/media-originals/portraits/batch-40';
const outputDir = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/portraits/batch-40';
const rows = [
  ['4001_多铎_AI想象像.png', '4001_多铎_AI想象像.webp'],
  ['4002_尼堪_AI想象像.png', '4002_尼堪_AI想象像.webp'],
  ['4003_豪格_AI想象像.png', '4003_豪格_AI想象像.webp'],
  ['4004_阿济格_AI想象像.png', '4004_阿济格_AI想象像.webp'],
  ['4005_李定国_AI想象像.png', '4005_李定国_AI想象像.webp'],
  ['4006_孙可望_AI想象像.png', '4006_孙可望_AI想象像.webp'],
  ['4007_刘文秀_AI想象像.png', '4007_刘文秀_AI想象像.webp'],
  ['4008_艾能奇_AI想象像.png', '4008_艾能奇_AI想象像.webp'],
  ['4009_马士英_AI想象像.png', '4009_马士英_AI想象像.webp'],
  ['4010_左良玉_AI想象像.png', '4010_左良玉_AI想象像.webp'],
  ['4011_高杰_AI想象像.png', '4011_高杰_AI想象像.webp'],
  ['4012_黄得功_AI想象像.png', '4012_黄得功_AI想象像.webp'],
  ['4013_刘良佐_AI想象像.png', '4013_刘良佐_AI想象像.webp'],
  ['4014_刘泽清_AI想象像.png', '4014_刘泽清_AI想象像.webp'],
  ['4015_阎应元_AI想象像.png', '4015_阎应元_AI想象像.webp'],
  ['4016_郑成功_AI想象像.png', '4016_郑成功_AI想象像.webp'],
  ['4017_郑芝龙_AI想象像.png', '4017_郑芝龙_AI想象像.webp'],
  ['4018_绍武帝_AI想象像.png', '4018_绍武帝_AI想象像.webp'],
  ['4019_张献忠_AI想象像.png', '4019_张献忠_AI想象像.webp'],
  ['4020_孔有德_AI想象像.png', '4020_孔有德_AI想象像.webp'],
  ['4021_李来亨_AI想象像.png', '4021_李来亨_AI想象像.webp'],
  ['4022_陈圆圆_AI想象像.png', '4022_陈圆圆_AI想象像.webp'],
];

await fs.mkdir(outputDir, {recursive: true});
for (const [sourceName, outputName] of rows) {
  await sharp(path.join(sourceDir, sourceName))
    .rotate()
    .resize({width: 720, height: 900, fit: 'cover', position: 'centre'})
    .webp({quality: 86, effort: 6})
    .toFile(path.join(outputDir, outputName));
}
