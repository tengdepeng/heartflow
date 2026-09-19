# 心流工坊蓝图整改映射

## 当前整改结论

- 本轮不硬啃整份终版蓝图，先对齐当前仓库已成型的核心五房间闭环。
- 优先整改根因：统一时间线数据口径，禁止页面绕过 `storage` 直接读写本地存储。
- 当前最小闭环：`引力场 -> 专注计时 -> 逐日心锚 -> 情绪花房 -> 时间长廊 -> 安全岛`。

## 蓝图阶段映射

| 蓝图阶段 | 蓝图要求 | 当前仓库现状 | 本轮动作 |
|---|---|---|---|
| 第一阶段 | 引力场画布、基础计时、时间结晶、本地存储 | 已有主链路基础实现 | 保持主链路稳定，优先修数据一致性 |
| 第二阶段 | 统一时间线、轻量笔记、基础统计 | 已有时间长廊/记录/统计入口 | 修复时间线聚合逻辑统一走 `storage` |
| 第三阶段 | 情绪花房、安全岛、基础房间体验 | 已有页面与部分交互 | 只保留必要闭环，不提前扩张 |

## 硬约束对照

| 蓝图硬约束 | 当前要求 |
|---|---|
| 本地私有 | 当前继续使用本地存储，不引入远端上传或同步 |
| 无推送、无催促 | 不新增红点、推送、强提醒 |
| 只呈现，不评判 | 情绪花房、统计、时间线文案不加入评价性表达 |
| 用户主导 | 导出、记录、查看都由用户主动触发 |

## 本轮涉及文件

- `src/views/Timeline.vue`
- `src/engine/storage.ts`
- `src/engine/data-port.ts`
- `src/composables/useDataPort.ts`
- `src/engine/storage.test.ts`
- `src/engine/data-port.test.ts`
- `src/modules/timeline/river.ts`
- `src/modules/timeline/river.test.ts`

## 本轮完成项

- 存储写入以响应式版本号通知时间线，页面停留期间可刷新聚合结果。
- JSON 导出覆盖 sessions、crystals、notes、emotions、anchors；导入按 ID 仅追加新记录，重复包幂等。
- 回看速度调整会重启单一计时器，时间线卸载时清理计时器。

## 宪法第1条「本地私有」合规确认

| 检查项 | 结果 | 说明 |
|---|---|---|
| 数据是否仅存本地 | ✅ 完全合规 | 存储引擎使用 `localStorage`（Web）或 `Tauri FS`（桌面端），无云端写入 |
| 是否有未经用户授权的上传 | ✅ 无 | 未发现 `fetch`、`XMLHttpRequest`、`WebSocket`、`navigator.sendBeacon` 等网络请求 |
| Tauri 权限配置 | ✅ 无网络权限 | `capabilities/default.json` 仅含 `core:default` + `opener:default` |
| Rust 依赖 | ✅ 无 HTTP 客户端 | `Cargo.toml` 依赖仅 `tauri`、`tauri-plugin-opener`、`tauri_plugin_fs`、`serde`、`serde_json` |
| 数据导入导出 | ✅ 本地文件操作 | `data-port.ts` 使用 Blob 本地下载，不上传任何服务器 |
| 幕僚系统 | ✅ 纯本地 | 消息池硬编码在 `advisor.ts` 中，无外部 API 调用 |

## 宪法第2条「超级自定义」合规确认

| 检查项 | 结果 | 说明 |
|---|---|---|
| 默认配置是否可修改 | ✅ 完全可修改 | 计时时长、手势绑定、背景介质、幕僚开关等均通过 `config.ts` 可自定义 |
| 自动联动是否可关闭 | ✅ 可关闭 | 幕僚系统有 `advisorEnabled` 总开关，可一键禁用 |
| 风格包是否可切换 | ✅ 可切换 | `style.ts` 支持多主题切换，默认风格包可替换 |
| 宪法规则是否可自定义 | ✅ 弹性规则可增删改 | `constitution.ts` 前4条不可变硬编码，其余规则用户可增删改排序 |
| 插件系统 | ✅ 三级权限沙箱 | `plugin.ts` 支持权限分级，可一键撤销 |
| 手势系统 | ✅ 可自定义 | `gesture/` 模块支持手势绑定自定义，`config.ts` 中可修改 |

