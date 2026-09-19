# 心流工坊 · 蓝图 vs 实现 差距分析报告

> 分析对象：权威蓝图 `docs/融合版 · 心流工坊完整蓝图15.txt`（13 部分 + 7 附录，七层架构 / 幕僚 11 节 / 30 功能模块 / 宪法 52 条）  
> 对照代码：`project/frontend/src/`（活跃真源；`_archive/legacy_root_src/` 为旧归档不计；`src-tauri/` 为 Rust 后端，仅在功能明显需要后端命令时标注）  
> 方法：两个并行探查代理分别映射「功能与架构」「治理与生态」到实际代码，按 `implemented / partial / stub / missing` 判定，附文件:行证据。



---

## 〇、总览量化（先给结论）

| 维度         | 蓝图数量  | implemented | partial | stub | missing | 备注                                         |
| ---------- | ----- | ----------- | ------- | ---- | ------- | ------------------------------------------ |
| **七层架构**   | 8 层   | 8           | 0       | 0    | 0       | 第 8 层"触角"系统级子能力（锁屏/桌面覆盖）依赖 Tauri 后端，前端无法自证 |
| **功能空间模块** | 31 项* | 29          | 0       | 0    | 2       | 缺：模块十八 释光阁、模块二十七 息壤                        |
| **宪法条款**   | 52 条  | 42 建模       | —       | —    | 10      | **真正运行时硬门控仅 ~5 条**；第 43–52 条完全缺失           |
| **幕僚子章节**  | 11 节  | 9           | 1       | 0    | 1       | 互动=部分；见证=差距；触角=风险                          |
| **安全守护**   | 4 类   | 1 硬实现       | 3 配置+评分 | —    | —       | 真实行为靠后端/系统权限                               |
| **数据主权**   | 7 项   | 核心已实现       | 跨端待验证   | —    | —       | —                                          |
| **社区/生态**  | 7 项   | 沙箱+市场已实现    | 时间种子缺失  | —    | —       | —                                          |

> *功能空间 = 模块〇~二十九（30 个）+ 模块十四·五 应用空间自定义体系（1 个）= 31 项。
>
> ⚠️ **判定口径说明**：本报告的 `implemented` 意为"存在对应模块目录 + 视图/逻辑 + 关联测试"，**不等于特性完整打磨**。30 模块中 29 个"有代码"是事实，但各模块内部深度未被逐行核查，实际完成度可能参差。真正经量化暴露的短板在**治理深度**与**个别缺失模块**，而非功能数量——这修正了"功能太少"的直觉判断。

---

## 一、功能与架构差距

### 1.1 七层架构对照（8/8 存在）

| # | 层        | 状态 | 证据                                                                                                                    |
| - | -------- | -- | --------------------------------------------------------------------------------------------------------------------- |
| 1 | 底层运行底座   | ✅  | `engine/storage/`(sqlite/plaintext/kv)、`engine/tauri-bridge.ts`、`engine/rendering/scene-renderer.ts`                  |
| 2 | 共鸣协议层    | ✅  | `resonance/`(capability/types/contract-interfaces/bridges) 接口桥接完整                                                     |
| 3 | 可插拔引擎层   | ✅  | `resonance/implementations/gesture-interaction-engine.ts`、`engine/ai/`、`engine/rendering/`                            |
| 4 | 插件化调度层   | ✅  | `modules/plugin/`(loader/sandbox/scheduler)、`resonance/implementations/capability-registry.ts`                        |
| 5 | 功能插件生态层  | ✅  | `modules/canvas/`、`timer/`、`crystal/`、`breathing/`、`plugin/`                                                          |
| 6 | 殿堂装修工坊   | ✅  | `views/DecorationWorkshop.vue`、`InteractionConfig/EnvironmentEditor/SceneEditor/CarrierEditor/ConstitutionEditor.vue` |
| 7 | 用户数据资产层  | ✅  | `engine/storage/`、`modules/data-asset/`、`data-sovereignty/`、`sync/`                                                   |
| 8 | 贯穿层·殿堂触角 | ✅* | `modules/touchpoints/`(widget/greeting/glow/notification/orchestration)、`perception/`；*桌面静默入口/锁屏光痕/覆盖层依赖 `src-tauri`  |

