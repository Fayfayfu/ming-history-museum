import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const outputRoot = path.join(repoRoot, 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const verifierPath = path.join(repoRoot, 'scripts/verify_ming_on_demand_contracts.mjs');

function runContractVerifier(root = outputRoot, scope = 'all') {
  return spawnSync(process.execPath, [verifierPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, MING_ON_DEMAND_CONTRACT_ROOT: root, MING_ON_DEMAND_CONTRACT_SCOPE: scope },
  });
}

function fixture(mutator) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ming-on-demand-contract-'));
  for (const file of ['people.html', 'people-archive.html', 'events.html']) fs.copyFileSync(path.join(outputRoot, file), path.join(root, file));
  fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
  fs.cpSync(path.join(outputRoot, 'assets/data'), path.join(root, 'assets/data'), { recursive: true });
  fs.symlinkSync(path.join(outputRoot, 'assets/portraits'), path.join(root, 'assets/portraits'));
  fs.symlinkSync(path.join(outputRoot, 'people'), path.join(root, 'people'));
  mutator(root);
  return root;
}

function mutateJson(file, mutate) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutate(parsed);
  fs.writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`);
}

function assertRejected(result, reason, marker) {
  assert.equal(result.error, undefined, `${reason} verifier could not start: ${result.error}`);
  assert.notEqual(result.status, 0, `${reason} mutation unexpectedly passed\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, new RegExp(marker), `${reason} did not fail at its contract gate\n${result.stdout}\n${result.stderr}`);
}

test('current on-demand UI contract verifier accepts the generated museum', () => {
  const result = runContractVerifier();
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('on-demand contract rejects mismatched stats in copied output', (t) => {
  const statsRoot = fixture((root) => mutateJson(path.join(root, 'assets/data/people-index.json'), (index) => { index.people.pop(); }));
  t.after(() => fs.rmSync(statsRoot, { recursive: true, force: true }));
  assertRejected(runContractVerifier(statsRoot, 'stats'), 'mismatched stats', 'current stats mismatch');
});

test('on-demand archive contract rejects an invalid noscript target', (t) => {
  const archiveRoot = fixture((root) => {
    const page = path.join(root, 'people.html');
    fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replace('people-archive.html', 'missing-archive.html'));
  });
  t.after(() => fs.rmSync(archiveRoot, { recursive: true, force: true }));
  assertRejected(runContractVerifier(archiveRoot, 'archive'), 'removed archive noscript link', 'archive noscript link invalid');
});

test('on-demand contract rejects an invalid individual-page link', (t) => {
  const linksRoot = fixture((root) => mutateJson(path.join(root, 'assets/data/people-index.json'), (index) => {
    index.people.find((person) => person.name === '朱元璋').personPageSlug = 'not-a-real-person';
  }));
  t.after(() => fs.rmSync(linksRoot, { recursive: true, force: true }));
  assertRejected(runContractVerifier(linksRoot, 'links'), 'invalid individual-page link', 'missing individual-page file for 朱元璋');
});

test('on-demand contract rejects a broken institution option mapping', (t) => {
  const institutionsRoot = fixture((root) => mutateJson(path.join(root, 'assets/data/people-index.json'), (index) => {
    index.people.find((person) => person.name === '张居正').institutions[0].name = '内阁损坏';
  }));
  t.after(() => fs.rmSync(institutionsRoot, { recursive: true, force: true }));
  assertRejected(runContractVerifier(institutionsRoot, 'institutions'), 'broken institution mapping', 'institution options are not complete and sorted');
});

test('on-demand contract rejects a removed event linkage', (t) => {
  const eventsRoot = fixture((root) => mutateJson(path.join(root, 'assets/data/event-details/e035.json'), (event) => { event.people = []; }));
  t.after(() => fs.rmSync(eventsRoot, { recursive: true, force: true }));
  assertRejected(runContractVerifier(eventsRoot, 'event'), 'removed event linkage', 'event linkage control missing for e035');
});
