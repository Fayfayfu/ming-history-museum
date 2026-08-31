import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const names = ['高拱', '冯保', '李太后', '客氏', '潘季驯', '孙承宗', '杨涟', '努尔哈赤', '魏忠贤'];
const dataFiles = [
  'data/ming_person_pages_batch20_court.json',
  'data/ming_person_pages_batch20_statecraft.json',
  'data/ming_person_pages_batch20_regime.json'
];
const museumRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const hedgeLanguage = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));

async function pagesByName() {
  const batches = await Promise.all(dataFiles.map(readJson));
  return Object.assign({}, ...batches.map((batch) => batch.people));
}

test('河政、储位与晚明转场九人均使用升级人物卡', async () => {
  const pages = await pagesByName();
  assert.deepEqual(Object.keys(pages).sort(), names.slice().sort());
  for (const name of names) {
    const page = pages[name];
    assert.equal(page.readingMode, 'clear-biography');
    assert.ok(page.scenes.length >= 4 && page.sources.length >= 2);
    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2);
      assert.ok(scene.primarySource?.url && scene.primarySource?.boundary && scene.interpretationBoundary);
      for (const text of [scene.kicker, scene.title, scene.preview, ...scene.body]) assert.doesNotMatch(text, hedgeLanguage, `${name}: ${text}`);
    }
  }
});

test('九人均生成独立页、详情分片并继承已登记画像', async () => {
  const pages = await pagesByName();
  const portraits = (await readJson('data/ming_portraits.json')).people;
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
