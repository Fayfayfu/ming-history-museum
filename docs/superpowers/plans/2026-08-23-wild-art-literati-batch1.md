# Wild Art Literati Batch 1 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade 沈周、仇英、徐渭、马守真、文徵明 from fixed drawer stories to source-backed independent person pages.

**Architecture:** Add a self-contained batch-12 page-data file and merge it into both existing person-page registries. Reuse the common renderer, historical slices, portraits, and creative-work renderer; distinguish the five pages through their page data and feature types rather than new global layout code.

**Tech Stack:** Node.js ESM, JSON content data, `node:test`, static HTML builders.

**Spec:** `docs/superpowers/specs/2026-08-23-wild-art-literati-batch1-design.md`

---

### Task 1: Add a failing batch contract test

**Files:**
- Create: `scripts/verify_wild_art_literati_batch1.test.mjs`
- Modify: `package.json`

1. Assert exactly the five target names receive independent pages.
2. Assert distinct slugs/themes/questions and complete evidence fields.
3. Assert sensitive content and attribution boundaries for 徐渭、马守真、仇英、文徵明.
4. Run the test and confirm it fails because the five page records do not yet exist.

### Task 2: Add source-backed page data

**Files:**
- Create: `data/ming_person_pages_batch12.json`
- Modify: `data/ming_creative_works.json`

1. Write independent narratives with 4—6 scenes per person.
2. Give every scene an evidence note, confidence, interpretation boundary, and linked source excerpt.
3. Add distinct feature modules: network, workshop/attribution, responsibility boundary, signature/market, and cultural authority.
4. Add an official-museum work record for 文徵明.

### Task 3: Wire batch 12 into both builders

**Files:**
- Modify: `scripts/build_ming_html.mjs`
- Modify: `scripts/build_ming_person_pages.mjs`

1. Import the new JSON batch.
2. Merge it into both page registries.
3. Run the contract test and confirm green.

### Task 4: Build and verify generated behavior

**Files:**
- Generated: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/people/*.html`
- Generated: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/assets/data/people-details/*.json`

1. Run the person-page builder and museum builder.
2. Assert every generated page has its correct title, feature, sources, and drawer link.
3. Run people on-demand data/page/contracts verification.
4. Inspect desktop and mobile rendering in a real browser, including source dialogs and overflow.

### Task 5: Final audit

1. Run the new verification command and relevant existing verification commands.
2. Review `git diff --check` and changed-file scope.
3. Report completed pages, verified claims, medium-confidence boundaries, and any remaining unverified points.
