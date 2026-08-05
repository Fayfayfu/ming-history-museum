import fs from 'node:fs/promises';
import path from 'node:path';

const core = JSON.parse(await fs.readFile('data/ming_core.json', 'utf8'));
const children = JSON.parse(await fs.readFile('data/ming_children_important.json', 'utf8'));
const outDir = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/portraits';
await fs.mkdir(outDir, {recursive: true});

const emperorPages = {
  朱元璋: '明太祖', 朱允炆: '建文帝', 朱棣: '明成祖', 朱高炽: '明仁宗',
  朱瞻基: '明宣宗', 朱祁镇: '明英宗', 朱祁钰: '明代宗', 朱见深: '明宪宗',
  朱祐樘: '明孝宗', 朱厚照: '明武宗', 朱厚熜: '明世宗', 朱载坖: '明穆宗',
  朱翊钧: '明神宗', 朱常洛: '明光宗', 朱由校: '明熹宗', 朱由检: '崇祯帝',
};

const wikiTitle = (name, category, source) => {
  if (category === '皇帝') return emperorPages[name] || name;
  try {
    const url = new URL(source || '');
    if (url.hostname.endsWith('wikipedia.org') && url.pathname.startsWith('/wiki/')) {
      return decodeURIComponent(url.pathname.slice(6)).replaceAll('_', ' ');
    }
  } catch {}
  return name;
};

const targets = [];
const seen = new Set();
for (const p of [...core, ...children]) {
  if (!p.name || seen.has(p.name)) continue;
  seen.add(p.name);
  targets.push({name: p.name, category: p.category || '皇室子女', title: wikiTitle(p.name, p.category || '皇室子女', p.source1 || p.source_url)});
}

const rejectPattern = /map|地图|陵|墓|碑|祠|故居|temple|tomb|mausoleum|memorial|battle|战争|舰|ship|coin|钱币|seal|印章|书法|calligraphy|signature|签名|旗|flag|route|location/i;
const mimeExt = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif'};
const manifest = {};
let downloaded = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const fetchWithRetry = async (url, attempts = 5) => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetch(url, {headers: {'user-agent': 'MingBiographicalRegister/1.0 (local research artifact)'}});
    if (response.ok) return response;
    if (response.status !== 429 || attempt === attempts - 1) throw new Error(`${new URL(url).hostname} ${response.status}`);
    const retryAfter = Number(response.headers.get('retry-after'));
    await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 2500 * (attempt + 1));
  }
};
const existingFiles = await fs.readdir(outDir);

for (let batchStart = 0; batchStart < targets.length; batchStart += 20) {
  const batch = targets.slice(batchStart, batchStart + 20);
  const api = new URL('https://zh.wikipedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query', format: 'json', redirects: '1', prop: 'pageimages|info', inprop: 'url',
    piprop: 'thumbnail|original|name', pithumbsize: '480', titles: batch.map(x => x.title).join('|'),
  });
  let payload;
  try {
    payload = await (await fetchWithRetry(api)).json();
  } catch (error) {
    for (const target of batch) manifest[target.name] = {status: 'placeholder', page: '', reason: String(error.message || error)};
    continue;
  }
  const aliases = new Map([
    ...(payload.query?.normalized || []).map(x => [x.from, x.to]),
    ...(payload.query?.redirects || []).map(x => [x.from, x.to]),
  ]);
  const pages = Object.values(payload.query?.pages || {});
  const pagesByTitle = new Map(pages.map(page => [page.title, page]));
  for (const target of batch) {
    let resolved = target.title;
    for (let step = 0; step < 4 && aliases.has(resolved); step++) resolved = aliases.get(resolved);
    const page = pagesByTitle.get(resolved);
    const thumb = page?.thumbnail;
    const fileName = page?.pageimage || '';
    const portraitLike = thumb && thumb.height >= thumb.width * .92 && !rejectPattern.test(fileName);
    if (!portraitLike) {
      manifest[target.name] = {status: 'placeholder', page: page?.fullurl || '', reason: thumb ? '非纵向人物图像或文件名疑似非画像' : '页面无题图'};
      continue;
    }
    const prefix = `${String(targets.indexOf(target) + 1).padStart(3, '0')}_${target.name.replace(/[\\/:*?"<>|]/g, '_')}.`;
    let localName = existingFiles.find(file => file.startsWith(prefix));
    try {
      if (!localName) {
        const imageResponse = await fetchWithRetry(thumb.source);
        const contentType = (imageResponse.headers.get('content-type') || '').split(';')[0];
        const ext = mimeExt[contentType] || path.extname(new URL(thumb.source).pathname).toLowerCase() || '.jpg';
        localName = prefix.slice(0, -1) + ext;
        await fs.writeFile(path.join(outDir, localName), Buffer.from(await imageResponse.arrayBuffer()));
        await sleep(180);
      }
      manifest[target.name] = {
        status: 'image', file: `assets/portraits/${localName}`, page: page.fullurl || '',
        commons: fileName ? `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}` : '',
        fileName, width: thumb.width, height: thumb.height,
        note: '维基百科页面题图；可能是传世画像、后世摹绘、雕像或现代纪念性塑像，须结合来源页辨别。',
      };
      downloaded++;
    } catch (error) {
      manifest[target.name] = {status: 'placeholder', page: page?.fullurl || '', reason: String(error.message || error)};
    }
  }
  await fs.writeFile('data/ming_portraits.json', JSON.stringify({generatedAt: new Date().toISOString(), downloaded, total: targets.length, people: manifest}, null, 2) + '\n');
  await sleep(900);
}

await fs.writeFile('data/ming_portraits.json', JSON.stringify({generatedAt: new Date().toISOString(), downloaded, total: targets.length, people: manifest}, null, 2) + '\n');
console.log(JSON.stringify({downloaded, total: targets.length, placeholders: targets.length - downloaded}, null, 2));
