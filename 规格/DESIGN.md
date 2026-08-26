# 心流工坊 · DESIGN.md

> **设计系统规范（AI 可读版）**
> 版本：2026-08-17 · 依据 `src/assets/design-tokens.css` 与 `src/components/ui/*` + `App.vue` 壳层实测提炼（含 P2 数据分类色收敛到暖琥珀同温层）
> 适用范围：所有前端 UI（Vue 3 + Vite + Tauri2 桌面端）。新增视图、组件、动效前请先读本文件。

---

## 0. 一句话定位

心流工坊的视觉语言是 **「深夜食堂 · 暖琥珀」**——一套温暖、克制、有呼吸感的个人私密空间美学。
它刻意回避当下 AI 生成界面最常见的"青紫渐变 + 高饱和霓虹"套路（我们称之为 **AI-slop**），改用
**暖琥珀主色 + 衬线标题 + 玻璃质感 + 低频辉光** 来表达"陪伴而非喧哗"。

设计伦理（与产品宪法第 1 条「本地私有」一致）：
- 一切视觉服务"安顿情绪"，不服务"眼球收割"。
- 默认无云、无外部字体 CDN 强依赖（字体走本地/系统回退，离线可用）。
- 色彩与动效克制，避免炫技式闪烁、强对比、信息轰炸。

---

## 1. Visual Theme & Atmosphere（视觉主题与氛围）

- **设计哲学**：把数字空间做成"深夜还亮着灯的一人食堂"——安静、包容、低刺激，让人愿意长久停留。
- **视觉基调**：温暖人文（warm-humanist）、私密、夜间向暗色主题。
- **核心视觉特征（5 个关键词）**：
  1. `暖琥珀主色` — 唯一品牌色，3500K 暖光。
  2. `衬线温度` — 标题衬线（Noto Serif SC），正文无衬线（Noto Sans SC）。
  3. `玻璃质感` — 半透明卡片 + `backdrop-filter: blur()`。
  4. `低频辉光` — 极淡琥珀光晕（`--shadow-glow`），非霓虹。
  5. `呼吸动效` — 慢、柔、有惯性，无弹跳/频闪。
- **光影与质感倾向**：毛玻璃（glassmorphism）+ 微阴影，无纯扁平、无重黑硬边、无高饱和平涂。

**氛围层级（壳层 z 栈，务必遵循）**
```
.app-shell           背景 = --bg-primary（实心底色，兜底）
  └ .app-base-bg     z-index: 0   ← 用户自定义全局背景（注意：绝不能是 -1，否则被壳层盖死）
  └ .canvas-room     z-index: 0   ← 引力场画布（DOM 在后，受 --canvas-alpha 控制强度）
  └ .ambient-layer   z-index: 1   ← 环境辉光/颗粒/尘埃（受 --ambient-*-alpha 控制）
  └ .main-content    z-index: 1   ← 唯一滚动容器，所有房间内容在此
```
- **所有房间根背景必须 `transparent`**，只保留 `::before / ::after` 主题辉光；新增房间切勿铺不透明渐变。
- 浮层 `position: fixed` 须 `left: calc(var(--sidebar-w, 220px) + Npx)` 避让 220px 侧栏。

---

## 2. Color Palette & Roles（调色板与角色）

所有颜色以 CSS 变量引用，**禁止硬编码 HEX**（除非一次性装饰且不影响主题切换）。

### 2.1 Primary Colors（主色）
| 角色 | HEX | CSS 变量 | 使用场景 |
| --- | --- | --- | --- |
| 核心品牌（琥珀） | `#d4a574` | `--accent` (`--accent-rgb: 212,165,116`) | 主按钮、链接、焦点环、主题辉光。唯一"主色"。 |

### 2.2 Brand & Dark（品牌色与深色变体）
| 用途 | HEX | CSS 变量 |
| --- | --- | --- |
| 主背景（壳层兜底） | `#0d0b09` | `--bg-primary` |
| 深一档 | `#14100b` | `--bg-deep` |
| 最深 | `#0a0806` | `--bg-deepest` |
| 面板底 | `#1a1612` | `--bg-panel` |
| 模态遮罩 | `rgba(10,8,6,.6)` | （BaseModal 内联） |
| Anthropic 补充点缀 | `#141413 / #faf9f5 / #d97757 / #6a9bcc / #788c5d` | `--brand-*` |

