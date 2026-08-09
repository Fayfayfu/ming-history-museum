import fs from 'node:fs';
import path from 'node:path';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const core = readJson('data/ming_core.json');
const children = readJson('data/ming_children_important.json');
const portraits = readJson('data/ming_portraits.json').people ?? {};
const storytelling = readJson('data/ming_storytelling.json').people ?? {};
const assetRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9';

const canonicalName = value => String(value ?? '')
  .replaceAll('熾', '炽')
  .replaceAll('鎮', '镇')
  .replaceAll('鈺', '钰')
  .replaceAll('見', '见')
  .replaceAll('載', '载')
  .replaceAll('鈞', '钧')
  .replaceAll('檢', '检')
  .replace(/\s+/g, '');

const coreNames = new Set(core.map(person => canonicalName(person.name)));
const displayedChildren = children.filter(person => !coreNames.has(canonicalName(person.name)));
const displayedNames = [...new Set([
  ...core.map(person => person.name),
  ...displayedChildren.map(person => person.name),
])];

function portraitFor(name) {
  const stored = portraits[name];
  if (stored?.file) {
    return {
      file: stored.file,
      kind: stored.status === 'imagined' || stored.portraitKind === 'AI想象像'
        ? 'AI想象像'
        : '史料或传世图像',
    };
  }
  const imagined = storytelling[name]?.portrait;
  return imagined ? {file: imagined, kind: 'AI想象像'} : null;
}

const rows = displayedNames.map(name => {
  const portrait = portraitFor(name);
  return {
    name,
    kind: portrait?.kind ?? '缺失',
    file: portrait?.file ?? '',
    fileExists: portrait ? fs.existsSync(path.join(assetRoot, portrait.file)) : false,
    scope: coreNames.has(canonicalName(name)) ? '正式人物卡' : '重要皇嗣',
  };
});

const missingRegistry = rows.filter(row => row.kind === '缺失');
const missingFiles = rows.filter(row => row.kind !== '缺失' && !row.fileExists);
const counts = rows.reduce((acc, row) => {
  acc[row.kind] = (acc[row.kind] ?? 0) + 1;
  return acc;
}, {});

console.log(`展示人物（按姓名去重）：${rows.length}`);
console.log(`正式人物卡：${core.length}；重要皇嗣独立人物：${displayedChildren.length}`);
console.log(`史料或传世图像：${counts['史料或传世图像'] ?? 0}`);
console.log(`AI想象像：${counts['AI想象像'] ?? 0}`);
console.log(`画像缺失：${missingRegistry.length}`);
console.log(`登记但文件缺失：${missingFiles.length}`);

if (missingRegistry.length) {
  console.log('\n画像缺失名单：');
  for (const row of missingRegistry) console.log(`- ${row.name}（${row.scope}）`);
}

if (missingFiles.length) {
  console.log('\n登记但文件缺失：');
  for (const row of missingFiles) console.log(`- ${row.name}: ${row.file}`);
  process.exitCode = 1;
}