### 1.2 功能空间模块（31 项：29 已实现 / 2 缺失）

| 模块             | 状态        | 证据                                                                                                             |
| -------------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| 〇 数据可视化自定义体系   | ✅         | `modules/visualization/`(dashboard-layout/component-market/style-packs/dimension-mapping/datasource-connector) |
| 一 输出管理         | ✅         | `modules/output/` + `views/Output.vue`                                                                         |
| 二 时间线索引        | ✅         | `modules/timeline-index/` + `views/TimelineIndex.vue`                                                          |
| 三 时间长廊         | ✅         | `modules/timeline/`(river/emotion-curve) + `views/TimeCorridorView.vue`                                        |
| 四 情绪花房         | ✅         | `modules/emotion/`(garden/flower) + `views/EmotionGarden.vue`                                                  |
| 五 逐日心锚         | ✅         | `modules/anchor/`(batch/cluster/journal/review/threads)                                                        |
| 六 守护室          | ✅         | `modules/safety/`(crypto-guard/anomaly-detector) + `views/GuardRoom.vue`                                       |
| 七 镜我           | ✅         | `modules/mirror/`(executor/parser/personality-model/llm-bridge)                                                |
| 八 留光阁          | ✅         | `modules/light/`(pavilion/guided-meditation)                                                                   |
| 九 思绪书房         | ✅*        | `modules/note/`(knowledge-graph/mind-map/version-history)（*与"家·书房"映射存疑）                                        |
| 十 经略阁          | ✅         | `modules/knowledge/`(graph-visualization/scenario-planner)                                                     |
| 十一 羁绊之厅        | ✅         | `modules/relation/`(relation-network/bond-bridge)                                                              |
| 十二 根脉之庭        | ✅         | `modules/roots/`(root-tree/decay-engine/visual-tree)                                                           |
| 十三 岁时阁         | ✅         | `modules/seasonal/`(cocoon/seasonal-journal)                                                                   |
| 十四 逸趣阁         | ✅         | `modules/play/`(time-seed/seed-share)                                                                          |
| 十四·五 应用空间自定义体系 | ✅         | `modules/space/`(app-space-manager/room-templates/space-orchestrator)                                          |
| 十五 身体温室        | ✅         | `modules/body/`(greenhouse/nutrition/exercise-tracker)                                                         |
| 十六 自律工坊        | ✅         | `modules/discipline/`(workshop/habit/streak-system)                                                            |
| 十七 字镜阁         | ✅         | `modules/word-mirror/`(etymology/semantic-network/writing-enhance)                                             |
| **十八 释光阁**     | ❌ missing | 无 `释光/release` 专属模块或视图；最近候选 `modules/breathing/`，建议确认是否并入邻近模块                                                  |
| 十九 阅览殿         | ✅         | `modules/reading/`(hall/book-recommendations)                                                                  |
| 二十 动律之间        | ✅         | `modules/movement/`(rhythm/recovery-optimizer)                                                                 |
| 二十一 更漏         | ✅*        | `modules/timer/` + `views/WorkHub.vue`（*枢纽较薄，核心计时节点在 `engine/timer.ts`）                                        |
| 二十二 工痕         | ✅         | `modules/worklog/` + `views/WorkLog.vue`                                                                       |
| 二十三 劳酬         | ✅         | `modules/reward/`(finance/milestones)                                                                          |
| 二十四 匠庐         | ✅         | `modules/craft/`(materials/synthesis/craft-bridge)                                                             |
| 二十五 业脉         | ✅         | `modules/career/`(career-simulator/skill-gap)                                                                  |
| 二十六 行囊         | ✅         | `modules/bag/`(bag-analytics/organize/evolution)                                                               |
| **二十七 息壤**     | ❌ missing | 全库 grep `息壤/xirang` 无专属模块/视图；可能隐含于 `home`(庭院种子) 或 `play`(time-seed)，但无独立功能空间                                   |
| 二十八 藏象阁        | ✅         | `modules/body-wisdom/`(constitution/meridian/five-movements)                                                   |
| 二十九 平行世界·梦境区   | ✅         | `modules/parallel-world/`(branch/worlds/scenario-sim)                                                          |

