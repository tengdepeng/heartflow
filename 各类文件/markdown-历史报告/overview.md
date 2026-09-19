# Heartflow · Item 8 收口 + 幕僚功能完善（A/B/C）

> 更新时间：2026-08-30。
> **提交状态**：Item 8 及前 9 项已收尾提交 **commit 72c9d32**（分支 master，**未推送**——用户规则：不 push、仓库无 remote）。
> **本轮幕僚 A/B/C 改动未提交**（未 git add）。

---

# 第一部分 · Item 8（外链房）收口

按用户拍板：AI 模型设置先落地；新建 `/external` 独立房间；云同步走本地加密文件夹（合规零后端）。

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/engine/room-graph.ts` | 改 | 新增 `external` 房间节点（group:system，邻接 home-space / launcher） |
| `src/router/index.ts` | 改 | 新增 `/external` 路由 → `ExternalRoom.vue` |
| `src/views/ExternalRoom.vue` | 新增 | 5 子段视图（AI 设置实做，其余占位） |
| `src/components/external-room/AIModelSettings.vue` | 新增 | AI 模型/接口设置面板 |
| `src/components/external-room/PendingSection.vue` | 新增 | skill/云同步/提示词/榜单 未建段占位 |
| `src/views/__tests__/ExternalRoom.test.ts` | 新增 | 6 用例，绿 |
| `src/components/external-room/__tests__/AIModelSettings.test.ts` | 新增 | 7 用例，绿 |

**回归修复（本轮真修）**：`featureDictionary.ts` 去静态 router import（改注入式 `setRouteSource`）、`kv.ts` 单向数组性守卫、`advisor.ts loadCommandTasks` 加 `Array.isArray` 防御、`Settings.test.ts` 断言 12→13。

---

# 第二部分 · 幕僚功能完善（A/B/C）

用户拍板三项全做，按 A→B→C 顺序推进。

## A. finance 调令真办事 ✅

| 文件 | 改动 |
|---|---|
| `src/modules/advisor/commandExecutor.ts` | 新增 `finance` 分支 + `tryQuickRecord()`：用账本自己的 `parseQuickEntry` + `quickEntryToRecord` **真落一笔账**，回执写入 `task.resultSummary` |
| `src/views/AdvisorHub.vue` | `if (task.targetRoute)` → `if (task.targetRoute && task.taskType === 'navigate')`，否则 finance 会被提前拦截、永远走不到执行器 |
| `src/stores/advisor.ts` | finance 汇报改为 `t.resultSummary ?? 原跳转文案`（照实转述） |

- **只在解析出金额时才代记**；无金额（"我想看看账本"）仅跳转，绝不瞎写；解析异常静默降级为纯跳转。
- 新增 2 个测试：带金额真落账（`amount=35`，NLP 用真实实现、落盘用 mock）／无金额不代记。

## B. 幕僚接 AI 引擎 → 核实为**已完成**，未动

`stores/advisor.ts:957` 已调 `aiEngine.getAdvisorReply`（`isAIEngineEnabled()` 门控，失败回退规则匹配），`AdvisorChat.vue:205` 用 `try{await reply()}catch{replySync()}` 正确降级。

剩余两个零消费 AI 能力属**设计使然，不宜硬接**：

| 能力 | 为何不接 |
|---|---|
| `getDingyinReply` | 定音 `getIronLawResponse()` 注释明写「只输出这一句话，**不做任何总结性叙事**」——项目「克制、不替用户总结」哲学，接 AI 总结即违背蓝图 |
| `getAnnualDialogueReply` | `collectAnnual/renderLetter` **只被 index.ts 再导出、无任何 .vue 消费**（年度信整体没接界面），接了也看不到；且年度信同样奉行「没有总结，只有陈列」 |

## C. advisor-bridge 死代码处置 ✅ 接线而非删除

实证**不是纯死代码**：操作入口多为一行转发（冗余），但有 4 个**独有聚合能力**（子模块没有）：
`relationNetwork`（亲密度分级分布）· `ritualSummary`（庆祝/退休汇总）· `witnessLogSummary`（见证类型分布+最近 10 条）· `createAdvisorSummary`（一人身上汇总作息/关系/见证）。

- 接到 `AdvisorHub.vue`：`advisorSummaries` computed Map（避免 v-for 内重复计算），卡片显示**「此刻在做什么」**（`ACTIVITY_META` icon+label）与**未读见证徽标**。幕僚阁从静态名单变成活的体系。
- 顺手修 A 项文案尾巴：调令说明补上「按你说的金额记一笔账」。

---

## 🔥 本轮最大教训：两次误判（已固化到项目记忆）

| 误判 | 真相 |
|---|---|
| 「finance 只汇报不办事」 | `commandIntent.ts:191` 已设 `targetRoute='/reward'`，`AdvisorHub:214` 有 targetRoute 就立即 push 并 return，**根本不走 executor**——我只看了 executor 的 switch |
| 「幕僚零 AI 接线」 | `stores/advisor.ts:957` 已接 AI——**我的扫描只覆盖 `modules/advisor/`，漏了 `stores/`** |

**固化规则**：判「未接线 / 死代码 / 缺失」前，grep 必须同时覆盖 `modules/` + `stores/` + `views/` + `engine/`；且要追到**调用链终点**（谁调用、走哪个分支），不能只看函数有无分支。

---

## 验收

| 项 | 结果 |
|---|---|
| `vue-tsc --noEmit` | **0 error**（A 项、C 项各跑一次均 EXIT=0） |
| advisor + reward 模块 | 528 测试绿 |
| 幕僚 5 视图（Hub/Chat/Archive/Affinity/WitnessLog） | 44 测试绿 |
| commandExecutor + commandIntent | 36 测试绿 |
| **全量** | 9 failed / 10156 passed（10165） |

**全量 9 个失败中 7 个经隔离单跑全绿** → 属重负载 `ECONNREFUSED :3000` 环境抖动（3000 端口在源码里 grep 不到，非项目依赖）：

- `HomeSpace.test.ts` 13/13 绿
- `MirrorSelfView.test.ts` 5/5 绿
- `room-mount-smoke.test.ts` **87/87 绿**

剩余 2 个 = 既有基线失败（`p16-note` 期望 12 月→11、`time-lens-contract` 期望 999→0），**非本次引入**。

**→ A/B/C 零真实回归。**

### 续作（第三部分）验收

| 项 | 结果 |
|---|---|
| `vue-tsc --noEmit` | **0 error**（修了 1 处测试回调隐式 any） |
| AdvisorHub + 四面板 | 32 测试绿（26 + 6） |
| **全量** | **3 failed / 10188 passed（10191）** |

全量 4 个失败文件**全部为既有，非本轮引入**：

| 文件 | 性质 |
|---|---|
| `timeline-patterns` / `p16-note` / `time-lens-contract` | 既有基线失败 |
| `ExerciseTrackerPanel` | **新发现·既有**：面板实际渲染 `总时长 1.3时`（75 分钟已改小时制），测试仍期望 `'75'` —— **测试断言过时**。两次隔离运行输出完全一致，且 git 实证 exercise/body 文件零改动 |

> 全量失败数从上轮 9 → 3：上轮那 7 个 `ECONNREFUSED` 抖动的 HomeSpace / MirrorSelfView / room-mount-smoke **本次未复现**，坐实为环境抖动而非回归。

---

---

# 第三部分 · 幕僚生活四面板上盘（续作）

## 发现：1033 行孤儿组件

全目录扫描（覆盖 components/views/stores/engine/modules/composables）发现 4 个面板**实现完备却从未挂载到任何视图**：

| 组件 | 行数 | 内容 |
|---|---|---|
| `AdvisorCelebrationPanel.vue` | 244 | 庆祝事件 / 退休仪式 |
| `AdvisorDailyLifePanel.vue` | 164 | 幕僚作息 |
| `AdvisorInteractionPanel.vue` | 235 | 幕僚间互动 / 关系网 |
| `AdvisorWitnessPanel.vue` | 172 | 见证记录（含「记录一次见证」交互） |

> `ChallengeAdvisorPanel.vue`(218 行) 虽带 Advisor 名，但依赖 `modules/discipline/*`（习惯画像 → 挑战推荐），**不属幕僚管家体系**，未动。

## 接线方案

四面板契约统一（都只吃 `advisors: AdvisorProfile[]`、无 emits），在 `AdvisorHub.vue` 加「幕僚生活」分区，**用标签页收纳而非平铺**——守「极简 UI 表面、面板折叠为单一元素」的偏好。

标签挂**真实数量徽标**（0 不显示，避免噪音），顺带消灭 `advisor-bridge` 剩余死代码：

| 标签 | 徽标来源 |
|---|---|
| 🕰 作息 | 正在活动的幕僚数（`advisorSummaries`） |
| 🤝 互动 | `bridge.relationNetwork.totalRelations` |
| 🎉 庆祝 | `bridge.ritualSummary` 今日 + 即将 |
| 👁 见证 | `bridge.witnessLogSummary.unviewedCount` |

## 测试 +7

- `components/__tests__/advisorLifePanels.test.ts`（6）：四面板挂载底线 + 空名单不抛错
- `views/__tests__/AdvisorHub.test.ts`（+1）：点击「见证」标签真能换面板并渲染

---

## 方法论修正（本轮新踩）

扫描「零消费导出」时若排除定义文件，会把**内部辅助函数误判为孤儿**——如 `exportCarrierFile` 显示 0 消费，实为同文件 `downloadCarrierFile` 的底层（后者已被 `AdvisorCarrierEditor` 消费，功能早已上盘）。**判孤儿前必须回定义文件确认是否被同文件函数调用。**

## 结论与状态

- Item 8 及前 9 项：已提交 **72c9d32**（不 push）。
- 幕僚 A/B/C + 续作四面板上盘：实现完成、验收通过，**均未提交**。
- 任务清单 7/7 → 加 A/B/C（#8/#9/#10）+ 续作（#11）全 completed。

## ⚠️ 提交前必读：工作区混入非本会话改动

`git status` 显示以下改动**非本会话创建**，提交前必须逐文件核对（禁用 `git add -A`）：

- 已修改：`modules/{mirror,parallel-world,transform,unfinished}/index.ts`、`views/{MirrorSelfView,ParallelWorld,TransformGallery,UnfinishedGarden}.vue`
- 新增未跟踪：`ParallelWorldArchivePanel.vue`、`PersonalityArchivePanel.vue`、`ReclamationWeatherPanel.vue`、`TransformMomentumPanel.vue` + 3 个同名测试

本会话实际改动仅限：`modules/advisor/commandExecutor.ts`（+测试）、`stores/advisor.ts`、`views/AdvisorHub.vue`（+测试）、新增 `components/__tests__/advisorLifePanels.test.ts`。

---

# 第四部分 · 按蓝图18 第四部分核对幕僚体系（522-673 行）

先读蓝图原文，再逐条 grep 实证。

## 已闭合（蓝图补注已过时，勿再当缺口）

| 蓝图点名 | 行号 | 实证 |
|---|---|---|
| **C2 开放项·文案中性检测** | 672 | **已实现**：`stores/advisor.ts:1396` 运行时中性检测（forbiddenPatterns / comparativePhrases / personification，默认仅记录供审计）。蓝图说「为空预留注释」已过时 |
| **6 类固定幕僚预设** | 578-586 | **已实现**：`presets.ts` 齐备 镜我/追风/灵犀/默渊/时痕/守钟人（C4 差距项也闭合） |
| 见证记录简化 / 定音锤四幕 | 618-623 / 540-565 | 均已落实 |

## 真差距（用户拍板 A→B→C→D 全做，逐项推进）

| # | 蓝图要求 | 行号 | 实证现状 |
|---|---|---|---|
| **A** | 分身上限**默认 3、用户可调** | 576 | `core.ts:323` 为 7 且**零消费**；UI 硬编码 5 —— 值不对、也不可调。**✅ 已修** |
| **B** | 专属知识库范围 | 573 | 完全缺失 → **✅ 已修（本轮）** |
| **C** | 协调权可转移 / 可关闭集中协调 | 544 | 完全缺失 → **✅ 已修（本轮）** |
| D | 调令拆解分派、最后汇总 | 646 | 现为单幕僚派单 |
| E（小） | 删除后任务标注「由已删除的幕僚完成」 | 664 | 已存 `advisorName`，缺标注逻辑 |

## A 项 ✅ 分身上限（本轮交付）

| 文件 | 改动 |
|---|---|
| `engine/storage/core.ts:323` | `maxAdvisors: 7` → **3**，重写注释（旧注释自相矛盾：既说固定幕僚「不计入额度」又按「6固定+N用户位」算） |
| `views/AdvisorHub.vue` | 硬编码 5 → `ref(storage.getKV('advisor:maxUserAdvisors', 3))` + `adjustLimit(±1)`（1-9，持久化）；操作区加紧凑步进器 `上限 − 3/3 +` |

**避坑**：上限存 **KV 而非 config** —— 本视图未依赖 `getConfig()`，而 `AdvisorHub.test.ts` 的 storage mock 只提供 `getKV/setKV/getAdvisors`，引入 `getConfig` 会挂掉 26 个既有测试。

**测试 +2**：默认为 3（蓝图值）／可增减并持久化／满额禁用创建按钮、提额后恢复可用。
**验收**：`vue-tsc` **0 error**；AdvisorHub **28 测试全绿**。

## B 项 ✅ 专属知识库范围（本轮交付）

**核心原则：先建消费点，再建字段。** 只加字段不接链路，就是又一个「存了不消费」的孤儿。

**新增** `modules/advisor/knowledge-scope.ts`：

| 导出 | 作用 |
|---|---|
| `KnowledgeScope` | `{ mode: 'all'\|'domains'\|'manual', domains?: DomainKey[], itemIds?: string[] }` |
| `normalizeScope()` | 空集合一律回退「全殿堂」——不许看任何东西的幕僚没有意义 |
| `collectHallKnowledge(scope, limit=12)` | **消费点**：从 `association.collectAllItems()` 取 10 域条目，按范围过滤 → 时间倒序取最近 N 条 → 渲染成 `- [笔记] 关于专注（2026-08-20）` |
| `itemKey()` | `域:条目id`，避免跨域 id 撞车 |

**链路四层贯通**：`types/advisor.ts` 加字段 → `engine/ai/prompt.ts` 模板加 `{{hallKnowledgeBlock}}`（有痕迹才拼标题，无痕迹整块为空）→ `engine/ai/index.ts` `getAdvisorReply` 末尾加可选参数透传 → `stores/advisor.ts reply()` 先取材再注入 → `AdvisorHub.vue` 表单加「专属知识库」选择（全殿堂 / 仅限特定领域 + 域芯片多选），创建/派生/编辑/保存四处接线。

**关键技巧**：`renderTemplate` 会**移除未替换的占位符**，故给内置模板加新占位符完全向后兼容；`getTemplate` 只读内置常量、不读用户配置，改模板立即生效。

**测试 +13**：`knowledge-scope.test.ts`(10，含「范围真的在过滤」的反向断言) + `prompt.test.ts`(+2) + `AdvisorHub.test.ts`(+1，UI 选域 → 存档带 knowledgeScope 的闭环)。

**验收**：`vue-tsc` **0 error**（修了 1 处漏导 `KnowledgeScope` 类型）；AdvisorHub 29 + prompt 19 + knowledge-scope 10 全绿。全量 **4 failed / 10222 passed（10226）** —— 3 个既有（p16-note / time-lens / ExerciseTrackerPanel 过时断言）+ 1 个 `ScarArchivePanel` 隔离单跑 **6/6 通过**（重负载 ECONNREFUSED 抖动，日志 40 次）。**0 真实回归**。

**遗留**：`manual` 模式（手动指定条目）数据层已支持并测过，UI 未做条目选择器。

## C 项 ✅ 协调权转移 / 关闭集中协调（本轮交付）

**实证前提**：代码里**原本没有「总管」实体**——派单 `dispatchAvatar` 是纯 `role × taskType` 权重算法，镜我只在派单失败时作为兜底名字硬编码（`advisor?.name ?? '镜我'`）。所以本项不是加开关，而是**先立起协调者概念、再给它真实消费点**。

**新增** `modules/advisor/coordinator.ts`：`CoordinatorMode = 'jingwo' | 'custom' | 'off'`，配置存 KV；`resolveCoordinator()` 负责解析（off→null；镜我不在位→回退首位在位者；custom 目标失效→回退镜我）。

**消费点（三处真实行为差异，非空开关）** —— `stores/advisor.ts issueCommand`：

| 情形 | 行为 |
|---|---|
| 派单无人可选 | 由**协调者**接手，替代硬编码的「镜我」 |
| custom 模式 | 接手的是被指定的幕僚 |
| **off 关闭协调** | 不署任何幕僚的名：`progressDesc` 从「阿七 正在…」→「正在…」；兜底汇报从「已交由 X 协调」→「已按调令处理」；任务不写空串 |

**UI**：幕僚阁加「🗝 协调权」分区（三选一 + 指定下拉 + 实时显示当前协调者）。

**测试 +13**：`coordinator.test.ts`(10) + `stores/advisor.test.ts`(+3，**消费点在 store 层验证**)。

**踩坑**：断言 `task.advisorName` 应为 undefined 却得到 `''`（代码用 `?? ''`）。**改代码而非改测试**——无署名人时字段留空（`|| undefined`）。

**验收**：`vue-tsc` **0 error**；advisor 相关 200 测试全绿。全量 **7 failed / 10232 passed（10239）** —— 3 个既有（p16-note / time-lens / ExerciseTrackerPanel 过时断言）+ 4 个视图（GuardRoom / HomeSpace / WisdomPavilion / room-mount-smoke）**隔离单跑 64/64 全绿**（含 87 视图挂载冒烟），属重负载 ECONNREFUSED 抖动。**0 真实回归。**

## 待办（D + E 小项）

- **D 调令任务拆解分派**（蓝图 646）：当前单幕僚派单，需新增多任务并发模型与汇总层（最复杂）。
- **E（小）**：删除幕僚后，其参与过的任务标注「由已删除的幕僚完成」（蓝图 664）——任务已存 `advisorName`，缺标注逻辑。

## 本轮固化要点

- **蓝图补注会过时**：672/157 行点名的开放项实际已实现 —— 据蓝图提差距必须 grep 实证，不能照抄补注。
- **配置「存在」≠「生效」**：`maxAdvisors: 7` 在 config 里躺了很久但零消费，判配置是否生效要 grep 消费者。

**下一步可选**：
1. 按具体文件 `git add` + commit（不 push）——先收本会话的 4 处改动，别带上混杂项；
2. 修 `ExerciseTrackerPanel` 过时断言（`'75'` → `'1.3'`，一行改动，超出幕僚范围）；
3. 修 3 个既有 timeline/note 测试断言（超出原 10 项范围）；
4. 年度信（`collectAnnual/renderLetter`）整体无 UI —— 独立功能项，非幕僚完善范围。
