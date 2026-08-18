import fs from 'node:fs/promises';
import path from 'node:path';

const museumRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--deploy') || args.filter((arg) => arg === '--deploy').length > 1) {
  throw new Error('Usage: node scripts/verify_ming_people_on_demand_data.mjs [--deploy]');
}

const deploy = args.includes('--deploy');
const root = path.resolve(
  deploy
    ? process.env.MING_PEOPLE_ON_DEMAND_DEPLOY_ROOT || 'dist'
    : process.env.MING_PEOPLE_ON_DEMAND_ROOT || museumRoot,
);
const dataRoot = path.join(root, 'assets', 'data');
const idPattern = /^[a-z0-9-]+$/;
const requiredPersonFields = ['id', 'rowId', 'name', 'category', 'domains', 'institutionIds', 'detailUrl'];
const requiredEventFields = ['id', 'year', 'date', 'eraYear', 'title', 'stage', 'category', 'people', 'detailUrl'];

const fail = (message) => { throw new Error(`People on-demand data verification failed: ${message}`); };
const relative = (file) => path.relative(root, file).split(path.sep).join('/');
const exists = async (file) => fs.access(file).then(() => true).catch(() => false);
const readText = async (file) => {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (error) {
    fail(`missing output file ${relative(file)} (${error.code || error.message})`);
  }
};
const readJson = async (file) => {
  const text = await readText(file);
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`parse error in ${relative(file)}: ${error.message}`);
  }
};
const assert = (condition, message) => { if (!condition) fail(message); };
const normalized = (value) => String(value || '')
  .replaceAll('熾', '炽').replaceAll('鎮', '镇').replaceAll('鈺', '钰')
  .replaceAll('見', '见').replaceAll('載', '载').replaceAll('鈞', '钧')
  .replaceAll('檢', '检').replaceAll('權', '权').replaceAll('標', '标')
  .replaceAll('潤', '润').replace(/\s+/g, '');

function requiredFields(entry, fields, label) {
  assert(entry && typeof entry === 'object' && !Array.isArray(entry), `${label} must be an object`);
  for (const field of fields) {
    assert(Object.hasOwn(entry, field), `${label} is missing deep-link/filter field ${field}`);
  }
}

function uniqueIds(entries, label) {
  const ids = new Set();
  for (const entry of entries) {
    assert(typeof entry.id === 'string' && idPattern.test(entry.id), `${label} has invalid ID ${JSON.stringify(entry.id)}`);
    assert(!ids.has(entry.id), `duplicate ${label} ID ${entry.id}`);
    ids.add(entry.id);
  }
  return ids;
}

function detailPath(entry, directory, label) {
  assert(typeof entry.detailUrl === 'string', `${label} ${entry.id} is missing detailUrl`);
  const expected = `assets/data/${directory}/${entry.id}.json`;
  assert(entry.detailUrl === expected, `${label} ${entry.id} has unsafe or mismatched detailUrl ${entry.detailUrl}`);
  const resolved = path.resolve(root, entry.detailUrl);
  const expectedDirectory = path.resolve(dataRoot, directory);
  assert(path.dirname(resolved) === expectedDirectory, `${label} ${entry.id} detailUrl escapes its shard directory`);
  return resolved;
}

function collectImageReferences(value, references = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => collectImageReferences(item, references));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectImageReferences(item, references));
  else if (typeof value === 'string' && /^assets\/[^?#]+\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(value)) references.add(value);
  return references;
}

async function assertReferencedImagesExist(artifacts) {
  const references = new Set();
  artifacts.forEach((artifact) => collectImageReferences(artifact, references));
  for (const source of references) {
    const file = path.resolve(root, source);
    assert(file.startsWith(`${root}${path.sep}`), `image reference escapes output root: ${source}`);
    try {
      const stat = await fs.stat(file);
      assert(stat.isFile(), `referenced image is not a file: ${source}`);
    } catch (error) {
      if (error.message.startsWith('People on-demand')) throw error;
      fail(`broken image reference ${source} (${error.code || error.message})`);
    }
  }
  return references.size;
}

async function jsonShardNames(directory) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    fail(`missing detail directory ${relative(directory)} (${error.code || error.message})`);
  }
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).map((entry) => entry.name).sort();
}

