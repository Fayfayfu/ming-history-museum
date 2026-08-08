# Imagegen 原图分类目录

任务归档：`019fc8d2-0e97-7ed3-a23b-47b434c01dc9`  
整理日期：2026-08-08

## 结论

- 共 76 张：54 张人物画像、22 张大场景图。
- 已采用 65 张：53 张人物画像、6 张专题主场景、6 张专题“多方视角”场景。
- 未采用 11 张：1 张张璁人物候选稿、10 张专题场景候选稿。
- 当前网站并非只使用少量场景：12 个正式场景位全部有图并已写入构建后的专题页；另外 10 张是同一批主题的候选构图，当前没有网页引用。

## 目录与命名规则

- `data/media-originals/portraits/`：全部人物原图；沿用 `batch-N/编号_姓名_AI想象像_原图.png`，通用人物稿放入 `imagined/`。
- `data/media-originals/scenes/adopted/`：12 张网站已采用场景；主场景与多方视角直接看文件名。
- `data/media-originals/scenes/candidates/`：10 张同主题候选稿；主场景与多方视角直接看文件名。
- 人物命名：`编号_姓名_AI想象像_原图或候选序号.png`。
- 场景命名：`专题_专题名_场景位_内容_采用或候选序号.png`。
- `manifest.json` 的 `originalFile` 保留原始 `exec-UUID`，`sha256` 和 `matchingProjectFiles` 保留完整采用链。

## 场景图清单

