# DESIGN.md — 心流工坊 · Heartflow 设计系统

> 设计哲学：**「深夜食堂 · 暖琥珀」**——温暖、私密、文学感的个人心流空间。
> 本文件为 **awesome-design-md 9 章标准格式**，供 Cursor / Claude Code / WorkBuddy 等 AI 代理直接消费。
> **全部数值取真实代码**（`src/assets/design-tokens.css` + `src/stores/style.ts` + `src/assets/animations.css`），可直接套用。
> 最后校准：2026-08-18。

---

## 1. Visual Theme & Atmosphere（视觉主题与氛围）

- **品牌哲学**：把「记录与生长」做成一种有温度的仪式感。界面如深夜食堂的暖灯，不喧哗、不冷峻。
- **视觉基调**：温暖人文 · 亲密私密 · 文学沉静。
- **核心视觉特征**：暖琥珀主色 · 近黑底 · 衬线标题 · 微光呼吸 · 光门转场。
- **光影与质感**：以「微阴影 + 克制毛玻璃」为主；**禁止**大面积发光渐变与纯扁平无层次。玻璃仅用于浮层/模态，普通面板用实色。

### 主题体系（重要 · 多包而非单色）
Heartflow 是**可换肤**系统，不是单一主色产品。两套事实来源：

1. **基础令牌品牌 = 暖琥珀 `#d4a574`**：`design-tokens.css` 的 `:root` 硬编码默认，全站 CSS 变量以此为基。这是「品牌灵魂」色。
2. **内置风格包（用户运行时可切换）**：`stores/style.ts` 在 JS 层注入并默认激活：
   | 包 id | 名称 | 主色 | 背景 |
   |---|---|---|---|
   | `default-gravity` | 心流科技风 | `#7c6cf0` | `#0a0a0f` |
   | `warm-amber` | 暖琥珀 | `#d4a574` | `#0d0b09` |
   | `deep-ocean` | 深海 | `#38bdf8` | `#020617` |

   ⚠️ **已知分歧**：`design-tokens.css` 基础令牌是琥珀，但 `style.ts` 默认 `activeId = 'default-gravity'`（紫），故**首次启动渲染为紫色**，覆盖基础琥珀。两者需对齐（建议默认激活 `warm-amber` 以契合品牌哲学）。以下设计令牌以**基础琥珀令牌**为准（AI 生成 UI 的默认参考），紫色包为可选皮肤。

---

## 2. Color Palette & Roles（调色板与角色）

### Primary Colors（主色 · 基础琥珀令牌）
| 角色 | HEX / rgba | CSS 变量 | 场景 |
|---|---|---|---|
| 品牌琥珀（主交互色） | `#d4a574` | `--accent` | 按钮、链接、强调、激活态 |
| 琥珀 RGB（透明度派生） | `212,165,116` | `--accent-rgb` | glow / dim / border 派生 |
| 琥珀微光 | `rgba(212,165,116,0.08)` | `--accent-glow` | 柔光晕 |
| 琥珀暗调 | `rgba(212,165,116,0.2)` | `--accent-dim` | 徽章底 / 激活态底 |

### Brand & Dark（品牌深色背景）
| 角色 | HEX | CSS 变量 |
|---|---|---|
| 主背景（最深） | `#0d0b09` | `--bg-primary` |
| 深背景 | `#14100b` | `--bg-deep` |
| 最深背景 | `#0a0806` | `--bg-deepest` |
| 表面替代 | `#0f0c09` | `--bg-surface-alt` |
| 面板实色 | `#1a1612` | `--bg-panel` |
| 卡片 RGB 基 | `42,36,30` | `--bg-card-rgb` |

### Accent / Interactive（强调与语义点缀）
| 名称 | HEX | CSS 变量 | 用途 |
|---|---|---|---|
| 琥珀主强调 | `#d4a574` | `--accent` | 主交互 |
| 青绿点缀 | `#5ab8a0` | `--accent-cyan` | 成功/自然/生命类模块 |
| 蓝点缀 | `#6b9fc4` | `--accent-blue` | 知识/冷静类模块 |
| 紫粉点缀 | `#a07c8c` | `--accent-purple` | 情感/关系类模块 |