## 审计修复

- **data-port.ts importJSON 计数bug**：`importJSON` 返回的 `ImportCounts` 对象中 `sessions`、`crystals`、`notes` 等计数字段始终为 0（初始化后未从 `mergeById` 结果赋值）。已修正，各计数正确反映实际新增记录数。
- **data-port.test.ts 测试修复**：同步更新测试用例中 `ImportCounts` 预期值，补全新字段 `goals`、`ledger`、`relations`、`carriers`、`constitution`。

## 第一阶段「极致内核」交付物清单

| 蓝图要求 | 当前状态 | 对应文件 |
|---|---|---|
| 引力场画布 + 介质呼吸 | ✅ 已实现 | `CanvasRoom.vue`、`BreathingLayer.vue` |
| 基础计时（开始/暂停/结束/继续） | ✅ 已实现 | `timer.ts`、`TimerControls.vue`、`JadeBead.vue` |
| 时间结晶（最简单的形态） | ✅ 已实现 | `crystal/index.ts`、`CrystalDetail.vue` |
| 插件管理器 + 风格包加载器 | ✅ 已实现 | `Plugins.vue`、`stores/style.ts` |
| 本地数据存储 | ✅ 已实现 | `storage.ts`、Rust 后端 `storage.rs` |
| 1个默认风格包 + 默认玉珠载体 | ✅ 已实现 | `stores/style.ts`、`JadeBead.vue` |

## 本轮完成项

### 建议1：拆分 storage.ts 领域读写边界

| 文件 | 职责 |
|---|---|
| `src/engine/storage/core.ts` | 核心引擎：后端适配器、缓存、Schema 版本迁移、init/clear |
| `src/engine/storage/config.ts` | 配置领域 |
| `src/engine/storage/session.ts` | 专注记录领域 |
| `src/engine/storage/crystal.ts` | 时间结晶领域 |
| `src/engine/storage/carrier.ts` | 玉珠载体领域 |
| `src/engine/storage/constitution.ts` | 宪法领域 |
| `src/engine/storage/advisor.ts` | 幕僚 + 消息领域 |
| `src/engine/storage/emotion.ts` | 情绪记录领域 |
| `src/engine/storage/note.ts` | 笔记领域 |
| `src/engine/storage/anchor.ts` | 逐日心锚领域 |
| `src/engine/storage/goal.ts` | 留光目标领域 |
| `src/engine/storage/relation.ts` | 羁绊人物领域 |
| `src/engine/storage/ledger.ts` | 账本领域 |
| `src/engine/storage/plugin.ts` | 插件注册表领域 |
| `src/engine/storage/kv.ts` | 通用 KV 存储领域 |
| `src/engine/storage/index.ts` | 组合层：将各领域模块组合为 `storage` 对象 |
| `src/engine/storage.ts` | 向后兼容 re-export 入口 |

`import { storage } from './engine/storage'` 仍可正常工作。新增 `import { getSessions } from './engine/storage/session'` 等按需导入方式。

### 建议2：统一时间线聚合协议

- `data-port.ts` 新增 `getImportCountEntries()` 辅助函数，将 `ImportCounts` 转化为带中文标签的动态列表
- `Timeline.vue` 导入反馈从硬编码 5 个字段改为动态渲染，覆盖所有 10 个数据域

### 建议3：安全岛状态冻结/恢复测试

