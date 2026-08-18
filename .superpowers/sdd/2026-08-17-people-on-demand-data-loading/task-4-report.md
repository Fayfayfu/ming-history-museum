# Task 4 report: on-demand data integrity and homepage weight

## Status

Complete after review round 1. The approved 430 KiB threshold preserves the static timeline while a dedicated no-JavaScript archive restores complete static roster access without duplicating the table on the homepage.

Commit message: `test: verify on-demand people data delivery`.

## Implemented locally

- Added `scripts/verify_ming_people_on_demand_data.mjs`.
  - Uses the museum output by default and `dist` with `--deploy`.
  - Checks JSON parsing, source-record ID/count parity, duplicate IDs, index/detail ID and path parity, detail-directory cardinality, local image references, required deep-link/filter fields, forbidden inline data declarations, and the strict `< 430 KiB` `people.html` budget.
- Added `verify:people-on-demand-data` and `verify:people-on-demand-page` scripts, and appended both to `npm run verify` without removing existing commands.
- Replaced the homepage's duplicated generated roster with a `<noscript>` link to a new pre-generated `people-archive.html`.
  - The archive has all 175 source-roster records and all 15 readable roster columns, contains no script tags, and links back to the interactive hall.
- Corrected batch-22 portrait output to the source asset tree that `build:museum` mirrors; the previous target was deleted by that mirror step and left four referenced portraits broken.

## Measured result

| Build state | `people.html` bytes |
| --- | ---: |
| Before removing table fallback | 506,374 |
| After moving complete roster to `people-archive.html` | 418,399 |
| Required strict maximum | less than 440,320 |

The approved threshold is deliberately below 430 KiB, not at-or-below: the verifier uses a strict byte comparison. The 418,399-byte build passes with 21,921 bytes of remaining headroom.

## Scope decision

The static 175-person historical timeline remains on the homepage. The complete 175-row static roster is now emitted once as `people-archive.html`; homepage `<noscript>` content explicitly directs no-JavaScript visitors there. The 175-person contract is locked from the actual source roster (151 core plus 24 non-emperor important-child records), while the 16-emperor/category invariants and mutation-test failure ordering remain gated.

## Verification run

- `npm run build:museum` — passed.
- Fresh build proof: removed generated `outputs/.../assets/portraits/batch-22/`, then `npm run build:museum` regenerated all four WebPs from tracked PNG inputs.
- `npm run verify:people-on-demand-data` — passed: 418,399-byte homepage, 175 index/shards/archive rows, 95 event shards, 187 local image references.
- `npm run verify:people-on-demand-page` — passed.
- `npm run verify:people-timeline` — passed.
- `npm run verify:people-timeline-unit` — passed (34/34).
- Focused browser check with JavaScript disabled — passed: archive has 175 rows, 15 headers, and zero scripts.
- `npm run verify` — rerun after the 175 contract repair; timeline and unit stages passed. The local runner stopped the long legacy browser regression before it emitted a final status, so a normal unrestricted CI/local terminal should rerun the aggregate command before release.
- `git diff --check` — passed.

## Confidence

High for build, data/shard, source-roster, and focused browser evidence; medium for aggregate completion because this runner did not return a final status from its long legacy browser phase.

## Deliberately unstaged build output

`outputs/.../assets/portraits/batch-22/*.webp` is regenerated from tracked source PNGs by `build:museum` and was not committed as a build artifact.

## Review round 2: source-derived legacy story coverage

- Replaced the legacy `storyCoverage.rows === 165` checks in `verify_ming_museum.mjs` with `expectedFormalRosterCount`, derived from the current core and important-child source records after the same name normalization used by the build.
- Added a timeline-verifier test that locks the derived source count at 175 and asserts the museum audit uses the derived gate rather than the removed `165` literal. A roster/story-marker mismatch still makes the audit fail.
- `node --test scripts/verify_ming_people_timeline.test.mjs` exited 0 (17/17).
- `npm run verify` exited 1 at the legacy museum audit. The generated audit now confirms the repaired coverage (`rows: 175`, `markers: 175`); remaining existing false checks are `secondSliceDrawerPass`, `thirdSliceDrawerPass`, and `institutionFilterPass`. They are outside this narrow row-count fix.

## Review round 3: current on-demand UI audit contracts

- Updated the legacy story probe to read the current `不重复人物` total stat (175) and to require the current `独立页面人物` stat to be present and positive; it no longer searches for the removed `故事覆盖` stat.
- Replaced stale emperor-empty-link expectations with valid current `people/<slug>.html` links, and verifies each linked individual page exists. Non-preview historical-slice assertions remain unchanged.
- Replaced stale institution `optgroup` ordering with the current complete, Chinese-sorted flat options; every tested option must select and return its expected people.
- Replaced the legacy literal table-mode event assertion with on-demand state/linkage checks: `?event=e035`, selected event field, title, four expected names, and four loaded `data-detail-id` rows.
- `node --check scripts/verify_ming_museum.mjs` exited 0; `node --test scripts/verify_ming_people_timeline.test.mjs` exited 0 (18/18), including source checks for all four updated contracts.
- A new `npm run verify` invocation passed the timeline, timeline-unit (36/36), variant-unit (15/15), and reign-year unit stages, but this environment stopped before the long legacy browser audit produced a final exit code or a refreshed audit report. Final aggregate exit code: **not returned by this execution environment**.
