# 心流工坊 · Heartflow

当前项目使用 `Vue 3 + Vite + TypeScript + Pinia + Tauri 2`，正在落地蓝图中的第一批核心五房间：

- 引力场主入口
- 时间长廊
- 逐日心锚
- 情绪花房
- 安全岛

## 当前开发信息

- 前端技术栈：`Vue 3 + Vite + TypeScript + Pinia`
- 桌面壳：`Tauri 2`
- 前端开发端口：`1001`
- 后端预留端口：`2001`
- 当前数据库：未接入独立数据库；桌面端优先使用 Tauri 应用私有目录下的本地 JSON 文件存储，Web 端仍可保留独立适配层
- 数据备份方式：桌面端数据位于应用 `app data` 目录下的 `data/`，当前默认包含 `config.json`、`sessions.json`、`crystals.json`、`schema.json`

## 目录约定

- `doc/`：项目文档
- `prototype/`：原型与设计稿
- `project/frontend/`：前端主代码目录（**当前唯一前端真源**，Tauri 桌面端 `frontendDist` 指向此处的 `dist`）
- `project/backend/`：后端（Tauri/Rust）主代码目录
- `_archive/legacy_root_src/`：2026-08-07 收敛双前端树时归档的旧根 `src/` 与支撑配置（vite/tsconfig/index.html），含当时未提交的旧改动，确认无用后可删除
- `database/`：数据库脚本与备份目录
- `utils/`：项目工具脚本

## 启动方式

```bash
npm install
npm run dev
```

默认访问：`http://localhost:1001`

Tauri 联调：

```bash
npm run tauri:dev
```

## 当前阶段说明

当前仓库重点不是把整份超大蓝图一次性做完，而是先打通第一条高保真可交互主链路，让核心房间先形成完整体验闭环，再逐步扩展其余房间。

## 开发与质量

- 测试：`npm run test`（Vitest）
- 类型闸门：`npx vue-tsc --noEmit`（CI 中强制执行，合并前须通过）
- 提交约定：按特性逐文件 `git add`，不使用 `git add -A`；遵循「本地私有 / 超级自定义」的项目宪法。
- 前端代码真源位于 `project/frontend/`，Tauri 桌面端 `frontendDist` 指向其 `dist`。