### 1.3 空间模型 / 家 / 环境

- **引力场画布（基底）** ✅：`modules/canvas/`(canvas-gravity/CanvasCarrier/CrystalLanding/AstrolabePortal) + `JadeBead.vue`/`Astrolabe.vue`（玉珠/介质呼吸/结晶落点/星盘入口齐备）。
- **家（9 房间）** ✅：`modules/home/` + `components/home/`(EntranceHall/Closet/KitchenDining/Bedroom/Bathroom/LivingRoom/StudyRoom/Courtyard/Hallway)。
- **安全岛（全局状态层）** ✅：`modules/sanctuary/`(`SanctuaryOverlay.vue`/`sanctuary-bridge.ts`/`useSanctuaryTrigger.ts`，连续点载体 5 次触发、墨色覆盖)。
- **环境/氛围系统** ✅(partial)：光/声/动已建（`customization/environment-templates.ts`、`useRoomAtmosphere.ts`、`home-atmosphere-engine.ts`）；**气味暗示维度缺实现**。

### 1.4 超出蓝图清单的实现

实现已超出 30 模块范围：`modules/advisor`(幕僚)、`cognition`(认知殿堂)、`will`(传承遗嘱)、`visitor`(访客)、`traditions`(传统)、`Dictionary.vue`(殿堂辞典) 等。说明工程推进快于蓝图列项。

---

## 二、治理与生态差距

### 2.1 宪法（第 1–52 条）

**计数：42/52 条被建模为规则（第 1–2 条=不可变核心 + 第 3–42 条=弹性规则），缺失第 43–52 条（10 条）。真正接入运行时"硬门控"的仅约 5 条，其余为"配置默认开启但非强制"或"建模但未被消费的软效果"。**

| 关键条款             | 蓝图要求      | 代码状态   | 证据                                                                                                        |
| ---------------- | --------- | ------ | --------------------------------------------------------------------------------------------------------- |
| 第1条 本地私有         | 数据永不出设备   | 部分/平台级 | `stores/constitution.ts:13-28` 硬编码不可改；前端无运行时拦截，依赖 Tauri 无网络权限（需后端核实）                                      |
| 第2条 超级自定义        | 用户可改一切    | ✅ 已实现  | `modules/customization/*`；宪法编辑器 CRUD `stores/constitution.ts:511-551`                                     |
| 第3条 心流第一         | 不推送不打断    | 部分硬门控  | `constitution-effect.ts:141` `advisor:enabled→disable` 经 `EFFECT_TO_OVERRIDE_MAP` 写入 `complianceOverride` |
| 第4条 数据驱动(呈现非评判)  | 只呈现不评判    | 仅观测未拦截 | `neutrality-checker.ts` + `stores/advisor.ts:1197-1222`（P2② 刻意"先观测、后可选拦截"，属分阶段设计）                         |
| 第5条 主动探索引擎(无推送)  | 无推送/弹窗/红点 | ⚠️ 受威胁 | `modules/touchpoints/push-channel.ts:298,366,456` 直接调用 OS `Notification` API——与硬条款冲突（需核实是否受宪法开关控制）        |
| 第8条 无脸人(中性呈现)    | 中性不评判     | 部分     | `elastic-faceless→advisor:forbidden-patterns` enable；同第4条仅观测                                              |
| 第16/35条 安全岛/触发响应 | 静默默认      | 部分     | `say()` 限频+开关 `stores/advisor.ts:1171-1184`；`sanctuary:enable` 效果存在但 UI 消费未验证                             |

