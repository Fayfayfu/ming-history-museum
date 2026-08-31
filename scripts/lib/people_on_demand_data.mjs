import fs from 'node:fs/promises';
import path from 'node:path';
import {buildPersonSearchIndex, buildSearchIndex} from './person_search.mjs';

const clone = (value) => structuredClone(value);
const peopleFor = (source) => source?.people || {};

function institutionIdsByPerson(institutionData) {
  const ids = new Map();
  for (const institution of institutionData?.institutions || []) {
    if (typeof institution.id !== 'string' || !institution.id) continue;
    for (const person of institution.people || []) {
      if (!person?.name) continue;
      const personIds = ids.get(person.name) || [];
      if (!personIds.includes(institution.id)) personIds.push(institution.id);
      ids.set(person.name, personIds);
    }
  }
  return ids;
}

function drawerProfileFor(source, name) {
  return source?.identities?.[name] || source?.people?.[name] || null;
}

function requiredId(id, label) {
  if (typeof id !== 'string' || !id.trim()) throw new Error(`Missing ${label} ID`);
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid ${label} ID: ${id}`);
  return id;
}

const personIdentityReplacements = new Map([
  ['熾', '炽'], ['鎮', '镇'], ['鈺', '钰'], ['見', '见'], ['載', '载'],
  ['鈞', '钧'], ['檢', '检'], ['權', '权'], ['標', '标'], ['潤', '润'],
]);

export function normalizePersonIdentity(value) {
  const identity = String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toLocaleLowerCase('en-US');
  if (!identity) throw new Error('Missing person identity name');
  return [...identity].map((character) => personIdentityReplacements.get(character) || character).join('');
}

function encodedIdentitySlug(identity) {
  const chunks = [];
  let ascii = '';
  const flushAscii = () => {
    if (!ascii) return;
    chunks.push(ascii.replace(/^-+|-+$/g, '').replace(/-+/g, '-'));
    ascii = '';
  };
  for (const character of identity) {
    if (/^[a-z0-9-]$/.test(character)) {
      ascii += character;
      continue;
    }
    flushAscii();
    chunks.push(`u${character.codePointAt(0).toString(16)}`);
  }
  flushAscii();
  const encoded = chunks.filter(Boolean).join('-');
  if (!encoded) throw new Error(`Cannot derive person ID from identity: ${identity}`);
  return requiredId(`person-${encoded}`, 'person');
}

function personPageSlugsByIdentity(personPages) {
  const slugs = new Map();
  for (const [name, page] of Object.entries(peopleFor(personPages))) {
    if (!page?.slug) continue;
    const identity = normalizePersonIdentity(name);
    const slug = requiredId(page.slug, 'person page');
    if (slugs.has(identity) && slugs.get(identity) !== slug) {
      throw new Error(`Duplicate person page identity: ${identity}`);
    }
    slugs.set(identity, slug);
  }
  return slugs;
}

function stablePeople(core, personPages) {
  const ids = new Set();
  const identities = new Set();
  const independentSlugs = personPageSlugsByIdentity(personPages);
  return core.map((person) => {
    const identity = normalizePersonIdentity(person?.name || person?.title);
    if (identities.has(identity)) throw new Error(`Duplicate normalized person identity: ${identity}`);
    identities.add(identity);
    const hasExplicitId = Object.hasOwn(person, 'id');
    if (hasExplicitId && !String(person.id || '').trim()) requiredId(person.id, 'person');
    const explicitId = hasExplicitId ? requiredId(person.id, 'person') : '';
    if (/^[ck]\d+$/.test(explicitId)) throw new Error(`Ordinal person ID is not stable: ${explicitId}`);
    const independentSlug = independentSlugs.get(identity) || '';
    if (explicitId && independentSlug && explicitId !== independentSlug) {
      throw new Error(`Person ID must reuse independent-page slug for ${identity}: ${independentSlug}`);
    }
    const id = independentSlug || explicitId || encodedIdentitySlug(identity);
    if (ids.has(id)) throw new Error(`Duplicate person ID: ${id}`);
    ids.add(id);
    return { id, person };
  });
}

function stableEvents(events) {
  const ids = new Set();
  return events.map((event) => {
    const id = requiredId(event.id, 'event');
    if (ids.has(id)) throw new Error(`Duplicate event ID: ${id}`);
    ids.add(id);
    return { id, event };
  });
}

function politicalPhasesFor(input, name, includeSourceIds = false) {
  const phases = input.politicalPhaseData?.people?.[name] || [];
  return phases.map((phase) => {
    const projected = {
      regime: phase.regime,
      start: phase.start,
      end: phase.end,
      role: phase.role,
      confidence: phase.confidence,
    };
    if (phase.tenure) projected.tenure = phase.tenure;
    if (phase.sovereigns) projected.sovereigns = phase.sovereigns;
    if (Array.isArray(phase.institutions) && phase.institutions.length) {
      projected.institutions = clone(phase.institutions);
    }
    if (includeSourceIds) projected.sourceIds = clone(phase.sourceIds || []);
    return projected;
  });
}

function buildPersonDetail(id, person, input) {
  const name = person.name;
  const politicalPhases = politicalPhasesFor(input, name, true);
  return {
    id,
    drawer: {
      person: clone(person),
      storytelling: clone(peopleFor(input.storytelling)[name] || null),
      historicalSlice: clone(peopleFor(input.historicalSlices)[name] || null),
      creativeWorks: clone(peopleFor(input.creativeWorks)[name] || null),
      personPage: clone(peopleFor(input.personPages)[name] || null),
      emperorDrawerProfile: clone(drawerProfileFor(input.emperorDrawerProfiles, name)),
      ...(politicalPhases.length ? { politicalPhases } : {}),
    },
  };
}

function buildEventIndexEntry(id, event, personAliases) {
  const searchTerms = [
    event.title,
    event.emperor,
    event.location,
    event.category,
    ...(event.people || []).flatMap((name) => personAliases.get(name) || [name]),
    ...(event.institutions || []),
  ];
  return {
    id,
    year: event.year,
    date: event.date,
    eraDate: event.eraDate,
    title: event.title,
    stage: event.stage,
    category: event.category,
    emperor: event.emperor,
    location: event.location,
    people: clone(event.people || []),
    institutions: clone(event.institutions || []),
    search: buildSearchIndex(searchTerms),
    confidence: event.confidence,
    detailUrl: `assets/data/event-details/${id}.json`,
  };
}

export function buildPeopleOnDemandData(input) {
  const people = stablePeople(input.core || [], input.personPages);
  const events = stableEvents(input.eventData?.events || []);
  const portraits = input.portraits?.people || input.portraits || {};
  const institutionIds = institutionIdsByPerson(input.institutionData);
  const personAliases = new Map((input.core || []).map((person) => [
    person.name || person.title,
    [person.name, person.alt, person.title].filter(Boolean),
  ]));

  return {
    peopleIndex: {
      version: 1,
      people: people.map(({ id, person }) => {
        const search = buildPersonSearchIndex(person).search;
        const politicalPhases = politicalPhasesFor(input, person.name);
        return {
          id,
          name: person.name,
          category: person.category,
          office: person.office,
          birth: person.birth,
          death: person.death,
          domains: clone(person.domains || []),
          institutionIds: clone(
            input.institutionData?.institutions
              ? institutionIds.get(person.name) || []
              : input.personInstitutionIds?.[person.name] || [],
          ),
          portrait: clone(portraits[person.name] || null),
          search: clone(search),
          detailUrl: `assets/data/people-details/${id}.json`,
          ...(politicalPhases.length ? { politicalPhases } : {}),
        };
      }),
    },
    peopleDetails: new Map(people.map(({ id, person }) => [id, buildPersonDetail(id, person, input)])),
    eventsIndex: {
      version: 1,
      stages: clone(input.eventData?.stages || []),
      events: events.map(({ id, event }) => buildEventIndexEntry(id, event, personAliases)),
    },
    eventDetails: new Map(events.map(({ id, event }) => [id, { ...clone(event), id }])),
  };
}

async function removeStaleJsonFiles(detailDir) {
  let entries;
  try {
    entries = await fs.readdir(detailDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => fs.unlink(path.join(detailDir, entry.name))));
}

function validatedDetailId(id, detail, label) {
  const shardId = requiredId(id, label);
  const detailId = requiredId(detail?.id, `${label} detail`);
  if (detailId !== shardId) throw new Error(`Mismatched ${label} detail ID: ${detailId}`);
  return shardId;
}

function validatedDetailEntries(details, label) {
  return [...details].map(([id, detail]) => [validatedDetailId(id, detail, label), detail]);
}

export async function emitPeopleOnDemandData(outDir, data) {
  const peopleDetails = validatedDetailEntries(data.peopleDetails, 'person');
  const eventDetails = validatedDetailEntries(data.eventDetails, 'event');
  const dataRoot = path.join(outDir, 'assets', 'data');
  const peopleDetailDir = path.join(dataRoot, 'people-details');
  const eventDetailDir = path.join(dataRoot, 'event-details');
  await fs.mkdir(peopleDetailDir, { recursive: true });
  await fs.mkdir(eventDetailDir, { recursive: true });
  await removeStaleJsonFiles(peopleDetailDir);
  await removeStaleJsonFiles(eventDetailDir);

  await fs.writeFile(path.join(dataRoot, 'people-index.json'), JSON.stringify(data.peopleIndex));
  await fs.writeFile(path.join(dataRoot, 'events-index.json'), JSON.stringify(data.eventsIndex));
  for (const [id, detail] of peopleDetails) {
    const shardId = validatedDetailId(id, detail, 'person');
    await fs.writeFile(path.join(peopleDetailDir, `${shardId}.json`), JSON.stringify(detail));
  }
  for (const [id, detail] of eventDetails) {
    const shardId = validatedDetailId(id, detail, 'event');
    await fs.writeFile(path.join(eventDetailDir, `${shardId}.json`), JSON.stringify(detail));
  }
}
