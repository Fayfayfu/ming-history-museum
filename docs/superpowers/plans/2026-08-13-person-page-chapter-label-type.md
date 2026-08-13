# 独立人物页章节辅助文字字号 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将独立人物页年号调整为13px、章节眉题调整为14px，并保持桌面与移动端无溢出。

**Architecture:** 修改共享独立人物页生成器的CSS，不创建郑和专属覆盖。用Playwright专项测试锁定两个计算字号和两种视口宽度。

**Tech Stack:** Node.js ESM、静态HTML生成器、Playwright。

## Global Constraints

- `.chapter-reign` 必须为13px。
- `.chapter-copy .eyebrow` 必须为14px。
- 其他字号不变。
- 1440px与390px视口均不得横向溢出。
- 不推送、不上线。

### Task 1: 字号回归测试与实现

**Files:**
- Create: `scripts/verify_person_page_chapter_label_type.mjs`
- Modify: `scripts/build_ming_person_pages.mjs`

- [ ] 写测试读取郑和六章的 `.chapter-reign` 和 `.chapter-copy .eyebrow` 计算字号。
- [ ] 运行测试，确认当前11px和10px导致失败。
- [ ] 将共享CSS调整为13px和14px。
- [ ] 重建页面并确认专项测试通过。
- [ ] 运行全站与部署包验证，创建本地提交。
