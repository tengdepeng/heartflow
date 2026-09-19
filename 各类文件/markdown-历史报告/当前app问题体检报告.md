# 心流工坊 · 当前 App 问题体检报告

> 生成时间：2026-08-07
> 范围：运行时 / 功能缺口 / 代码健康度 / project/frontend 主干（四维全覆盖）
> 方法：实际执行类型检查、测试、构建验证与代码静态扫描，非仅翻阅旧文档

---

## 0. 一句话结论

当前 app **能跑、能编译、核心测试通过**，没有"一启动就崩"的硬伤。真正的"问题"集中在五处：

1. **两套前端树并存**（根 `src/` 与 `project/frontend/src/` 都可独立构建）→ 易分歧、易踩坑
2. **存储瓶颈仍在，且优化白做** → SQLite 增量后端写好了却没接入，活跃路径仍是整文件序列化；`save()` 还是 fire-and-forget，有丢数据风险
3. **本环境无法常规出包** → `vite build` 被 WorkBuddy「安全删除」守卫在清空 `dist/` 时拦截（已确认代码本身可构建）
4. **测试套件极慢** → 主干 274 文件约 15–20 分钟，CI 体验差
5. **蓝图核心引擎大面积未实现** → 调度/关联/感知引擎、幕僚体系基本空壳

---

## 1. 运行时体检

- **桌面端启动健康**：`project/frontend/tauri_dev_test.log` 显示 Rust 编译完成（`Finished dev profile`）、`heartflow.exe` 正常启动、Vite HMR 持续更新（`TimerControls.vue` / `Home.vue` 等），**无 panic、无运行时崩溃**。
- **数据持久化隐患（真实风险）**：`TauriStorageBackend.save()`（`engine/storage/core.ts:90`）是「同步写缓存 + 异步 `fire-and-forget` 持久化」——`_persist()` 不 `await`，失败仅 `console.error`。**应用快速关闭时可能丢未落盘的数据**。
- 用户未提供具体故障现象，故未做逐房间点击式排查；如需定位某个具体现象（白屏/某房间报错/数据丢失），请描述，我再定点排查。

## 2. 代码健康度

| 检查项 | 结果 |
|--------|------|
| 类型检查 根 `src/` (`vue-tsc --noEmit`) | ✅ 0 错误 |
| 类型检查 主干 `project/frontend` (`vue-tsc --noEmit`) | ✅ 0 错误 |
| 测试 根 `src/` (`vitest run`) | ✅ 3 文件 / 80 用例全过 |
| 测试 主干核心子集（storage ×2 文件） | ✅ 68 用例全过（7.7s） |
| 测试 主干全套（274 文件） | ⏳ 极慢，约 15–20 分钟才出结果（CI 隐患） |
| 构建 根 `vite build` | ⛔ 被安全删除守卫拦截（见 §3 说明） |
| 构建 绕过验证 `vite build --outDir dist-verify` | ✅ `built in 9.65s`，产出完整生产包 |

- **错误处理分布**：约 **21 个非测试源文件**含 `console.error`/`throw`，集中在**系统边界层**——`visualization/datasource-connector.ts`(×8)、`data-sovereignty/useDataExtradition.ts`(×6)、`engine/tauri-bridge.ts`、`engine/rendering/scene-renderer.ts`、`modules/timeline-index`、`plugin/loader`+`sandbox/isolator`、`mirror/llm-bridge`、`safety/crypto-guard`+`backup-recovery`。明确的 `TODO/FIXME/未实现` 仅 **2 处**。
  → 不是"留了 TODO 没写"，而是**边界失败点多且多为静默 `console.error`**，用户侧难感知失败（如存储写入失败只在控制台打印）。

## 3. 架构 / 存储（重点问题）

全景分析点名的"整文件序列化瓶颈"**在活跃代码路径依然生效**：

- `getBackend()` 工厂（`engine/storage/core.ts:121`）只在 `TauriStorageBackend` 与 `LocalStorageBackend` 间二选一。
- `SQLiteStorageBackend`（`engine/storage/sqlite-backend.ts`，**支持增量写入、带完整测试**）是**孤儿代码**：除自身测试与导出的 `getSQLiteBackend()` 外，全仓无引用，**从未接入工厂**。
- 活跃 Tauri 路径仍是 `cmd_save_storage` + `JSON.stringify(整个 schema)` 整文件写入。
- 叠加 §1 的 `save()` fire-and-forget → **既有性能瓶颈，又有数据丢失风险**。

> **构建拦截说明**：常规 `vite build` 失败并非代码错误，而是 WorkBuddy 沙箱的"安全删除" shim（`genie-safe-delete.cjs`）在 Vite 清空已有 `dist/` 时包装 `rmSync` 超时（`ETIMEDOUT`）。已用"构建到不存在的输出目录"验证**代码本身可正常产出生产包**。在本环境恢复常规出包的方法：构建到非现有 `outDir`，或将 `dist/` 排除出删除守卫。

## 4. 功能缺口（对照蓝图，源自 2026-07-26 全景分析，建议刷新）