### 2.3 Accent / Interactive（强调与交互）
| 角色 | HEX | CSS 变量 | 用法 |
| --- | --- | --- | --- |
| 青（数据/状态） | `#5ab8a0` | `--accent-cyan` | 仅语义/图表点缀 |
| 蓝（数据/状态） | `#6b9fc4` | `--accent-blue` | 仅语义/图表点缀 |
| 紫（数据/状态） | `#a07c8c` | `--accent-purple` | 仅语义/图表点缀 |
| 强调微染 | `rgba(212,165,116,.2)` | `--accent-dim` | 选中态底 |
| 辉光 | `rgba(212,165,116,.08)` | `--accent-glow` | 导航/卡片选中底 |

> 规则：**琥珀是唯一的"品牌主色"**；青/蓝/紫只作语义或图表点缀，绝不用于大面积铺底或主按钮。

### 2.4 Neutral / Gray Scale（中性系统）
本项目**不使用冷灰**，层级全部由"暖白 + 透明度阶梯"表达：
| 用途 | 取值 | CSS 变量 |
| --- | --- | --- |
| 主文字（暖白） | `#e8e0d8` | `--text-primary` |
| 次文字 | `rgba(232,224,216,.55)` | `--text-secondary` |
| 静音/占位 | `rgba(232,224,216,.3)` | `--text-muted` |
| 弱化/禁用 | `#8a8a8a` | `--text-muted-alt` / `--text-disabled` |
| 高亮片段 | `rgba(232,224,216,.88)` | `--text-high` |
| 中 | `.5` | `--text-medium` |
| 暗 | `.4` | `--text-dim` |
| 浅 | `.35` | `--text-low` |
| 极淡 | `.2` | `--text-faint` |

### 2.5 Surface & Borders（表面与边框）
| 用途 | 取值 | CSS 变量 |
| --- | --- | --- |
| 表面态 | `rgba(255,255,255,.03)` | `--bg-surface` |
| 浮起表面 | `rgba(35,30,24,.8)` | `--bg-elevated` |
| 卡片底（半透） | `rgba(42,36,30,.6)` | `--bg-card` → `--bg-card-rgb: 42,36,30` |
| 卡片 hover | `rgba(55,48,40,.7)` | `--bg-card-hover` |
| 默认边框 | `rgba(212,165,116,.12)` | `--border` / `--border-color` |
| 极淡边框 | `rgba(212,165,116,.06)` | `--border-light` |
| 卡片别名底/边 | `rgba(42,36,30,.4)` / `rgba(212,165,116,.08)` | `--card-bg` / `--card-border` |

### 2.6 Semantic Colors（语义色）
| 状态 | HEX | CSS 变量 |
| --- | --- | --- |
| 成功 | `#34d399` | `--success` |
| 成功（浅） | `#6aba7a` | `--success-light` |
| 危险 | `#ff6b6b` | `--danger` |
| 错误 | `#ef4444` | `--error` |
| 警告 | `#f0c040` | `--warning` |

> 注意：本项目在**金融/涨跌**语境用红涨绿跌（A 股习惯），但通用 UI 语义仍用上面这组（success=绿、danger=红）。
> **语义成功绿 `#34d399` 等刻意保留**（有固定语义：success / health / thriving / approved / ready / score / plant-growth / grade / low-priority），
> 属"语义/状态色"而非"任意数据分类色"，**不在 P2 收敛范围内**——请勿将其改成暖鼠尾草 `#8a9a7a`（后者仅用于无语义的类别区分，见 §2.9）。

### 2.7 Shadow Colors（阴影色，含 rgba）
| 用途 | box-shadow 值 | CSS 变量 |
| --- | --- | --- |
| 基础投影 | `0 4px 24px rgba(0,0,0,.4)` | `--shadow` |
| 琥珀辉光 | `0 0 40px rgba(212,165,116,.06)` | `--shadow-glow` |
| 模态遮罩 | `rgba(10,8,6,.6)` + `blur(8px)` | （BaseModal） |
| 焦点环 | `0 0 0 3px rgba(212,165,116,.35)` | （按钮/输入内联） |

### 2.8 琥珀色阶（Amber Scale，3500K 暖光）
| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#fde8c8` | `#f5d5a0` | `#e8c078` | `#dbaa58` | `#cf9640` | `#c28130` | `#a66a24` | `#8a541c` | `#6e4016` | `#523010` |

