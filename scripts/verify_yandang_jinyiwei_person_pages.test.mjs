import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const names = ['严世蕃', '杨继盛', '陆炳', '张永'];
const file = 'data/ming_person_pages_batch24_yandang_jinyiwei.json';
const root = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const hedge = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

test('严党、言路与锦衣卫四人均使用升级人物卡', async () => {
  const pages = JSON.parse(await fs.readFile(file, 'utf8')).people;
  const portraits = JSON.parse(await fs.readFile('data/ming_portraits.json', 'utf8')).people;
  const institutions = JSON.parse(await fs.readFile('data/ming_person_institutions.json', 'utf8')).institutions;
  const linked = new Set(institutions.flatMap((institution) => institution.people.map((person) => person.name)));
  assert.deepEqual(Object.keys(pages).sort(), names.slice().sort());
  for (const name of names) {
    const page = pages[name];
    assert.equal(page.readingMode, 'clear-biography');
    assert.equal(page.scenes.length, 4);
    assert.ok(page.sources.length >= 2);
    assert.ok(portraits[name]?.file);
    assert.ok(linked.has(name));
    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2);
      assert.ok(scene.primarySource?.url && scene.primarySource?.boundary);
      for (const text of [scene.kicker, scene.title, scene.preview, ...scene.body]) assert.doesNotMatch(text, hedge, `${name}: ${text}`);
    }
    const html = await fs.readFile(`${root}/people/${page.slug}.html`, 'utf8');
    const detail = JSON.parse(await fs.readFile(`${root}/assets/data/people-details/${page.slug}.json`, 'utf8'));
    assert.match(html, new RegExp(`<h1>${name}`));
    assert.equal(detail.drawer.personPage.scenes.length, 4);
  }
});
