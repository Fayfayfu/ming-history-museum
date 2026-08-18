# Task 4 report: on-demand data integrity and homepage weight

## Status

Complete. The approved 430 KiB threshold preserves the static timeline and the accessible no-JavaScript fallback while still removing duplicate generated table rows.

Commit message: `test: verify on-demand people data delivery`.

## Implemented locally

- Added `scripts/verify_ming_people_on_demand_data.mjs`.
  - Uses the museum output by default and `dist` with `--deploy`.
  - Checks JSON parsing, source-record ID/count parity, duplicate IDs, index/detail ID and path parity, detail-directory cardinality, local image references, required deep-link/filter fields, forbidden inline data declarations, and the strict `< 430 KiB` `people.html` budget.
- Added `verify:people-on-demand-data` and `verify:people-on-demand-page` scripts, and appended both to `npm run verify` without removing existing commands.
- Removed the generated 165-row table-data fallback and replaced it with one accessible no-JavaScript notice row.
- Corrected batch-22 portrait output to the source asset tree that `build:museum` mirrors; the previous target was deleted by that mirror step and left four referenced portraits broken.

## Measured result

| Build state | `people.html` bytes |
| --- | ---: |
| Before removing table fallback | 506,374 |
| After removing table fallback | 418,157 |
| Required strict maximum | less than 440,320 |

The approved threshold is deliberately below 430 KiB, not at-or-below: the verifier uses a strict byte comparison. The 418,157-byte build passes with 22,163 bytes of remaining headroom.

## Scope decision

The static 165-person historical timeline and no-JavaScript fallback remain in production. The removed generated table rows were redundant with the indexed JavaScript roster and accounted for 88,217 bytes. The approved 430 KiB limit reflects this accessibility-preserving architecture.

## Verification run

- `npm run build:museum` — passed.
- `npm run verify:people-on-demand-data` — passed after the approved 430 KiB threshold update.
- `npm run verify:people-on-demand-page` — passed.
- `npm run verify` — started and reached the existing timeline-unit suite; it remains blocked by pre-existing 165-versus-175 roster assertions unrelated to Task 4. The Task 4 aggregate-command assertion was updated to cover the two new gates.
- `git diff --check` — passed.

## Confidence

High: output byte measurement, source/shard checks, and browser regression all passed.

## Deliberately unstaged build output

`outputs/.../assets/portraits/batch-22/*.webp` is regenerated from tracked source PNGs by `build:museum` and was not committed as a build artifact.