**关键工程事实**：`getTargetEffectState` 仅在 `engine/constitution-effect.ts` 定义，全仓业务组件几乎不消费（grep 仅命 `App.vue`、`useConstitutionEffect.ts`、测试）。即 34+ 个 `EffectTarget`（如 `ui:particle-density`、`ui:notification reduce`、各类 `data:*`）**被计算但未被运行时真正消费**——属"建模/默认开启"，非硬门控。

### 2.2 幕僚 11 子章节

| #  | 子章节                | 状态    | 证据                                                                                                                                                                                                                               |
| -- | ------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | 幕僚本质(职责+性格+知识库+载体) | ✅     | `presets.ts` + `types/advisor.ts` AdvisorProfile                                                                                                                                                                                 |
| 2  | 镜我                 | ✅     | `stores/advisor.ts:168` ensureDefaultAdvisors；`:357` getFourActs；`:999` getAnnualDialogue                                                                                                                                        |
| 3  | 创建与管理              | ✅     | `stores/advisor.ts:109-139` add/update/removeAdvisorProfile                                                                                                                                                                      |
| 4  | 日常与成长              | ✅     | 好感度 `:141-236`；`modules/advisor/daily-life.ts`                                                                                                                                                                                   |
| 5  | 幕僚间互动              | 部分/桩  | 类型 `types.ts:10-85`(AdvisorRelation/InteractionRecord)；真实模拟引擎未确认                                                                                                                                                                 |
| 6  | 见证                 | ❌ 差距  | 通用 witness 日志 `stores/advisor.ts:679-735`；蓝图"仅存 `{advisor_id,memory_id,timestamp}`、禁储存感受、每月1-2次随机、模糊光点"**未落实**（`WitnessEntry` 仍含 `reaction/description/emotion` 字段；P2③ 仅整改了孤立的 `modules/advisor/witness.ts`，未改 store 通用 witness） |
| 7  | 触角(感知通道)           | ⚠️ 风险 | `modules/touchpoints/*`；问候应仅为极淡光点，但 `push-channel.ts` 用 OS 通知——违背宪法                                                                                                                                                              |
| 8  | 调令系统               | ✅     | `stores/advisor.ts:620` dispatchAvatar                                                                                                                                                                                           |
| 9  | 庆祝与退休              | ✅     | `stores/advisor.ts:944` retireAdvisor；`modules/advisor/celebration.ts`                                                                                                                                                           |
| 10 | 隐私与安全              | ✅     | 本地存储+可重置/删除；`modules/safety/privacy-dashboard.ts`                                                                                                                                                                                |
| 11 | 载体(幕僚身体)           | ✅     | `modules/carrier/index.ts` 生命周期 newborn→…→retired；`:191` retireCarrier→遗志；`:210` inheritCarrier                                                                                                                                  |

### 2.3 安全 / 数据主权 / 社区 / 文明 / 先祖 / 路线

