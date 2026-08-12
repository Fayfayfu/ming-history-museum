# Zhu Yuanzhang Governance Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Zhu Yuanzhang's institutional reforms out of the basic information table into a dedicated prose section.

**Architecture:** Keep `basicInfo.institutionReforms` as the source of truth. Change only the Zhu Yuanzhang founder rendering branch: the basic facts renderer stops consuming reforms, while a new prose renderer consumes the same data after the quick biography preview.

**Tech Stack:** Node.js build scripts, generated static HTML/CSS, Playwright browser verification.

## Global Constraints

- Only Zhu Yuanzhang changes in this iteration.
- Ministers keep the existing “关联机构” module.
- Emperors use “统治与制度” to describe institutional change, not employment relationships.
- Six Ministries remain a collective name for six parallel ministries.
- Do not commit because the current worktree contains unrelated user changes.

---

### Task 1: Lock the new information hierarchy

**Files:**
- Modify: `scripts/verify_zhu_yuanzhang_readability_page.mjs`

**Interfaces:**
- Consumes: generated `people.html` drawer DOM.
- Produces: assertions for `.founder-governance` outside `.facts-founder`.

- [ ] Add assertions that the facts table contains no `.founder-reforms` or `.founder-reform-item`.
- [ ] Add assertions that one `.founder-governance` follows `.profile-preview`, precedes the biography evaluation heading, and contains four reform items.
- [ ] Run `node scripts/verify_zhu_yuanzhang_readability_page.mjs` and confirm it fails against the current table-based rendering.

### Task 2: Render reforms as prose below the quick biography

**Files:**
- Modify: `scripts/build_ming_html.mjs`

**Interfaces:**
- Consumes: `basicInfo.institutionReforms` from `data/ming_person_pages.json`.
- Produces: `founderGovernanceHtml(basicInfo)` returning one prose section or an empty string.

- [ ] Replace `founderReformsHtml` with `founderGovernanceHtml`.
- [ ] Remove reforms from the founder facts string.
- [ ] Insert governance HTML after `profilePreviewHtml(p)` and before “生平事迹与史学评价”.
- [ ] Style the section as a vertical reading block rather than a table or card matrix.

### Task 3: Rebuild and verify

**Files:**
- Verify: `scripts/verify_zhu_yuanzhang_readability_page.mjs`
- Verify: `scripts/verify_zhu_yuanzhang_readability.mjs`

**Interfaces:**
- Consumes: regenerated museum output.
- Produces: passing desktop/mobile and content contracts.

- [ ] Run `npm run build:museum`.
- [ ] Run both Zhu Yuanzhang verification scripts.
- [ ] Run syntax checks and `git diff --check`.
- [ ] Inspect the generated governance section screenshot.
