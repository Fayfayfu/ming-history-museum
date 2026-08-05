import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const root = path.resolve('dist');
const types = {'.html':'text/html; charset=utf-8','.webp':'image/webp','.json':'application/json'};
const server = http.createServer(async (request, response) => {
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
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
});

const files = [
  'index.html','people.html','events.html','exhibitions.html',
  'exhibit-yongle-capital.html','exhibit-zheng-he-voyages.html','exhibit-tumu-crisis.html',
  'exhibit-zhang-reform.html','exhibit-imjin-war.html','exhibit-fall-1644.html',
  'people/yu-qian.html','people/zhang-ju-zheng.html','people/tang-yin.html','people/qi-ji-guang.html',
];
const pages = [];
for (const file of files) {
  await page.goto(`${base}/${file}`, {waitUntil:'networkidle'});
  await page.evaluate(async () => {
    const images = [...document.images];
    images.forEach(image => { image.loading = 'eager'; });
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
    title: document.title,
    images: document.images.length,
    broken: [...document.images].filter(image => !image.naturalWidth).length,
    bodyWidth: document.body.scrollWidth,
    viewport: innerWidth,
  }), file));
}

await page.goto(`${base}/people.html?person=${encodeURIComponent('姚广孝')}`, {waitUntil:'networkidle'});
const yao = await page.evaluate(() => ({
  open: document.querySelector('#drawer')?.classList.contains('open'),
  src: document.querySelector('#detail .portrait img')?.getAttribute('src'),
  loaded: Boolean(document.querySelector('#detail .portrait img')?.naturalWidth),
}));

await page.setViewportSize({width:390,height:844});
await page.goto(`${base}/index.html`, {waitUntil:'networkidle'});
const mobile = await page.evaluate(() => ({bodyWidth:document.body.scrollWidth,viewport:innerWidth}));

await browser.close();
await new Promise(resolve => server.close(resolve));

const audit = {
  pages,
  yao,
  mobile,
  errors,
  pass: pages.length === files.length
    && pages.every(record => record.title && record.broken === 0 && record.bodyWidth === record.viewport)
    && yao.open && yao.loaded && yao.src?.endsWith('.webp')
    && mobile.bodyWidth === mobile.viewport
    && errors.length === 0,
};
console.log(JSON.stringify(audit, null, 2));
if (!audit.pass) process.exit(1);
