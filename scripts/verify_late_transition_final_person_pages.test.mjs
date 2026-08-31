import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const file = 'data/ming_person_pages_batch39_late_transition_final.json';
const root = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const names = ['史可法', '皇太极', '李自成', '多尔衮', '王保保'];
const hedge = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

test('明清易代五人均为完整升级卡，并保持本地证据链接边界', async () => {
  const pages = JSON.parse(await fs.readFile(file, 'utf8')).people;
  const institutions = JSON.parse(await fs.readFile('data/ming_person_institutions.json', 'utf8')).institutions;
  const events = JSON.parse(await fs.readFile('data/ming_events.json', 'utf8')).events;
  const eventIds = new Set(events.map((event) => event.id));
  const linkedPeople = new Set(institutions.flatMap((institution) => institution.people.map((person) => person.name)));
  assert.deepEqual(Object.keys(pages).sort(), names.slice().sort());

  for (const name of names) {
    const page = pages[name];
    assert.equal(page.readingMode, 'clear-biography');
    assert.ok(page.scenes.length >= 4 && page.scenes.length <= 6);
    assert.ok(page.sources.length >= 2);
    assert.ok(page.localEvidenceLinks?.portrait, `${name} 缺少本地画像路径`);
    await fs.access(path.join(root, page.localEvidenceLinks.portrait));
    for (const eventId of page.localEvidenceLinks.events) assert.ok(eventIds.has(eventId), `${name} 关联事件 ${eventId} 不存在`);
    if (linkedPeople.has(name)) {
      assert.ok(page.localEvidenceLinks.institutions.length > 0, `${name} 已有机构关系但卡片未链接`);
    } else {
      assert.equal(page.localEvidenceLinks.institutions.length, 0, `${name} 不应伪造明朝机构链接`);
      assert.match(page.localEvidenceLinks.institutionBoundary, /不属于本站明朝机构索引|不虚构明朝任职/);
    }
    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2, `${name} ${scene.title}`);
      assert.ok(scene.evidenceNote && scene.confidence && scene.interpretationBoundary);
      assert.ok(scene.primarySource?.url && scene.primarySource?.boundary && scene.primarySource?.original?.length);
      for (const text of [scene.kicker, scene.title, scene.preview, ...scene.body]) assert.doesNotMatch(text, hedge, `${name}: ${text}`);
    }
  }
});

test('史可法保留南明阶段，清朝政权人物不伪装为明朝官员', async () => {
  const pages = JSON.parse(await fs.readFile(file, 'utf8')).people;
  assert.match(pages['史可法'].scenes[2].reignYears, /南明·弘光/);
  assert.match(pages['史可法'].scenes[3].reignYears, /南明·弘光/);
  for (const name of ['皇太极', '李自成', '多尔衮', '王保保']) {
    assert.equal(pages[name].localEvidenceLinks.institutions.length, 0);
  }
});
