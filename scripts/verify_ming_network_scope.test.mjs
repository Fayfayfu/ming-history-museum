import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';
import test from 'node:test';

const source = await fs.readFile('scripts/build_ming_network.mjs', 'utf8');
const core = JSON.parse(await fs.readFile('data/ming_core.json', 'utf8'));
const execFileAsync = promisify(execFile);
const networkDir = 'data/diagram';
const networkData = `${networkDir}/明史人物关系网.data.json`;
const networkSvg = `${networkDir}/明史人物关系网.svg`;
const beijingMingEmperors = ['朱元璋','朱允炆','朱棣','朱高炽','朱瞻基','朱祁镇','朱祁钰','朱见深','朱祐樘','朱厚照','朱厚熜','朱载坖','朱翊钧','朱常洛','朱由校','朱由检'];
const years = value => String(value ?? '').match(/\d{4}/g)?.map(Number) || [];

test('relationship network uses the shared 1368—1664 scope instead of silently truncating at 1644', () => {
  assert.match(source, /import\s*\{\s*MUSEUM_BOUNDARIES\s*,\s*MUSEUM_TIMELINE_SCOPE\s*\}\s*from\s*['"]\.\/lib\/museum_temporal_scope\.mjs['"]/);
  assert.doesNotMatch(source, /Math\.min\(1644,\s*centralYear\(n\)\)/);
  assert.doesNotMatch(source, /\(1644\s*-\s*1368\)/);
  assert.match(source, /MUSEUM_TIMELINE_SCOPE\.end/);
  assert.match(source, /南明延续政权/);
  assert.match(source, /北京明廷覆亡/);
  assert.match(source, /永历政权终局/);
  assert.match(source, /夔东抵抗终局/);
  assert.doesNotMatch(source, /129 NODES/);
});

test('relationship network preserves the 16-ruler Beijing Ming spine and never creates a 17th through 19th emperor', () => {
  assert.match(source, /const emperorOrder\s*=\s*\[/);
  assert.match(source, /const southernMingBranch/);
  assert.doesNotMatch(source, /第(?:17|18|19)帝|17位皇帝|18位皇帝|19位皇帝/);
});

test('generated network artifact anchors the Beijing Ming spine to 1644 while retaining the Southern Ming 1662 branch', async () => {
  await execFileAsync(process.execPath, ['scripts/build_ming_network.mjs']);
  const data = JSON.parse(await fs.readFile(networkData, 'utf8'));
  const svg = await fs.readFile(networkSvg, 'utf8');
  const boundaryX = data.meta.coordinates.boundaries;
  const chongzhen = data.nodes.find(node => node.name === '朱由检');

  assert.equal(data.meta.nodes, 200);
  assert.equal(data.meta.roleCounts.emperor, 16);
  assert.equal(data.meta.roleCounts.southern, 3);
  assert.equal(data.meta.coordinates.beijingMingSpine.end, boundaryX['1644']);
  assert.equal(data.meta.coordinates.southernMingBranch.end, boundaryX['1662']);
  assert.ok(chongzhen.x <= boundaryX['1644'], `崇祯坐标 ${chongzhen.x} 不得晚于 1644 断点 ${boundaryX['1644']}`);
  for (const name of beijingMingEmperors) {
    const sourcePerson = core.find(person => person.name === name);
    const node = data.nodes.find(person => person.name === name);
    const starts = years(sourcePerson.office_start);
    const ends = years(sourcePerson.office_end);
    const reignMidpoint = (Math.min(...starts) + Math.max(...ends)) / 2;
    const expectedX = 150 + ((reignMidpoint - 1368) / (1664 - 1368)) * (5050 - 150);
    assert.equal(node.x, +expectedX.toFixed(1), `${name} 必须按实际在位年份锚定`);
  }
  assert.match(svg, /aria-label="era spine"><line x1="150" y1="1420" x2="[\d.]+"/);
  assert.match(svg, /1644 · 北京明廷覆亡/);
  assert.match(svg, /1662 · 永历政权终局/);
  assert.match(svg, /1664 · 夔东抵抗终局/);

  for (const node of data.nodes.filter((item) => item.subtype === '政权人物' && !['朱由崧', '朱聿键', '朱由榔'].includes(item.name))) {
    assert.equal(node.role, 'regime', `${node.name} must not fall back to the royal network role`);
  }
  for (const node of data.nodes.filter((item) => item.subtype === '域外人物')) {
    assert.equal(node.role, 'foreign', `${node.name} must not fall back to the royal network role`);
  }
  for (const name of ['朱由崧', '朱聿键', '朱由榔']) {
    assert.equal(data.nodes.find((node) => node.name === name)?.role, 'southern', `${name} must remain a Southern Ming branch node`);
  }
  for (const [name, regimes] of Object.entries({ 洪承畴: ['明', '清'], 吴三桂: ['明', '清'], 傅山: ['明', '遗民'] })) {
    const node = data.nodes.find((item) => item.name === name);
    assert.deepEqual(node?.politicalPhases?.map((phase) => phase.regime), regimes, `${name} must retain readable cross-regime phases in network data`);
    assert.match(svg, new RegExp(`${name}｜[^<]*政权阶段[^<]*${regimes.join('.*')}`), `${name} network label must expose political progression`);
  }

  const names = await fs.readdir(networkDir);
  assert.ok(!names.some(name => name.startsWith('明史129人物关系网')), '版本化关系网不得保留旧的 129 人命名');
});