### Neutral / Gray Scale（中性文字阶 · 实测于 `#0d0b09`）
> ⚠️ 对比度纪律：承载信息的文字 ≥ `--text-medium`(0.5)；说明级 ≥ `--text-secondary`(0.55)；仅占位/装饰可 ≤ `--text-dim`(0.4)。旧 `--text-muted`(0.3) 已弃用裸引用。

| 角色 | rgba | CSS 变量 | 对比度(约) | 用途 |
|---|---|---|---|---|
| 主文字 | `#e8e0d8` | `--text-primary` | ~14:1 | 正文/标题 |
| 高亮文字 | `rgba(232,224,216,0.88)` | `--text-high` | ~12:1 | 强调句 |
| 明亮文字 | `rgba(232,224,216,0.7)` | `--text-bright` | ~7:1 ✅AAA | 强调正文 |
| 次级文字 | `rgba(232,224,216,0.55)` | `--text-secondary` | ~5:1 ✅AA | 标签/说明（收敛目标值） |
| 中文字 | `rgba(232,224,216,0.5)` | `--text-medium` | ~4.5:1 ⚠️AA边缘 | 次级正文 |
| 弱化文字 | `rgba(232,224,216,0.4)` | `--text-dim` | ~3:1 ⚠️大文字AA | 占位符/装饰 |
| 低文字 | `rgba(232,224,216,0.35)` | `--text-low` | ~2.5:1 | 仅装饰 |
| 极淡文字 | `rgba(232,224,216,0.2)` | `--text-faint` | ~2:1 | 仅非信息性装饰 |
| 装饰级 | `rgba(232,224,216,0.3)` | `--text-muted` | ~2:1 | 仅装饰 fallback |
| 禁用文字 | `#8a8a8a` | `--text-muted-alt` | — | disabled 态 |
| 禁用文字亮 | `#e0e0e0` | `--text-disabled` | — | disabled 态 |

### Surface & Borders（表面与边框）
| 角色 | rgba / HEX | CSS 变量 |
|---|---|---|
| 卡片表面（半透） | `rgba(42,36,30,0.6)` | `--bg-card` |
| 卡片悬停 | `rgba(55,48,40,0.7)` | `--bg-card-hover` |
| 实色抬升面 | `rgba(35,30,24,0.8)` | `--bg-elevated` |
| 极淡表面 | `rgba(255,255,255,0.03)` | `--bg-surface` |
| 边框（标准） | `rgba(212,165,116,0.12)` | `--border-color` |
| 边框（轻） | `rgba(212,165,116,0.06)` | `--border-light` |
| 卡片别名底 | `rgba(42,36,30,0.4)` | `--card-bg` |

### Semantic Colors（语义色）
| 语义 | HEX | CSS 变量 |
|---|---|---|
| 成功 | `#34d399` | `--success` |
| 成功浅 | `#6aba7a` | `--success-light` |
| 危险 | `#ff6b6b` | `--danger` |
| 错误 | `#ef4444` | `--error` |
| 警告 | `#f0c040` | `--warning` |

### Shadow Colors（阴影）
| 角色 | 值 |
|---|---|
| 标准阴影 | `0 4px 24px rgba(0,0,0,0.4)` (`--shadow`) |
| 琥珀微光 | `0 0 40px rgba(212,165,116,0.06)` (`--shadow-glow`) |

### 琥珀色阶（暖光 3500K 系列）
`--amber-50 #fde8c8` · `--amber-100 #f5d5a0` · `--amber-200 #e8c078` · `--amber-300 #dbaa58` · `--amber-400 #cf9640` · `--amber-500 #c28130` · `--amber-600 #a66a24` · `--amber-700 #8a541c` · `--amber-800 #6e4016` · `--amber-900 #523010`

---

## 3. Typography Rules（排版规则）

