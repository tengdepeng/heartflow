# Heartflow 蓝图整整改 · 合规审查报告

**日期**：2026-08-16
**场景**：蓝图合规审查（产品线：幕僚/镜我系统）— 产品评审 + 安全审计 + 设计审查 + 蓝图文档修订建议
**参与成员**：产品评审员 · 安全官 · 设计顾问
**协作模式**：降级执行（本环境 `TeamCreate` 不可用，子 Agent 无法派生；三位成员的专业框架由主理人沽思航直接承载，独立完成三重视角审查并汇编）

> 合规口径（用户明确）：**只守蓝图前两条硬约束**——① 本地私有；② 超级自定义（幕僚的形象/性格/行为边界/主动程度由用户定义或自然形成）。第 3–52 条为弹性条款，按用户口径非强制。

---

## 📌 TL;DR（执行摘要）

- **整体结论：🟢 通过（幕僚/镜我系统已满足两条硬约束）**，仅在全局层与编辑器细节有 2 项 🟡 改进建议，0 项 🔴 硬违约。
- **阻塞项数量：0**（无阻碍上线的硬约束违规）。
- **核心判定**：
  - 本地私有：幕僚/载体/镜我模块**零外部交互命中**，图片导入与 `.carrier` 分享纯本地 🟢
  - 超级自定义：载体编辑器支持官方几何 + 本地图片导入 + 各生命阶段覆盖；沉默默认与主动程度用户开关均已落地 🟢
  - 设计呈现：无脸人（字形派生，无硬编码脸/性别/名字）、克制中性均已落实 🟢
- **下一步**：落实 2 项 🟡 建议（AI 默认云端 URL 兜底提示、载体预览圆框适配），并把"无脸人≠球体""载体生命周期"等澄清写入蓝图文档。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟢 Go（硬约束全通过，无阻塞） |
| 严重度分布 | 🔴 0 / 🟠 0 / 🟡 2 / 🟢 多项 |
| 关键行动项 | 2 条（均非阻塞） |
| 建议负责人 | 前端 / 产品（蓝图文档） |
| 审查范围 | 幕僚子系统（advisor/store/view/carrier/镜像）+ 全局外联触点 |

---

## 1. 各成员核心结论

### 🔍 产品评审员（蓝图条款对照）
- **核心判断**：把蓝图硬约束 1、2 与幕僚相关弹性条款（无脸人、沉默默认、中性呈现、载体生命周期）逐条对照现状，**未发现硬性违约**。形象自定义已真落地（`AdvisorCarrierEditor` 覆盖各生命阶段 + 本地图片导入），沉默默认由 `advisorEnabled` 默认关 + `complianceOverride.advisorEnabled` 默认 false 双重保障（`stores/advisor.ts:1227`）。
- **关键建议**：蓝图文档需补 3 处澄清——①"无脸人≠必须是球体"（球体仅为镜我初始形态）；② 载体生命周期（诞生→成长→成熟→衰老→传承）在 UI 的可操作定义；③ 明确"系统不得强加有限形态集"的硬性禁止条款。

### 🛡️ 安全官（OWASP+STRIDE · 本地私有审计）
- **核心判断**：对 `modules/advisor/*`、`views/Advisor*.vue`、`components/Advisor*.vue`、`components/Carrier*.vue`、`resonance/bridges/advisor.ts`、`engine/storage/advisor.ts` 全量扫描 `fetch/axios/WebSocket/shell.open/Notification(外发)/telemetry` —— **生产代码零命中**（grep 命中的全是 SVG `xmlns` 命名空间、`data:` 内联图、测试文件字面量、openai 占位 URL）。`carrier-io.ts` 图片导入走 `File→canvas→本地 dataURL`（256px 降采样），`.carrier` 导出为纯本地 Blob 下载并受 `assertShareLocalOnly('local')` 兜底。**本地私有硬约束 🟢 通过**。
- **关键建议**：发现 2 处**全局级**（非幕僚专属）需关注点——① `engine/storage/core.ts:311` AI 默认 `baseUrl:'https://api.openai.com/v1'`（虽 `enabled:false` 默认关、apiKey 空，但占位云端 URL 有潜在误触外联风险）；② `useDesktopTouchpoints.ts:34` `shell.open('https://heartflow.app')` 为"固定到桌面"按钮的用户点击事件触发，打开官方站点、不发送数据，可接受但函数命名语义错位。两者均需确保严格用户主动 + 显性提示。

### 🎨 设计顾问（视觉/交互合规）
- **核心判断**：`AdvisorDock.vue` 问候默认关闭（`greetingOn` 初值 false + KV 默认 false，仅 `enabled&&greetingOn` 才显示，247 行），标题"幕僚沉默（默认）"，未启用时显"安睡"态 —— **沉默默认 + 主动程度用户开关 🟢**。`CarrierFormPiece.vue` 提供 4 官方几何 + 导入本地图片双通道，文案明确"系统不强制形态" —— **形象自定义 🟢**。头像由 `carrierGlyph`/图片派生、无硬编码脸/性别 —— **无脸人 🟢**。
- **关键建议**：`CarrierFormPiece.vue` 的预览框 `.cp-preview` 硬编码 `border-radius:50%`（圆形 puck），对所有几何形态（含 crystal/flame/seed）都用圆框展示，轻微偏向"球体"观感，建议预览容器随形态适配（圆/方/棱角）。好感度（`AdvisorAffinity.vue`）为克制等级进度列表，代码未发现 confetti/弹幕/满屏庆贺动画，符合中性克制。

