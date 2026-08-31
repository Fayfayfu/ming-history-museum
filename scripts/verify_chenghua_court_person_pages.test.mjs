import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const file = 'data/ming_person_pages_batch36_chenghua_court.json';
const names = ['李贤', '商辂', '曹吉祥', '纪氏', '万贵妃'];
const hedge = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

async function readJson(path) { return JSON.parse(await fs.readFile(path, 'utf8')); }

test('成化前后五人升级为完整且动态的人物叙事', async () => {
  const batch = await readJson(file);
  assert.equal(batch.version, 1);
  assert.deepEqual(Object.keys(batch.people).sort(), names.slice().sort());
  for (const name of names) {
    const page = batch.people[name];
    assert.equal(page.readingMode, 'clear-biography');
    assert.ok(page.scenes.length >= 4 && page.scenes.length <= 6, `${name} uses 4-6 scenes`);
    assert.ok(page.sources.length >= 2, `${name} has cross-checking sources`);
    assert.ok(page.localEvidenceLinks?.portrait, `${name} declares portrait`);
    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2, `${name} scene has two body paragraphs`);
      assert.match(scene.confidence, /高|中|低/);
      assert.ok(scene.evidenceNote && scene.interpretationBoundary);
      for (const key of ['title', 'location', 'original', 'reading', 'boundary', 'url', 'confidence']) assert.ok(scene.primarySource?.[key], `${name} primary source ${key}`);
      assert.ok(Array.isArray(scene.primarySource.original) && scene.primarySource.original.length > 0);
      for (const prose of [scene.kicker, scene.title, scene.preview, ...scene.body]) assert.doesNotMatch(prose, hedge, `${name} avoids disclaimer prose`);
    }
  }
});

test('成化前后五人链接到可用画像、机构或明确的机构模型边界', async () => {
  const pages = (await readJson(file)).people;
  const portraits = (await readJson('data/ming_portraits.json')).people;
  const institutions = (await readJson('data/ming_person_institutions.json')).institutions;
  const events = new Map((await readJson('data/ming_events.json')).events.map((event) => [event.id, event]));
  const institutionIds = new Set(institutions.map((institution) => institution.id));
  const linkedPeople = new Set(institutions.flatMap((institution) => (institution.people || []).map((person) => person.name)));
  for (const name of names) {
    const page = pages[name];
    assert.equal(portraits[name]?.file, page.localEvidenceLinks.portrait, `${name} portrait resolves`);
    for (const institution of page.localEvidenceLinks.institutions || []) assert.ok(institutionIds.has(institution), `${name} institution id resolves`);
    for (const eventId of page.localEvidenceLinks.events || []) assert.ok(events.get(eventId)?.people.includes(name), `${name} event resolves`);
  }
  assert.equal(linkedPeople.has('李贤'), true);
  assert.equal(linkedPeople.has('商辂'), true);
  assert.equal(linkedPeople.has('曹吉祥'), true);
  for (const name of ['纪氏', '万贵妃']) {
    assert.equal(pages[name].localEvidenceLinks.institutions.length, 0);
    assert.match(pages[name].institutionBoundary, /主要记录官署与正式军政组织/);
  }
});