if (deploy) {
  assert(await exists(path.join(dataRoot, 'people-index.json')), 'missing deployed assets/data/people-index.json');
}

const [peopleHtml, peopleArchiveHtml, eventsHtml, peopleIndex, eventsIndex] = await Promise.all([
  readText(path.join(root, 'people.html')),
  readText(path.join(root, 'people-archive.html')),
  readText(path.join(root, 'events.html')),
  readJson(path.join(dataRoot, 'people-index.json')),
  readJson(path.join(dataRoot, 'events-index.json')),
]);

if (deploy) {
  for (const entry of peopleIndex.people) {
    assert(await exists(path.join(root, entry.detailUrl)), `missing deployed ${entry.detailUrl}`);
  }
  for (const entry of eventsIndex.events) {
    assert(await exists(path.join(root, entry.detailUrl)), `missing deployed ${entry.detailUrl}`);
  }
}

assert(Buffer.byteLength(peopleHtml) < 430 * 1024, `people.html must be below 430 KiB (got ${Buffer.byteLength(peopleHtml)} bytes)`);
assert(
  /<noscript>[\s\S]*?href="people-archive\.html"/.test(peopleHtml),
  'people.html must link to people-archive.html inside noscript content',
);
for (const [name, html] of [['people.html', peopleHtml], ['events.html', eventsHtml]]) {
  for (const forbidden of ['"personPages"', '"historicalSlices"', '"storytelling"', '"creativeWorks"']) {
    assert(!html.includes(forbidden), `${name} contains forbidden inline payload key ${forbidden}`);
  }
  for (const forbidden of [/\b(?:const|let|var)\s+(?:personPages|historicalSlices|storytelling|creativeWorks)\s*=/]) {
    assert(!forbidden.test(html), `${name} contains forbidden inline data declaration ${forbidden}`);
  }
}

assert(Array.isArray(peopleIndex.people), 'people-index.json must contain a people array');
assert(Array.isArray(eventsIndex.events), 'events-index.json must contain an events array');
assert(Array.isArray(eventsIndex.stages), 'events-index.json must contain stages for event filtering');
for (const person of peopleIndex.people) {
  requiredFields(person, requiredPersonFields, `people index entry ${person?.id || '<unknown>'}`);
  assert(Array.isArray(person.domains), `people index entry ${person.id} domains must be an array`);
  assert(Array.isArray(person.institutionIds), `people index entry ${person.id} institutionIds must be an array`);
}
for (const event of eventsIndex.events) {
  requiredFields(event, requiredEventFields, `events index entry ${event?.id || '<unknown>'}`);
  assert(Array.isArray(event.people), `events index entry ${event.id} people must be an array`);
}

