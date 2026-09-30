# Heartflow 真机 QA 探针套件

基于 Playwright（chromium + swiftshader 软件渲染）的真机巡检脚本集，用于回归验证
「侧栏折叠 / 全路由点击输入 / Canvas·3D 坐标级交互」，无需改任何业务源码。

## 前置

1. 起 dev server（默认 `http://localhost:1003`，可用 `HF_ORIGIN` 覆盖）：
   ```bash
   npm run dev -- --host --port 1003
   # 或： node node_modules/vite/bin/vite.js --host --port 1003
   ```
2. 安装 Playwright chromium 内核（任选其一）：
   - 项目内：`npm i -D playwright-core` 后 `npx playwright install chromium`
   - 或复用已装内核：脚本会自动探测 `~/AppData/Local/ms-playwright/chromium-*`
3. 运行环境需 Node ≥ 18（`node xxx.mjs`）。

## 环境变量（均可选）

| 变量 | 默认 | 说明 |
|------|------|------|
| `HF_ORIGIN` | `http://localhost:1003` | dev server 地址 |
| `HF_EXEC` | 自动探测 | chromium 可执行路径 |
| `HF_PW_CORE` | 自动探测 | playwright-core 路径 |
| `HF_VIEWPORT` | `1440x900` | e2e 视口，如 `390x844` |
| `HF_MOBILE` | `0` | 设 `1` 启用移动端上下文（isMobile+hasTouch） |
| `HF_TARGETS` | 见脚本 | canvas-deep 目标房间（逗号分隔） |
| `HF_REPORT` | 各脚本默认 | 报告输出文件 |

## 脚本

| 脚本 | 作用 | 示例 |
|------|------|------|
| `sidebar-collapse.mjs` | 侧栏折叠闭环：点≡(.bar-menu) 显隐稳定切换(collapsed 类交替且不卡死) + 完全展开态房间链接可跳转 | `node sidebar-collapse.mjs` |
| `e2e.mjs` | 全路由点击/输入/加载巡检（桌面或手机视口） | `node e2e.mjs` / `HF_VIEWPORT=390x844 HF_MOBILE=1 node e2e.mjs` / `node e2e.mjs 5 20` |
| `canvas-scan.mjs` | 扫描全路由运行时挂载的 `<canvas>`（ctx/尺寸/上下文丢失） | `node canvas-scan.mjs` |
| `canvas-deep.mjs` | 对目标房间做坐标级 拖拽+滚轮+点击，断言零应用错误+上下文存活+像素响应 | `node canvas-deep.mjs` / `HF_TARGETS="/home-replica,/map" node canvas-deep.mjs` |

## 解读结果

- **e2e / sidebar**：每条路由 `OK` + `errs=0` 即通过；`clk=…(fail=0 skip=N)` 中 `skip` 多为屏外/全局 chrome 已抽样覆盖的元素，非失败。
- **canvas-scan**：`webglLost` 标记 WebGL 上下文丢失（真回归信号）。
- **canvas-deep**：`appErrs=0` 且 `lost=false` 即画布交互路径健康；`pixResponded` 仅作参考——**持续动画场景**基线噪声大，拖拽差无法隔离（`pixResponded=false` 是测量假象，非失败）。
- 注意：数据驱动渲染的房间（如 `/star-map` 受 `nodes.length` 门控）在**空数据环境**下画布不挂载（`display:none`），需带数据真机复验 3D 拾取。

## 复用约定

- 依赖解析、路由抽取、错误收集、canvas 测量统一在 `lib.mjs`，各脚本只写业务断言。
- 报告为 JSONL（每行一条），可用 `node -e` 聚合（见下方示例）。
- 所有脚本 `process.exitCode` 反映最终 PASS/FAIL，便于接入 CI。

```bash
# 聚合 e2e 报告：统计错误/空白路由
node -e 'const fs=require("fs");const l=fs.readFileSync("hf-e2e-report.jsonl","utf8").trim().split("\n").map(x=>JSON.parse(x));console.log("routes",l.length,"err",l.filter(r=>r.errs.length).length,"blank",l.filter(r=>r.blank).length)'
```
