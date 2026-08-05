import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const source = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const destination = 'dist';
const rasterPattern = /assets\/[^"'<>\s]+?\.(?:jpe?g|png|webp)/gi;

const walk = async directory => {
  const entries = await fs.readdir(directory, {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else files.push(file);
  }
  return files;
};

const htmlFiles = (await walk(source)).filter(file => file.endsWith('.html'));
const htmlByFile = new Map();
const referencedAssets = new Set();

for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  htmlByFile.set(file, html);
  for (const match of html.matchAll(rasterPattern)) referencedAssets.add(match[0]);
}

const missingAssets = [];
for (const relative of referencedAssets) {
  try {
    await fs.access(path.join(source, relative));
  } catch {
    missingAssets.push(relative);
  }
}
if (missingAssets.length) {
  throw new Error(`Missing ${missingAssets.length} referenced assets:\n${missingAssets.sort().join('\n')}`);
}

await fs.rm(destination, {recursive: true, force: true});
await fs.mkdir(destination, {recursive: true});

const assetMap = new Map();
for (const relative of [...referencedAssets].sort()) {
  const input = path.join(source, relative);
  const extension = path.extname(relative).toLowerCase();
  const outputRelative = extension === '.webp'
    ? relative
    : relative.slice(0, -extension.length) + '.webp';
  const output = path.join(destination, outputRelative);
  await fs.mkdir(path.dirname(output), {recursive: true});
  if (extension === '.webp') {
    await fs.copyFile(input, output);
  } else {
    await sharp(input)
      .rotate()
      .resize({width: 1800, height: 2400, fit: 'inside', withoutEnlargement: true})
      .webp({quality: 82, alphaQuality: 90, effort: 6, smartSubsample: true})
      .toFile(output);
  }
  assetMap.set(relative, outputRelative);
}

for (const [file, originalHtml] of htmlByFile) {
  let html = originalHtml;
  for (const [from, to] of assetMap) html = html.replaceAll(from, to);
  const relative = path.relative(source, file);
  const output = path.join(destination, relative);
  await fs.mkdir(path.dirname(output), {recursive: true});
  await fs.writeFile(output, html, 'utf8');
}

await fs.writeFile(path.join(destination, 'vercel.json'), JSON.stringify({
  headers: [
    {
      source: '/assets/(.*)',
      headers: [{key: 'Cache-Control', value: 'public, max-age=31536000, immutable'}],
    },
  ],
}, null, 2) + '\n');

const outputFiles = await walk(destination);
let bytes = 0;
for (const file of outputFiles) bytes += (await fs.stat(file)).size;
console.log(JSON.stringify({
  pages: htmlFiles.length,
  images: assetMap.size,
  files: outputFiles.length,
  bytes,
  megabytes: Number((bytes / 1024 / 1024).toFixed(2)),
}, null, 2));