- **安全守护（第八部分）**：`modules/safety/index.ts:138-171` 四类配置齐全；`crypto-guard.ts`（Web Crypto 端到端加密）✅ 已实现；SOS/反诈骗/行程守护/跌倒检测属配置+安全评分，真实传感器/OS 行为需后端 → **部分**。
- **数据主权与遗忘（第九部分）**：`modules/data-sovereignty/index.ts` 五种遗忘法 `:73-114`、六种退场态 `:118-173`、`executeForgetting:484`、`useDataExtradition`/`useCrossDevice` → **核心已实现**；跨端实际传输疑似桩。
- **社区与生态（第十部分）**：`modules/plugin/*`（沙箱 `isolateFS/Network/DOM` `loader.ts:106`、权限分级、marketplace）✅ 已实现(部分)；`modules/visitor/*` 访客模式 ✅ 基础；**时间种子遗传（第46–48条）缺失**。
- **文明根系（第十一部分）**：`modules/roots/*`(decay-engine/root-tree/root-visualization/root-narrative) + `modules/traditions/*` → 已实现(部分)。
- **先祖遗志（第十二部分）**：`modules/carrier/index.ts:191,210` + `will` 模块 → 已实现(部分；先祖树疑似桩)。
- **落地路线图（第十三部分）**：grep 全仓无 "第一阶段…第五阶段/roadmap" 跟踪 → **缺失（仅文档）**。

---

## 三、关键风险清单（按优先级）

| 优先级    | 风险             | 说明                                                              | 关联          |
| ------ | -------------- | --------------------------------------------------------------- | ----------- |
| **P0** | 推送通道违反"无推送"硬条款 | `push-channel.ts` 直接调 OS `Notification`，与第5条冲突                  | 第5条(内核级)    |
| **P1** | 幕僚见证硬约束未落实     | store 通用 witness 仍存 reaction/description/emotion，违反蓝图"仅三元组+禁感受" | 第四部分·六      |
| **P1** | 第 43–52 条完全未建模 | 含时间种子遗传(46–48)、社区红线细化等                                          | 第二部分 / 第十部分 |
| **P1** | 释光阁 / 息壤 缺失    | 需决策：独立实现 or 并入邻近模块（呼吸/庭院种子）                                     | 第七部分        |
| **P2** | 宪法软效果未消费       | 34+ EffectTarget 计算但不被运行时消费，门控形同虚设                              | 第二部分        |
| **P2** | 环境"气味"维度缺      | 光/声/动齐，气味暗示未实现                                                  | 第六部分        |
| **P2** | 第 8 层系统级触角     | 锁屏/桌面覆盖/静默入口依赖 `src-tauri` 命令                                   | 第三部分·八      |
| **P2** | 跨端接续传输         | `useCrossDevice` 疑似桩，真实同步未验证                                    | 第九部分        |

---

## 四、结论与建议

**修正直觉**：此前"功能太少"的判断被量化结果推翻——**30 个功能空间已有 29 个存在代码、七层架构 8/8 落地、幕僚 11 节 9 节已实现**。真正的短板不在"功能数量"，而在三处：

1. **治理深度浅**：宪法 52 条仅 ~5 条真正运行时门控，大量 `EffectTarget` 计算却不消费；这是"有宪法之名、缺宪法之实"的最关键风险。
2. **个别硬约束未落实**：幕僚见证"禁感受"约束、推送"无推送"硬条款存在代码级违反。
3. **尾部缺失**：第 43–52 条宪法、释光阁/息壤、环境气味、跨端传输。

**建议的下一步（按性价比）**：

- **立刻修 P0**：核实并收敛 `push-channel.ts` 的 OS 通知，使其受第5条宪法开关硬控（或改为纯前端极淡光点）。
- **P1 填治理深坑**：① 让 `constitution-effect.ts` 的 `EffectTarget` 真正被运行时消费（至少把"无推送/中性呈现/安全岛静默"做成硬门控）；② `stores/advisor.ts` 通用 witness 落实"仅三元组+禁感受"；③ 建模第 43–52 条（优先时间种子遗传）。
- **P1 决策缺失模块**：释光阁/息壤 是否独立实现或并入邻近模块，给出明确结论并入路线图。
- **P2 补尾部**：环境气味维度、跨端传输验证、第 8 层系统级触角后端对接。

> 注：本次为静态代码映射分析（未执行运行时代码），`implemented` 判定基于"模块+视图+逻辑+测试"的存在性。如需对各模块内部完成度做深度核查，可针对单个模块派专项探查。
