import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const root = path.resolve(process.env.MING_DEPLOY_ROOT || 'dist');
const expectedDataCacheControl = 'public, max-age=0, must-revalidate';
const vercelConfig = JSON.parse(await fs.readFile(path.join(root, 'vercel.json'), 'utf8'));
const dataCacheRules = (vercelConfig.headers || []).filter((rule) => rule.source === '/assets/data/(.*)');
const cachePolicy = {
  dataRules: dataCacheRules.length,
  value: dataCacheRules[0]?.headers?.find((header) => header.key.toLowerCase() === 'cache-control')?.value || '',
  broadImmutable: (vercelConfig.headers || []).some((rule) => (
    rule.source === '/assets/(.*)'
    && rule.headers?.some((header) => header.key.toLowerCase() === 'cache-control' && /immutable/i.test(header.value))
  )),
};
const types = {'.html':'text/html; charset=utf-8','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.md':'text/markdown; charset=utf-8'};
const server = process.env.MING_DEPLOY_URL ? null : http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) throw new Error('Invalid path');
    const body = await fs.readFile(file);
    response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});
if (server) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.MING_DEPLOY_URL?.replace(/\/$/, '') || `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
});

const immersivePeople = (await fs.readdir(path.join(root, 'people')))
  .filter(file => file.endsWith('.html'))
  .sort()
  .map(file => `people/${file}`);
const timelinePreviews = Object.freeze({
  'people-timeline-current.html': { variant: 'current', titleMarker: '当前版' },
  'people-timeline-a.html': { variant: 'a', titleMarker: 'A版' },
  'people-timeline-b.html': { variant: 'b', titleMarker: 'B版' },
  'people-timeline-b2.html': { variant: 'b2', titleMarker: 'B2版' },
  'people-timeline-c.html': { variant: 'c', titleMarker: 'C版' },
});
const files = [
  'index.html','people.html','events.html','exhibitions.html',
  'institutions.html','institutions-graph.html',
  ...Object.keys(timelinePreviews),
  'exhibit-yongle-capital.html','exhibit-zheng-he-voyages.html','exhibit-tumu-crisis.html',
  'exhibit-zhang-reform.html','exhibit-imjin-war.html','exhibit-fall-1644.html',
  ...immersivePeople,
];
const pages = [];
for (const file of files) {
  const response = await page.goto(`${base}/${file}`, {waitUntil:'domcontentloaded', timeout:60000});
  await page.evaluate(async () => {
    const images = [...document.images];
    images.forEach(image => {
      image.loading = 'eager';
      if (!image.getAttribute('src') && image.dataset.src) image.src = image.dataset.src;
    });
    window.scrollTo(0, document.body.scrollHeight);
    await Promise.race([
      Promise.all(images.map(image => image.complete
        ? undefined
        : new Promise(resolve => {
            image.addEventListener('load', resolve, {once:true});
            image.addEventListener('error', resolve, {once:true});
          }))),
      new Promise(resolve => setTimeout(resolve, 10000)),
    ]);
    window.scrollTo(0, 0);
  });
  pages.push(await page.evaluate(file => ({
    file,
    responseStatus: Number(document.documentElement.dataset.verifierResponseStatus || 0),
    title: document.title,
    images: document.images.length,
    broken: [...document.images].filter(image => image.currentSrc && !image.naturalWidth).length,
    bodyWidth: document.body.scrollWidth,
    viewport: innerWidth,
    navLabels: [...document.querySelectorAll('.museum-links a')].map(link => link.textContent.trim()),
    exhibitionCards: document.querySelectorAll('.specials .special').length,
    palaceNavLinks: document.querySelectorAll('.museum-links a[href="institutions-palace.html"]').length,
    institutionDisplayTabs: document.querySelectorAll('.institution-display-switch [data-display]').length,
    developmentCopy: /B\s*版|C\s*版|返回明代官制档案|版本号/.test(document.body.textContent),
    scrollVariant: document.body.dataset.scrollVariant || '',
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
    scopeCopy: document.body.textContent.replace(/\s+/g, ' ').trim(),
  }), file));
  pages.at(-1).responseStatus = response?.status() || 0;
}

await page.goto(`${base}/people.html`, {waitUntil:'load', timeout:60000});
await page.evaluate(async () => document.fonts.ready);
const typography = await page.evaluate(() => ({
  sans: document.fonts.check('15px "Ming Museum Sans"'),
  marker: document.querySelector('style[data-museum-typography="scope-note-only"]') !== null,
}));

await page.goto(`${base}/institutions-palace.html`, {waitUntil:'domcontentloaded', timeout:60000});
await page.waitForTimeout(80);
const legacyInstitutionRedirect=page.url().endsWith('/institutions.html');

await page.goto(`${base}/people.html?person=${encodeURIComponent('姚广孝')}`, {waitUntil:'domcontentloaded', timeout:60000});
await page.waitForFunction(() => (
  document.querySelector('#drawer')?.classList.contains('open')
  && document.querySelector('#detail h2')?.textContent.trim() === '姚广孝'
  && document.querySelector('#detail .portrait img')
), {timeout: 60000});
const yao = await page.evaluate(async () => {
  const image = document.querySelector('#detail .portrait img');
  if (image && !image.complete) await new Promise(resolve => {
    image.addEventListener('load', resolve, {once:true});
    image.addEventListener('error', resolve, {once:true});
  });
  return {
    open: document.querySelector('#drawer')?.classList.contains('open'),
    src: image?.getAttribute('src'),
    loaded: Boolean(image?.naturalWidth),
  };
});

await page.goto(`${base}/people.html?person=${encodeURIComponent('杨继盛')}`, {waitUntil:'domcontentloaded', timeout:60000});
await page.waitForFunction(() => (
  document.querySelector('#drawer')?.classList.contains('open')
  && document.querySelector('#detail h2')?.textContent.trim() === '杨继盛'
  && document.querySelectorAll('#detail .life-chapter').length === 6
), {timeout: 60000});
const yangJisheng = await page.evaluate(async () => {
  const image = document.querySelector('#detail .portrait img');
  if (image && !image.complete) await new Promise(resolve => {
    image.addEventListener('load', resolve, {once:true});
    image.addEventListener('error', resolve, {once:true});
  });
  return {
    open: document.querySelector('#drawer')?.classList.contains('open'),
    name: document.querySelector('#detail h2')?.textContent.trim(),
    portraitLoaded: Boolean(image?.naturalWidth),
    portraitLabel: document.querySelector('#detail .portrait-label')?.textContent.trim(),
    chapters: document.querySelectorAll('#detail .life-chapter').length,
    quoteLines: document.querySelectorAll('#detail .work-voice blockquote div').length,
  };
});

await page.setViewportSize({width:390,height:844});
await page.goto(`${base}/index.html`, {waitUntil:'domcontentloaded', timeout:60000});
const mobile = await page.evaluate(() => ({bodyWidth:document.body.scrollWidth,viewport:innerWidth}));

await browser.close();
if (server) await new Promise(resolve => server.close(resolve));

const audit = {
  pages,
  topLevelInstitutionNavigation: pages
    .filter(record => ['index.html','people.html','events.html','exhibitions.html'].includes(record.file))
    .map(record => ({file: record.file, hasInstitutionHall: record.navLabels.includes('制度馆')})),
  yao,
  yangJisheng,
  mobile,
  legacyInstitutionRedirect,
  errors,
  typography,
  cachePolicy,
  scopeCopy: Object.fromEntries(['index.html', 'people.html', 'events.html'].map(file => [file, pages.find(record => record.file === file)?.scopeCopy || ''])),
  pass: pages.length === files.length
    && pages.every(record => record.responseStatus === 200 && record.title && record.broken === 0 && record.bodyWidth === record.viewport)
    && pages.every(record => record.navLabels.includes('专题展'))
    && pages.every(record => record.palaceNavLinks === 0)
    && pages.find(record => record.file === 'institutions.html')?.institutionDisplayTabs === 2
    && pages.find(record => record.file === 'institutions.html')?.developmentCopy === false
    && legacyInstitutionRedirect
    && ['index.html','people.html','events.html','exhibitions.html'].every(file =>
      pages.find(record => record.file === file)?.navLabels.includes('制度馆')
    )
    && pages.find(record => record.file === 'index.html')?.exhibitionCards === 6
    && Object.entries(timelinePreviews).every(([file, expected]) => {
      const record = pages.find(candidate => candidate.file === file);
      return record?.title.includes(expected.titleMarker)
        && record.scrollVariant === expected.variant
        && record.robots === 'noindex,nofollow';
    })
    && pages.find(record => record.file === 'people.html')?.scrollVariant === 'b2'
    && pages.find(record => record.file === 'people.html')?.robots === ''
    && ['index.html', 'people.html', 'events.html'].every(file => ['1368', '1644', '1662', '北京明廷覆亡', '南明终局'].every(token => pages.find(record => record.file === file)?.scopeCopy.includes(token)))
    && yao.open && yao.loaded && yao.src?.endsWith('.webp')
    && yangJisheng.open && yangJisheng.name === '杨继盛' && yangJisheng.portraitLoaded
    && yangJisheng.portraitLabel === '18世纪清人绘像'
    && yangJisheng.chapters === 6 && yangJisheng.quoteLines === 2
    && mobile.bodyWidth === mobile.viewport
    && typography.marker && typography.sans
    && cachePolicy.dataRules === 1 && cachePolicy.value === expectedDataCacheControl && !cachePolicy.broadImmutable
    && errors.length === 0,
};
console.log(JSON.stringify(audit, null, 2));
if (!audit.pass) process.exit(1);
