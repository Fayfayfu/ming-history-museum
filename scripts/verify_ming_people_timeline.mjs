import fs from 'node:fs/promises';
import { MUSEUM_BOUNDARIES, MUSEUM_TIMELINE_SCOPE } from './lib/museum_temporal_scope.mjs';
import { layoutPeopleTimeline, validatePeopleTimelineData } from './lib/people_timeline.mjs';

const ALLOWED_SOURCE_KINDS = new Set([
  '正史',
  '实录',
  '人物著作',
  '博物馆',
  '博物馆研究',
  '专业机构',
  '专业数据库',
  '学术论文',
  '档案机构',
  '史传',
  '科举原始文献',
  '地方政府',
  '地方文史',
  '地方文史机构',
  '地方纪检文史',
]);

const AUTHORITATIVE_SOURCE_KINDS = new Set([
  '正史',
  '实录',
  '人物著作',
  '博物馆',
  '博物馆研究',
  '专业机构',
  '专业数据库',
  '学术论文',
  '档案机构',
  '史传',
  '科举原始文献',
]);

const FEATURED_ANCHORS = [
  { name: '于谦', year: 1421, source: 'MS170' },
  { name: '王守仁', year: 1499, source: 'MS195' },
  { name: '张居正', year: 1547, source: 'MS213' },
];

const [core, children, timelineData] = await Promise.all([
  fs.readFile('data/ming_core.json', 'utf8').then(JSON.parse),
  fs.readFile('data/ming_children_important.json', 'utf8').then(JSON.parse),
  fs.readFile('data/ming_people_timeline.json', 'utf8').then(JSON.parse),
]);

const people = validatePeopleTimelineData({ core, children, timelineData });
const years = people.map((person) => person.timeline_year);
const approximate = people.filter((person) => /^约/.test(person.timeline_year_label)).length;
const failures = [];

// The curated source roster is 154 core people plus 24 non-duplicate important children.
// Keep this fixed contract so a self-consistent accidental source deletion cannot lower the gate.
const expectedPeopleCount = 178;
if (people.length !== expectedPeopleCount) failures.push(`timeline must contain exactly ${expectedPeopleCount} people; got ${people.length}`);

const emperors = people.filter((person) => person.timeline_size === 'emperor');
if (emperors.length !== 16) {
  failures.push(`timeline must contain exactly 16 emperors; got ${emperors.length}`);
}

if (failures.length) {
  throw new Error(failures.join('\n'));
}

const layout = layoutPeopleTimeline(people);

const boundaryYears = layout.boundaries.map((boundary) => boundary.year);
for (const boundary of MUSEUM_BOUNDARIES) {
  if (!boundaryYears.includes(boundary.year)) {
    failures.push(`timeline layout must render boundary ${boundary.year} (${boundary.label})`);
  }
}
if (layout.maxYear !== MUSEUM_TIMELINE_SCOPE.end) {
  failures.push(`timeline layout must end at ${MUSEUM_TIMELINE_SCOPE.end}; got ${layout.maxYear}`);
}

for (const [sourceId, source] of Object.entries(timelineData.source_catalog)) {
  if (!ALLOWED_SOURCE_KINDS.has(source.kind)) {
    failures.push(`source kind not allowed: ${source.kind} (${sourceId})`);
  }
}

for (const anchor of FEATURED_ANCHORS) {
  const person = people.find((candidate) => candidate.name === anchor.name);
  if (
    !person ||
    person.timeline_year !== anchor.year ||
    person.timeline_size !== 'featured' ||
    !person.timeline_source_refs.includes(anchor.source)
  ) {
    failures.push(
      `${anchor.name} anchor must remain ${anchor.year}, featured, with source ${anchor.source}`,
    );
  }
}

for (const person of people) {
  const sources = person.timeline_source_refs.map(
    (sourceId) => timelineData.source_catalog[sourceId],
  );
  if (!sources.some((source) => AUTHORITATIVE_SOURCE_KINDS.has(source.kind))) {
    failures.push(`${person.name} must cite an authoritative source`);
  }

  const isApproximate = /^约/.test(person.timeline_year_label);
  const range = person.timeline_year_range;
  if (isApproximate) {
    if (
      !range ||
      !Number.isInteger(range.start) ||
      !Number.isInteger(range.end) ||
      range.start > range.end
    ) {
      failures.push(`${person.name}: approximate label requires timeline_year_range`);
      continue;
    }

    const midpoint = Math.round((range.start + range.end) / 2);
    if (person.timeline_year !== midpoint) {
      failures.push(`${person.name}: timeline_year must equal the rounded midpoint ${midpoint}`);
    }

    const rangeLabel = range.start === range.end
      ? `约${range.start}`
      : `约${range.start}—${range.end}`;
    if (person.timeline_year_label !== rangeLabel) {
      failures.push(`${person.name}: range label must be ${rangeLabel}`);
    }

    if (!['中', '低', '未知'].includes(person.timeline_year_confidence)) {
      failures.push(`${person.name}: approximate confidence cannot be 高`);
    }
  } else {
    if (range !== undefined) {
      failures.push(`${person.name}: exact year must not include timeline_year_range`);
    }
    if (person.timeline_year_label !== String(person.timeline_year)) {
      failures.push(`${person.name}: exact year label must equal timeline_year`);
    }
  }
}

if (failures.length) {
  throw new Error(failures.join('\n'));
}

console.log(
  `People timeline verified: ${people.length} people, layout ${layout.minYear}-${layout.maxYear}, people ${Math.min(...years)}-${Math.max(...years)}, ${approximate} approximate.`,
);