### Font Family（✅ CJK 已落地 `index.html` Google Fonts）
> 已知风险（P3）：依赖 Google Fonts CDN，离线桌面端回退系统衬线（token 已设 `serif` fallback，不崩）。后续可自托管 woff2 消除离线依赖。

| 用途 | 字体栈 | CSS 变量 |
|---|---|---|
| 标题（中） | `'Noto Serif SC', 'Noto Sans SC', 'Source Han Serif SC', serif` | `--font-heading-zh` |
| 正文（中） | `'Noto Sans SC', 'Noto Sans', system-ui, -apple-system, sans-serif` | `--font-body-zh` |
| 标题（英） | `'Poppins', 'Arial', sans-serif` | `--font-heading-en` |
| 正文（英） | `'Lora', 'Georgia', serif` | `--font-body-en` |

### Type Scale（完整层级）
| 级别 | 字号 | 字重 | 行高 | 字距 | 用途 |
|---|---|---|---|---|---|
| Display Hero | 40px | 600 | 1.15 | -0.02em | 首页主标题 |
| H1 | 32px | 600 | 1.20 | -0.01em | 视图标题 |
| H2 | 26px | 600 | 1.25 | 0 | 区块标题 |
| H3 | 21px | 600 | 1.30 | 0 | 卡片标题 |
| H4 | 18px | 500 | 1.40 | 0 | 子标题 |
| Body | 14px | 400 | 1.60 | 0 | 正文 |
| Small | 13px | 400 | 1.50 | 0 | 辅助说明 |
| Nano | 11px | 500 | 1.40 | 0.04em | 大写标签/徽章（uppercase） |

**设计哲学**：衬线标题传递「书写与沉思」，无衬线正文保证长文可读；中文标题用衬线（Noto Serif SC）是品牌灵魂，必须加载。

---

## 4. Component Stylings（组件样式）

> 所有组件**必须走共享基类**（见 `src/components/ui/`），禁止各视图自起 `.btn-save/.panel-*` 等散类名。

### Buttons（4 变体）
```css
/* Primary */
.btn-primary { background: var(--accent); color: #1a1208; border: none;
  border-radius: var(--radius-md); padding: 10px 20px; font-weight: 600;
  transition: var(--transition); }
.btn-primary:hover { filter: brightness(1.08); box-shadow: var(--shadow-glow); }
.btn-primary:active { transform: translateY(1px); }
.btn-primary:disabled { background: var(--text-muted-alt); cursor: not-allowed; }

/* Secondary */
.btn-secondary { background: transparent; color: var(--accent);
  border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 20px; }

/* Ghost */
.btn-ghost { background: transparent; color: var(--text-medium); border: none;
  border-radius: var(--radius-md); padding: 10px 20px; }
.btn-ghost:hover { background: var(--bg-surface); color: var(--text-primary); }

/* Danger */
.btn-danger { background: var(--danger); color: #1a0a0a; border: none;
  border-radius: var(--radius-md); padding: 10px 20px; font-weight: 600; }
```
> 全站按钮圆角统一 `var(--radius-md)=10px`，padding 纵向 ≥10px（满足 44px 触控高度需配合字号）。

### Cards
```css
.card { background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow); }
.card--elevated { background: var(--bg-elevated); }
```

### Inputs
```css
.input { background: var(--bg-surface); color: var(--text-primary);
  border: 1px solid var(--border-color); border-radius: var(--radius-md);
  padding: 10px 12px; }
.input::placeholder { color: var(--text-dim); }
.input:focus { outline: none; border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(212,165,116,0.20); }
```

### Navigation（侧栏/顶栏）
```css
.nav-item { color: var(--text-medium); padding: 10px 14px; border-radius: var(--radius-md); }
.nav-item:hover { background: var(--bg-surface); color: var(--text-primary); }
.nav-item--active { color: var(--accent); background: var(--accent-dim);
  box-shadow: inset 2px 0 0 var(--accent); }
```

### Badges / Tags
```css
.badge { display: inline-flex; align-items: center; padding: 2px 8px;
  border-radius: 999px; font-size: 11px; font-weight: 500; letter-spacing: 0.04em;
  background: var(--accent-dim); color: var(--accent); }
```

