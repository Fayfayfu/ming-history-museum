import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const file = 'data/ming_person_pages_batch34_tumu_court.json';
const names = ['王振', '金英', '也先', '石亨'];
const hedge = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

async function readJson(path) { return JSON.parse(await fs.readFile(path, 'utf8')); }

test('土木前后四人升级为完整而动态的人物叙事', async () => {
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

test('土木前后四人与可用的本地画像、事件、切片和机构数据交叉', async () => {
  const pages = (await readJson(file)).people;
  const portraits = (await readJson('data/ming_portraits.json')).people;
  const institutions = (await readJson('data/ming_person_institutions.json')).institutions;
  const events = new Map((await readJson('data/ming_events.json')).events.map((event) => [event.id, event]));
  const institutionIds = new Set(institutions.map((institution) => institution.id));
  const linkedPeople = new Set(institutions.flatMap((institution) => (institution.people || []).map((person) => person.name)));
  for (const name of names) {
    const page = pages[name];
    assert.equal(portraits[name]?.file, page.localEvidenceLinks.portrait);
    for (const institution of page.localEvidenceLinks.institutions) assert.ok(institutionIds.has(institution));
    for (const eventId of page.localEvidenceLinks.events || []) assert.ok(events.get(eventId)?.people.includes(name), `${name} event resolves`);
    for (const link of page.localEvidenceLinks.historicalSlices || []) {
      const [sliceFile, sliceName] = link.split('#');
      assert.ok((await readJson(sliceFile)).people?.[sliceName], `${name} slice resolves`);
    }
  }
  assert.equal(linkedPeople.has('王振'), true);
  assert.equal(linkedPeople.has('金英'), true);
  assert.equal(linkedPeople.has('石亨'), true);
  assert.equal(linkedPeople.has('也先'), false);
  assert.match(pages['也先'].institutionBoundary, /仅覆盖明朝官署/);
});
