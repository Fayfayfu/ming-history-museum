# All Emperor Readable Drawers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all sixteen Ming emperors the verified Zhu Yuanzhang drawer structure and six-stage readable quick biography.

**Architecture:** Add `data/ming_emperor_profiles.json` as a drawer-only content layer. Render emperor drawers from this file while preserving `ming_person_pages*.json` as independent-page metadata; validate the data statically before performing cross-emperor browser checks.

**Tech Stack:** JSON data, Node.js static-site generators, Playwright browser verification.

## Global Constraints

- Only emperor drawers change; non-emperor drawers remain untouched.
- Every emperor receives six quick-view stages with Gregorian and reign-era dates.
- Every emperor receives identity, lineage, succession, governance summary, external notes, score, and governance prose.
- Do not force four governance items when the record does not support four meaningful changes.
- Do not commit because the worktree contains unrelated user changes.

---

### Task 1: Define and validate emperor drawer data

**Files:**
- Create: `data/ming_emperor_profiles.json`
- Create: `scripts/verify_ming_emperor_profiles.mjs`

**Interfaces:**
- Consumes: existing emperor core, lineage, children, reign and event data.
- Produces: `people[name]` records with `basicInfo`, `assessment`, `heroQuestion`, `lead`, and six `scenes`.

- [ ] Write a validator requiring exactly sixteen emperor names, six scenes per emperor, double dates, three royal columns, two assessment fields, sources and boundary notes.
- [ ] Run the validator and confirm it fails while the data file is absent.
- [ ] Add all sixteen records, with Zhu Yuanzhang copied from the already approved standard and fifteen records written individually.
- [ ] Run the validator and resolve every structural or content failure.

### Task 2: Separate drawer profiles from independent pages

**Files:**
- Modify: `scripts/build_ming_html.mjs`

**Interfaces:**
- Consumes: `raw.emperorProfiles.people[name]` through `emperorProfileMeta(p)`.
- Produces: emperor drawer content independent of `personPageMeta(p)` and independent-page routing.

- [ ] Load and embed `ming_emperor_profiles.json`.
- [ ] Add `drawerProfileMeta(p)` and use it for quick preview, founder-style facts, assessment and governance rendering.
- [ ] Keep `personPageMeta(p)` only for independent-page links and mobile routing.
- [ ] Generalize founder CSS class names or retain them as implementation classes without changing semantics.

### Task 3: Cross-emperor browser contracts

**Files:**
- Create: `scripts/verify_ming_emperor_drawers.mjs`
- Modify: `scripts/verify_ming_museum.mjs`

**Interfaces:**
- Consumes: generated `people.html`.
- Produces: per-emperor DOM, typography, order, mobile overflow and non-emperor isolation assertions.

- [ ] Check all sixteen emperor drawers for six scenes, dual dates, new facts, notes, score and governance placement.
- [ ] Check special cases: Jianwen unknown ending, Yingzong two reigns, Jiajing collateral succession, Guangzong one-month reign, Chongzhen brother succession.
- [ ] Check one civil official retains “关联机构” and the legacy facts structure.
- [ ] Update the broad museum verifier so its lineage assertions accept the new emperor structure.

### Task 4: Build and visual review

**Files:**
- Verify: `scripts/verify_ming_emperor_profiles.mjs`
- Verify: `scripts/verify_ming_emperor_drawers.mjs`
- Verify: `scripts/verify_zhu_yuanzhang_readability_page.mjs`

**Interfaces:**
- Consumes: source data and generated museum output.
- Produces: passing static, browser and visual acceptance evidence.

- [ ] Run `npm run build:museum`.
- [ ] Run all three focused verification scripts.
- [ ] Capture representative early-, middle- and late-Ming drawer screenshots.
- [ ] Run syntax checks and `git diff --check`.