### Modals / Dialogs
```css
.modal-mask { position: fixed; inset: 0; background: rgba(10,8,6,0.6);
  backdrop-filter: blur(8px); display: grid; place-items: center; z-index: 1000; }
.modal { background: var(--bg-elevated); border: 1px solid var(--border-color);
  border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow);
  animation: summon-fade-in 0.32s cubic-bezier(0.22,1,0.36,1); }
```

---

## 5. Layout Principles（布局原则）

- **Spacing System**：基数 4px，倍数 `xs4 sm8 md16 lg24 xl40 2xl64`（统一 `--spacing-*`）。
- **Grid**：内容最大宽 `1200px`；桌面应用主区采用 `padding: 24px` 容器；多栏间距 `16–24px`。
- **Container**：视图根容器 `max-width: 1200px; margin: 0 auto; padding: 24px`。
- **Section Spacing**：区块间 `24–40px`；卡片网格 `gap: 16px`。
- **留白哲学**：心流空间需「呼吸感」——内容密度高时用 `gap:16px` 而非 8px；避免满屏卡片堆叠，每屏保留 ≥1 处负空间。
- **圆角**：`--radius-sm 6px` / `--radius-md 10px` / `--radius-lg 16px`（全站统一，禁止逐组件自定义圆角）。

---

## 6. Depth & Elevation（深度与层级）

### Shadow System
| 级别 | box-shadow |
|---|---|
| shadow-xs | `0 1px 2px rgba(0,0,0,0.3)` |
| shadow-sm | `0 2px 8px rgba(0,0,0,0.35)` |
| shadow-md | `0 4px 24px rgba(0,0,0,0.4)` (`--shadow`) |
| shadow-lg | `0 8px 40px rgba(0,0,0,0.5)` |
| shadow-glow | `0 0 40px rgba(212,165,116,0.06)` (`--shadow-glow`) |

### Surface Layers
`background(#0d0b09) → surface(rgba 白0.03) → card(rgba 42,36,30,.6) → elevated(rgba 35,30,24,.8) → overlay(模态)`

### Z-index Scale
`base 0 · sticky 100 · dropdown 500 · modal 1000 · toast 1100`

### Backdrop Effects（玻璃纪律 ⚠️）
> `backdrop-filter` 在 54 文件使用，含 `blur(2px)×11`、`blur(0)×5` 等无效装饰；webview 下昂贵。
- **允许**：模态遮罩 `blur(8px)`、浮层 `blur(12px)`。
- **禁止**：普通面板/卡片用玻璃；`blur<4px` 或 `blur(0)` 视为无效，删除。
- 统一令牌：`--glass-blur: 8px; --glass-bg: rgba(42,36,30,0.55);`

---

## 7. Do's and Don'ts（设计规范与禁忌）

**Do's**
1. 中文标题用 Noto Serif SC 衬线，并确保在 `index.html` 加载。
2. 承载信息的文字对比度 ≥ WCAG AA（≥ `--text-dim` 0.55）。
3. 所有交互元素走 `src/components/ui/` 共享基类。
4. 统一动效缓动 `cubic-bezier(0.22,1,0.36,1)`（入场）/ `0.25s` 标准过渡。
5. 玻璃仅用于模态/浮层；普通面板用实色 `--bg-elevated`。
6. 用 `--accent-cyan/blue/purple` 做模块语义点缀，保持琥珀主色统一。
7. 尊重 `--hf-animate-speed` 等宪法调速变量（见 §9），勿硬编码秒数绕过。

**Don'ts**
1. ❌ 不加载 CJK 字体却声明 Noto Serif SC（现状缺口待补）。
2. ❌ 用 `--text-muted`(0.3)/`--text-dim`(0.4) 显示正文（对比度不达标）。
3. ❌ 每视图自起 `.btn-*`/`.panel-*` 散类名。
4. ❌ 全站滥用 `backdrop-filter` 与渐变（现状 54/113 文件）。
5. ❌ 用青紫 AI 渐变、纯发光、英雄指标卡等 AI slop 套路。
6. ❌ `blur<4px` 或 `blur(0)` 的伪玻璃。
7. ❌ 布局属性（width/height/left/top）做动画——只用 transform/opacity。