> 用于渐变、辉光衰减、图表填充、深浅层次。

### 2.9 Data-Classification Warm Zone（数据分类同温层 · 16 色，单一事实源）
任何「区分数据类别」的着色（图表系列、标签簇、分支、聚类、成员、时间线节点……）**必须**取自本调色板，
不得硬编码霓虹亮色。代码单一事实源：`src/theme/categoryColors.ts` 的 `CATEGORY_PALETTE`
（运行时图表需字面量 hex，故此处用字面量而非 CSS 变量）。旧散落亮色用 `warmCategoryColor()` 迁移到本表。

| 序号 | 名称 | HEX | 备注 |
| --- | --- | --- | --- |
| 0 | 琥珀 | `#d4a574` | = `--accent`（主色，亦作分类首项） |
| 1 | 浅琥珀 | `#e8c8a0` | |
| 2 | 古铜 | `#c89060` | |
| 3 | 赭石 | `#e0a96d` | 原 `#fbbf24` / `#f59e0b` 收敛 |
| 4 | 赤陶 | `#cf8b6b` | 原 `#fb923c` / `#f6b26b` 收敛 |
| 5 | 陶土玫 | `#d98c7a` | 原 `#f472b6` / `#ec4899` 收敛 |
| 6 | 烟玫 | `#b5707a` | 原 `#a78bfa` 收敛 |
| 7 | 雾紫 | `#a07c8c` | = `--accent-purple`；原 `#7c5cfc` / `#8b5cf6` / `#7c6cf0` 收敛 |
| 8 | 暖鼠尾草 | `#8a9a7a` | 原 `#34d399` / `#10b981` 收敛（**分类**用，非语义成功） |
| 9 | 雾青绿 | `#7a9a8a` | 原 `#84cc16` / `#6ee7b7` 收敛 |
| 10 | 雾青 | `#5ab8a0` | = `--accent-cyan`；原 `#36d6e7` / `#06b6d4` 收敛 |
| 11 | 雾蓝 | `#6b9fc4` | = `--accent-blue`；原 `#38bdf8` / `#4f8cff` / `#6c9cf5` 收敛 |
| 12 | 暖金 | `#f0c040` | = `--warning`；原 `#ffd700` 收敛 |
| 13 | 焦糖 | `#c4956a` | |
| 14 | 暖锈 | `#c46a5a` | red 的暖替代；原 `#ef4444` / `#e63946` 收敛 |
| 15 | 橄榄金 | `#b89a6a` | |

> ⚠️ **语义/状态色 与 数据分类色 是两套，勿混**：
> - **语义/状态色**（§2.6）如成功 `#34d399`、危险 `#ef4444`、警告 `#f0c040` 是**有固定含义**的系统色，按用途保留，**不**在此收敛范围内。
> - **数据分类色**（本表）是**无固有语义、只为区分类别**的循环调色板；任何"只是用来区分 A/B/C 类"的着色都应收敛到本 16 色，而非引入新霓虹。
> - 新增"类别着色"时：优先 `categoryColor(index)` 取本表；若要把旧硬编码亮色迁移，用 `warmCategoryColor(legacy)`。

---

## 3. Typography Rules（排版规则）

### 3.1 Font Family（字体族）
| 角色 | 字体栈 | CSS 变量 |
| --- | --- | --- |
| 标题（中文） | `'Noto Serif SC','Noto Sans SC','Source Han Serif SC',serif` | `--font-heading-zh` |
| 正文（中文） | `'Noto Sans SC',system-ui,-apple-system,sans-serif` | `--font-body-zh` |
| 标题（英文） | `'Poppins','Arial',sans-serif` | `--font-heading-en` |
| 正文（英文） | `'Lora','Georgia',serif` | `--font-body-en` |

- 根 `font-size: 14px; line-height: 1.6;`
- 中英文混排：标题走衬线（`--font-heading-zh`），正文走无衬线（`--font-body-zh`）。
- 字体**必须走系统/本地回退**，不得强依赖外部 CDN（离线可用是硬约束，见宪法第 1 条）。

### 3.2 Type Scale（完整层级）
字号全部相对根 14px；下表给出 px 近似、字重、行高、字距。

