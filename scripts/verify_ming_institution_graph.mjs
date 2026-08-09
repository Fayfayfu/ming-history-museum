import fs from 'node:fs/promises';

const graphPath = 'data/ming_institution_graph.json';
let graph;
try {
  graph = JSON.parse(await fs.readFile(graphPath, 'utf8'));
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.error(`Institution graph verification failed (1):\n- missing ${graphPath}`);
    process.exit(1);
  }
  throw error;
}
const failures = [];

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const duplicateIds = values => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
const validConfidence = new Set(['高', '中高', '中', '低', '未知']);
const publishableRelationConfidence = new Set(['高', '中高']);
const validRelationTypes = new Set([
  'formal_subordination',
  'direct_imperial_control',
  'document_flow',
  'supervision_review',
  'military_coordination',
  'operational_coordination',
  'special_imperial_mandate'
]);

expect(graph.meta?.version === '0.1', 'meta.version must be 0.1');
expect(graph.meta?.status === 'content-baseline', 'meta.status must be content-baseline');
expect(Array.isArray(graph.phases) && graph.phases.length === 4, 'expected exactly 4 macro phases');
expect(Array.isArray(graph.systems) && graph.systems.length === 6, 'expected exactly 6 systems');
expect(Array.isArray(graph.institutions) && graph.institutions.length === 29, 'expected exactly 29 P0 institution nodes');
expect(Array.isArray(graph.relations) && graph.relations.length === 47, 'expected exactly 47 P0 relations');
expect(Array.isArray(graph.views) && graph.views.length === 6, 'expected 1 overview plus 5 topic views');
expect(Array.isArray(graph.sources) && graph.sources.length === 16, 'expected exactly 16 baseline sources');

for (const [label, values] of [
  ['phase', graph.phases || []],
  ['system', graph.systems || []],
  ['institution', graph.institutions || []],
  ['relation', graph.relations || []],
  ['view', graph.views || []],
  ['source', graph.sources || []]
]) {
  const ids = values.map(item => item.id);
  expect(ids.every(Boolean), `${label} entries must all have ids`);
  const duplicates = duplicateIds(ids);
  expect(duplicates.length === 0, `${label} ids must be unique: ${duplicates.join(', ')}`);
}

const phaseIds = new Set((graph.phases || []).map(item => item.id));
const systemIds = new Set((graph.systems || []).map(item => item.id));
const institutionIds = new Set((graph.institutions || []).map(item => item.id));
const relationIds = new Set((graph.relations || []).map(item => item.id));
const sourceIds = new Set((graph.sources || []).map(item => item.id));

for (const phase of graph.phases || []) {
  expect(Number.isInteger(phase.start) && Number.isInteger(phase.end) && phase.start <= phase.end, `${phase.id}: invalid phase interval`);
  expect(Number.isInteger(phase.default_year) && phase.default_year >= phase.start && phase.default_year <= phase.end, `${phase.id}: default_year outside phase`);
  expect(Array.isArray(phase.key_years) && phase.key_years.every(year => Number.isInteger(year) && year >= phase.start && year <= phase.end), `${phase.id}: invalid key_years`);
}

const checkPeriods = (owner, periods) => {
  expect(Array.isArray(periods) && periods.length > 0, `${owner}: active_periods must be non-empty`);
  for (const period of periods || []) {
    expect(Number.isInteger(period.start) && Number.isInteger(period.end) && period.start <= period.end, `${owner}: invalid active period`);
    expect(validConfidence.has(period.confidence), `${owner}: invalid period confidence ${period.confidence}`);
  }
};

