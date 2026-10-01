# DESIGN-DEAI.md — 去「AI 生成感」· 精细化设计契约

> 本文是 `DESIGN.md`（暖琥珀设计系统）的**执行层细化**，专治「过于规整、模板化的 AI 生成感」。
> 全部数值取**真实代码**，可直接套用；与既有五门验证闸门（vue-tsc / eslint / vitest / build / 循环依赖）对齐。
> 最后校准：2026-09-30。

---

## 0. 三条铁律（判 AI 味的核心标准）

1. **不新造色**：Home 当前冷蓝 `#dfe6f2 / #26324a / rgba(120,150,200,…)` 违反 `DESIGN.md` 品牌令牌（暖琥珀 `--accent #d4a574` / `--accent-rgb 212,165,116`）。首页所有辉光/描边/文字必须改消费既有 `--accent* / --text-* / --border-*` 变量，**禁止冷蓝硬编码**。
2. **动效去同步整数周期**：所有 `infinite` 动画必须「非整数周期 + 负相位偏移 + 幅度错层」，看起来像有机呼吸而非节拍器。
3. **撤 emoji 占位 + 破绝对对称**：emoji 全换线性 SVG 描边图标或衬线首字；玉珠/标题/留白不再强制居中等分。

---

## 1. 问题清单（逐条 file:line + 实测现值）

| # | 位置 | 现值（AI 味病灶） | 类型 |
|---|---|---|---|
| P1 | `Home.vue:600-621` | 3 层 `radial-gradient` + `gravity-pulse(8s)`/`lens-shimmer(12s)` 满屏无限呼吸 | 满屏辉光 |
| P2 | `Home.vue:683-766` | `gravity-lens-rings` 120vmin/80vmin 扩张环 + `gravity-streamers` 十字流光无限闪 | 科技装饰堆砌 |
| P3 | `Home.vue:623-649` | `atmos-glow-gold/warm` 两团 `breathe(7s/9s)` 径向辉光 | 多余呼吸层 |
| P4 | `Home.vue:486-499` | `bead-svg` `drop-shadow(0 0 30px rgba(165,195,235,.45))` 冷蓝 + `bead-aura` 月华冷晕 | 冷蓝玉珠 |
| P5 | `Home.vue:502-529` | `bead-ring/progress` `rgba(200,220,245,.5)`、`bead-particle` 冷、`bead-time #26324a` + 冷光 `text-shadow` | 冷蓝温度 |
| P6 | `Home.vue:396-406` | `focus-title` `color:#dfe6f2` + `text-shadow:0 0 20px rgba(120,150,200,.18)` | 冷蓝标题 |
| P7 | `Home.vue:462-484` | `moon-ripple` 三圈 `rgba(180,205,235,…)` 无限扩散 | 涟漪堆砌 |
| P8 | `useViewEntrance.ts:40-42,108-111` | 全站同款 `translateY(16px)` + 固定 `80ms` 等距 stagger | 动效模板化 |
| P9 | `room-graph.ts` 30+ 处 / 各面板 | emoji 图标 📖🌿🗺️⚙️🧩⚖️📌💡✍️🖼️（已 grep 核实 30+ 处） | 占位标签感 |
| P10 | `App.vue:1662-1696` 等 | 星点/浮层用 `rgba(var(--accent-rgb),…)` 但部分仍冷调派生 | 温度不一致（次要） |

---

## 2. 新增令牌（追加到 `src/assets/design-tokens.css` 的 `:root`）

> 不破坏既有令牌；仅补「有机 / 肌理 / 缓动」所需项。