| 层级 | 用途 | 字号 | 字重 | 行高 | 字距 | 字体 |
| --- | --- | --- | --- | --- | --- | --- |
| Display Hero | 首屏大标题 | `28px` | 600 | 1.25 | `0` | heading-zh |
| H1 | 页面主标题 | `22px` | 600 | 1.3 | `0` | heading-zh |
| H2 | 区块标题 | `18px` | 600 | 1.4 | `0` | heading-zh |
| H3 | 卡片/模态标题 | `21px` | 600 | 1.4 | `0` | heading-zh（模态见 §4.6） |
| H4 | 小组标题 | `16px` | 600 | 1.4 | `0` | heading-zh |
| Body | 正文 | `14px` | 400 | 1.6 | `0` | body-zh |
| Body Strong | 强调正文 | `14px` | 600 | 1.6 | `0` | body-zh |
| Small | 辅助说明 | `13px` | 400 | 1.6 | `0` | body-zh |
| Caption | 标签/注释 | `11px` | 500 | 1.5 | `.5px` | body-zh |
| Nano | 角标/微注 | `10px` | 500 | 1.4 | `1.5px`(大写) | body-zh |

### 3.3 设计哲学
- 字重只用 400 / 500 / 600 三档，避免 700+ 的"喊叫感"。
- 衬线标题提供"温度与安定"，无衬线正文提供"清晰与舒适"。
- 字距：中文标题 `0`；英文小标签用 `letter-spacing: 1.5px` + `uppercase` 表达"分区感"（见导航组标题）。

---

## 4. Component Stylings（组件样式）

所有新组件应复用 `src/components/ui/` 基元：**`BaseButton` / `BaseCard` / `BaseInput` / `BaseModal`**。
下面是其权威样式，照此延伸，不要另起一套。

### 4.1 Buttons（按钮 `BaseButton` → `class="hf-btn"`）
- 基础：`min-height: 40px; padding: 10px 20px; border-radius: var(--radius-md)=10px; font-weight: 600;`
- 变体：
  - `--primary`：底 `--accent`，字 `#1a1208`；hover `filter: brightness(1.08)` + `box-shadow: var(--shadow-glow)`；active `translateY(1px)`。
  - `--secondary`：透明底，字 `--accent`，边 `--border-color`；hover 底 `--bg-surface`。
  - `--ghost`：透明底，字 `--text-medium`；hover 底 `--bg-surface` + 字 `--text-primary`。
  - `--danger`：底 `--danger`，字 `#1a0a0a`；hover `brightness(1.06)`。
- 禁用：`background: var(--text-muted-alt)`，无阴影。
- 焦点：`box-shadow: 0 0 0 3px rgba(var(--accent-rgb), .35)`（无 `outline`）。
- `block` 变体 = `width: 100%`。

### 4.2 Cards（卡片 `BaseCard` → `class="hf-card"`）
- 基础：`background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg)=16px; box-shadow: var(--shadow); overflow: hidden;`
- `--elevated`：`background: var(--bg-elevated)`（更实，用于浮起面板/模态）。
- `--flush`：去掉 body 内边距（用于图片/列表铺满）。
- 结构：`__header`（padding `16px 20px 0`，衬线 600）、`__body`（padding `20px`）、`__footer`（padding `0 20px 16px`，`--text-dim`，`13px`）。

### 4.3 Inputs（输入 `BaseInput` → `class="hf-input"`）
- 包裹 `.hf-field`：`flex column; gap: 6px;`
- label `.hf-field__label`：`13px`，`--text-medium`。
- input：`background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md)=10px; padding: 10px 12px;`
- focus：`border-color: var(--accent)` + `box-shadow: 0 0 0 3px rgba(var(--accent-rgb), .2)`。
- placeholder：`--text-dim`；disabled：`opacity: .5; cursor: not-allowed`。

### 4.4 Navigation（导航 `App.vue` 侧栏）
- 容器 `.nav-links`：`flex column; gap: 1px;`
- 组标题 `.nav-group-title`：`10px`，`letter-spacing: 1.5px`，`uppercase`，`--text-secondary`。
- 项 `.nav-item`：`display:flex; gap:10px; padding: 9px 12px; border-radius: 8px; font-size: 13px; color: var(--text-secondary);`
  - 左侧琥珀指示条 `::before`：`width:3px`，默认 `height:0; opacity:0`，过渡。
  - hover：底 `--bg-surface`，字 `--text-primary`。
  - **active**：底 `--accent-glow`，字 `--accent`；`::before` 高度 `60%`、`opacity:1`。
  - 图标 `.nav-icon`：`clamp(14px,1.3vw,16px)`，默认 `opacity:.7`，active `1`。
  - 右端胶囊 `.nav-pill`：`border-radius:999px; font-size:9px`，active 时边/字转琥珀。
