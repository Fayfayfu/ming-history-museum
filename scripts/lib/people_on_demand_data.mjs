import fs from 'node:fs/promises';
import path from 'node:path';

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

function stablePeople(core) {
  const ids = new Set();
  return core.map((person, index) => {
    const hasExplicitId = Object.hasOwn(person, 'id');
    const id = hasExplicitId ? requiredId(person.id, 'person') : `c${index}`;
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

function buildPersonDetail(id, person, input) {
  const name = person.name;
  return {
    id,
    drawer: {
      person: clone(person),
      storytelling: clone(peopleFor(input.storytelling)[name] || null),
      historicalSlice: clone(peopleFor(input.historicalSlices)[name] || null),
      creativeWorks: clone(peopleFor(input.creativeWorks)[name] || null),
      personPage: clone(peopleFor(input.personPages)[name] || null),
      emperorDrawerProfile: clone(drawerProfileFor(input.emperorDrawerProfiles, name)),
    },
  };
}

function buildEventIndexEntry(id, event) {
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
    confidence: event.confidence,
    detailUrl: `assets/data/event-details/${id}.json`,
  };
}

export function buildPeopleOnDemandData(input) {
  const people = stablePeople(input.core || []);
  const events = stableEvents(input.eventData?.events || []);
  const portraits = input.portraits?.people || input.portraits || {};
  const institutionIds = institutionIdsByPerson(input.institutionData);

  return {
    peopleIndex: {
      version: 1,
      people: people.map(({ id, person }) => ({
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
        detailUrl: `assets/data/people-details/${id}.json`,
      })),
    },
    peopleDetails: new Map(people.map(({ id, person }) => [id, buildPersonDetail(id, person, input)])),
    eventsIndex: {
      version: 1,
      stages: clone(input.eventData?.stages || []),
      events: events.map(({ id, event }) => buildEventIndexEntry(id, event)),
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

export async function emitPeopleOnDemandData(outDir, data) {
  const dataRoot = path.join(outDir, 'assets', 'data');
  const peopleDetailDir = path.join(dataRoot, 'people-details');
  const eventDetailDir = path.join(dataRoot, 'event-details');
  await fs.mkdir(peopleDetailDir, { recursive: true });
  await fs.mkdir(eventDetailDir, { recursive: true });
  await removeStaleJsonFiles(peopleDetailDir);
  await removeStaleJsonFiles(eventDetailDir);

  await fs.writeFile(path.join(dataRoot, 'people-index.json'), JSON.stringify(data.peopleIndex));
  await fs.writeFile(path.join(dataRoot, 'events-index.json'), JSON.stringify(data.eventsIndex));
  for (const [id, detail] of data.peopleDetails) {
    await fs.writeFile(path.join(peopleDetailDir, `${id}.json`), JSON.stringify(detail));
  }
  for (const [id, detail] of data.eventDetails) {
    await fs.writeFile(path.join(eventDetailDir, `${id}.json`), JSON.stringify(detail));
  }
}
