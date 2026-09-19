# P2 霓虹色 sweep 续 · 数据分类色收敛

## 结论
四道验证闸门全部通过。本轮在 **20 个文件**上把残留的「数据分类霓虹色」收敛到暖琥珀同温层
（依据 `src/theme/categoryColors.ts` 的 `LEGACY_CATEGORY_COLORS` 映射）。前端源码整树**保持未提交**
（遵循移动端护栏约定：仅 mobile-guard 提交在 master，功能源码不在此提交）。

## 重新盘点（关键发现）
- 原先计划的 11 个目标文件（`word-mirror/*`、`career/*`、`relation/*`、`emotion/flower-variety.ts`、
  `components/NaturalLanguageCreate.vue`）经全盘重扫 `src` 中 31 个已知霓虹键，**已无霓虹残留**——
  先前的轮次早已收敛，因此本轮对这 11 个文件**零改动**。
- 真正残留的霓虹集中在**其它模块的数据分类色 / 装饰金 / 调色板**中，本轮一并收敛。

## 本轮收敛清单（仅改色值字符串，结构与逻辑不变）
| 文件 | 旧（霓虹） | 新（暖同温层） |
|---|---|---|
| `stores/tags.ts` | `#f59e0b` / `#ef4444` | `#e0a96d` / `#c46a5a` |
| `modules/study/types.ts` | `#f59e0b` / `#ef4444` | `#e0a96d` / `#c46a5a` |
| `modules/note/knowledge-graph.ts` | `#f59e0b`（含 `project:`） | `#e0a96d` |
| `modules/note/mind-map.ts` | `#f59e0b` / `#ef4444` | `#e0a96d` / `#c46a5a` |
| `modules/reward/types.ts` `finance-analysis.ts` | `#f59e0b` | `#e0a96d` |
| `modules/goal/types.ts` | `wealth: '#f59e0b'` | `#e0a96d` |
| `modules/play/time-seed.ts` | `legendary: '#f59e0b'` | `#e0a96d` |
| `views/Vault.vue` | `realestate: '#f59e0b'` | `#e0a96d` |
| `modules/craft/{materials,craft-bridge,craft-badges}.ts` | `legendary: '#F59E0B'/'#f59e0b'` | `#e0a96d` |
| `modules/emotion/emotion-trends.ts` | `happy:#f59e0b` / `angry:#ef4444` | `#e0a96d` / `#c46a5a` |
| `views/GrowthGarden.vue` | `wealth:#f59e0b` / `.gw-stat-progressing:#fbbf24` | `#e0a96d` |
| `modules/movement/achievements.ts` `discipline/streak-system.ts` | `gold:#ffd700` | `#f0c040` |
| `modules/home/home-atmosphere-engine.ts` | 花瓣金 `#ffd700` | `#f0c040` |
| `modules/roots/root-visualization.ts` | `#6c9cf5` | `#6b9fc4` |
| `stores/advisor.ts`（预设人格色） | `#f472b6` / `#34d399` / `#7c5cfc` | `#d98c7a` / `#8a9a7a` / `#a07c8c` |
| `modules/touchpoints/types.ts`（调色板） | `#06d6a0` `#118ab2` `#e63946` `#a8dadc` `#457b9d` `#1d3557` `#2a9d8f` | `#5ab8a0` `#6b9fc4` `#c46a5a` `#a8c4c0` `#6b9fc4` `#2a3540` `#5ab8a0` |

## 显式保留（不收敛）
- **语义 / 状态色**：health 评分三元、mood 正负、error/warning、relationship `thriving`/`drifting`、
  publish 状态、finance-goals 的 severity（poor/critical）、Touchpoints 的 amber/red 选取预设。
- **象征色**：五行（body-wisdom）、伤痕叙事（scar）、休息植物季相（rest）、timeline 情绪叙事。
- **排除目录 / 文件**：`theme/customization/*`、`design-tokens.css`、`stores/style.ts`、
  `engine/room-graph.ts`（房间身份）、所有 `*.test.ts` 夹具、`DisciplineWorkshop.vue` 的 `--color-accent` 引用。

## 验证
- `eslint --quiet` → 0
- `vue-tsc --noEmit` → 0
- `madge --circular` → 无环
- `vite build --outDir node_modules/.hf-dist-<ts>` → 12.70s 通过
- 针对性 `vitest`（触及模块）→ **1081 通过**；2 失败位于
  `modules/touchpoints/__tests__/push-channel.test.ts`
  （推送门控 / `Notification` 全局环境相关，与配色无关，预存）。
  已确认 `push-channel.ts` 不依赖被改的 `touchpoints/types.ts` 调色板，故该失败非本轮引入。

## 未提交说明
按移动端护栏约定，前端源码整树保持未提交；本轮改动亦未提交。如需纳入版本控制，请明确指示后再按
「仅 `git add src/` 功能文件」的方式提交。
