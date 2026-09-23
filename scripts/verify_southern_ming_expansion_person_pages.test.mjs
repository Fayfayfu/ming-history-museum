import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {repairPersonPages} from './lib/person_page_repairs.mjs';

const requestedNames = [
  '郑成功', '李定国', '孙可望', '马士英', '左良玉', '陈圆圆', '多铎', '高杰', '黄得功',
  '刘良佐', '刘泽清', '阎应元', '郑芝龙', '黄道周', '朱聿鐭', '张献忠', '刘文秀', '艾能奇',
  '孔有德', '尼堪', '豪格', '阿济格', '李来亨',
];
const sourceBoundary = /不等于|不以|不把|不将|不能|不宜|不足以|无法|不可/;

test('用户点名的南明与明清易代人物均有唯一名录和完整证据卡', async () => {
  const [core, batch] = await Promise.all([
    fs.readFile('data/ming_core.json', 'utf8').then(JSON.parse),
    fs.readFile('data/ming_person_pages_batch40_southern_ming_expansion.json', 'utf8').then(JSON.parse),
  ]);
  repairPersonPages(batch);
  const pages = batch.people;
  assert.deepEqual(Object.keys(pages).sort(), requestedNames.slice().sort());
  assert.equal(core.filter((person) => person.category === '皇帝').length, 16);

  for (const name of requestedNames) {
    assert.equal(core.filter((person) => person.name === name).length, 1, `${name} must have exactly one core row`);
    const page = pages[name];
    assert.equal(page.readingMode, 'clear-biography');
    assert.match(page.slug, /^[a-z0-9-]+$/);
    assert.ok(page.scenes.length >= 4 && page.scenes.length <= 6, `${name} needs 4–6 scenes`);
    assert.ok(page.sources.length >= 1, `${name} needs at least one explicit source entry`);
    assert.ok(page.lead.length >= 80, `${name} needs a substantive lead`);
    assert.ok(page.thesis.length >= 80, `${name} needs a substantive thesis`);
    assert.ok(page.localEvidenceLinks?.institutionBoundary, `${name} needs an institution boundary`);
    for (const scene of page.scenes) {
      assert.equal(scene.body.length, 2, `${name} ${scene.title} must retain two evidence paragraphs`);
      assert.ok(scene.year.length >= 4 && /\d|待考/.test(scene.year), `${name} needs a historical time label`);
      assert.ok(/·|天命|天聪|崇德|崇祯|弘光|隆武|永历|绍武|顺治|康熙|天启|现代/.test(scene.reignYears), `${name} needs a reign-year label`);
      assert.ok(scene.title.length >= 12 && scene.preview.length >= 30, `${name} scene needs a narrative title and preview`);
      assert.ok(scene.body.every((paragraph) => paragraph.length >= 60), `${name} scene needs two substantive paragraphs`);
      assert.ok(scene.evidenceNote && scene.confidence && scene.interpretationBoundary);
      assert.ok(scene.primarySource?.title && scene.primarySource?.url && scene.primarySource?.boundary && (scene.primarySource?.original?.length || page.sourceExcerpt?.quote), `${name} needs a primary-source excerpt`);
    }
  }
});

test('绍武帝列为南明相继政权人物，不改变三主线与北京明廷十六帝', async () => {
  const [core, phases, branch] = await Promise.all([
    fs.readFile('data/ming_core.json', 'utf8').then(JSON.parse),
    fs.readFile('data/ming_political_phases.json', 'utf8').then(JSON.parse),
    fs.readFile('data/ming_southern_ming_branch.json', 'utf8').then(JSON.parse),
  ]);
  const shaowu = core.find((person) => person.name === '朱聿鐭');
  assert.equal(shaowu.category, '政权人物');
  assert.match(shaowu.alt, /绍武帝/);
  assert.equal(phases.people['朱聿鐭'][0].regime, '隆武');
  assert.deepEqual(branch.primary.map((item) => item.name), ['朱由崧', '朱聿键', '朱由榔']);
  assert.equal(core.filter((person) => person.category === '皇帝').length, 16);
});

test('陈圆圆和易代军事人物的解释不冒充为可证实的私人动机', async () => {
  const batch = JSON.parse(await fs.readFile('data/ming_person_pages_batch40_southern_ming_expansion.json', 'utf8'));
  for (const name of ['陈圆圆', '郑成功', '多铎', '孙可望', '李定国']) {
    const boundaries = batch.people[name].scenes.map((scene) => scene.interpretationBoundary).join(' ');
    assert.match(boundaries, sourceBoundary, `${name} needs an explicit interpretive boundary`);
  }
});