- 移动端：`.bottom-nav-item.active`（≤639px 底栏，逻辑同 active）。

### 4.5 Badges / Tags / Chips（标记）
| 类型 | 来源 | 样式要点 |
| --- | --- | --- |
| Tag（标签） | `CrystalDetail.vue .tag` | `border: 1px solid <color>44; color: <color>`（色由数据驱动，弱描边） |
| Chip（芯片） | `AutomationWorkshop.vue .chip` | `padding: 4px 10px; border-radius: 12px; font-size: 11px; border: 1px solid; cursor: grab` |
| Badge 官方 | `Constitution.vue .badge-official` | 小角标，标记"官方"预设 |
| Badge 运行时 | `.badge-runtime-active` / `.badge-runtime-declarative` | 宪法编辑器标记条款是否"生效中/声明式" |

> 通用规则：标记用**弱描边 + 小字 + 圆角 12px / 999px**，不用实心高饱和底；颜色优先取上下文色（如晶体色、琥珀）。

### 4.6 Modals / Dialogs（`BaseModal` → `class="hf-modal"`）
- 遮罩 `.hf-modal-mask`：`position: fixed; inset: 0; background: rgba(10,8,6,.6); backdrop-filter: blur(8px); display: grid; place-items: center; z-index: 1000;`
- 内容 `.hf-modal`：`background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-lg)=16px; padding: 24px; box-shadow: var(--shadow); min-width: 320px; max-width: 90vw; max-height: 85vh; overflow: auto;`
- 标题 `.hf-modal__title`：`21px / 600`，`--font-heading-zh`，`--text-primary`。
- 关闭钮 `.hf-modal__close`：透明、字 `--text-medium`，hover 底 `--bg-surface` + 字 `--text-primary`。
- 动画：`summon-fade-in 0.32s cubic-bezier(0.22,1,0.36,1)`（入），`0.2s` 反向（出）；Esc 关闭。

### 4.7 玻璃面板（Glass Panel）通用范式
多处浮层复用：`backdrop-filter: blur(8–20px)`（侧栏 8px、幕僚坞 18px、星盘 20px）。
```css
.glass {
  background: var(--bg-elevated);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
}
```

### 4.8 覆盖层 / 软效果（Overlays）
- 数字安息日：`.sabbath-overlay`（"数字安息日 · 今日不扰"），由 `html.sabbath` + `--hf-sabbath` 控制。
- 夜静调暗：`.night-dim-overlay`，由 `html.night-dim` + `--hf-night-dim` 控制。
- 这类"宪法软效果"通过 `App.vue` 挂载的组合式（`useDigitalSabbath` / `useLongDormancy` / `useNightDim`）切换 `<html>` class 与 CSS 变量，**组件自身不应硬编码这些效果**。

---

## 5. Layout Principles（布局原则）

- **唯一滚动容器**：`.main-content`（z:1）是页面唯一可滚动区域；房间根用 `min-height: 100%`，**禁止 `height: 100vh` 硬撑**（会裁切/割裂超一屏内容）。
- **侧栏宽度**：`--sidebar-w: 220px`（桌面）。浮层避让：`left: calc(var(--sidebar-w, 220px) + Npx)`。
- **Spacing System（间距基数 4px）**：`xs=4 / sm=8 / md=16 / lg=24 / xl=40 / 2xl=64`（px）。倍数制，勿裸数字。
- **Grid System**：自由流式布局（桌面应用非栅格站点）；房间内区块用 `flex/grid` + 上述间距；卡片网格 `gap: 16px`。
- **Container**：内容区宽度 `calc(100% - 220px)`（减侧栏）；内 padding 用 `--spacing-md/lg`。
- **Section Spacing（区块间距）**：段间 `--spacing-xl(40px)`；卡片内 `--spacing-md(16px)`。
- **留白哲学**：宽松、呼吸感优先；信息密度低于常规 SaaS，留白即"安静"。

---

