import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const file = 'data/ming_person_pages_batch37_hongzhi_civil.json';
const names = ['刘健', '谢迁', '李东阳', '刘大夏'];
const hedge = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

async function readJson(path) { return JSON.parse(await fs.readFile(path, 'utf8')); }

test('弘治中枢四人升级为动态且可核的人物叙事', async () => {
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

test('弘治中枢四人与本地画像、机构和事件索引保持一致', async () => {
  const pages = (await readJson(file)).people;
  const portraits = (await readJson('data/ming_portraits.json')).people;
  const institutions = (await readJson('data/ming_person_institutions.json')).institutions;
  const events = new Map((await readJson('data/ming_events.json')).events.map((event) => [event.id, event]));
  const institutionIds = new Set(institutions.map((institution) => institution.id));
  const linkedPeople = new Set(institutions.flatMap((institution) => (institution.people || []).map((person) => person.name)));
  for (const name of names) {
    const page = pages[name];
    assert.equal(portraits[name]?.file, page.localEvidenceLinks.portrait, `${name} portrait resolves`);
    assert.equal(linkedPeople.has(name), true, `${name} has an institution link`);
    for (const institution of page.localEvidenceLinks.institutions) assert.ok(institutionIds.has(institution), `${name} institution id resolves`);
    for (const eventId of page.localEvidenceLinks.events || []) assert.ok(events.get(eventId)?.people.includes(name), `${name} event resolves`);
  }
});
