# P2 收口（归档 UI 完整收口）执行报告

> 日期：2026-08-11 · 阶段：P0→P1→P2 路线图全量落地后的归档 UI 收口
> 范围：将 P1-1 已就绪但无挂载点的「归档」数据层，变成真正可用的 UI 面板（用户于 2026-08-11 确认「两者都做·完整收口」）

## 一、背景与缺口
P1-1（归档）已实现两个数据层能力，但经核查**两者此前均无列表视图可挂载**：
- **留光阁**（`light` 模块）的 `meditations` / `releases` 记录，经全仓 grep 确认**未在任何视图渲染**（`CognitionHall.vue` 标题虽为「释光阁」，但其冥想数据来自 `cognition` 模块的 `useMeditationAnalytics`，与 `light` 模块无关）。
- **镜我对白**（`dialogue-persistence.ts`）的 `DialogueSession` 归档，经 grep 确认 **无列表视图**（`AdvisorHub.vue` 的「对话记录」是 advisor 扁平聊天，非 `DialogueSession`）。

此外 `dialogue-persistence.ts` 只有 `archiveSession()`，**缺少 `restoreSession()`**，无法在 UI 上「恢复」。

## 二、本次落地内容

### 1. 补 `restoreSession`（数据层对称）
- `src/modules/mirror/dialogue-persistence.ts`：新增 `restoreSession(sessionId)`（置 `archived=false` 并 `saveSessions()`），加入 `useDialoguePersistence()` 返回对象。与 `light` 模块的 `restoreMeditation`/`restoreRelease` 对称。

### 2. 留光阁归档面板（收口-6）
- 新建 `src/components/LightRecordsPanel.vue`：消费 `useLightPavilion()`，分「冥想记录」「释怀记录」两组，各显示**活跃 / 已归档**列表与**归档 / 恢复**切换；含类型/方式图标、时长、日期、状态前后、洞见、释怀内容截断。
- 挂载至 `src/views/CognitionHall.vue`（释光阁视图）：在现有「冥想分析」区块之后新增「🏮 留光阁记录」区块。
- 新建 `src/components/__tests__/LightRecordsPanel.test.ts`（3 项：显示+归档按钮 / 冥想归档后恢复 / 释怀归档）。

### 3. 镜我对白归档面板（收口-5）
- 新建 `src/components/DialogueSessionList.vue`：消费 `useDialoguePersistence()`，显示**活跃会话 / 已归档会话**两组与**归档 / 恢复**切换；含标题、条目数、时间、意图标签（`INTENT_INFO`）。
- 挂载至 `src/views/AdvisorHub.vue`：在现有「💬 对话记录」区块之后新增独立「🪞 镜我对白会话」区块（与原 advisor 聊天记录区分）。
- 新建 `src/components/__tests__/DialogueSessionList.test.ts`（3 项：显示活跃+归档按钮 / 归档后恢复 / 直接显示已归档）。

## 三、验证闸门（全部绿）
| 闸门 | 命令 | 结果 |
|------|------|------|
| 类型检查 | `vue-tsc --noEmit` | **0 错误** |
| 单元回归 | `vitest run` | **302 文件 / 7050 用例全过**（本阶段新增 6 项） |
| 静态检查 | `eslint --quiet`（收口改动源） | **0 错误** |
| 循环依赖 | `madge --circular --extensions ts,vue`（957 文件） | **0 循环依赖** |

## 四、关键实现说明
- **命名债延续**：`light` 模块目录注释自认「释光阁」、蓝图称「留光阁」，且 `CognitionHall.vue` 标题也为「释光阁」——本次未改名，仅在面板标题以「留光阁记录」显式标注，规避歧义。
- **组件用 `useLightPavilion` 而非 `useLightBridge`**：`useLightBridge()` 仅暴露 `meditationRecords`/`archivedMeditations`/`releaseEntries`/`archivedReleases`，**不含 `activeMeditations`/`activeReleases`**；面板需要全量活跃/归档分流，故直接消费 `useLightPavilion()`（其计算属性与归档动作完整）。
- **测试范式**：两个面板测试均遵循既有 `createMockStorage + invalidateCache + vi.resetModules + 动态 import` 范式；种子数据直接写入 `schema.kvStore[key]`（本案 `getKV` 不做额外 `JSON.parse`，由 `saveSchema` 整体序列化兜底）。

## 五、剩余已知项（不阻塞，未自动推进）
1. **双笔记系统负债**：`study.Note` 与 `note.StickyNote` 同读 `storage.getNotes()`，结构性待办（P2 SRS 已规避）；属高风险专项，需单独确认范围。
2. 归档 UI 现已可用，但未接入「数据档案馆」(`/archive`) 的聚合视图——当前分别在释光阁 / 幕僚大厅两处挂载，符合「本地私有、分房间」的宪法风格。

## 六、交付物
- 报告：`E:\Heartflow\分析报告\P2收口(归档UI)执行报告.md`
- 代码：`LightRecordsPanel.vue` / `DialogueSessionList.vue` 及两视图挂载、单测。
- 日志：`E:\Heartflow\.workbuddy\memory\2026-08-11.md` 已追加本阶段记录。