---

## 8. Responsive Behavior（响应式行为）

> 产品为 Tauri **桌面应用**（`body{overflow:hidden}`），主场景固定窗口；以下用于窗口缩放与未来移动端。

- **Breakpoints**：`sm 640 / md 1024 / lg 1440 / xl 1920`（桌面为主，`lg` 为最佳视窗）。
- **Touch Targets**：交互元素最小 `44×44px`（按钮 padding 纵向 ≥10px + 14px 字号达标）。
- **折叠策略**：`lg` 以下多栏转单栏；侧栏可收起为图标栏；卡片网格 `lg 3列 / md 2列 / sm 1列`。
- **Font Scaling**：`clamp()` 流式字号；用户系统字号放大时不破版（禁固定 px 强约束关键尺寸）。
- **显示密度**：环境编辑器 `density`（`compact 0.94` / `normal 1` / `spacious 1.06`）经 `root.style.zoom` 整窗均匀缩放，间距与字号同比例变化。

---

## 9. Agent Prompt Guide（AI 代理提示指南）

**Quick Reference**
- 主题：暖琥珀深色（`--bg-primary #0d0b09` / `--accent #d4a574` 为基础令牌；运行时可切换紫/蓝包）
- 字体：标题 Noto Serif SC + Poppins；正文 Noto Sans SC + Lora
- 圆角：md 10 / lg 16；间距基数 4px；阴影用 `--shadow`/`--shadow-glow`
- 动效：`cubic-bezier(0.22,1,0.36,1)`；仅 transform/opacity
- 组件：一律走 `src/components/ui/` 基类

### 宪法软效果调速变量（运行时由 `useEffect(target)` 注入，A2 接线目标）
以下 8 个 `--hf-*` 变量由宪法引擎在 `:root` 注入，组件动效/视觉应**消费**它们而非硬编码，确保宪法第2条「超级自定义」生效：

| 变量 | 默认 | 语义 |
|---|---|---|
| `--hf-animate-speed` | `1` | 全局入场/过渡时长倍率（除法缩放，启用 0.9 更从容） |
| `--hf-breathing-speed` | `1` | 呼吸/微光节奏倍率 |
| `--hf-particle-density` | `1` | 引力场粒子密度 |
| `--hf-empty-space` | `1` | 负空间留白倍率 |
| `--hf-night-dim` | `1` | 夜间调光强度 |
| `--hf-sabbath` | `1` | 安息日（静默）强度 |
| `--hf-scene-transition` | `1` | 场景转场节奏 |
| `--hf-silence` | `1` | 沉默/降噪强度 |

> 接入约定：组件动画时长写 `calc(0.5s / var(--hf-animate-speed, 1))`，绝不写死 `0.5s`。

### 主题切换 API（前端 `stores/style.ts`）
- `useStyleStore().activate(id)` 切换内置包；`createFromBaseColor(name, color, mode)` 从基础色生成包；`importPack(share)` / `exportPack(id)` 导入导出 `.stylepack`。
- 环境编辑器覆盖：`applyEnvironmentConfig(cfg)` 支持 `accentColor` / `background`(default|dark|light|nature|ocean) / `fontFamily`(serif|sans-serif|monospace) / `transition`(none|slide|normal) / `density`。

### Component Prompts（可直接复制）
1. `基于 DESIGN.md 生成 BaseButton.vue，含 primary/secondary/ghost/danger 四变体，用 --accent 与 --radius-md`
2. `基于 DESIGN.md 生成 BaseCard.vue，半透 --bg-card + --border-light + --radius-lg + --shadow`
3. `基于 DESIGN.md 生成 BaseInput.vue，focus 用 --accent 3px ring`
4. `基于 DESIGN.md 生成 BaseModal.vue，遮罩 --glass-blur 8px + summon-fade-in 入场`
5. `把现有 views/Home.vue 中的 .panel-* 散样式重构为使用 BaseCard/BaseButton`

