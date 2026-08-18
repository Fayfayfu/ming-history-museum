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
