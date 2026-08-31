import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const file = 'data/ming_person_pages_batch32_yongle_statecraft.json';
const names = ['解缙', '夏原吉', '蹇义'];
const hedge = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

test('永乐国家治理三人均使用升级人物卡', async () => {
  const { people } = JSON.parse(await fs.readFile(file, 'utf8'));
  const portraits = JSON.parse(await fs.readFile('data/ming_portraits.json', 'utf8')).people;
  const institutions = JSON.parse(await fs.readFile('data/ming_person_institutions.json', 'utf8')).institutions;
  const linked = new Set(institutions.flatMap((institution) => institution.people.map((person) => person.name)));

  assert.deepEqual(Object.keys(people).sort(), names.slice().sort());
  for (const name of names) {
    const page = people[name];
    assert.equal(page.readingMode, 'clear-biography');
    assert.ok(page.scenes.length >= 4 && page.scenes.length <= 6);
    assert.ok(page.sources.length >= 2);
    assert.ok(portraits[name]?.file, `${name} needs portrait metadata`);
    assert.ok(linked.has(name), `${name} needs institutional linkage`);
    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2, `${name}: ${scene.title}`);
      assert.ok(scene.evidenceNote && scene.confidence && scene.interpretationBoundary);
      assert.ok(scene.primarySource?.title && scene.primarySource?.url && scene.primarySource?.boundary && scene.primarySource?.confidence);
      for (const text of [scene.kicker, scene.title, scene.preview, ...scene.body]) assert.doesNotMatch(text, hedge);
    }
  }
});
