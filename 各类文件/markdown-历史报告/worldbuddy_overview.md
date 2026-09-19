# 世界壳「星辰」落地 · 概览

## 已完成
把「框架与内容分离、用户自定义世界壳、2D/3D 混合渲染、屏风/玉珠/进深层级」的共识，对照 impeccable 设计理念，转化为可运行代码。

### 关键发现（现状基线）
经核查，共识中的大部分架构**早已存在于代码**：
- `room-graph.ts`：`RoomSlot` 类型 + 全部 68 个节点的 `slot` 字段已就位（`getRoomsBySlot()` 可用）。
- `stores/config.ts`：`worldShell` 配置块（`activeShell` / `shellConfig`）+ `setActiveShell` / `updateShellConfig` / `setWorldShell` 已实现。
- `CanvasRoom.vue`：已是「世界渲染容器」，通过 `createShell(activeShell)` + `getRoomsBySlot` 注入房间锚点；`particlesEnabled = activeShell !== 'courtyard'` 已实现壳切换时降级/复用粒子。
- `modules/world-shell/types.ts`：可插拔渲染器接口（`mount/render/updateContext/resize/destroy`）；`courtyard.ts` 已注册并渲染。
- `DecorationWorkshop.vue`：已有「换境」面板，5 张壳卡片，仅 `courtyard` 标记为 `ready`。

共识的真正缺口 = 用户方案第 4 步：**第二个壳（星辰）尚未实现**。

### 本次产出（实质变更）
1. **新建 `project/frontend/src/modules/world-shell/stars.ts`** — 星辰世界壳渲染器：
   - 屏风位 = 中央「星核」（脉动光晕 + 光环），计时器/玉珠叠加其上，交互契约不动。
   - 前院 = 三颗相邻星体（时间长廊/逐日心锚/情绪花房）；正堂 = 星云节点；后院/厢房/角门 = 漂浮星体。
   - **星体尺寸 = 使用频率，亮度 = 近期活跃度**；空间锚点沿用 `courtyard` 的归一化坐标，保证宅院↔星辰切换时进深层级不跳变。
   - 深空径向渐变背景 + 背景微星闪烁，暗色主题适配。
2. **`world-shell/index.ts`** — 导出并 `import './stars'` 完成自注册。
3. **`DecorationWorkshop.vue`** — 把「星辰」卡片 `ready` 置为 `true`，UI 可直接切换。
4. **`world-shell/__tests__/world-shell.test.ts`** — 新增 StarsShell 契约测试；修正原「未注册返回 null」用例改用 `ocean`（仍占位）。

### 验证
- `vitest run src/modules/world-shell` → 11 passed（含 3 条新增）。
- `vue-tsc --noEmit` 对 world-shell 模块无类型错误。

### 后续（未做，按需）
- **数据真实化**：房间 `frequency`/`recency` 当前为硬编码 0.5/0.3，需接入 usage 统计，使星体大小/亮度反映真实活跃度。
- **用户自定义世界壳的数据层**：方案第 5 步「给每个 slot 选一个激活房间」的 UI 尚未实现（目前仅切换整体壳，未做 slot→激活房间选择）。
- 剩余壳 `ocean` / `home-scan` / `custom` 仍为占位（返回 null，渲染留空）。

### 操作方式
App 内「装修工坊 → 换境」面板切换「星辰」即可预览（由 `CanvasRoom` 的 `watch(activeShell)` 自动重建渲染器）。
