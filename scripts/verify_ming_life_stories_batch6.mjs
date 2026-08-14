import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const names = ['于谦', '唐寅', '戚继光'];
const bannedTitles = ['生卒与出身', '进入历史现场', '主要行动与位置', '结局与历史影响'];
const expectedFeature = {
  于谦: 'crisis-decision',
  唐寅: 'gallery',
  戚继光: 'training-system'
};
const routes = {于谦: 'yu-qian', 唐寅: 'tang-yin', 戚继光: 'qi-ji-guang'};
const mobileFeatureSelector = {于谦: '.feature-crisis-decision', 唐寅: '.gallery', 戚继光: '.feature-training-system'};
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const core = JSON.parse(await fs.readFile('data/ming_core.json', 'utf8'));
const pages = JSON.parse(await fs.readFile('data/ming_person_pages.json', 'utf8')).people || {};
const creative = JSON.parse(await fs.readFile('data/ming_creative_works.json', 'utf8'));

const baselineCore = JSON.parse(execFileSync('git', ['show', '41e5646:data/ming_core.json'], {encoding: 'utf8'}));
const baselinePages = JSON.parse(execFileSync('git', ['show', '41e5646:data/ming_person_pages.json'], {encoding: 'utf8'})).people || {};
const zhengHe = core.find(item => item.name === '郑和');
const baselineZhengHe = baselineCore.find(item => item.name === '郑和');
if (JSON.stringify(zhengHe) !== JSON.stringify(baselineZhengHe) || JSON.stringify(pages.郑和) !== JSON.stringify(baselinePages.郑和)) {
  errors.push('郑和: changed outside batch scope');
}

function isDirectAuthority(url) {
  if (typeof url !== 'string' || !url.trim() || /wikipedia\.org/i.test(url)) return false;
  try {
    const parsed = new URL(url);
    return !(parsed.hostname === 'ctext.org' && /^\/?(?:zh)?\/?$/.test(parsed.pathname));
  } catch {
    return false;
  }
}

function chineseCharacterCount(text) {
  return (String(text).match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g) || []).length;
}

function hasExpectedArtworkImages(images, expectedCount) {
  return expectedCount >= 4 && expectedCount <= 6 && images.length === expectedCount && images.every(Boolean);
}

if (chineseCharacterCount('甲乙abc') !== 2 || chineseCharacterCount('abc123') !== 0 || hasExpectedArtworkImages([], 4)) {
  throw new Error('Batch 6 verifier self-check failed');
}

function assertScene(scene, name, banned) {
  assert(Boolean(scene?.year), `${name}: scene missing year`);
  assert(Boolean(scene?.reignYears), `${name}: scene missing reignYears`);
  assert(Boolean(scene?.age), `${name}: scene missing age`);
  assert(Boolean(scene?.kicker), `${name}: scene missing kicker`);
  assert(Boolean(scene?.title), `${name}: scene missing title`);
  assert(!banned.includes(scene?.title), `${name}: banned scene title`);
  assert((scene?.preview || '').length >= 28, `${name}: scene preview too short`);
  assert(Array.isArray(scene?.body) && scene.body.length >= 2 && scene.body.every(paragraph => chineseCharacterCount(paragraph) >= 55), `${name}: scene body incomplete`);
  assert(Boolean(scene?.evidenceNote), `${name}: scene missing evidenceNote`);
  assert(Boolean(scene?.confidence), `${name}: scene missing confidence`);
  const source = scene?.primarySource;
  assert(Boolean(source?.title && source?.location && Array.isArray(source?.original) && source.original.length && source?.reading && source?.boundary && source?.url && source?.confidence), `${name}: scene primarySource incomplete`);
  assert(Boolean(scene?.interpretationBoundary), `${name}: scene missing interpretationBoundary`);
}