```css
:root {
  /* —— 棱边光 / 刻面（方案1 暖琉璃） —— */
  --edge-light: rgba(212, 165, 116, 0.28);   /* 1px 暖棱边光，替代冷 drop-shadow */
  --edge-light-strong: rgba(255, 228, 170, 0.5);
  --facet-line: rgba(255, 228, 170, 0.4);     /* 玉珠刻面细线 */
  --facet-line-soft: rgba(255, 228, 170, 0.28);

  /* —— 颗粒肌理（方案3 手作） —— */
  --grain-opacity: 0.04;                      /* feTurbulence 叠加不透明度，静态不闪 */

  /* —— 缓动曲线族（横切动效自然化） —— */
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);   /* 入场微回弹 */
  --ease-in-out-sine: cubic-bezier(0.37, 0, 0.63, 1);   /* 常驻呼吸 */
  --ease-ink: cubic-bezier(0.22, 1, 0.36, 1);           /* 墨晕开长尾 */

  /* —— 非整数呼吸周期（破同步） —— */
  --dur-breath-1: 7.3s;
  --dur-breath-2: 11.7s;
  --dur-breath-3: 8.9s;

  /* —— 微交互延迟（hover 不秒回） —— */
  --hover-delay: 72ms;
  --hover-shift: 2px;
}
```

---

## 3. 方案 1 · 暖琉璃·有机微差（默认语言）— 逐组件落地

### 3.1 氛围层（修 P1/P2/P3）`Home.vue:591-766`

**删**：`.atmos-glow-gold`、`.atmos-glow-warm`、`.gravity-lens-rings`、`.gravity-streamers` 整段及其 `breathe/gravity-pulse/lens-shimmer/streamer-pulse/lens-ring-expand` keyframes。

**换**（仅一处静态暖晕 + 两层非同步极淡呼吸）：

```css
.home-atmosphere {
  position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
  background: radial-gradient(circle at 50% 38%,
    rgba(var(--accent-rgb), 0.05) 0%, transparent 55%);
}
.home-atmosphere::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 42%,
    rgba(var(--accent-rgb), 0.04) 0%, transparent 42%);
  animation: breath-a var(--dur-breath-1) var(--ease-in-out-sine) infinite;
  animation-delay: -2.4s;        /* 负相位：与环境层错步 */
  will-change: opacity;
}
.home-atmosphere::after {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 42%,
    transparent 30%, rgba(var(--accent-rgb), 0.018) 33%, transparent 40%);
  animation: breath-b var(--dur-breath-2) var(--ease-in-out-sine) infinite;
  animation-delay: -5.1s;        /* 另一相位，三者永不同步 */
  will-change: opacity;
}
@keyframes breath-a { 0%,100% { opacity: .5 } 50% { opacity: 1 } }
@keyframes breath-b { 0%,100% { opacity: .35 } 50% { opacity: .8 } }
```
> 幅度差异（.5↔1 vs .35↔.8）+ 周期差异（7.3s vs 11.7s）+ 相位差异（-2.4s vs -5.1s）= 视觉上「各自在呼吸」，消除齐步脉冲感。

### 3.2 玉珠（修 P4/P5/P7）`Home.vue:486-529`

```css
/* 辉光：冷蓝 drop-shadow → 暖琥珀极淡（强度 0.45→0.22，去刺眼） */
.focus-orb :deep(.bead-svg) {
  width: 280px; height: 280px;
  filter: drop-shadow(0 0 18px rgba(var(--accent-rgb), 0.22));
}
/* 外晕：月华冷 → 暖琥珀小晕 */
.focus-orb :deep(.bead-aura) {
  inset: -48px;
  background: radial-gradient(circle at 50% 50%,
    rgba(var(--accent-rgb), 0.10) 0%, transparent 78%);
}
/* 环/进度/粒子：冷蓝 → 暖琥珀 */
.focus-orb :deep(.bead-ring),
.focus-orb :deep(.bead-progress) { stroke: rgba(var(--accent-rgb), 0.5); }
.focus-orb :deep(.bead-particle) { background: rgba(232, 200, 150, 0.55); }

/* 时间字：冷蓝 #26324a → 暖琥珀玻璃上的深褐；冷光 text-shadow → 暖光 */
.focus-orb :deep(.bead-time) {
  font-size: 48px;
  color: #2a1c08;
  text-shadow: 0 1px 3px rgba(255, 240, 210, 0.7), 0 0 16px rgba(var(--accent-rgb), 0.35);
}

/* 涟漪：冷蓝 → 暖琥珀，降为两圈、幅度收窄（P7） */
.moon-ripple {
  border: 1px solid rgba(var(--accent-rgb), 0.16);
  animation: moon-ripple var(--dur-breath-3) ease-out infinite;
}
.moon-ripple.r2 { animation-delay: 2.97s; border-color: rgba(var(--accent-rgb), 0.11); }
.moon-ripple.r3 { display: none; }   /* 三圈→两圈，去堆砌 */
```