### Iteration Guide
1. 先对齐色彩与字体，再动组件，最后动效。
2. 每改一组件，跑 `vue-tsc --noEmit` + `eslint . --quiet` + `madge --circular` + `vitest run`。
3. 玻璃/渐变每加一处，问「能否用实色+阴影替代？」
4. 任何新文字色，先用对比度检查（≥AA）。
5. 不引入新设计 token，优先复用现有 `--accent-*`/`--text-*`/`--spacing-*`。
6. 动效时长受 `--hf-animate-speed` 影响，勿硬编码秒数绕过。
7. 组件默认 `scoped` 样式 + props 控制变体，避免全局污染。
8. 完成后用真机窗口缩放验证不破版。

---

## 10. 共享原语清单（实际落地 · 2026-09 补充）

> 本节把 §4 的「共享基类」对齐到仓库**真实结构**。当前共享原语**不在** `src/components/ui/`（该目录不存在），而是落在 `src/components/` 与 `src/assets/states.css`。新增 / 补全 UI 时请**优先复用**下列已落地原语，禁止重造散写版本。

### 空态 EmptyState（必用）
- 文件：`src/components/EmptyState.vue`（`.hf-empty*` scoped 样式）。已接入：ComponentMarket / DataAsset / HomeSpace / Study / EmotionGarden / Constitution。
- Props：`icon`(emoji) · `title`(主文案) · `hint`(引导语) · `ctaLabel`(默认「新建」) · `glow`(默认 `true`) · `ctaDisabled`；事件 `@cta`。
- **规则**：所有「无内容」占位统一用 `<EmptyState>`，禁止再散写 `.empty-*` 三件套（icon/text/hint 各写各的 scoped）。
- **无操作按钮的空态必须显式传 `cta-label=""`**，否则会渲染默认「新建」按钮。
- **氛围型房间保留 `glow` 默认呼吸光晕**（如情绪花园）；普通房间用 `:glow="false"` 保持安静。
- 样式：虚线边框卡片 + `--bg-surface` 底 + 呼吸光晕；受宪法调速钩子控制（`--hf-empty-space` 留白 / `--hf-silence` 沉默 / `--hf-breathing-speed` 节奏）。

### 全局交互状态原语（states.css，零特异性 `:where()` 兜底）
- `.hf-state*` 内联状态条（loading/success/error/warning/info）+ `__icon` / `__text` / `__action`。
- `.hf-spinner` 行内加载圈；`.hf-shimmer` 骨架闪烁（仅动 `background-position`）。
- `.hf-sr-only` 屏幕阅读器专用文本；`.hf-tap-safe` 触屏最小命中区（≥24×24）。

### 房间页头（RoomLayout / RoomHeader）
- 53 个房间已接 `RoomLayout → RoomHeader`；页头类名口径 `.rh-title / .rh-kicker / .rh-subtitle / .rh-ornament / .rh-orn-line / .rh-orn-diamond`。
- 旧 `.wl-* / .sr-* / .ce-* / .header-kicker / .orn-*` 已失效，迁移时勿复用。
- 其余约 35 间裸写头部应逐步迁移到 RoomLayout（见后续「统一 padding / 头部」轴）。

### 令牌治理红线（重申）
- 组件 / scoped 样式里**禁止硬编码色值**（令牌定义文件除外）；带透明度令牌色一律 `rgba(var(--xxx-rgb), a)`。
- 间距走 `--spacing-*`、圆角走 `--radius-*`、z 轴走 `--z-*`、阴影走 `--shadow*`；动效时长走 `calc(Ns / var(--hf-animate-speed, 1))`，不写死秒数。
- 动画只动 `transform` / `opacity` / `background-color`；CSS 自定义属性当 `<time>` 必须带单位（`${n}ms`），否则回退 `0s` + `infinite` 致整屏高频闪。