| 内容 | 状态 | 归档路径 | 网站使用情况 | 识别置信度 |
|---|---|---|---|---|
| 1644王朝崩解｜多方视角｜南京留都运作 | 已采用 | `data/media-originals/scenes/adopted/专题_1644王朝崩解_多方视角_南京留都运作_采用.png` | 已接入：outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/exhibitions/perspectives/fall-nanjing.png | 高（SHA-256精确匹配项目采用文件） |
| 1644王朝崩解｜主场景｜北京城破与失序 | 已采用 | `data/media-originals/scenes/adopted/专题_1644王朝崩解_主场景_北京城破与失序_采用.png` | 已接入：outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/exhibitions/scenes/fall-1644.png | 高（SHA-256精确匹配项目采用文件） |
| 土木堡之变｜多方视角｜败讯抵京与固守争论 | 已采用 | `data/media-originals/scenes/adopted/专题_土木堡之变_多方视角_败讯抵京与固守争论_采用.png` | 已接入：outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/exhibitions/perspectives/tumu-court.png | 高（SHA-256精确匹配项目采用文件） |
| 土木堡之变｜主场景｜北京城防准备 | 已采用 | `data/media-originals/scenes/adopted/专题_土木堡之变_主场景_北京城防准备_采用.png` | 已接入：outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/exhibitions/scenes/tumu-crisis.png | 高（SHA-256精确匹配项目采用文件） |
| 万历援朝｜多方视角｜战争后方村落 | 已采用 | `data/media-originals/scenes/adopted/专题_万历援朝_多方视角_战争后方村落_采用.png` | 已接入：outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/exhibitions/perspectives/imjin-village.png | 高（SHA-256精确匹配项目采用文件） |
| 万历援朝｜主场景｜平壤雪地攻城 | 已采用 | `data/media-originals/scenes/adopted/专题_万历援朝_主场景_平壤雪地攻城_采用.png` | 已接入：outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/exhibitions/scenes/imjin-war.png | 高（SHA-256精确匹配项目采用文件） |
| 永乐迁都｜多方视角｜大运河漕运 | 已采用 | `data/media-originals/scenes/adopted/专题_永乐迁都_多方视角_大运河漕运_采用.png` | 已接入：outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/exhibitions/perspectives/yongle-canal.png | 高（SHA-256精确匹配项目采用文件） |
| 永乐迁都｜主场景｜北京营建 | 已采用 | `data/media-originals/scenes/adopted/专题_永乐迁都_主场景_北京营建_采用.png` | 已接入：outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/exhibitions/scenes/yongle-capital.png | 高（SHA-256精确匹配项目采用文件） |
| 张居正改革｜多方视角｜乡村清丈 | 已采用 | `data/media-originals/scenes/adopted/专题_张居正改革_多方视角_乡村清丈_采用.png` | 已接入：outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/exhibitions/perspectives/zhang-land-survey.png | 高（SHA-256精确匹配项目采用文件） |
| 张居正改革｜主场景｜北京官署考成运作 | 已采用 | `data/media-originals/scenes/adopted/专题_张居正改革_主场景_北京官署考成运作_采用.png` | 已接入：outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/exhibitions/scenes/zhang-reform.png | 高（SHA-256精确匹配项目采用文件） |
| 郑和下西洋｜多方视角｜海外港市相遇 | 已采用 | `data/media-originals/scenes/adopted/专题_郑和下西洋_多方视角_海外港市相遇_采用.png` | 已接入：outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/exhibitions/perspectives/zheng-he-port.png | 高（SHA-256精确匹配项目采用文件） |
| 郑和下西洋｜主场景｜南京龙江港远航整备 | 已采用 | `data/media-originals/scenes/adopted/专题_郑和下西洋_主场景_南京龙江港远航整备_采用.png` | 已接入：outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/exhibitions/scenes/zheng-he-voyages.png | 高（SHA-256精确匹配项目采用文件） |
| 1644王朝崩解｜主场景｜北京城破与失序｜候选02 | 候选 | `data/media-originals/scenes/candidates/专题_1644王朝崩解_主场景_北京城破与失序_候选02.png` | 未接入网站；保留为同主题候选/二次叙事素材 | 高（画面内容、生成批次、展览提示与对应已采用稿一致） |
| 土木堡之变｜多方视角｜败讯抵京与固守争论｜候选02 | 候选 | `data/media-originals/scenes/candidates/专题_土木堡之变_多方视角_败讯抵京与固守争论_候选02.png` | 未接入网站；保留为同主题候选/二次叙事素材 | 高（画面内容、生成批次、展览提示与对应已采用稿一致） |
| 土木堡之变｜主场景｜北京城防准备｜候选02 | 候选 | `data/media-originals/scenes/candidates/专题_土木堡之变_主场景_北京城防准备_候选02.png` | 未接入网站；保留为同主题候选/二次叙事素材 | 高（画面内容、生成批次、展览提示与对应已采用稿一致） |
| 万历援朝｜多方视角｜战争后方村落｜候选02 | 候选 | `data/media-originals/scenes/candidates/专题_万历援朝_多方视角_战争后方村落_候选02.png` | 未接入网站；保留为同主题候选/二次叙事素材 | 高（画面内容、生成批次、展览提示与对应已采用稿一致） |
| 万历援朝｜主场景｜平壤雪地攻城｜候选02 | 候选 | `data/media-originals/scenes/candidates/专题_万历援朝_主场景_平壤雪地攻城_候选02.png` | 未接入网站；保留为同主题候选/二次叙事素材 | 高（画面内容、生成批次、展览提示与对应已采用稿一致） |
| 永乐迁都｜多方视角｜大运河漕运｜候选02 | 候选 | `data/media-originals/scenes/candidates/专题_永乐迁都_多方视角_大运河漕运_候选02.png` | 未接入网站；保留为同主题候选/二次叙事素材 | 高（画面内容、生成批次、展览提示与对应已采用稿一致） |
| 永乐迁都｜主场景｜北京营建｜候选02 | 候选 | `data/media-originals/scenes/candidates/专题_永乐迁都_主场景_北京营建_候选02.png` | 未接入网站；保留为同主题候选/二次叙事素材 | 高（画面内容、生成批次、展览提示与对应已采用稿一致） |
| 张居正改革｜多方视角｜乡村清丈｜候选02 | 候选 | `data/media-originals/scenes/candidates/专题_张居正改革_多方视角_乡村清丈_候选02.png` | 未接入网站；保留为同主题候选/二次叙事素材 | 高（画面内容、生成批次、展览提示与对应已采用稿一致） |
| 张居正改革｜主场景｜北京官署考成运作｜候选02 | 候选 | `data/media-originals/scenes/candidates/专题_张居正改革_主场景_北京官署考成运作_候选02.png` | 未接入网站；保留为同主题候选/二次叙事素材 | 高（画面内容、生成批次、展览提示与对应已采用稿一致） |
| 郑和下西洋｜多方视角｜海外港市相遇｜候选02 | 候选 | `data/media-originals/scenes/candidates/专题_郑和下西洋_多方视角_海外港市相遇_候选02.png` | 未接入网站；保留为同主题候选/二次叙事素材 | 高（画面内容、生成批次、展览提示与对应已采用稿一致） |

