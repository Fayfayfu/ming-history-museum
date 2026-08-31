# Remaining Person Card Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade all remaining legacy people cards in the Ming museum to the current `clear-biography` format.

**Architecture:** Keep each batch in an independent `data/ming_person_pages_batchNN_*.json` file with a matching focused verifier. The shared builders are changed only by the coordinator, after a batch file passes local structural checks.

**Tech Stack:** Node.js ESM, JSON content shards, static HTML generation, Node test runner, existing people drawer and standalone page renderer.

**Spec:** Current user requirements in this Codex task; audit source is the current `data/ming_core.json` plus merged `data/ming_person_pages*.json`.

## Global Constraints

- A core person is considered upgraded only when the merged page config has `readingMode: "clear-biography"`.
- Use dynamic scene counts: 4-6 scenes for most people, not a fixed six-scene template.
- Titles and body copy must narrate the person's actual experience; uncertainty belongs in `evidenceNote`, `interpretationBoundary`, `primarySource.boundary`, and source confidence.
- Each scene needs two body paragraphs, a source note, confidence, interpretation boundary, and a primary source.
- Each person needs at least two sources.
- Keep existing full-bleed hero image behavior unless a page has a specific artwork display reason to use framed presentation.
- Do not commit or deploy during this content run unless the user explicitly asks.

## Audit Snapshot

- Core people: 154
- Already upgraded before this execution pass: 100
- Legacy remaining before this execution pass: 54
- Already upgraded after this execution pass: 154
- Legacy remaining after this execution pass: 0
- Legacy with portrait data: 52
- Legacy with institution relationships: 42

## Remaining Legacy People By Identity

- 皇帝（0）：已清零
- 全部身份分类已清零：154 位核心人物均为 `clear-biography` 升级卡。

## Batch Order

### Task 1: 洪武开国文臣

**Files:**
- Create: `data/ming_person_pages_batch27_founding_civil.json`
- Create: `scripts/verify_founding_civil_person_pages.test.mjs`
- Modify: `scripts/build_ming_person_pages.mjs`
- Modify: `scripts/build_ming_html.mjs`

**People:** 李善长、胡惟庸、刘基、宋濂

**Acceptance:** All four are `clear-biography`, each has 4 scenes, no banned uncertainty phrases in title/body, sources and primary sources present, and generated HTML/detail shards exist.

### Task 2: 洪武开国军功集团

**Files:**
- Create: `data/ming_person_pages_batch28_founding_commanders.json`
- Create: `scripts/verify_founding_commanders_person_pages.test.mjs`
- Modify shared builders after the data file passes.

**People:** 徐达、常遇春、汤和、李文忠

**Acceptance:** Military careers distinguish campaign command, postwar institutions, and later purge or succession consequences.

### Task 3: 靖难与永乐权力重组

**Files:**
- Create: `data/ming_person_pages_batch29_jingnan_yongle.json`
- Create: `scripts/verify_jingnan_yongle_person_pages.test.mjs`
- Modify shared builders after the data file passes.

**People:** 朱棣、方孝孺、姚广孝

**Acceptance:** 朱棣 replaces the remaining emperor legacy page; 靖难人物 separate public loyalty, military role, and postwar institutional consequences.

### Task 4: 洪武后续军功与竞争政权

**Files:**
- Create: `data/ming_person_pages_batch30_founding_remainder.json`
- Create: `scripts/verify_founding_remainder_person_pages.test.mjs`
- Modify shared builders after the data file passes.

**People:** 邓愈、沐英、傅友德、蓝玉、马皇后、郭子兴、陈友谅、张士诚、王保保

**Acceptance:** Complete the remaining founding-period records while separating military command, household legitimacy, and rival-regime agency.

### Task 5: 永乐至仁宣官僚与工程

**Files:**
- Create: `data/ming_person_pages_batch31_yongle_renxuan_statecraft.json`
- Create: `scripts/verify_yongle_renxuan_statecraft_person_pages.test.mjs`
- Modify shared builders after the data file passes.

**People:** 解缙、夏原吉、蹇义、杨士奇、杨荣、杨溥、王景弘、宋礼、张玉、朱能、丘福、纪纲

