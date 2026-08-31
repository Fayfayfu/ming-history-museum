import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const file = 'data/ming_person_pages_batch26_wanli_emperor.json';
const root = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const hedge = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;

test('万历帝使用七幕升级人物卡并覆盖统治关键阶段', async () => {
  const page = JSON.parse(await fs.readFile(file, 'utf8')).people['朱翊钧'];
  const portrait = JSON.parse(await fs.readFile('data/ming_portraits.json', 'utf8')).people['朱翊钧'];
  assert.equal(page.readingMode, 'clear-biography');
  assert.equal(page.scenes.length, 7);
  assert.ok(page.sources.length >= 3);
  assert.ok(page.feature?.items?.length >= 6);
  assert.ok(portrait?.file);
  for (const scene of page.scenes) {
    assert.equal(scene.body.length, 2);
    assert.ok(scene.primarySource?.url && scene.primarySource?.boundary);
    for (const text of [scene.kicker, scene.title, scene.preview, ...scene.body]) assert.doesNotMatch(text, hedge, text);
  }
  const detail = JSON.parse(await fs.readFile(`${root}/assets/data/people-details/zhu-yi-jun.json`, 'utf8'));
  const html = await fs.readFile(`${root}/people/zhu-yi-jun.html`, 'utf8');
  assert.equal(detail.drawer.personPage.readingMode, 'clear-biography');
  assert.equal(detail.drawer.personPage.scenes.length, 7);
  assert.match(html, /万历账本/);
});