## 人物画像清单

| 人物 | 状态 | 归档路径 | 原始文件名 |
|---|---|---|---|
| 秦良玉 AI想象像 | 已采用 | `data/media-originals/portraits/batch-1/112_秦良玉_AI想象像_原图.png` | `exec-bbdc5dcf-c0c2-4484-89b9-b9458933911e.png` |
| 万贵妃 AI想象像 | 已采用 | `data/media-originals/portraits/batch-12/1201_万贵妃_AI想象像_原图.png` | `exec-de133665-ba51-47e9-ab3d-c8ee01f55eab.png` |
| 纪氏 AI想象像 | 已采用 | `data/media-originals/portraits/batch-12/1202_纪氏_AI想象像_原图.png` | `exec-f7d6fd12-76c8-4d1b-9142-a88d7c2aca5b.png` |
| 客氏 AI想象像 | 已采用 | `data/media-originals/portraits/batch-12/1203_客氏_AI想象像_原图.png` | `exec-80509e8b-8fb7-4574-b4ad-d6180fe5c832.png` |
| 李贽 AI想象像 | 已采用 | `data/media-originals/portraits/batch-13/1302_李贽_AI想象像_原图.png` | `exec-e94919a3-640e-4766-9cde-89a42ef2d11a.png` |
| 吴承恩 AI想象像 | 已采用 | `data/media-originals/portraits/batch-13/1303_吴承恩_AI想象像_原图.png` | `exec-38cc382f-58d6-4a2d-a2a2-4da5e21cef59.png` |
| 汤显祖 AI想象像 | 已采用 | `data/media-originals/portraits/batch-13/1304_汤显祖_AI想象像_原图.png` | `exec-670293ea-5dc0-4435-88dc-f40f4efe4532.png` |
| 张景岳 AI想象像 | 已采用 | `data/media-originals/portraits/batch-13/1305_张景岳_AI想象像_原图.png` | `exec-856c7b97-5a2a-4829-93b2-882fd5745af8.png` |
| 宋应星 AI想象像 | 已采用 | `data/media-originals/portraits/batch-13/1306_宋应星_AI想象像_原图.png` | `exec-8cb2b08b-f465-4369-98bb-4f15e9d5febd.png` |
| 郑贵妃 AI想象像 | 已采用 | `data/media-originals/portraits/batch-13/1307_郑贵妃_AI想象像_原图.png` | `exec-521e2691-29c7-4ae3-bc06-5ee72f2b2496.png` |
| 郭子兴 AI想象像 | 已采用 | `data/media-originals/portraits/batch-14/1401_郭子兴_AI想象像_原图.png` | `exec-e7ee1ad1-2777-42e9-b44c-a09e996606aa.png` |
| 陈友谅 AI想象像 | 已采用 | `data/media-originals/portraits/batch-14/1402_陈友谅_AI想象像_原图.png` | `exec-38aad8a3-3608-48a9-9863-dc3fed34b95f.png` |
| 张士诚 AI想象像 | 已采用 | `data/media-originals/portraits/batch-14/1403_张士诚_AI想象像_原图.png` | `exec-cbb0d861-f5a2-4801-9858-1cf1b9c9a151.png` |
| 也先 AI想象像 | 已采用 | `data/media-originals/portraits/batch-14/1404_也先_AI想象像_原图.png` | `exec-43f51a21-63cf-4181-8a72-e30d4e4b8b39.png` |
| 张璁 AI想象像｜另一构图 | 候选 | `data/media-originals/portraits/batch-15/1501_张璁_AI想象像_候选02.png` | `exec-27225f95-2888-43b7-b2ed-6661f1ed1f15.png` |
| 张璁 AI想象像 | 已采用 | `data/media-originals/portraits/batch-15/1501_张璁_AI想象像_原图.png` | `exec-7e7b18db-483f-4371-b3a8-3a15bf77afd1.png` |
| 马芳 AI想象像 | 已采用 | `data/media-originals/portraits/batch-3/303_马芳_AI想象像_原图.png` | `exec-1d0a0477-52ae-4470-8f34-f0a0fed14c06.png` |
| 刘健 AI想象像 | 已采用 | `data/media-originals/portraits/batch-3/304_刘健_AI想象像_原图.png` | `exec-19094530-12cc-46b9-a29f-872c59c3a09b.png` |
| 宋应昌 AI想象像 | 已采用 | `data/media-originals/portraits/batch-3/305_宋应昌_AI想象像_原图.png` | `exec-494a6273-636c-4a7d-a303-8e9e15de48ec.png` |
| 蓝玉 AI想象像 | 已采用 | `data/media-originals/portraits/batch-3/310_蓝玉_AI想象像_原图.png` | `exec-f87f7ba8-4666-4d1d-9951-c1bf72fc7aa9.png` |
| 马守真 AI想象像 | 已采用 | `data/media-originals/portraits/batch-3/312_马守真_AI想象像_原图.png` | `exec-dbc119d8-b953-4e9c-bd4d-bcc8b37ac6a5.png` |
| 商辂 AI想象像 | 已采用 | `data/media-originals/portraits/batch-4/410_商辂_AI想象像_原图.png` | `exec-8f948077-3057-4dd8-9ef8-c5eac5670f31.png` |
| 李贤 AI想象像 | 已采用 | `data/media-originals/portraits/batch-4/411_李贤_AI想象像_原图.png` | `exec-fecb4a14-8f45-4e35-9b18-6941e345e61d.png` |
| 王景弘 AI想象像 | 已采用 | `data/media-originals/portraits/batch-4/412_王景弘_AI想象像_原图.png` | `exec-ffe13dac-a960-404a-9c36-49c2ece27f1f.png` |
| 夏言 AI想象像 | 已采用 | `data/media-originals/portraits/batch-5/503_夏言_AI想象像_原图.png` | `exec-90c416d4-fe5a-48bd-bfe0-3a9994fdbe4a.png` |
| 张玉 AI想象像 | 已采用 | `data/media-originals/portraits/batch-5/505_张玉_AI想象像_原图.png` | `exec-58ca80bc-f26b-4f54-95c3-3194d09d2677.png` |
| 丘福 AI想象像 | 已采用 | `data/media-originals/portraits/batch-5/507_丘福_AI想象像_原图.png` | `exec-28189efa-bf4a-4101-9b46-7b8d02eed27f.png` |
| 朱能 AI想象像 | 已采用 | `data/media-originals/portraits/batch-5/509_朱能_AI想象像_原图.png` | `exec-edeb85e3-153e-4097-8393-f75413282877.png` |
| 刘瑾 AI想象像 | 已采用 | `data/media-originals/portraits/batch-5/510_刘瑾_AI想象像_原图.png` | `exec-be767422-574a-4f23-a1ca-9dd3bd573f9b.png` |
| 张永 AI想象像 | 已采用 | `data/media-originals/portraits/batch-5/511_张永_AI想象像_原图.png` | `exec-3b19413d-2b83-4b9b-bce3-4aefeb6cc363.png` |
| 沈鲤 AI想象像 | 已采用 | `data/media-originals/portraits/batch-6/602_沈鲤_AI想象像_原图.png` | `exec-d682980e-f2ba-4b90-8877-5900edc9a405.png` |
| 叶向高 AI想象像 | 已采用 | `data/media-originals/portraits/batch-6/604_叶向高_AI想象像_原图.png` | `exec-f1e555b1-5acd-48ac-a9f5-6f854c95584f.png` |
| 石亨 AI想象像 | 已采用 | `data/media-originals/portraits/batch-6/607_石亨_AI想象像_原图.png` | `exec-5301b8cb-bd8f-475d-912c-7a6678aa09f7.png` |
| 李成梁 AI想象像 | 已采用 | `data/media-originals/portraits/batch-6/609_李成梁_AI想象像_原图.png` | `exec-e78ed133-90ec-4143-ab5c-e40e28c049ac.png` |
| 刘綎 AI想象像 | 已采用 | `data/media-originals/portraits/batch-6/610_刘綎_AI想象像_原图.png` | `exec-9a48e547-8c18-48bd-ae47-36c0a081b0ed.png` |
| 毛文龙 AI想象像 | 已采用 | `data/media-originals/portraits/batch-6/611_毛文龙_AI想象像_原图.png` | `exec-af9da765-3d60-4b8e-8cd1-64a8157c6e54.png` |
| 金英 AI想象像 | 已采用 | `data/media-originals/portraits/batch-7/702_金英_AI想象像_原图.png` | `exec-4cf1231b-8f3a-478b-8244-ff1779f687b6.png` |
| 曹吉祥 AI想象像 | 已采用 | `data/media-originals/portraits/batch-7/703_曹吉祥_AI想象像_原图.png` | `exec-00d0d431-8634-4b12-a33c-46098878bca3.png` |
| 汪直 AI想象像 | 已采用 | `data/media-originals/portraits/batch-7/704_汪直_AI想象像_原图.png` | `exec-ba995b51-9b90-4116-b086-2afc0df976de.png` |
| 冯保 AI想象像 | 已采用 | `data/media-originals/portraits/batch-7/705_冯保_AI想象像_原图.png` | `exec-8ebaf993-5fd0-4787-a156-aa748c50d797.png` |
| 陈矩 AI想象像 | 已采用 | `data/media-originals/portraits/batch-7/706_陈矩_AI想象像_原图.png` | `exec-659dc88e-7991-4f1e-9fea-71c180cb782f.png` |
| 魏忠贤 AI想象像 | 已采用 | `data/media-originals/portraits/batch-7/707_魏忠贤_AI想象像_原图.png` | `exec-1a43ea20-f3d9-4826-9707-8d654e13f9e3.png` |
| 严世蕃 AI想象像 | 已采用 | `data/media-originals/portraits/batch-8/801_严世蕃_AI想象像_原图.png` | `exec-387459cc-8f11-4402-9c6c-a8cad6fbe092.png` |
| 胡惟庸 AI想象像 | 已采用 | `data/media-originals/portraits/batch-8/802_胡惟庸_AI想象像_原图.png` | `exec-671e94e9-4b2c-4256-a359-0bde56c245c3.png` |
| 宁国公主 AI想象像 | 已采用 | `data/media-originals/portraits/batch-9/901_宁国公主_AI想象像_原图.png` | `exec-10cab549-ddb1-4a48-a38e-5935438f381d.png` |
| 长平公主 AI想象像 | 已采用 | `data/media-originals/portraits/batch-9/902_长平公主_AI想象像_原图.png` | `exec-7d93ee02-bcad-4cba-895b-09623975e120.png` |
| 冯保 AI想象像 | 已采用 | `data/media-originals/portraits/imagined/冯保_AI想象像_原图.png` | `exec-2f656465-bdf8-46f4-887e-5d5feb6e4522.png` |
| 李如松 AI想象像 | 已采用 | `data/media-originals/portraits/imagined/李如松_AI想象像_原图.png` | `exec-0777ea7c-5f0d-434d-a290-5de23fa323a5.png` |
| 李自成 AI想象像 | 已采用 | `data/media-originals/portraits/imagined/李自成_AI想象像_原图.png` | `exec-a76ed541-c24f-421f-ae63-0fc6a70993a4.png` |
| 戚继光 AI想象像 | 已采用 | `data/media-originals/portraits/imagined/戚继光_AI想象像_原图.png` | `exec-40dbfd44-fa5a-4f96-9b1b-abd16dafafb4.png` |
| 史可法 AI想象像 | 已采用 | `data/media-originals/portraits/imagined/史可法_AI想象像_原图.png` | `exec-44929d80-bb9e-45a9-9892-4d49d447ee07.png` |
| 王振 AI想象像 | 已采用 | `data/media-originals/portraits/imagined/王振_AI想象像_原图.png` | `exec-c56ae447-61e1-4a89-8917-58e77af2b10a.png` |
| 于谦 AI想象像 | 已采用 | `data/media-originals/portraits/imagined/于谦_AI想象像_原图.png` | `exec-9f2fd6be-049a-4419-a260-f73af65e63f5.png` |
| 张居正 AI想象像 | 已采用 | `data/media-originals/portraits/imagined/张居正_AI想象像_原图.png` | `exec-f21f5fb8-0bc8-4b4b-a279-16bb295b0237.png` |
