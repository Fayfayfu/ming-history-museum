import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const names = ['李舜臣', '丰臣秀吉'];
const dataFile = 'data/ming_person_pages_batch22_renchen.json';
const museumRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const hedgeLanguage = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));

test('万历援朝战争两位域外人物均使用升级人物卡', async () => {
  const pages = (await readJson(dataFile)).people;
  assert.deepEqual(Object.keys(pages).sort(), names.slice().sort());
  for (const name of names) {
    const page = pages[name];
    assert.equal(page.readingMode, 'clear-biography');
    assert.ok(page.scenes.length >= 4);
    assert.ok(page.sources.length >= 3, `${name} needs cross-border source entries`);
    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2);
      assert.ok(scene.primarySource?.url && scene.primarySource?.boundary);
      for (const text of [scene.kicker, scene.title, scene.preview, ...scene.body]) {
        assert.doesNotMatch(text, hedgeLanguage, `${name}: ${text}`);
      }
    }
  }
});

test('万历援朝战争两位域外人物均有画像、生成页与所属军政体系', async () => {
  const pages = (await readJson(dataFile)).people;
  const portraits = (await readJson('data/ming_portraits.json')).people;
  const institutions = await readJson('data/ming_person_institutions.json');
  const linkedNames = new Set(institutions.institutions.flatMap((institution) => institution.people.map((person) => person.name)));
  for (const name of names) {
    const {slug} = pages[name];
    const html = await fs.readFile(`${museumRoot}/people/${slug}.html`, 'utf8');
    const detail = await readJson(`${museumRoot}/assets/data/people-details/${slug}.json`);
    assert.match(html, new RegExp(`<h1>${name}`));
    assert.ok(detail.drawer.personPage.scenes.length >= 4);
    assert.ok(portraits[name]?.file);
    assert.ok(linkedNames.has(name));
  }
});
