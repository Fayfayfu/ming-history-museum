import fs from 'node:fs/promises';
import { validatePeopleTimelineData } from './lib/people_timeline.mjs';

const [core, children, timelineData] = await Promise.all([
  fs.readFile('data/ming_core.json', 'utf8').then(JSON.parse),
  fs.readFile('data/ming_children_important.json', 'utf8').then(JSON.parse),
  fs.readFile('data/ming_people_timeline.json', 'utf8').then(JSON.parse),
]);

const people = validatePeopleTimelineData({ core, children, timelineData });
const years = people.map((person) => person.timeline_year);
const approximate = people.filter((person) => /^约/.test(person.timeline_year_label)).length;
const featured = people
  .filter((person) => person.timeline_size === 'featured')
  .map((person) => person.name);

if (!['于谦', '王守仁', '张居正'].every((name) => featured.includes(name))) {
  throw new Error('于谦、王守仁、张居正必须为 featured');
}

console.log(
  `People timeline verified: ${people.length} people, ${Math.min(...years)}-${Math.max(...years)}, ${approximate} approximate.`,
);
