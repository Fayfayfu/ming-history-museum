import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const sourceDir='data/media-originals/portraits/batch-22';
// build_ming_museum mirrors this root asset tree into the museum after portrait processing.
// Writing directly into the museum tree loses these files during that mirror step.
const outputDir='outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/portraits/batch-22';
await fs.mkdir(outputDir,{recursive:true});
for(const name of ['汪广洋','徐有贞','杨一清','王锡爵']) await sharp(path.join(sourceDir,`${name}_AI想象像.png`)).rotate().resize({width:720,height:900,fit:'cover',position:'centre'}).webp({quality:86,effort:6}).toFile(path.join(outputDir,`${name}_AI想象像.webp`));
