import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outputDir = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/portraits/batch-5';
const originalDir = 'data/media-originals/portraits/batch-5';

const portraits = [
  {id: 501, name: '李东阳', fileName: 'Li Dongyang.jpg'},
  {id: 502, name: '严嵩', fileName: 'Yansong2.jpg'},
  {id: 504, name: '徐阶', fileName: '徐階.jpg'},
  {id: 506, name: '姚广孝', fileName: '明人画姚广孝像轴.png'},
  {id: 508, name: '解缙', fileName: '解縉.png'},
];

const mimeExtension = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const safeName = value => value.replace(/[\\/:*?"<>|]/g, '_');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const fetchWithRetry = async (url, attempts = 6) => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetch(url, {
      headers: {'user-agent': 'MingDigitalMuseum/1.0 (local educational research project)'},
    });
    if (response.ok) return response;
    if (response.status !== 429 || attempt === attempts - 1) return response;
    const retryAfter = Number(response.headers.get('retry-after'));
    await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 1800 * (attempt + 1));
  }
};

await fs.mkdir(outputDir, {recursive: true});
await fs.mkdir(originalDir, {recursive: true});

const results = [];
for (const portrait of portraits) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url|size|mime',
    titles: `File:${portrait.fileName}`,
  });

  const metadataResponse = await fetchWithRetry(api);
  if (!metadataResponse.ok) throw new Error(`Metadata request failed for ${portrait.name}: ${metadataResponse.status}`);

  const payload = await metadataResponse.json();
  const page = Object.values(payload.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.url) throw new Error(`No image URL returned for ${portrait.name}`);

  const imageResponse = await fetchWithRetry(info.url);
  if (!imageResponse.ok) throw new Error(`Image request failed for ${portrait.name}: ${imageResponse.status}`);

  const extension = mimeExtension[info.mime] || path.extname(new URL(info.url).pathname).toLowerCase() || '.jpg';
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const originalName = `${portrait.id}_${safeName(portrait.name)}${extension}`;
  let localName = originalName;
  if (portrait.name === '姚广孝') {
    await fs.writeFile(path.join(originalDir, originalName), imageBuffer);
    localName = `${portrait.id}_${safeName(portrait.name)}.webp`;
    await sharp(imageBuffer)
      .resize({width: 1400, withoutEnlargement: true})
      .webp({quality: 82, effort: 6, smartSubsample: true})
      .toFile(path.join(outputDir, localName));
  } else {
    await fs.writeFile(path.join(outputDir, localName), imageBuffer);
  }

  results.push({
    ...portrait,
    localName,
    originalName: portrait.name === '姚广孝' ? originalName : undefined,
    width: info.width,
    height: info.height,
    mime: info.mime,
    url: info.url,
    page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(portrait.fileName)}`,
  });
  await sleep(900);
}

console.log(JSON.stringify(results, null, 2));
