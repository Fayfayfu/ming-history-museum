# 步入大明 · 数字历史博物馆

以人物、事件与专题展组织明代历史的本地静态网站。史实、合理推演与艺术想象分别标识；人物画像同时记录来源、图像性质与置信度。

## 构建

```bash
npm run build:museum
npm run build:deploy
```

- 研究数据位于 `data/`。
- 页面生成脚本位于 `scripts/`。
- 原始本地图片位于 `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/`。
- `dist/` 是经过WebP压缩的Vercel发布包，不保存高清史料原件和验收截图。
