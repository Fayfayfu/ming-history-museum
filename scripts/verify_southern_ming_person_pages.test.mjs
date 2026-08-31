import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const names = ['朱由崧', '朱聿键', '朱由榔'];
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const dataFile = 'data/ming_person_pages_batch16.json';
const museumRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';

test('南明三位君主使用升级人物卡，而非旧版单段摘要', async () => {
  const pages = (await readJson(dataFile)).people;
  assert.deepEqual(Object.keys(pages), names);
  for (const name of names) {
    const page = pages[name];
    assert.equal(page.readingMode, 'clear-biography');
    assert.equal(page.scenes.length, 5);
    assert.ok(page.scenes.every((scene) => scene.body.length === 2 && scene.evidenceNote && scene.interpretationBoundary));
    assert.ok(page.scenes.every((scene) => /^https:\/\//.test(scene.primarySource?.url || '')));
    assert.deepEqual(page.basicInfo.royalRelations.columns.map((column) => column.title), ['父母/帝系', '子女', '继承']);
    assert.ok(page.sources.length >= 3);
  }
});

test('南明三位君主的独立页与按需详情均由升级数据生成', async () => {
  const pages = (await readJson(dataFile)).people;
  const personBuilder = await fs.readFile('scripts/build_ming_person_pages.mjs', 'utf8');
  const museumBuilder = await fs.readFile('scripts/build_ming_html.mjs', 'utf8');
  assert.match(personBuilder, /ming_person_pages_batch16\.json/);
  assert.match(museumBuilder, /ming_person_pages_batch16\.json/);
  for (const name of names) {
    const slug = pages[name].slug;
    const html = await fs.readFile(`${museumRoot}/people/${slug}.html`, 'utf8');
    const detail = await readJson(`${museumRoot}/assets/data/people-details/${slug}.json`);
    assert.match(html, new RegExp(`<h1>${name}`));
    assert.equal(detail.drawer.personPage.scenes.length, 5);
    assert.equal(detail.drawer.personPage.basicInfo.royalRelations.columns.length, 3);
  }
});
