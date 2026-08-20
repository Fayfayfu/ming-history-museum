# Task 5 report — deploy bundle includes on-demand data

## Status

**PASS (high confidence).** The deploy bundle now contains every generated people/event index and detail shard, including the raster assets referenced by those JSON shards. No Vercel deployment or root upload was performed.

## Root cause and fix

The deploy builder previously copied only HTML-discovered assets. Runtime-fetched `assets/data/**/*.json` never appears as a static HTML URL, so the initial `dist` contained **0** data JSON files and `--deploy` failed with `missing deployed assets/data/people-index.json`.

`scripts/build_vercel_bundle.mjs` now:

1. Reads the generated data JSON files and adds their raster references to the existing asset map.
2. Copies only `assets/data/` into `dist/assets/data/`.
3. Rewrites copied JSON asset URLs through the same JPEG/PNG-to-WebP map as HTML, preventing broken runtime portrait URLs.

The data verifier now asserts the deployed index before parsing and every indexed people/event `detailUrl` after parsing. The existing deploy browser verifier now waits for the asynchronous `?person=` drawer load before asserting it.

## Counts and bytes

| Artifact | `people.html` bytes | People index / shards | Event index / shards |
| --- | ---: | ---: | ---: |
| Museum source before deploy rewrite | 418,399 | 175 / 175 | 95 / 95 |
| Final `dist` bundle | 418,514 | 175 / 175 | 95 / 95 |

The 115-byte difference is the deploy builder's existing HTML asset URL rewrite; Task 5 does not add inline people/event payloads. Final bundle output: 542 files, 36.17 MiB, 205 mapped images.

## Verification

1. Baseline negative check: `npm run build:deploy` then `node scripts/verify_ming_people_on_demand_data.mjs --deploy` failed as intended: `missing deployed assets/data/people-index.json`; `dist/assets/data` contained 0 JSON files.
2. `npm run build:museum` completed; it wrote the museum pages, six exhibitions, 36 immersive person pages, and institution outputs.
3. `npm run build:deploy` completed after the fix: 542 files, 36.17 MiB.
4. `node scripts/verify_ming_people_on_demand_data.mjs --deploy` passed:
   `peopleHtmlBytes: 418514`, people `index/shards/archiveRows: 175/175/175`, events `index/shards: 95/95`, image references `187`.
5. `npm run verify:deploy` passed in a loopback-capable environment. It served the local `dist` via temporary `127.0.0.1`, returned 200 for all audited pages, found no broken images or HTTP errors, validated `?person=姚广孝` and `?person=杨继盛`, and emitted `pass: true`.
6. `git diff --check` passed.

`npm run verify` was started during this task but its sandboxed browser phase was blocked from binding `127.0.0.1` (`listen EPERM`). It is not counted as a full-pass result here; the requested focused deploy verification was rerun successfully in the approved loopback-capable environment.

## Changed files

- `scripts/build_vercel_bundle.mjs`
- `scripts/verify_ming_people_on_demand_data.mjs`
- `scripts/verify_vercel_bundle.mjs`
- `.superpowers/sdd/2026-08-17-people-on-demand-data-loading/task-5-report.md`

## Preview routes

The deploy verifier uses an ephemeral local loopback server, so its port is intentionally released after the check. For any local static preview rooted at `dist`, use:

- `http://127.0.0.1:<port>/people.html`
- `http://127.0.0.1:<port>/people.html?person=%E6%9C%B1%E5%85%83%E7%92%8B`
- `http://127.0.0.1:<port>/events.html?event=e001` (朱元璋建立明朝)

The task verified all 95 generated event shards structurally; it did not add a browser interaction assertion for the example event query.

## Concerns

- `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/portraits/batch-22/` was already untracked and remains unstaged/unmodified by Task 5.
- `dist/` is a generated, ignored deployment artifact and is not committed.