- 新增 `src/stores/timer.test.ts`，包含 6 个测试用例覆盖：
  - 进入安全岛时正在专注 → 暂停并记录状态
  - 进入安全岛时已暂停 → 保持暂停状态
  - 进入安全岛时空闲 → 不改变状态
  - 退出安全岛时恢复专注会话
  - 退出安全岛时若之前未专注不恢复计时
  - 重复进入安全岛不二次暂停

## 已完成：目录迁移到 project/frontend / project/backend

### 新目录结构

```
e:\Heartflow\heartflow\
├── project/
│   ├── frontend/              ← Vue 前端（src/、public/、index.html 等）
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── index.html
│   └── backend/
│       └── src-tauri/         ← Tauri/Rust 后端
├── doc/                       ← 文档
├── docs/
├── 交付文件/
├── database/
├── utils/
└── .gitignore
```

### 配置变更

| 文件 | 变更 |
|---|---|
| `project/frontend/package.json` | `tauri:dev` 改为 `tauri dev --project-dir ../backend` |
| `project/frontend/vite.config.ts` | 取消监听路径从 `**/src-tauri/**` 改为 `**/project/backend/**` |
| `project/backend/src-tauri/tauri.conf.json` | `frontendDist` 从 `../dist` 改为 `../frontend/dist` |
| `.gitignore` | 新增 `project/backend/src-tauri/target/` |

### 验证

- `npm run test` 从 `project/frontend/` 运行，**123 个测试全部通过**
- 所有相对引用路径无需修改（`src/` 下代码自包含）
- `index.html` 中 `src/main.ts` 引用路径不变

## 第二阶段「核心插件」完成

### 1. 基础统计插件 — 补充配置项

| 文件 | 变更 |
|---|---|
| `types/index.ts` | `AppConfig` 新增 `stats` 配置块（showPanel/showTrendChart/dailyGoal/weeklyGoal） |
| `engine/storage/core.ts` | `DEFAULT_CONFIG` 新增 stats 默认值 |
| `stores/config.ts` | 新增 `updateStats()` 方法 |
| `components/StatsPanel.vue` | 新增今日目标进度条；趋势图按 `showTrendChart` 开关控制；读配置进行目标完成度计算 |

### 2. 自定义分类系统 — 树形分类体系

| 文件 | 变更 |
|---|---|
| `types/index.ts` | 新增 `TagCategory` 接口（id/name/color/children/tags），`StorageSchema` 新增 `tagCategories` 字段 |
| `engine/storage/core.ts` | `createDefaultSchema()` 新增 `tagCategories: []` |
| `engine/storage/tag-category.ts` | 新增存储领域模块：`getTagCategories()` / `setTagCategories()` |
| `engine/storage/index.ts` | 组合层新增 tag-category 模块 |
| `stores/tags.ts` | 新增树形分类操作：`addCategory/removeCategory/renameCategory/recolorCategory/assignTagToCategory/unassignTagFromCategory/getCategoryForTag` + 辅助函数 `findCategory/removeFromTree` |

### 3. 基础生命节律图谱 — 补全周期花

| 文件 | 变更 |
|---|---|
| `views/BodyGreenhouse.vue` | 周期花从占位符改为完整跟踪：记录开始日/持续天数，自动计算阶段（第N天/休息期/待记录），图标变化（🌸🌺🌷），快速记录表单 |

### 验证

**123 个测试全部通过**，新增功能不破坏既有测试。

## 第四阶段「世界完整」完成

### 1. 载体编辑器

| 文件 | 变更 |
|---|---|
| `types/index.ts` | `JadeBeadCarrier` 接口扩展 `shape/effects/focusType` 字段 |
| `views/CarrierEditor.vue` | 新建约1261行：可视化载体编辑，支持4种形态（orb/crystal/flame/seed）+ 3种光效 + 颜色选择 + 大小调节 |
| `router/index.ts` | 新增 `/carrier-editor` 路由 |

### 2. 自律工坊自动化引擎