## 6. Depth & Elevation（深度与层级）

### 6.1 Shadow System（阴影阶梯，shadow-xs → shadow-2xl）
在现有两枚 token 基础上，按同一投影语言扩展为可选层级（前两项为真实 token，其余为一致派生）：
| 层级 | box-shadow | 来源/用途 |
| --- | --- | --- |
| shadow-xs | `0 1px 4px rgba(0,0,0,.3)` | 派生：标签/小元素 |
| **shadow (base)** | `0 4px 24px rgba(0,0,0,.4)` | `--shadow`：卡片/面板 |
| shadow-glow | `0 0 40px rgba(212,165,116,.06)` | `--shadow-glow`：琥珀 hover 辉光 |
| shadow-lg | `0 8px 32px rgba(0,0,0,.45)` | 派生：浮起面板/抽屉 |
| shadow-2xl | `0 16px 48px rgba(0,0,0,.5)` | 派生：模态/顶层浮层 |

### 6.2 Surface Layers（表面层级）
`background(#0d0b09)` → `surface(rgba(255,255,255,.03))` → `card(rgba(42,36,30,.6))` → `elevated(rgba(35,30,24,.8))` → `overlay(模态遮罩 rgba(10,8,6,.6)+blur)`。

### 6.3 Z-index Scale（层级数值）
| 层级 | z-index | 元素 |
| --- | --- | --- |
| 背景 | 0 | `.app-base-bg` / `.canvas-room` |
| 环境/内容 | 1 | `.ambient-layer` / `.main-content` |
| 浮层/抽屉 | `10–100` | 侧栏、面板 |
| 模态遮罩 | `1000` | `.hf-modal-mask` |

### 6.4 Backdrop Effects（毛玻璃）
`backdrop-filter: blur(8–20px)`；侧栏 8px、幕僚坞 18px、星盘 20px、模态 8px。配 `1px` 极淡琥珀边。

---

## 7. Do's and Don'ts（设计规范与禁忌）

**✅ Do**
- 颜色一律走 CSS 变量；新增颜色先问"是否已有语义变量"。
- 复用 `Base*` 基元；自定义组件对齐 `hf-btn` / `hf-card` / `hf-input` 的密度与圆角。
- 氛围靠 `::before/::after` 辉光 + `backdrop-filter`，保留房间根透明。
- 动效统一 `--transition`；用 `cubic-bezier(0.4,0,0.2,1)` 缓动。
- 文字层级用"暖白 + 透明度"，不用冷灰。
- 标记用弱描边小字，不用实心高饱和底。

**❌ Don't**
- 不要硬编码 HEX；不要引入青紫渐变 / 霓虹 / 高饱和平涂（AI-slop）。
- 不要为"区分数据类别"硬编码霓虹亮色（如 `#7c5cfc` / `#38bdf8` / `#f472b6` / 把 `#34d399` 当类别色）；改用 §2.9 的 `CATEGORY_PALETTE` / `warmCategoryColor()`。
- 不要给房间根铺不透明渐变背景（会盖死自定义背景与画布）。
- 不要用 `height: 100vh` 硬撑视图根（超一屏裁切）。
- 不要另起 `border-radius` / `padding` 数值体系（用 `--radius-*` / `--spacing-*`）。
- 不要在组件内硬编码宪法软效果（安息日/夜静/长眠），由 `App.vue` 组合式统一驱动。
- 不要强依赖外部字体 CDN（离线可用是硬约束）。

---

## 8. Responsive Behavior（响应式行为）

### 8.1 Breakpoints（断点）
| 断点 | 范围 | 布局 |
| --- | --- | --- |
| Mobile | `≤ 639px` | 侧栏折叠为抽屉/底栏；房间单列堆叠；顶栏 48px、底栏 56px |
| Tablet | `640–1023px` | 侧栏可收起；双列卡片 |
| Desktop | `≥ 1024px`（默认） | 侧栏 220px 常驻；多列网格 |
| Wide | `≥ 1440px` | 内容区放宽，留白增大 |

### 8.2 Touch Targets（触摸目标）
- 最小可点尺寸 `40×40px`（`.hf-btn` `min-height: 40px` 已满足）；导航项/图标点击区同此基线。
- 移动端浮层避让 48px 顶栏 / 56px 底栏，勿被遮挡。

