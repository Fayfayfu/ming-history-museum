import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/portraits/batch-4';

const portraits = [
  {id: 401, name: '杨溥', fileName: 'Yang Pu.png'},
  {id: 402, name: '谢迁', fileName: '謝遷.jpg'},
  {id: 403, name: '蹇义', fileName: '蹇义.jpg'},
  {id: 404, name: '刘大夏', fileName: 'Liu Daxia.jpg'},
  {id: 405, name: '高攀龙', fileName: '高攀龍.jpg'},
  {id: 406, name: '黄道周', fileName: 'Huang Daozhou.jpg'},
  {id: 407, name: '陈继儒', fileName: '陳繼儒.jpg'},
  {id: 408, name: '胡宗宪', fileName: '胡宗憲.jpg'},
  {id: 409, name: '顾宪成', fileName: 'Gu Xiancheng.jpg'},
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
  const localName = `${portrait.id}_${safeName(portrait.name)}${extension}`;
  const localPath = path.join(outputDir, localName);
  try {
    await fs.access(localPath);
  } catch {
    await fs.writeFile(localPath, Buffer.from(await imageResponse.arrayBuffer()));
  }

  results.push({
    ...portrait,
    localName,
    width: info.width,
    height: info.height,
    mime: info.mime,
    url: info.url,
    page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(portrait.fileName)}`,
  });
  await sleep(900);
}

console.log(JSON.stringify(results, null, 2));
