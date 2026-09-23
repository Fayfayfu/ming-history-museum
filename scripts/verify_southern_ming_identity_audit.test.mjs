import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import {promisify} from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const root = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const batchPath = 'data/ming_person_pages_batch40_southern_ming_expansion.json';

test('南明与易代新增人物均有明确政权经历，不以出生年误标北京明廷', async () => {
  await execFileAsync(process.execPath, ['scripts/build_ming_html.mjs']);
  const [{people: batchPeople}, core, phases, index] = await Promise.all([
    fs.readFile(batchPath, 'utf8').then(JSON.parse),
    fs.readFile('data/ming_core.json', 'utf8').then(JSON.parse),
    fs.readFile('data/ming_political_phases.json', 'utf8').then(JSON.parse),
    fs.readFile(`${root}/assets/data/people-index.json`, 'utf8').then(JSON.parse),
  ]);
  const names = Object.keys(batchPeople);
  assert.equal(names.length, 23);

  for (const name of names) {
    const person = core.find(item => item.name === name);
    const entry = index.people.find(item => item.name === name);
    assert.ok(person && entry, `${name} must remain in the core and generated index`);
    assert.ok(phases.people[name]?.length, `${name} must have an explicit political-phase record`);
    assert.doesNotMatch(person.office, /^明清易代与南明关联人物/, `${name} must have a concrete identity, not a batch placeholder`);
    assert.ok(entry.politicalPhases?.length, `${name} must render a political identity flow`);
  }

  const qingPrinces = {
    多铎: '和硕豫亲王',
    尼堪: '和硕敬谨亲王',
    豪格: '和硕肃亲王',
    阿济格: '和硕英亲王',
  };
  for (const [name, title] of Object.entries(qingPrinces)) {
    const entry = index.people.find(item => item.name === name);
    assert.equal(entry.category, '政权人物', `${name} must not be reduced to a generic Ming military official`);
    assert.equal(entry.periodIds.includes('ming'), false, `${name} must not carry the Beijing Ming marker`);
    assert.deepEqual(entry.periodIds, ['transition'], `${name} must be indexed under the Ming-Qing transition`);
    assert.match(entry.office, new RegExp(`满洲宗室.*${title}`), `${name} must show both clan identity and title`);
    assert.equal(entry.politicalPhases[0].regime, '清');
  }
});