**Acceptance:** Show how cabinet, finance, personnel, voyages, and water transport made Yongle-Renxuan governance function.

### Task 6: 土木、夺门与成化内廷

**Files:**
- Create: `data/ming_person_pages_batch32_tumu_court.json`
- Create: `scripts/verify_tumu_court_person_pages.test.mjs`
- Modify shared builders after the data file passes.

**People:** 王振、金英、也先、石亨、曹吉祥、李贤、商辂、纪氏、万贵妃

**Acceptance:** Separate土木之变、景泰/天顺政变, 成化后宫 and cabinet reconstruction.

### Task 7: 弘治正德前夜与厂卫近侍

**Files:**
- Create: `data/ming_person_pages_batch33_hongzhi_zhengde_court.json`
- Create: `scripts/verify_hongzhi_zhengde_court_person_pages.test.mjs`
- Modify shared builders after the data file passes.

**People:** 刘健、谢迁、李东阳、刘大夏、汪直、刘瑾、钱宁

**Acceptance:** Distinguish cabinet restraint, maritime policy, eunuch document channels, and emperor-favorite military networks.

### Task 8: 晚明转场与明清交替

**Files:**
- Create: `data/ming_person_pages_batch34_late_transition.json`
- Create: `scripts/verify_late_transition_person_pages.test.mjs`
- Modify shared builders after the data file passes.

**People:** 史可法、皇太极、李自成、多尔衮、田尔耕

**Acceptance:** Keep multi-regime chronology clear and avoid reducing actors to simple忠奸标签.

## Execution Steps For Each Batch

- [ ] Inspect local core, portrait, institution, event, and historical-slice data for the batch.
- [ ] Cross-check at least two sources per person; prefer `明史`/`清史稿`/实录/馆藏 records, with later studies only as context.
- [ ] Create the batch JSON using `clear-biography`.
- [ ] Create a focused verifier for structure, source completeness, portrait and institution availability where applicable, generated HTML and detail shards.
- [ ] Add the batch to both builders.
- [ ] Run the focused verifier before and after `npm run build:museum`.
- [ ] Re-run tone checks when a batch contains controversy-heavy figures.

## Execution Log

- [x] Created and integrated `data/ming_person_pages_batch27_founding_civil.json`: 李善长、胡惟庸、刘基、宋濂.
- [x] Integrated existing `data/ming_person_pages_batch28_founding_commanders.json`: 徐达、常遇春、汤和、李文忠.
- [x] Integrated existing `data/ming_person_pages_batch29_jingnan_yongle.json`: 朱棣、方孝孺、姚广孝.
- [x] Rebuilt museum output: 112 immersive person pages generated.
- [x] Verified: `node --test scripts/verify_founding_civil_person_pages.test.mjs scripts/verify_founding_commanders_person_pages.test.mjs scripts/verify_jingnan_yongle_person_pages.test.mjs`
- [x] Verified: `node --test scripts/verify_person_page_editorial_tone.test.mjs`
- [x] Created and integrated `data/ming_person_pages_batch30_founding_remainder.json`: 马皇后、郭子兴、陈友谅、张士诚.
- [x] Created and integrated `data/ming_person_pages_batch31_founding_commanders_remainder.json`: 邓愈、沐英、傅友德、蓝玉.
- [x] Created and integrated `data/ming_person_pages_batch33_jingnan_security.json`: 张玉、朱能、丘福、纪纲.
- [x] Generated 124 immersive person pages with the three new completed batches.
- [x] Created and integrated `batch32_yongle_statecraft`、`batch33_jingnan_security`、`batch34_tumu_court`：共 11 人。
- [x] Created and integrated `batch35_renxuan_statecraft`、`batch36_chenghua_court`、`batch37_hongzhi_civil`：共 14 人。
- [x] Created and integrated `batch38_late_court_security`、`batch39_late_transition_final`：最后 10 人。
- [x] Rebuilt the full museum: 154 immersive person pages; focused batch tests, editorial-tone gate, institution-coverage gate and default `npm run verify` pass.
- [x] Final source audit: `154 total / 154 upgraded / 0 legacy`.
