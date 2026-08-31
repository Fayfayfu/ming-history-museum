import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const names = ['申时行', '沈一贯', '沈鲤', '叶向高', '海瑞'];
const dataFiles = [
  'data/ming_person_pages_batch18_central.json',
  'data/ming_person_pages_batch18_senior.json',
  'data/ming_person_pages_batch18_hairui.json'
];
const museumRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));

async function pagesByName() {
  const batches = await Promise.all(dataFiles.map(readJson));
  return Object.assign({}, ...batches.map((batch) => batch.people));
}

test('万历中枢与改革余波五人均使用有证据边界的升级人物卡', async () => {
  const pages = await pagesByName();
  assert.deepEqual(Object.keys(pages).sort(), names.slice().sort());
  for (const name of names) {
    const page = pages[name];
    assert.equal(page.readingMode, 'clear-biography');
    assert.ok(page.slug && page.scenes.length >= 4);
    assert.ok(page.sources.length >= 1);
    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2);
      assert.ok(scene.evidenceNote && scene.interpretationBoundary);
      assert.ok(/^https:\/\//.test(scene.primarySource?.url || ''));
    }
  }
});

test('升级数据同时生成独立页、按需详情与已登记画像', async () => {
  const pages = await pagesByName();
  const portraits = (await readJson('data/ming_portraits.json')).people;
  const personBuilder = await fs.readFile('scripts/build_ming_person_pages.mjs', 'utf8');
  const museumBuilder = await fs.readFile('scripts/build_ming_html.mjs', 'utf8');
  for (const file of dataFiles) {
    const basename = file.split('/').at(-1);
    assert.ok(personBuilder.includes(basename));
    assert.ok(museumBuilder.includes(basename));
  }
  for (const name of names) {
    const {slug} = pages[name];
    const html = await fs.readFile(`${museumRoot}/people/${slug}.html`, 'utf8');
    const detail = await readJson(`${museumRoot}/assets/data/people-details/${slug}.json`);
    assert.match(html, new RegExp(`<h1>${name}`));
    assert.ok(detail.drawer.personPage.scenes.length >= 4);
    assert.ok(portraits[name]?.file, `${name} needs a local portrait`);
    assert.match(html, new RegExp(`\.\./${portraits[name].file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }
});
