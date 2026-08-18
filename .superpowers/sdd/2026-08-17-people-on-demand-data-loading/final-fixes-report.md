# Final fixes report — whole-branch review C1, I1, I2, M1

## Status

**Focused verification PASS (high confidence).** C1, I1, I2, and M1 are implemented. No product content was changed and no deployment was performed.

## Fixes

### I1 — permanent person IDs

- Removed every generated `c${index}` / `k${index}` person ID.
- Independent-page people reuse their existing page slug.
- Every other person receives a deterministic `person-u<codepoint>-...` slug derived from the NFKC-normalized, whitespace-free person identity.
- The builder rejects missing identities, duplicate normalized identities, duplicate IDs, unsafe IDs, page-slug conflicts, and ordinal `cN` / `kN` IDs.
- Index `id`, `rowId`, `detailUrl`, detail `id`, shard filename, client cache keys, race interception, contract mutations, and data verification now use the stable ID.
- The unit mutation test reorders two existing people and inserts a third, then proves the existing name-to-ID mapping is unchanged.

Generated result: 175 unique person IDs, 0 ordinal IDs, 36 reused independent-page slugs, and 139 normalized-identity slugs.

### C1 — mutable JSON cache policy

- `dist/vercel.json` now assigns `/assets/data/(.*)` the policy `public, max-age=0, must-revalidate`.
- Year-long immutable caching is limited to the generated `exhibitions`, `portraits`, `works`, and `fonts` subtrees; the conflicting broad `/assets/(.*)` rule was removed.
- The deploy verifier requires exactly one data rule with the revalidation value and rejects the former broad immutable rule.

### I2 — contract gate

- `?person=` link verification now waits for the hydrated drawer/profile link directly and never clicks the table tab through an open veil.
- The individual-link mutation resolves its detail shard through `people-index.json`, so the mutation remains valid under permanent IDs.
- All six clean/mutation contract cases pass with their intended diagnostics.

### M1 — portrait completion

- The 姚广孝 deploy assertion now waits for the portrait `load` or `error` event before reading `naturalWidth`, matching the existing 杨继盛 assertion.

## Focused verification

- `node --test scripts/lib/people_on_demand_data.test.mjs scripts/verify_ming_people_timeline.test.mjs` — 28/28 passed.
- `npm run verify:people-on-demand-data` — passed; 175/175 people index/shards/archive rows, 95/95 event index/shards, 187 valid image references.
- `npm run verify:people-on-demand-page` — passed; 175 rows, stable-ID detail race, retry/deep-link/scroll contracts.
- `npm run verify:people-on-demand-contracts` — 6/6 passed.
- `npm run build:museum` — passed.
- `npm run build:deploy` — passed; 542 files, 36.18 MiB.
- `npm run verify:deploy` — passed with `cachePolicy.dataRules=1`, the exact revalidation value, `broadImmutable=false`, both on-demand portraits loaded, and `pass=true`.
- `git diff --check` — passed.

The aggregate `npm run verify` is intentionally run after this focused checkpoint commit; its final result will be appended here.

## Concerns

- `dist/` is generated and ignored; its verified `vercel.json` is recreated by `scripts/build_vercel_bundle.mjs` rather than committed.
- `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/portraits/batch-22/` remains pre-existing and untracked; it is excluded from this change.