const personIds = uniqueIds(peopleIndex.people, 'person index');
const eventIds = uniqueIds(eventsIndex.events, 'event index');
const archiveRows = [...peopleArchiveHtml.matchAll(/<tr\s+data-id="([^"]+)"/g)].map((match) => match[1]);
assert(!/<script\b/i.test(peopleArchiveHtml), 'people-archive.html must not require JavaScript');
assert((peopleArchiveHtml.match(/<th\b/g) || []).length === 15, 'people-archive.html must retain all 15 roster columns');
assert(archiveRows.length === personIds.size, `people-archive.html record count differs from people index (${archiveRows.length} vs ${personIds.size})`);
assert(new Set(archiveRows).size === archiveRows.length, 'people-archive.html contains duplicate roster record IDs');
for (const requiredName of ['朱元璋', '于谦', '傅山', '王保保']) {
  assert(archiveRows.includes(requiredName), `people-archive.html is missing required readable record ${requiredName}`);
}
const [core, importantChildren, eventSource] = await Promise.all([
  readJson(path.resolve('data/ming_core.json')),
  readJson(path.resolve('data/ming_children_important.json')),
  readJson(path.resolve('data/ming_events.json')),
]);
const emperorNames = new Set(core.filter((person) => person.category === '皇帝').map((person) => normalized(person.name)));
const expectedPeople = [
  ...core,
  ...importantChildren.filter((person) => !emperorNames.has(normalized(person.name || person.title))),
];
const expectedPeopleByIdentity = new Map();
for (const person of expectedPeople) {
  const name = person.name || person.title;
  const identity = normalized(name);
  assert(identity, 'source person is missing a normalized identity');
  assert(!expectedPeopleByIdentity.has(identity), `duplicate normalized source person identity ${identity}`);
  expectedPeopleByIdentity.set(identity, name);
}
const expectedEventIds = new Set((eventSource.events || []).map((event) => event.id));
const peopleByIdentity = new Map();
for (const entry of peopleIndex.people) {
  const identity = normalized(entry.name);
  assert(!/^[ck]\d+$/.test(entry.id), `person ${entry.name} uses unstable ordinal ID ${entry.id}`);
  assert(!peopleByIdentity.has(identity), `people index contains duplicate normalized identity ${identity}`);
  peopleByIdentity.set(identity, entry);
}
assert(
  peopleByIdentity.size === expectedPeopleByIdentity.size
    && [...expectedPeopleByIdentity.keys()].every((identity) => peopleByIdentity.has(identity)),
  `person shard source-record identities differ (expected ${expectedPeopleByIdentity.size}, got ${peopleByIdentity.size})`,
);
assert(eventIds.size === expectedEventIds.size && [...expectedEventIds].every((id) => eventIds.has(id)), `event shard source-record count/IDs differ (expected ${expectedEventIds.size}, got ${eventIds.size})`);

const personDetails = [];
for (const entry of peopleIndex.people) {
  const file = detailPath(entry, 'people-details', 'person');
  const detail = await readJson(file);
  assert(detail.id === entry.id, `person detail ID mismatch in ${relative(file)} (expected ${entry.id}, got ${detail.id})`);
  assert(normalized(detail.drawer?.person?.name || detail.drawer?.person?.title) === normalized(entry.name), `person detail identity mismatch in ${relative(file)}`);
  if (detail.drawer?.personPage?.slug) {
    assert(entry.id === detail.drawer.personPage.slug, `person ${entry.name} must reuse independent-page slug ${detail.drawer.personPage.slug}`);
  } else {
    assert(entry.id.startsWith('person-'), `person ${entry.name} without an independent page must use a semantic derived ID`);
  }
  assert(entry.rowId === entry.id, `person ${entry.name} rowId must reuse its stable person ID`);
  personDetails.push(detail);
}
const eventDetails = [];
for (const entry of eventsIndex.events) {
  const file = detailPath(entry, 'event-details', 'event');
  const detail = await readJson(file);
  assert(detail.id === entry.id, `event detail ID mismatch in ${relative(file)} (expected ${entry.id}, got ${detail.id})`);
  eventDetails.push(detail);
}

const [personShardNames, eventShardNames] = await Promise.all([
  jsonShardNames(path.join(dataRoot, 'people-details')),
  jsonShardNames(path.join(dataRoot, 'event-details')),
]);
assert(personShardNames.length === personIds.size, `people detail shard count differs from people index (${personShardNames.length} vs ${personIds.size})`);
assert(eventShardNames.length === eventIds.size, `event detail shard count differs from event index (${eventShardNames.length} vs ${eventIds.size})`);
assert(personShardNames.every((name) => personIds.has(name.slice(0, -'.json'.length))), 'people detail directory contains an unindexed shard');
assert(eventShardNames.every((name) => eventIds.has(name.slice(0, -'.json'.length))), 'event detail directory contains an unindexed shard');

const imageReferences = await assertReferencedImagesExist([peopleIndex, eventsIndex, ...personDetails, ...eventDetails]);
console.log(JSON.stringify({
  status: 'ok',
  mode: deploy ? 'deploy' : 'output',
  root,
  peopleHtmlBytes: Buffer.byteLength(peopleHtml),
  people: { index: personIds.size, shards: personShardNames.length, archiveRows: archiveRows.length },
  events: { index: eventIds.size, shards: eventShardNames.length },
  imageReferences,
}));
