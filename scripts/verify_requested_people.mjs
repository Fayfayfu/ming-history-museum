import fs from 'node:fs/promises';

const expected = new Map([
  ['何心隐', '在野人物'],
  ['陆炳', '武官'],
  ['纪纲', '武官'],
  ['蒋瓛', '武官'],
  ['田尔耕', '武官'],
  ['钱宁', '武官']
]);
const jinyiweiNames = new Set(['陆炳', '纪纲', '蒋瓛', '田尔耕', '钱宁']);

const core = JSON.parse(await fs.readFile('data/ming_core.json', 'utf8'));
const institutions = JSON.parse(await fs.readFile('data/ming_person_institutions.json', 'utf8'));
const portraits = JSON.parse(await fs.readFile('data/ming_portraits.json', 'utf8'));
const builtPeoplePath = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/people.html';
let builtPeople = '';
try {
  builtPeople = await fs.readFile(builtPeoplePath, 'utf8');
} catch {
  // A missing build is reported by the assertions below.
}
let slices = {people: {}};
try {
  slices = JSON.parse(await fs.readFile('data/ming_historical_slices_batch9.json', 'utf8'));
} catch {
  // Missing batch is reported by the assertions below.
}

const failures = [];
for (const [name, category] of expected) {
  const matches = core.filter(person => person.name === name);
  if (matches.length !== 1) {
    failures.push(`${name}: expected exactly one formal card, found ${matches.length}`);
    continue;
  }
  const person = matches[0];
  if (person.category !== category) failures.push(`${name}: expected category ${category}, got ${person.category}`);
  for (const field of ['office', 'summary', 'evaluation', 'confidence', 'source1', 'source2']) {
    if (!person[field]) failures.push(`${name}: missing ${field}`);
  }
  if (!Array.isArray(person.domains) || person.domains.length < 2) failures.push(`${name}: domains must contain at least two entries`);
  if (!slices.people?.[name]) failures.push(`${name}: missing historical slice in batch9`);
  if (!builtPeople.includes(`\"name\":\"${name}\"`)) failures.push(`${name}: missing from built people.html dataset`);
  const portrait = portraits.people?.[name];
  if (portrait?.status !== 'imagined') failures.push(`${name}: portrait status must be imagined`);
  if (portrait?.portraitKind !== 'AI想象像' || portrait?.confidence !== '未知') failures.push(`${name}: portrait must be labeled AI想象像 · 未知置信度`);
  if (!portrait?.note?.includes('艺术想象')) failures.push(`${name}: portrait note must state the artistic-imagination boundary`);
  if (!portrait?.file) {
    failures.push(`${name}: portrait file is missing from metadata`);
  } else {
    try {
      await fs.access(`outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/${portrait.file}`);
    } catch {
      failures.push(`${name}: portrait asset does not exist at ${portrait.file}`);
    }
    try {
      await fs.access(`outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/${portrait.file}`);
    } catch {
      failures.push(`${name}: portrait asset is missing from the built museum at ${portrait.file}`);
    }
    if (!builtPeople.includes(`\"file\":\"${portrait.file}\"`)) failures.push(`${name}: portrait metadata is missing from built people.html`);
  }
}

const jinyiwei = institutions.institutions?.find(item => item.id === 'jinyiwei');
if (!jinyiwei) {
  failures.push('missing jinyiwei institution');
} else {
  const linked = new Set(jinyiwei.people?.map(person => person.name));
  for (const name of jinyiweiNames) {
    if (!linked.has(name)) failures.push(`${name}: missing jinyiwei institution link`);
  }
  if (linked.has('何心隐')) failures.push('何心隐: must not be linked to jinyiwei');
}

if (failures.length) {
  console.error(`Requested people verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Requested people verification passed: 6 formal cards, 6 portraits, 6 slices, 5 jinyiwei links.');
