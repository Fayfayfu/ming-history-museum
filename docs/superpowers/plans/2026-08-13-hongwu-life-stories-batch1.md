# 洪武人物一生故事第一批实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将李善长、刘基、宋濂、常遇春、汤和、李文忠、邓愈、沐英、傅友德、蓝玉的通用四段模板，替换为人物专属的完整一生故事。

**Architecture:** 故事内容写入 `data/ming_storytelling.json`，沿用现有完整故事渲染器。年号由 `scripts/lib/ming_reign_year.mjs` 构建时生成；浏览器验证只检查最终可见内容。

**Tech Stack:** JSON, Node.js ESM, Playwright, 静态 HTML 构建。

## Global Constraints

- 每人必须有专属 hook、完整 arc、4—6个真实转折、reading 及可追溯 sources。
- 章节标题不得使用“生卒与出身”“进入历史现场”“主要行动与位置”“结局与历史影响”。
- 事实层不写无依据心理、对话或现场细节；解释必须标为合理推演。
- 对有争议的死因、罪名、案件和后世神化明确收紧表述。
- 不提交 Git，不上线。

---

### Task 1: 建立批次内容合同

**Files:**
- Create: `scripts/verify_hongwu_life_stories_batch1.mjs`

- [ ] 检查10人都有 hook、arc、4—6章、reading、sources。
- [ ] 检查禁用通用四标题，且同一批内标题不重复。
- [ ] 构建前运行，确认因内容缺失而失败。

### Task 2: 撰写十人完整故事

**Files:**
- Modify: `data/ming_storytelling.json`

- [ ] 依《明史》卷125、126、127、128、132及现有事件资料，撰写10人专属故事。
- [ ] 逐人核对年份、官职、战事、封赏与结局。
- [ ] 对李善长案、刘基死因、傅友德赐死、蓝玉案保留争议边界。

### Task 3: 渲染与视觉验证

**Files:**
- Modify: `scripts/verify_hongwu_life_stories_batch1.mjs`
- Generated: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/people.html`

- [ ] 运行 `npm run build:museum`。
- [ ] 逐人打开抽屉，检查通用基础传记已消失。
- [ ] 检查每章都有年号、年龄、专属标题与层级标签。
- [ ] 在桌面端与移动端检查无横向溢出。
- [ ] 运行人物卡、时间轴、朱元璋页面回归验证。