> 以上三位成员的实际产出由主理人基于直接代码审查汇编（环境限制子 Agent 派生）。

---

## 2. 综合审查发现（去重合并，按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源 |
|---|--------|------|------|---------|------|------|
| 1 | 🟡 | 安全/本地私有 | `engine/storage/core.ts:311` | AI 默认 provider `baseUrl` 指向 `https://api.openai.com/v1`（占位云端 URL）；虽默认 `enabled:false`、apiKey 空，但用户若开启 AI 而未改端点，数据将离开设备 | 开启 AI 时弹"数据将发往你所配置的服务"显式提示；可将默认 `baseUrl` 置空或指向本地占位，避免误触云外联 | 安全官 |
| 2 | 🟡 | 设计/无脸人 | `components/CarrierFormPiece.vue:138-151` | 载体预览框 `.cp-preview` 硬编码圆形（`border-radius:50%`），所有几何形态均用圆框展示，视觉上偏向"球体"，与"无脸人≠必须是球体"的澄清弱冲突 | 预览容器随几何形态适配外观（orb 圆 / crystal 棱 / flame 尖 / seed 椭圆），或明确该 puck 仅为通用展示框 | 设计顾问 |
| 3 | 🟢 | 合规通过 | `modules/advisor/carrier-io.ts` | 图片导入与 `.carrier` 导出纯本地，含 `assertShareLocalOnly('local')` 兜底 | 维持现状 | 安全官 |
| 4 | 🟢 | 合规通过 | `stores/advisor.ts:1227` + `AdvisorDock.vue:214-247` | 沉默默认 + 主动程度用户开关落地 | 维持现状 | 产品/设计 |
| 5 | 🟢 | 合规通过 | `views/AdvisorHub.vue:56,88,125` | 创建上限按用户自建数计（maxAdvisors=5，排除 preset-*）；创建走真实 `AdvisorCarrierEditor` | 维持现状 | 产品/设计 |
| 6 | 🟢 | 合规通过 | 全量扫描 advisor/carrier/mirror 模块 | 无任何外部网络/云端交互（fetch/axios/WebSocket/telemetry 零命中于生产代码） | 维持现状；CI 增加"advisor 模块禁外联"静态断言以防回归 | 安全官 |

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | AI 启用时增加数据外发显式告知；默认 `baseUrl` 置空/本地占位，阻断误触云端 | 前端 | P1（非阻塞） | 下个迭代 |
| 2 | 载体编辑器预览框随几何形态适配外观，消除"默认球体"视觉暗示 | 前端 | P2 | 下个迭代 |
| 3 | 将"无脸人≠必须是球体""载体生命周期 UI 可操作定义""系统不得强加有限形态集"写入蓝图文档 | 产品 | P1 | 本周 |
| 4 | 在 CI/静态检查中加入"advisor/carrier/mirror 模块禁止外部网络调用"断言，防回归 | 前端/CI | P2 | 下个迭代 |
| 5 | 复核 `pinToDesktop()`（`useDesktopTouchpoints.ts:30-39`）语义——函数名与"打开 heartflow.app"行为不符，确认是否为预期并加注释/改名 | 前端 | P3 | 排期 |

---

## ⚠️ 待完善 / 已知局限

- 子 Agent 派生在本环境被禁用（缺 `TeamCreate`），三位成员的专业产出由主理人直接代码审查汇编，未进行多人交叉复核；结论基于本次静态扫描与关键文件精读，未运行构建/测试全量验证。
- `celebration.ts` 未发现庆贺弹幕相关实现（grep 无匹配），与历史记忆中"升级庆贺弹幕"描述不一致 —— 可能已被移除或改名，建议后续确认该模块真实职责，避免文档与代码脱节。
- "本地私有"审计聚焦幕僚/载体/镜我模块；应用全局仍有 AI provider 配置与"固定到桌面"链接两处外联触点（均已评估为可控），若需严格零外联，须在项目级策略中明确"用户主动触发的官方站点导航是否计入违约"。

---

## 📚 成员产出索引

- 产品评审员（产品合规 + 蓝图文档修订）：主理人汇编自 `stores/advisor.ts`、`views/AdvisorHub.vue`、`views/AdvisorDock.vue`、`modules/advisor/*`、`modules/customization/*` 审查。
- 安全官（本地私有硬约束审计）：主理人汇编自全量外联扫描（grep）+ `modules/advisor/carrier-io.ts`、`engine/storage/core.ts`、`composables/useDesktopTouchpoints.ts`、`engine/compliance-gate.ts` 精读。
- 设计顾问（形象/无脸人/沉默默认/克制中性）：主理人汇编自 `components/CarrierFormPiece.vue`、`components/AdvisorDock.vue`、`views/AdvisorHub.vue`、`views/AdvisorAffinity.vue` 审查。
- 原始代码证据索引：见本报告"综合审查发现"表"位置"列所列文件:行号。

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