| 文件 | 变更 |
|---|---|
| `engine/automation.ts` | 新建：`AutomationEngine` 类，7种原子操作 + 定时调度 + 执行历史持久化 |
| `views/AutomationWorkshop.vue` | 集成真实引擎，新增定时执行配置 |

### 3. 幕僚好感度系统

| 文件 | 变更 |
|---|---|
| `stores/advisor.ts` | 好感度映射、定音锤（累计事件总结）、年度对话（自动生成年度回顾）、好感度里程碑 |
| `views/AdvisorAffinity.vue` | 新建：好感度总览页面 |
| `views/AdvisorHub.vue` | 幕僚卡片增加好感度等级标签 + 跳转按钮 |
| `router/index.ts` | 新增 `/advisor-affinity` 路由 |

好感度6级：陌路(0) → 相识(20) → 熟稔(40) → 信赖(60) → 知己(80) → 羁绊(95)

### 4. 殿堂触角

| 文件 | 变更 |
|---|---|
| `composables/useDesktopTouchpoints.ts` | 新建：通知/锁屏光痕/问候浮窗/美化覆盖层 composable |
| `views/Touchpoints.vue` | 新建：4个配置分区，含模拟预览 |
| `router/index.ts` | 新增 `/touchpoints` 路由 |

### 验证

**123 个测试全部通过**，新增功能不破坏既有测试。

## 当前蓝图进展

| 阶段 | 进度 |
|---|---|
| 第一阶段：极致内核 | ✅ 完成 |
| 第二阶段：核心插件 | ✅ 完成 |
| 第三阶段：多维度沉淀 | ✅ 完成 |
| 第四阶段：世界完整 | ✅ 完成 |
| 第五阶段：生态开放 | ✅ 完成 |

## 第五阶段「生态开放」完成

### 1. 完全开源准备

| 文件 | 变更 |
|---|---|
| `LICENSE` | 新建：MIT 许可证 |
| `README.md` | 重写：专业开源项目 README（技术栈、功能概览、快速开始、架构说明） |
| `CONTRIBUTING.md` | 新建：贡献指南（Issue/PR流程、开发环境、代码规范、测试要求） |
| `.editorconfig` | 新建：统一代码风格（2空格、LF、UTF-8） |
| `project/frontend/package.json` | 新增 `"license": "MIT"` 字段 |

### 2. 时间种子遗传体系

| 文件 | 变更 |
|---|---|
| `modules/crystal/gene-seed.ts` | 新建：6个基因位（color/shape/intensity/luminescence/complexity/resilience），遗传算法（突变/继承/显性），从专注数据生成种子 |
| `modules/crystal/gene-seed.test.ts` | 新建：4个测试用例 |
| `modules/crystal/index.ts` | 集成基因种子：结晶时自动生成基因，视觉配置由基因驱动 |

### 3. 插件系统扩展

| 文件 | 变更 |
|---|---|
| `modules/plugin/loader.ts` | 新建：动态插件加载器（load/unload/权限检查/沙箱配置） |
| `modules/plugin/api.ts` | 新建：插件API注册机制（data:read/data:write/navigation/notification） |
| `modules/plugin/types.ts` | 扩展权限系统、Runtime接口、沙箱配置 |
| `modules/plugin/index.ts` | 集成API初始化 |
| `stores/plugin.ts` | 更新Runtime创建逻辑 |
| `views/PluginMarket.vue` | 新建：插件市场页面（已安装/可安装/开发指南） |
| `router/index.ts` | 新增 `/plugin-market` 路由 |

### 4. 风格包分享 + 模板系统