for (const institution of graph.institutions || []) {
  expect(institution.name, `${institution.id}: missing name`);
  expect(systemIds.has(institution.system), `${institution.id}: unknown system ${institution.system}`);
  expect(['institution', 'role', 'group'].includes(institution.node_type), `${institution.id}: invalid node_type ${institution.node_type}`);
  expect(institution.summary, `${institution.id}: missing summary`);
  expect(institution.boundary, `${institution.id}: missing boundary`);
  expect(validConfidence.has(institution.confidence), `${institution.id}: invalid confidence ${institution.confidence}`);
  checkPeriods(institution.id, institution.active_periods);
  expect(Array.isArray(institution.source_ids) && institution.source_ids.length > 0, `${institution.id}: missing source_ids`);
  for (const sourceId of institution.source_ids || []) expect(sourceIds.has(sourceId), `${institution.id}: unknown source ${sourceId}`);
}

for (const relation of graph.relations || []) {
  expect(institutionIds.has(relation.from), `${relation.id}: unknown from node ${relation.from}`);
  expect(institutionIds.has(relation.to), `${relation.id}: unknown to node ${relation.to}`);
  expect(relation.from !== relation.to, `${relation.id}: self-relations are not allowed`);
  expect(validRelationTypes.has(relation.type), `${relation.id}: invalid relation type ${relation.type}`);
  expect(relation.label, `${relation.id}: missing label`);
  expect(publishableRelationConfidence.has(relation.confidence), `${relation.id}: relation confidence must be 高 or 中高`);
  checkPeriods(relation.id, relation.active_periods);
  expect(Array.isArray(relation.source_ids) && relation.source_ids.length > 0, `${relation.id}: missing source_ids`);
  for (const sourceId of relation.source_ids || []) expect(sourceIds.has(sourceId), `${relation.id}: unknown source ${sourceId}`);
}

for (const view of graph.views || []) {
  expect(['overview', 'topic'].includes(view.type), `${view.id}: invalid view type ${view.type}`);
  expect(Array.isArray(view.institution_ids) && view.institution_ids.length > 0, `${view.id}: missing institution_ids`);
  for (const id of view.institution_ids || []) expect(institutionIds.has(id), `${view.id}: unknown institution ${id}`);
  expect(Array.isArray(view.relation_ids), `${view.id}: relation_ids must be an array`);
  for (const id of view.relation_ids || []) expect(relationIds.has(id), `${view.id}: unknown relation ${id}`);
}

const requiredExistingIds = new Set([
  'grand_secretariat',
  'censorate',
  'ministry_personnel',
  'ministry_revenue',
  'ministry_rites',
  'ministry_war',
  'ministry_justice',
  'ministry_works',
  'directorate_ceremonial',
  'embroidered_uniform_guard',
  'eastern_depot',
  'western_depot'
]);
for (const id of requiredExistingIds) expect(institutionIds.has(id), `missing current-product institution mapping ${id}`);

const westernDepot = (graph.institutions || []).find(item => item.id === 'western_depot');
expect(westernDepot?.active_periods?.length === 2, 'western_depot must have two high-level activity ranges');
expect(westernDepot?.active_periods?.[0]?.state === 'intermittent', 'western_depot first range must be intermittent');
expect(westernDepot?.active_periods?.[0]?.exact_intervals_verified === false, 'western_depot must not fabricate exact Chenghua intervals');
expect(westernDepot?.active_periods?.[1]?.state === 'reopened', 'western_depot second range must be marked reopened');

const secretariat = (graph.institutions || []).find(item => item.id === 'central_secretariat');
const chancellor = (graph.institutions || []).find(item => item.id === 'chancellor');
expect(secretariat?.active_periods?.[0]?.end === 1379, 'central_secretariat product state must end in 1379');
expect(chancellor?.active_periods?.[0]?.end === 1379, 'chancellor product state must end in 1379');

const compositeEndpointPattern = /[／、]|体系|百司|事务/;
for (const relation of graph.relations || []) {
  expect(!compositeEndpointPattern.test(relation.from), `${relation.id}: composite from endpoint is forbidden`);
  expect(!compositeEndpointPattern.test(relation.to), `${relation.id}: composite to endpoint is forbidden`);
}

if (failures.length) {
  console.error(`Institution graph verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Institution graph verification passed: 29 nodes, 47 relations, 6 views, 16 sources.');
