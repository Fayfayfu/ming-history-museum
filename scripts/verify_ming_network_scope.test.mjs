import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const source = await fs.readFile('scripts/build_ming_network.mjs', 'utf8');

test('relationship network uses the shared 1368—1662 scope instead of silently truncating at 1644', () => {
  assert.match(source, /import\s*\{\s*MUSEUM_BOUNDARIES\s*,\s*MUSEUM_TIMELINE_SCOPE\s*\}\s*from\s*['"]\.\/lib\/museum_temporal_scope\.mjs['"]/);
  assert.doesNotMatch(source, /Math\.min\(1644,\s*centralYear\(n\)\)/);
  assert.doesNotMatch(source, /\(1644\s*-\s*1368\)/);
  assert.match(source, /MUSEUM_TIMELINE_SCOPE\.end/);
  assert.match(source, /南明延续政权/);
  assert.match(source, /北京明廷覆亡/);
  assert.match(source, /南明终局/);
  assert.doesNotMatch(source, /129 NODES/);
});

test('relationship network preserves the 16-ruler Beijing Ming spine and never creates a 17th through 19th emperor', () => {
  assert.match(source, /const emperorOrder\s*=\s*\[/);
  assert.match(source, /const southernMingBranch/);
  assert.doesNotMatch(source, /第(?:17|18|19)帝|17位皇帝|18位皇帝|19位皇帝/);
});