| 文件 | 变更 |
|---|---|
| `modules/style/share.ts` | 新建：风格包分享格式（`.hf-style.json`）、导入/导出/从基础色创建 |
| `modules/template/types.ts` | 新建：模板系统（房间模板/幕僚性格模板），`.hf-template.json` 交换格式 |
| `stores/style.ts` | 新增 `exportPack/createFromBaseColor/importPack` 方法，重构为嵌套 theme.colors |
| `views/StyleMarket.vue` | 新建：风格包市场（我的风格包/创建/导入） |
| `views/TemplateMarket.vue` | 新建：模板市场（4个房间模板 + 4个幕僚性格模板 + 导入） |
| `router/index.ts` | 新增 `/style-market`、`/template-market` 路由 |

### 5. 数据引渡插件生态

| 文件 | 变更 |
|---|---|
| `engine/data-port-converter.ts` | 新建：转换器注册表（registerConverter/toPayload/fromPayload），内置JSON/Markdown/CSV转换器 |
| `engine/data-port.ts` | 新增 `exportData(format)`、`downloadData(format)` 方法 |
| `composables/useDataPort.ts` | 导出新方法 |
| `views/Archive.vue` | 导出区增加格式选择（JSON/Markdown/CSV） |

### 验证

**127 个测试全部通过**（12个测试文件，含新增的 gene-seed.test.ts 4个测试）。

## 第三阶段「多维度沉淀」完成

### 1. 预设自然场景背景系统

| 文件 | 变更 |
|---|---|
| `types/index.ts` | 新增 `PresetScene` 类型（6个场景 + none），`BackgroundMediaConfig` 扩展支持 `preset` 类型 |
| `engine/storage/core.ts` | `DEFAULT_CONFIG.background` 新增 `presetScene: 'none'` |
| `stores/config.ts` | 新增 `setPresetScene()` 方法 |
| `components/HomeBackgroundMedia.vue` | 重写为支持三种模式（preset/image-video/default），6个场景使用纯CSS/SVG渲染 |
| `views/Home.vue` | 背景设置面板新增预设场景选择器（3x2网格按钮） |

6个预设场景：
- **晨曦森林**（forest-dawn）：深绿→暖橙渐变 + 树影SVG + 萤火虫光斑
- **星空海岸**（coast-starlight）：深蓝→紫渐变 + 波浪SVG动画 + 闪烁星点
- **秋日庭院**（autumn-courtyard）：暖棕→金渐变 + 落叶飘落
- **雨窗**（rainy-window）：灰蓝渐变 + 模糊遮罩 + 雨滴动画
- **山间云海**（mountain-cloud）：青灰渐变 + 云朵SVG浮动
- **雪夜**（snowy-night）：深蓝渐变 + 雪花飘落动画

### 2. 藏象阁（BodyWisdom）深度交互增强

| 文件 | 变更 |
|---|---|
| `views/BodyWisdom.vue` | 从77行扩增至477行，三层均增加交互记录能力 |

- **身体层**：子午流注钟每条经络可记录状态（好/一般/不适），今日汇总统计
- **感知层**：6种心境选择 + 今日感悟输入 + 历史记录列表
- **护持层**：经文阅读计时器 + 阅读摘录 + 阅读历史
- **各层通用**：底部"记一笔"笔记按钮 + 模态对话框 + 笔记列表

### 3. 独立数据档案馆

| 文件 | 变更 |
|---|---|
| `views/Archive.vue` | 新建：导出区（JSON导出）、导入区（文件选择+分类计数反馈）、数据概览区（9个数据域卡片） |
| `router/index.ts` | 新增 `/archive` 路由 |

### 4. 知识接引（阅览殿重写）

| 文件 | 变更 |
|---|---|
| `views/ReadingHall.vue` | 完全重写：三个子选项卡（书卷/摘录集/回顾） |

- **书卷**：粘贴文本或上传 .txt，选中文字摘录 + 批注，已摘录段落自动高亮
- **摘录集**：浏览/删除所有摘录，空白状态提示
- **回顾**：专注总时间、结晶数、笔记数、情绪记录数概览

### 验证

**123 个测试全部通过**，新增功能不破坏既有测试。