### 8.3 折叠策略
- 桌面 → 移动：侧栏 `220px` 收为抽屉（`.sidebar-collapsed` / `.sidebar-overlay`），主导航降为底栏 `.bottom-nav-item`。
- 卡片网格随宽度降列（3→2→1）。
- 宪法软效果覆盖层在移动端保持全屏。

### 8.4 Font Scaling（字体缩放）
- 根 `14px` 固定；相对单位用 `em/rem` 与 `clamp()`（如导航图标 `clamp(14px,1.3vw,16px)`）。
- 移动端不全局放大根字号，靠 `clamp()` 与断点微调标题；超大屏（Wide）可适度增大 Display Hero 至 `32px`。

---

## 9. Agent Prompt Guide（AI 代理提示指南）

### 9.1 Quick Reference（速查）
主色仅琥珀 `--accent`；青蓝紫仅语义点缀；拒绝 AI-slop；字体走系统回退；复用 `Base*` 基元；类别着色走 `CATEGORY_PALETTE`（§2.9），勿硬编码霓虹分类色；
房间根透明 + `::before/::after` 辉光；视图根 `min-height:100%` 禁 `100vh`；浮层避让 220px 侧栏；
宪法软效果由 `App.vue` 组合式驱动；动效用 `--transition`；强度可调接 `--canvas-alpha`/`--ambient-*-alpha`。

### 9.2 Component Prompts（可直接复制的组件生成 Prompt）
1. **生成主操作按钮**：`基于 DESIGN.md 生成一个确认按钮，使用 BaseButton primary 变体：底 --accent、字 #1a1208、hover brightness(1.08)+shadow-glow、圆角 --radius-md、min-height 40px。`
2. **生成信息卡片**：`生成一个 hf-card 风格卡片：底 --bg-card、边 --border-light、圆角 --radius-lg、阴影 --shadow、header 用衬线 600、body padding 20px，且背景半透明可透出画布。`
3. **生成输入框**：`生成 BaseInput 风格输入：底 --bg-surface、边 --border-color、focus 时边 --accent + 3px 琥珀焦点环、圆角 --radius-md、placeholder 用 --text-dim。`
4. **生成侧栏导航项**：`生成 nav-item：默认 --text-secondary，hover 底 --bg-surface，active 底 --accent-glow+字 --accent+左侧 3px 琥珀指示条，圆角 8px，图标 opacity 随状态 0.7→1。`
5. **生成玻璃面板**：`生成一个 glass 浮层：底 --bg-elevated、backdrop-filter blur(12px)、边 --border-light、圆角 --radius-lg，文字用暖白保证对比。`
6. **生成模态**：`生成 BaseModal 风格对话框：遮罩 rgba(10,8,6,.6)+blur(8px)、内容底 --bg-elevated、圆角 --radius-lg、padding 24px、标题衬线 21px 600、入场 summon-fade-in 0.32s。`

### 9.3 Iteration Guide（AI 生成 UI 的迭代建议）
1. 先核对颜色是否全为 CSS 变量；发现 HEX 立即替换为对应 `--var`。
2. 检查是否出现青紫渐变/霓虹——若有，强制改为琥珀主色 + 中性表面。
3. 确认组件是否复用 `Base*`；自建组件须对齐其密度/圆角/焦点环。
4. 验证房间根 `background: transparent`；把不透明背景改为 `::before/::after` 辉光。
5. 把 `height:100vh` 改为 `min-height:100%`，确认超一屏不裁切。
6. 浮层 `left` 加 `calc(var(--sidebar-w,220px) + Npx)`；移动端改避让 48/56px 栏。
7. 动效统一 `--transition`；删除 `ease-in-out` 硬编码与弹跳关键帧。
8. 标记类元素改弱描边小字，去掉实心高饱和底。
9. 文字层级用暖白透明度，不用冷灰 `#888`。
10. 涉及画布/环境层时接 `--canvas-alpha`/`--ambient-*-alpha`，勿写死不透明度。
11. 新增/修改"数据类别着色"时，从 §2.9 的 16 色同温层取色（代码用 `categoryColor(index)`），旧亮色用 `warmCategoryColor(legacy)` 迁移；**禁止新增霓虹类色值**作为类别色。

---

*本文件由设计系统审计生成，后续如 `design-tokens.css` 或 `Base*` 基元变更，请同步更新本章节对应小节。*