**刻面母题**（玉珠内加两道细棱光，消费 `--facet-line`）——在 `JadeBead.vue` 的珠体层叠两个 `::before/::after` 细线（旋转 28° / -18°，长度 54/40px，opacity .4/.3），或直接由 Home 用 `:deep` 覆盖 `.bead-facet`。实现细节见 §7 验收。

### 3.3 标题（修 P6）`Home.vue:396-406`

```css
.focus-title {
  font-size: clamp(18px, 2vw, 24px);
  font-weight: 400; line-height: 1.2;
  color: var(--text-primary, #e8e0d8);   /* 去 #dfe6f2 冷蓝 */
  margin: 0 0 44px;
  opacity: 0.85;                          /* 去 text-shadow 冷光 */
}
```

### 3.4 入场错落（修 P8）`useViewEntrance.ts`

- CSS 入场态改消费缓动：`transition: opacity .6s var(--ease-out-quart), transform .6s var(--ease-out-quart);`；`.enter-from { opacity:0; transform: translateY(14px) scale(.992); }`。
- `getEnterDelay` 由「固定 `idx*staggerMs`」改为**黄金比间隔**序列（非均匀）：`[0, 70, 190, 360, 580, 860]ms`（相邻差 ≈ 1.618×），并由各视图通过 `data-enter` 顺序引用；或提供 `staggerMs` 默认值改 `70` + 叠加 `ease-out-back` 微回弹。
- 首段 `0ms`（不延迟），末段回弹而非匀速淡入。

### 3.5 emoji 撤换（修 P9）优先级序

| 优先级 | 范围 | 处理 |
|---|---|---|
| 高 | `Home.vue` / `DeskSpaces.vue` 内 emoji（🧩📌等） | 立即换线性 SVG 描边图标（房间卡统一图标组件 `RoomGlyph.vue`） |
| 高 | `room-graph.ts` 30+ 处 `icon:'📖'` 等 | 改为 `glyph:'reading'` 字符串键，由 `RoomGlyph` 映射为 SVG；**不改 room 结构**，仅换字段 |
| 中 | 面板 📌💡✍️🖼️（AnchorJournal*/AnniversaryHealth/AdvisorOverview 等） | 换内联 SVG 或衬线首字（如「阅」「记」「念」） |
| 低 | 引擎层 `automation.ts`/`data-port.ts` 的 emoji（导出文本用） | 保留（属数据内容，非 UI 渲染），下个迭代清理 |

> 新图标组件 `RoomGlyph.vue`：`1.5px` 描边、`currentColor`、`16–18px`、无填充无阴影，统一消费 `--accent`/语义色。

---

## 4. 方案 2 · 侘寂·不对称（夜静 / Sabbath 皮肤）

适用：`.sabbath` / `night-dim` 模式或用户选「静」皮肤时启用。

