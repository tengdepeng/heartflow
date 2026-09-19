# 心流工坊 · 八项需求 — 阶段 A 审计与修复计划

> 前提：保证不改变现有状态，仅做增删改查式改动。阶段划分：A 修坏的（1/2/4）→ B 找回+GitHub → C 新建（3/7/8）。

## 已确认的根因（A 阶段）

### 1(a) 侧栏「创建自定义房间不显示」—— 实为缺失功能
- `RoomSettingsPanel.vue` **没有任何「创建房间」入口**；它只管理已存在房间的显隐/改名/图标/钉入。
- `engine/room-graph.ts` 的 `getAllRooms()` 读取一个**静态常量 `ROOM_GRAPH`**（`Object.values(ROOM_GRAPH)`），全仓无 `addRoom`/`registerRoom`。
- `useRoomManager`（`modules/room-manager/index.ts`）的 `loadAllRoomConfigs` **只遍历 `getAllRooms()`**，不在 room-graph 里的房间直接被丢弃。
- 侧栏 `navTree`（`App.vue`）同样源自 `getAllRooms()`。
- 结论：当前架构下「自定义房间」无法被创建，也就无法出现在侧栏。**这不是接线 bug，而是缺少一条「自定义房间」的数据通道**，需要先定设计：要么让 `ROOM_GRAPH` 可运行时扩展，要么新增独立的 custom-rooms 存储并在 `navTree` / `roomEntries` 里合并。
- 待你确认：「自定义房间」具体指什么——① 从零新建全新房间（含路由/视图）？② 还是仅把现有的「外部链接/收藏」做成可自建条目？这决定实现量。

### 1(b) 两个房间互相移动不成立（前庭↔屏风拖不回去）
- `App.vue onMoveNode`（1040-1071）逻辑对称：拖到分组头（`tax-domain-*`/`tax-slot-*`/`tax-custom-*`）→ `setRoomPin`/`addRoomToGroup`；拖到房间项 → `reorderWithinGroup` + 对齐归属。
- 前向（前庭→屏风）与后向（屏风→前庭）走同一套 `setRoomPin`，数据层本应都成立。
- `NavTreeNode.vue` 拖拽层已具备：⠿ 手柄即时拖、边缘自动滚、空分组头 `is-empty-group` 保留可命中高度（可拖回）。
- 结论：纯逻辑层面未发现「拖不回去」的硬阻断；真实断裂点需**真机复现**（怀疑在 custom 维度 / 维度全集渲染，或某次 stale 状态）。下一轮用浏览器真机拖一次定位。

### 4 幕僚管家「都不知道自家项目有啥 / 打开记账不做」
- **根因已坐实**：`modules/advisor/featureDictionary.ts` 早已精确收录 `记账/劳酬 → /reward`（真实路由，注释明确「没有虚构的 /accounting」），`searchFeatures()` 也能按中文/别名/路由段命中。
- 但 `featureDictionary` 仅被 `commandIntent.ts`（意图分类）调用，**幕僚的执行层从不开路由到命中功能** → 用户输入「我要记账/打开记账」走 general 回落，说「没有这个功能」。
- 修复方向（已设计、低风险）：在幕僚执行/回复侧接入 `searchFeatures` + `pickDirectJump`，命中即对 `router.push(hit.route)` 跳转；并把功能词典接入幕僚的「我知道的功能」上下文，让它答得出「自家有啥」。
- 这是 A 阶段最高性价比、最确定的修复，建议先做。

### 2 设置/房间界面自适应与排版
- `RoomSettingsPanel.vue` 已用分组卡片 + 入场动画，结构性尚可；真正「功能多了上下滑费时」的应是 `Settings.vue`（尚未细读）。
- 下一步：读 `Settings.vue`，把长列表改为分区/折叠/限宽 + 锚点跳转，避免无限滚动。

## 待澄清
- 1(a)「自定义房间」的语义（见上）。
- GitHub 凭据：本地 `gh` 未安装，建仓库需要你的 GitHub 账号令牌或授权；或我改用 GitHub API（需 token）。

## 下一步（A 阶段执行顺序建议）
1. 先修 **4**（幕僚接线，确定、可逆、收益高）。
2. 真机复现 **1(b)**，定位后修（保留现有 `is-empty-group` 逻辑）。
3. 与你确认 **1(a)** 语义后，设计自定义房间数据通道并落地。
4. 收敛 **2** 的 `Settings.vue` 排版。

## 备注
- 所有改动将保持「现有状态不变」，新增代码走独立路径，不覆盖现有逻辑；每处跑 `vue-tsc` + 真实交互测试（不再用镜像测试）。
- 此前 `sidebar-taxonomy-dnd.test.ts` 是镜像重写、真实拖拽零覆盖，是导致「测过=修好」假象的形式主义来源，后续替换为真实交互测试。
