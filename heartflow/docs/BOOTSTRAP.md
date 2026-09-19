# BOOTSTRAP · 心流工坊（Heartflow）工程引导

> 本文件是项目「启动地图」。新协作者/助手读完即可上手。详细约定以 `MEMORY.md` 与 `.workbuddy/memory/` 为准。

## 这是什么
- **心流工坊（Heartflow）**：本地优先的私人心智工作台。Vue3 + Vite + TypeScript + Pinia + Tauri2 桌面应用。
- 核心定位：**本地私有、超级自定义**（蓝图前两条硬约束）。所有数据留在本机，绝不外传、绝不与云端交互。

## 快速开始
```bash
cd heartflow/project/frontend
npm install          # 或 pnpm install
npm run dev          # 本地开发
npm run build        # 生产构建（见下方「四道闸门」）
```

## 四道验证闸门（每次改动必跑）
1. `eslint . --quiet`
2. `vue-tsc --noEmit`
3. `madge --circular --extensions ts --ts-config tsconfig.json src`（应无循环依赖）
4. `vitest run --no-file-parallelism <改动相关文件>`
5. 构建：`vite build --outDir node_modules/.hf-dist-$(date +%s)`（绕开 safe-delete 守卫）

> ⚠️ 全量 `vitest run` 在沙箱偶发静默退出码 1 无输出，改用「针对性组件测试 + 构建」验证回归。

## 代码约定
- **模块模式**：每域一个 `src/modules/<domain>/`，含 `use<Xxx>()` 组合式 + 子 `index.ts`，顶层 `src/modules/index.ts` 再导出。
- **持久化**：统一走 `engine/storage` 的 `storage.getKV(key, default)` / `setKV`；视图中禁止裸调用，下沉到组合式。
- **视觉层**：房间根背景必须 transparent（透底），仅留 `::before/::after` 辉光；`.app-base-bg` 的 z-index 必须是 **0**（非 -1）；浮层 `position:fixed` 须避让 220px 侧栏。
- **提交纪律**：`git add` 仅具体功能文件路径，**绝不 `git add -A`**；提交前 `git diff --cached --name-only` 复核，避免索引预存变更被一并带入。

## 蓝图合规口径（重要）
用户对「根据蓝图来」的口径 = **只守前两条硬约束**（第1条 本地私有 + 第2条 超级自定义）。蓝图其余弹性条款（无脸人/克制/沉默默认等）按用户口径非强制。

## 已知坑
- 视图 `onMounted(load)` 更新 ref 后，子组件重渲染排在微任务 → 测试须在 `mount()` 后 `await flushPromises()` 再断言。
- 巨型组件拆分（GuardRoom / KnowledgeTower / Craft）已完成，各自用「骨架 + `use<Xxx>Ui` + 子组件 + `*-shared.css`」模式。