```css
/* 破对称：玉珠偏左上，标题左对齐，留白 3:5 */
.home-focus { align-items: flex-start; padding: 64px 28px 140px; text-align: left; }
.focus-orb { transform: translate(-8%, -4%); }     /* 偏心 8%/4% */
.focus-title { text-align: left; max-width: 60%; }

/* 撤全部氛围层（P1-P3），仅留一抹极淡静态暖晕 */
.home-atmosphere { background: radial-gradient(circle at 38% 30%, rgba(var(--accent-rgb),0.03) 0%, transparent 60%); }
.home-atmosphere::before, .home-atmosphere::after,
.gravity-lens-rings, .gravity-streamers { display: none; }

/* 单一圆相（ensō）替代玉珠外环，仅透明度呼吸（6s, ±0.06） */
.ensō { border: 1.5px solid var(--text-secondary); border-radius: 50%;
  animation: enso-breath 6s var(--ease-in-out-sine) infinite; }
@keyframes enso-breath { 0%,100% { opacity: .5 } 50% { opacity: .9 } }
```

---

## 5. 方案 3 · 手作肌理·墨边（书写房间皮肤：阅读厅 / 手札 / 年谱）

适用：房间 `meta.skin === 'paper'` 时启用。

```css
/* 颗粒肌理：SVG 噪声滤镜叠加，静态不闪（P 肌理） */
.paper-grain { position: absolute; inset: 0; pointer-events: none; opacity: var(--grain-opacity);
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,...feTurbulence baseFrequency=0.9 numOctaves=2...");
}
/* 非全等圆角 + 微旋手绘边 */
.room-card { border-radius: 11px 9px 12px 8px; transform: rotate(-0.4deg);
  box-shadow: inset 0 0 0 1px rgba(180,150,100,0.18), inset 0 1px 2px rgba(255,240,210,0.06); }
/* 衬线首字 + 朱点替代 emoji */
.room-card .glyph-initial { font-family: var(--font-heading-zh); color: var(--accent-purple, #a07c8c); }
```
> 肌理用 `feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"` + `feColorMatrix` 转琥珀单色，opacity 0.04，**不参与任何 animation**（防频闪）。

---

## 6. 横切 · 动效自然化（叠加任一方案）

1. **缓动统一**：所有 `transition` 入场用 `var(--ease-out-quart)`，常驻呼吸用 `var(--ease-in-out-sine)`，墨晕用 `var(--ease-ink)`。禁止裸 `ease`/`linear` 用于可见动效。
2. **无限动画三原则**：非整数周期（用 `--dur-breath-*`）+ 负 `animation-delay` 错相位 + 幅度错层（2–3 个伪元素不同 keyframe 振幅）。
3. **hover 不秒回**：`transition-delay: var(--hover-delay)` + `transform: translateY(var(--hover-shift))`，替代瞬间高亮。
4. **列表 stagger**：相邻间隔取黄金比（70→120→190→300ms），非固定 80ms。

---

## 7. 验收闸门（新增「视觉 lint」）

在既有五门外，加一条轻量核对（grep / 后续 lint 规则）：
- 禁止新增代码出现 `radial-gradient(... infinite)` 的**满屏**辉光（单处静态暖晕豁免）。
- 禁止新增 `emoji` 作 UI 图标（数据文本豁免）。
- 冷蓝字面量 `#dfe6f2/#26324a/rgba(120,150,200/165,195,235/180,205,235` 在 `src/` 出现即告警（P4-P7 修复后应从 Home 清零）。

---

## 8. 落地顺序（分阶段，可逐笔 commit，匹配 git 纪律）

- **Phase 1（单文件低风险）**：`Home.vue` 氛围层(§3.1)+玉珠(§3.2)+标题(§3.3) 拉回暖琥珀。→ 直接消除最刺眼 AI 味。
- **Phase 2（令牌+动效）**：`design-tokens.css` 加 §2 令牌；`useViewEntrance.ts` 错落(§3.4)；全站 `transition` 接缓动族(§6)。
- **Phase 3（图标）**：新建 `RoomGlyph.vue`；`room-graph.ts` 字段 `icon→glyph`；Home/DeskSpaces/高优先面板撤 emoji(§3.5)。
- **Phase 4（皮肤）**：方案2 `.sabbath`、方案3 `skin:'paper'` 房间级开关（§4/§5）。

> 默认激活**方案 1**；方案 2/3 作为可切换皮肤，不阻塞主链路。