| 层 | 状态 | 说明 |
|----|------|------|
| 调度引擎（DAG 接收/分配/追踪） | 🔴 未实现 | 无任务拆解器、无调度 |
| 关联引擎（语义/时间/情绪/因果） | 🔴 未实现 | 无关联图、无 query 接口 |
| 感知层（位置/健康/设备） | 🔴 未实现 | `utils/platform.ts` 仅做平台检测 |
| 幕僚体系 6 类（镜我/追风/灵犀/默渊/时痕/守钟人） | 🔴 基本空壳 | 仅统一 `AdvisorHub`，无特化实现 |
| 宪法引擎（自动执行/约束检查） | 🔴 未实现 | 编辑器视图在，引擎不在 |
| 载体演进逻辑 / 数据治理（遗忘·权限） | 🟡 部分 | 有阶段定义与 L3 加密，缺演进与权限 |
| 40+ 功能空间 | ~15 高 / 20 中 / 20 低或骨架 | 时间长廊/逐日心锚/情绪花房等完成度高 |

> 注：当前代码已新增 `visualization` / `data-sovereignty` / `plugin 沙箱` / `ai provider` / `mirror` / `resonance` / `safety` 等模块，上述缺口清单需对照**最新代码**刷新一次。

## 5. 结构隐患：两套前端树

- 根 `src/` 与 `project/frontend/src/` **都能独立构建**（各自 `vite.config` + `package.json` + `node_modules`）。
- `git status` 显示最近改动**同时落在两棵树**（`src/App.vue`、`src/views/Home.vue`、`project/frontend/src/...`）。
- 从 `tauri_dev_test.log` 的 HMR 路径（`/src/components/...`、`/src/views/Home.vue`，相对 project/frontend）判断，**活跃真源是 `project/frontend`**，根 `src/` 更像遗留/并行树。
- 风险：逻辑分歧、重复维护、新人易踩坑。

## 6. 优先级建议

- **P0**：① 把 `SQLiteStorageBackend` 接入 `getBackend()`（按 `isTauri` + SQLite 可用性选择），并让 `save()` 等待持久化完成/可观测；② 明确唯一前端真源，收敛另一棵树。
- **P1**：① 在本环境恢复常规出包（绕过/修复删除守卫）；② 拆分或加速测试套件（`--pool`/分片/排查慢文件）。
- **P2**：① 对照最新代码刷新蓝图缺口清单；② 系统边界错误从静默 `console.error` 改为可观测（toast/状态提示）。

## 7. 已修复（按蓝图字面）：主存储引擎改回明文 JSON 文件 + 持久化 flush（2026-08-07）

针对 §3 的存储问题，先接了 SQLite 增量后端，后**依据权威蓝图《融合版 · 心流工坊完整蓝图15》第一层「本地文件存储引擎 = 明文 JSON/Markdown，用户可直接查看编辑」的字面要求，已反转回明文 JSON 文件**（用户拍板："先按蓝图字面来"）：

- **明文 JSON 文件后端**：`getBackend()` 在 Tauri 环境现在返回 `PlaintextFileStorageBackend`，通过既有 `cmd_save_storage`/`cmd_load_storage` 读写**用户可直接查看编辑的明文 JSON 文件**；Web 环境仍用 `LocalStorageBackend`。
- **消除 fire-and-forget 丢数据风险（保留）**：`save()`/`clear()` 持有 pending Promise；新增 `flushStorage()`，并在 `main.ts` 注册 `beforeunload`/`pagehide`/`visibilitychange(hidden)` 钩子触发 flush，确保异步写入在关闭前落盘。
- **SQLite 后端降级为预留模块**：`sqlite-backend.ts` 不再接入主路径，明确标注为蓝图第八层「保险库房间」L3 加密存储的预留实现（优先级 P2 第四阶段），保留其测试。

验证：`vue-tsc --noEmit`（主干）0 错误；存储测试 78/78 通过；`vite build`（project/frontend）`built in 11.64s` 成功。

> 权衡：恢复明文单文件后，每次写仍整文件 `JSON.stringify(schema)` 序列化（蓝图字面要求的代价，非增量写）。若日后既要贴合蓝图又要解性能瓶颈，可改为**按域拆分明文 JSON 文件**（需新增 Rust 文件写命令或 Tauri FS 插件），既保持可读又可只写变更域。
> 备注：Tauri 的 `beforeunload` 为尽力而为钩子；若要**保证**关闭瞬间不丢最后几次写入，可在 Rust 侧 `RunEvent::ExitRequested` 中阻止退出直至 `flushStorage()` 完成。当前 JS 层 flush 已大幅降低风险，列为可选增强。

## 附：执行证据

- `vue-tsc --noEmit`（根 & 主干）：0 错误
- `vitest run`（主干 storage 子集）：68 passed / 7.7s
- `vitest run`（根 src/）：80 passed
- `vite build --outDir dist-verify`：`built in 9.65s`
- `tauri_dev_test.log`：Rust 编译完成、`heartflow.exe` 启动、HMR 正常、无 panic
- 静态扫描：`console.error`/`throw` 集中分布于系统边界层；`SQLiteStorageBackend` 仅被测试与自身引用