function validArtwork(work) {
  return Boolean(work?.title && work?.date && work?.medium && work?.image && /^https:\/\//.test(work?.source || '') && work?.collection && work?.license && work?.confidence && (work?.reading || '').length >= 35);
}

for (const name of names) {
  const card = core.find(item => item.name === name);
  const page = pages[name];
  if (!card) {
    errors.push(`${name}: missing core card`);
    continue;
  }
  assert((card.summary || '').length >= 34, `${name}: summary too short`);
  assert((card.evaluation || '').length >= 38, `${name}: evaluation too short`);
  assert([card.source1, card.source2].every(isDirectAuthority), `${name}: weak card source`);
  if (!page) {
    errors.push(`${name}: missing person page`);
    continue;
  }
  assert(page.readingMode === 'clear-biography', `${name}: not clear biography`);
  const scenes = Array.isArray(page.scenes) ? page.scenes : [];
  assert(scenes.length >= 5 && scenes.length <= 6, `${name}: wrong scene count`);
  scenes.forEach(scene => assertScene(scene, name, bannedTitles));
  assert(page.feature?.type === expectedFeature[name], `${name}: wrong exhibition focus`);
}

const joined = name => JSON.stringify({core: core.find(item => item.name === name), page: pages[name]});
assert(joined('于谦').match(/反对南迁|北京保卫|景泰|夺门|平反/), '于谦: crisis chain incomplete');
assert(joined('唐寅').match(/解元|科场|职业|题跋|市场/), '唐寅: cultural production incomplete');
assert(joined('戚继光').match(/募兵|编组|军纪|蓟镇|纪效新书|练兵实纪/), '戚继光: training system incomplete');

assert(pages.于谦?.feature?.items?.length === 6, '于谦: decision chain must have six steps');
assert(creative.people?.唐寅?.works?.length >= 4 && creative.people.唐寅.works.length <= 6, '唐寅: artwork count');
assert(creative.people?.唐寅?.works?.every(validArtwork), '唐寅: incomplete artwork metadata');
assert(pages.戚继光?.feature?.items?.length === 8, '戚继光: training system must have eight parts');

if (!errors.length) {
  const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
  const hallUrl = name => `${pathToFileURL(path.join(root, 'people.html')).href}?person=${encodeURIComponent(name)}`;
  const browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 1});
    for (const name of names) {
      await page.goto(hallUrl(name), {waitUntil: 'networkidle'});
      const drawer = await page.evaluate(() => ({
        question: document.querySelector('#detail .profile-preview-head h5')?.textContent.trim() || '',
        lead: document.querySelector('#detail .profile-preview > p')?.textContent.trim() || '',
        nodes: [...document.querySelectorAll('#detail .profile-quick-node')].map(node => ({
          year: node.querySelector('.profile-quick-date b')?.textContent.trim() || '',
          reignYear: node.querySelector('.profile-quick-reign')?.textContent.trim() || '',
          title: node.querySelector('.profile-quick-copy > span')?.textContent.trim() || '',
          preview: node.querySelector('.profile-quick-summary')?.textContent.trim() || ''
        })),
        enter: document.querySelector('#detail .profile-enter')?.getAttribute('href') || '',
        bodyWidth: document.body.scrollWidth,
        viewport: innerWidth
      }));
      assert(Boolean(drawer.question && drawer.lead), `${name}: drawer question or lead missing`);
      assert(drawer.nodes.length >= 5 && drawer.nodes.length <= 6, `${name}: desktop quick-node count`);
      assert(drawer.nodes.every(node => node.year && node.reignYear && node.title && node.preview), `${name}: desktop quick-node incomplete`);
      assert(drawer.enter.endsWith(`/people/${routes[name]}.html`), `${name}: wrong independent page target`);
      assert(drawer.bodyWidth === drawer.viewport, `${name}: desktop horizontal overflow`);
    }
    await page.setViewportSize({width: 390, height: 844});
    for (const name of names) {
      await page.goto(hallUrl(name), {waitUntil: 'networkidle'});
      const mobile = await page.evaluate(featureSelector => ({
        pathname: decodeURIComponent(location.pathname),
        chapters: document.querySelectorAll('.story > .chapter').length,
        feature: document.querySelector(featureSelector) !== null,
        artworkImages: [...document.querySelectorAll('.art-card img')].map(image => image.complete && image.naturalWidth > 0),
        bodyWidth: document.body.scrollWidth,
        viewport: innerWidth
      }), mobileFeatureSelector[name]);
      assert(mobile.pathname.endsWith(`/people/${routes[name]}.html`), `${name}: mobile route did not redirect`);
      assert(mobile.chapters >= 5 && mobile.chapters <= 6, `${name}: mobile chapter count`);
      assert(mobile.feature, `${name}: mobile feature missing`);
      if (name === '唐寅') assert(hasExpectedArtworkImages(mobile.artworkImages, creative.people?.唐寅?.works?.length ?? 0), '唐寅: artwork image count or load failed');
      assert(mobile.bodyWidth === mobile.viewport, `${name}: mobile horizontal overflow`);
    }
  } finally {
    await browser.close();
  }
}

if (errors.length) {
  console.error(`人物文案第六批未通过（${errors.length}项）：`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('人物文案第六批通过：三人人物卡、场景证据、差异化展项与桌面/移动端页面完整。');
