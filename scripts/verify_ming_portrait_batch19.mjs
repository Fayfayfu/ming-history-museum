import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const names = [
  '朱橚', '朱柏', '朱权', '朱文奎', '朱文圭', '朱高煦', '朱高燧', '朱瞻墡', '朱见济', '朱载壡',
  '朱载圳', '朱翊镠', '朱常洵', '朱常浩', '朱常润', '朱常瀛', '朱慈烺', '朱慈炯', '朱慈炤', '朱慈煥',
];
const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9');
const museum = path.join(root, '明史数字博物馆');
const portraits = JSON.parse(fs.readFileSync('data/ming_portraits.json', 'utf8')).people;
const problems = [];

for (const name of names) {
  const portrait = portraits[name];
  if (!portrait) problems.push(`${name}: 画像登记缺失`);
  if (portrait?.status !== 'imagined') problems.push(`${name}: status 不是 imagined`);
  if (portrait?.portraitKind !== 'AI想象像') problems.push(`${name}: portraitKind 标识错误`);
  if (!portrait?.file || !fs.existsSync(path.join(root, portrait.file))) problems.push(`${name}: 网页图文件缺失`);
  if (!portrait?.originalFile || !fs.existsSync(portrait.originalFile)) problems.push(`${name}: 原图文件缺失`);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
await page.goto(`file://${path.join(museum, 'people.html')}`, {waitUntil: 'networkidle'});

for (const name of names) {
  await page.evaluate(personName => focusPerson(personName), name);
  await page.waitForSelector('#drawer.open');
  const result = await page.evaluate(async personName => {
    const image = document.querySelector('#detail .portrait img');
    if (image && !image.complete) {
      await new Promise(resolve => {
        image.addEventListener('load', resolve, {once: true});
        image.addEventListener('error', resolve, {once: true});
      });
    }
    return {
      heading: document.querySelector('#detail h2')?.textContent.trim(),
      loaded: Boolean(image?.naturalWidth),
      label: document.querySelector('#detail .portrait-label')?.textContent.trim(),
      fallback: Boolean(document.querySelector('#detail .portrait-fallback')),
      note: document.querySelector('#detail .portrait-note')?.textContent.trim() ?? '',
      expected: personName,
    };
  }, name);
  if (result.heading !== name) problems.push(`${name}: 抽屉人物错位为 ${result.heading || '空'}`);
  if (!result.loaded) problems.push(`${name}: 浏览器未加载画像`);
  if (result.label !== 'AI想象像') problems.push(`${name}: 抽屉未显示完整AI标识`);
  if (result.fallback) problems.push(`${name}: 仍显示占位章`);
  if (!result.note.includes('艺术想象')) problems.push(`${name}: 详情缺少艺术想象边界说明`);
  await page.locator('#close').click();
}

await browser.close();

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`batch 19 verified: ${names.length}/${names.length} portraits loaded, labelled and archived`);
