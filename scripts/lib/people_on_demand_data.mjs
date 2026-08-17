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
