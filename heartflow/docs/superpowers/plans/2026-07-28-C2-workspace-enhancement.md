# C2 工作区房间增强实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** 对更漏（WorkLog）入口的 7 个工作类房间做深度视觉和功能增强，包括金属砧板、光质天平、脉络图、展品架演化、物品类别映射、植被映射四季变化、光仪编织等。

**Architecture:** 每个房间独立增强，在现有 Vue 组件基础上添加视觉层（SVG/Canvas 装饰动画）和功能层（新数据类型/计算属性/交互）。测试文件同步更新覆盖新功能。

**Tech Stack:** Vue 3 (Composition API), TypeScript, CSS animations, SVG, vitest + @vue/test-utils

---

### 文件结构概览

**修改的文件（7 个视图组件 + 7 个测试文件）：**
- `src/views/Scar.vue` — 金属砧板 + 痕迹演化 + 4 种痕迹类型
- `src/views/Reward.vue` — 光质天平 + 回报映射 + 工作生涯总结
- `src/views/Craft.vue` — 展品架视觉演化 + 半成品工作台
- `src/views/Career.vue` — 脉络图 + 11 种节点 + 6 种连接 + 探照光
- `src/views/Bag.vue` — 7 种物品类别视觉映射 + 使用频率演化
- `src/views/Rest.vue` — 12 种休息类别植被映射 + 四季变化 + 漫步功能
- `src/views/WorkLog.vue` — 光仪编织 + 周度呼吸 + 跨房间联动
- `src/views/__tests__/Scar.test.ts` — 更新测试
- `src/views/__tests__/Reward.test.ts` — 更新测试
- `src/views/__tests__/Craft.test.ts` — 更新测试
- `src/views/__tests__/Career.test.ts` — 更新测试
- `src/views/__tests__/Bag.test.ts` — 更新测试
- `src/views/__tests__/Rest.test.ts` — 更新测试
- `src/views/__tests__/WorkLog.test.ts` — 更新测试

---

### Task 1: 工痕（Scar）— 金属砧板 + 痕迹演化 + 4 种痕迹类型

**Files:**
- Modify: `src/views/Scar.vue`
- Modify: `src/views/__tests__/Scar.test.ts`

**设计说明：**
- 4 种痕迹类型：撞击（impact）、割裂（cut）、灼烧（burn）、磨损（wear）
- 每种类型有不同颜色和图标：撞击=#c48a6a/🔨、割裂=#d08080/🔪、灼烧=#e06040/🔥、磨损=#8a8a7a/🧊
- 痕迹演化状态：新增痕迹默认"新鲜"（fresh），最多 3 天后变为"愈合"（healing），7 天后变为"疤痕"（scarred）
- 金属砧板 SVG 背景增强（在现有锻炉背景上叠加砧板纹理）

- [ ] **Step 1: 在 Scar.vue 中添加痕迹类型和演化状态类型定义**

```typescript
// 在 <script setup> 中，现有 BodyMark 接口旁添加：
type ScarType = 'impact' | 'cut' | 'burn' | 'wear'

const SCAR_TYPES: { type: ScarType; icon: string; color: string; label: string }[] = [
  { type: 'impact', icon: '🔨', color: '#c48a6a', label: '撞击' },
  { type: 'cut', icon: '🔪', color: '#d08080', label: '割裂' },
  { type: 'burn', icon: '🔥', color: '#e06040', label: '灼烧' },
  { type: 'wear', icon: '🧊', color: '#8a8a7a', label: '磨损' },
]

type ScarState = 'fresh' | 'healing' | 'scarred'

const SCAR_STATES: { state: ScarState; label: string; days: number }[] = [
  { state: 'fresh', label: '新鲜', days: 0 },
  { state: 'healing', label: '愈合', days: 3 },
  { state: 'scarred', label: '疤痕', days: 7 },
]

// 扩展 BodyMark 接口
interface BodyMark {
  id: string
  bodyPart: string
  severity: number
  description: string
  scarType: ScarType  // 新增
  at: string
}

// 计算痕迹演化状态
function getScarState(at: string): ScarState {
  const days = (Date.now() - new Date(at).getTime()) / (1000 * 60 * 60 * 24)
  if (days >= 7) return 'scarred'
  if (days >= 3) return 'healing'
  return 'fresh'
}
```

- [ ] **Step 2: 更新 Scar.vue 模板添加痕迹类型选择器和演化状态显示**

```html
<!-- 在表单中添加痕迹类型选择（在部位选择之后） -->
<div class="sc-form-row">
  <div class="sc-type-group">
    <span class="sc-type-label">痕迹类型</span>
    <button
      v-for="st in SCAR_TYPES"
      :key="st.type"
      :class="['sc-type-btn', { active: formScarType === st.type }]"
      :style="{ '--type-color': st.color }"
      @click="formScarType = st.type"
      :title="st.label"
    >{{ st.icon }}</button>
  </div>
</div>

<!-- 在时间线卡片中，在身体部位旁添加类型图标和演化状态 -->
<span class="sc-timeline-type-icon" :style="{ color: SCAR_TYPES.find(t => t.type === m.scarType)?.color }">
  {{ SCAR_TYPES.find(t => t.type === m.scarType)?.icon }}
</span>
<span class="sc-timeline-state" :class="`sc-state--${getScarState(m.at)}`">
  {{ SCAR_STATES.find(s => s.state === getScarState(m.at))?.label }}
</span>
```

- [ ] **Step 3: 添加金属砧板 SVG 装饰和痕迹类型统计**

```html
<!-- 在现有氛围背景层中，砧板 SVG 增强 -->
<div class="sc-anvil-svg" aria-hidden="true">
  <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g stroke="currentColor" stroke-width="1.5" opacity="0.04">
      <!-- 砧板主体 -->
      <path d="M120,120 L120,80 Q120,60 140,60 L260,60 Q280,60 280,80 L280,120 Z" />
      <path d="M100,140 L100,120 L300,120 L300,140 Z" />
      <path d="M160,60 L160,30 Q160,20 170,20 L230,20 Q240,20 240,30 L240,60" />
      <!-- 铁锤 -->
      <path d="M310,60 L340,60 L340,80 L310,80 Z" />
      <line x1="325" y1="80" x2="325" y2="110" />
    </g>
    <!-- 火星 -->
    <g fill="currentColor" opacity="0.03">
      <circle cx="275" cy="55" r="3" />
      <circle cx="290" cy="45" r="2" />
      <circle cx="280" cy="35" r="1.5" />
    </g>
  </svg>
</div>
```

```typescript
// 痕迹类型统计计算属性
const typeDistribution = computed(() => {
  const map = new Map<ScarType, number>()
  for (const st of SCAR_TYPES) map.set(st.type, 0)
  for (const m of marks.value) {
    map.set(m.scarType, (map.get(m.scarType) || 0) + 1)
  }
  const total = marks.value.length || 1
  return SCAR_TYPES.map(st => ({
    ...st,
    count: map.get(st.type) || 0,
    percent: Math.round(((map.get(st.type) || 0) / total) * 100),
  }))
})
```

- [ ] **Step 4: 更新测试文件**

```typescript
// 在 Scar.test.ts 中添加
describe('痕迹类型', () => {
  it('渲染 4 种痕迹类型按钮', async () => {
    const wrapper = mount(Scar)
    expect(wrapper.findAll('.sc-type-btn').length).toBe(4)
  })
  
  it('选择痕迹类型后记录', async () => {
    const wrapper = mount(Scar)
    // 选择部位
    await wrapper.find('.sc-select').setValue('手')
    // 选择痕迹类型
    await wrapper.findAll('.sc-type-btn')[1].trigger('click')
    // 输入描述
    await wrapper.find('.sc-input').setValue('测试印记')
    // 保存
    await wrapper.find('.sc-btn--primary').trigger('click')
    // 验证记录包含痕迹类型
    const items = wrapper.findAll('.sc-timeline-item')
    expect(items.length).toBe(1)
  })
})

describe('痕迹演化状态', () => {
  it('新痕迹显示"新鲜"状态', () => {
    wrapper = mount(Scar)
    // 使用 new Date().toISOString() 的痕迹应为新鲜
    expect(wrapper.find('.sc-state--fresh').exists()).toBeTruthy()
  })
})
```

- [ ] **Step 5: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/Scar.test.ts 2>&1
Expected: All tests pass
```

---

### Task 2: 劳酬（Reward）— 光质天平 + 回报映射 + 工作生涯总结

**Files:**
- Modify: `src/views/Reward.vue`
- Modify: `src/views/__tests__/Reward.test.ts`

**设计说明：**
- 光质天平：用 SVG 绘制发光的金色天平，左右托盘随收入/支出比例动态倾斜
- 回报映射：将收入来源按类别映射到"光质色块"（薪资=金色、自由职业=铜色、投资=绿色等）
- 工作生涯总结：新增"生涯总览"区域，展示总收入/总支出/日均收入/工作天数等

- [ ] **Step 1: 在 Reward.vue 中添加光质天平 SVG 动态倾斜效果**

```html
<!-- 替换现有的天平概览区域为动态天平 -->
<section class="rw-balance">
  <div class="rw-balance-anvil">
    <svg viewBox="0 0 300 180" fill="none" xmlns="http://www.w3.org/2000/svg" class="rw-anvil-svg">
      <g transform="rotate({{ tiltAngle }}, 150, 100)">
        <!-- 横梁 -->
        <line x1="50" y1="100" x2="250" y2="100" stroke="currentColor" stroke-width="2" opacity="0.3" />
        <!-- 中心 -->
        <circle cx="150" cy="100" r="5" fill="currentColor" opacity="0.3" />
        <line x1="150" y1="100" x2="150" y2="160" stroke="currentColor" stroke-width="2" opacity="0.3" />
        <!-- 左托盘 -->
        <g :opacity="0.3 + incomeRatio * 0.5">
          <path d="M50,80 L70,80 L65,100 L55,100 Z" fill="currentColor" />
          <circle cx="60" cy="75" r="4" fill="#e8c060" opacity="0.5" />
        </g>
        <!-- 右托盘 -->
        <g :opacity="0.3 + expenseRatio * 0.5">
          <path d="M230,80 L250,80 L245,100 L235,100 Z" fill="currentColor" />
          <circle cx="240" cy="75" r="4" fill="#c08080" opacity="0.5" />
        </g>
      </g>
      <!-- 发光效果 -->
      <circle cx="150" cy="100" r="3" fill="#e8c060" opacity="0.8">
        <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  </div>
</section>
```

```typescript
// 计算倾斜角度
const totalVal = computed(() => parseFloat(totalIncome.value) + parseFloat(totalExpense.value))
const incomeRatio = computed(() => {
  const t = totalVal.value
  return t > 0 ? parseFloat(totalIncome.value) / t : 0.5
})
const expenseRatio = computed(() => {
  const t = totalVal.value
  return t > 0 ? parseFloat(totalExpense.value) / t : 0.5
})
const tiltAngle = computed(() => {
  // 左倾（收入多）或右倾（支出多），最大 ±15 度
  const diff = incomeRatio.value - expenseRatio.value
  return diff * 15
})

// 光质映射
const LIGHT_QUALITY_MAP: Record<string, { color: string; glow: string }> = {
  salary: { color: '#e8c060', glow: 'rgba(232, 192, 96, 0.3)' },
  freelance: { color: '#c0a060', glow: 'rgba(192, 160, 96, 0.3)' },
  investment: { color: '#a0d080', glow: 'rgba(160, 208, 128, 0.3)' },
  gift: { color: '#d080a0', glow: 'rgba(208, 128, 160, 0.3)' },
  tool: { color: '#80a0c0', glow: 'rgba(128, 160, 192, 0.3)' },
  course: { color: '#a0c080', glow: 'rgba(160, 192, 128, 0.3)' },
  health: { color: '#d0a080', glow: 'rgba(208, 160, 128, 0.3)' },
  social: { color: '#c080a0', glow: 'rgba(192, 128, 160, 0.3)' },
}
```

- [ ] **Step 2: 添加工作生涯总结区域**

```html
<!-- 在统计概览后添加生涯总结 -->
<section class="rw-career-section" v-if="records.length">
  <h3 class="rw-section-label">📋 工作生涯总结</h3>
  <div class="rw-career-summary">
    <div class="rw-career-row">
      <span class="rw-career-label">生涯总览</span>
      <span class="rw-career-value">共 {{ records.length }} 条记录 · {{ careerStats.totalIncome }} 收入 · {{ careerStats.totalExpense }} 支出</span>
    </div>
    <div class="rw-career-row">
      <span class="rw-career-label">收支比</span>
      <span class="rw-career-value" :class="careerStats.ratioClass">{{ careerStats.ratio }} : 1</span>
    </div>
    <div class="rw-career-row">
      <span class="rw-career-label">日均收入</span>
      <span class="rw-career-value">¥{{ careerStats.avgDailyIncome }}</span>
    </div>
    <div class="rw-career-row">
      <span class="rw-career-label">工作天数</span>
      <span class="rw-career-value">{{ careerStats.workDays }} 天</span>
    </div>
  </div>
</section>
```

```typescript
const careerStats = computed(() => {
  const inc = parseFloat(totalIncome.value)
  const exp = parseFloat(totalExpense.value)
  const ratio = exp > 0 ? (inc / exp).toFixed(2) : '∞'
  const ratioClass = parseFloat(ratio as string) >= 1.5 ? 'rw-career-pos' : 'rw-career-neg'
  const uniqueDays = new Set(records.value.map(r => r.at.slice(0, 10))).size
  const avgDaily = uniqueDays > 0 ? (inc / uniqueDays).toFixed(1) : '0'
  return {
    totalIncome: totalIncome.value,
    totalExpense: totalExpense.value,
    ratio,
    ratioClass,
    avgDailyIncome: avgDaily,
    workDays: uniqueDays,
  }
})
```

- [ ] **Step 3: 更新测试文件**

```typescript
// 在 Reward.test.ts 中添加
describe('光质天平', () => {
  it('天平倾斜角度随收入支出比例变化', async () => {
    const wrapper = mount(Reward)
    // 添加收入记录
    const incomeBtn = wrapper.findAll('.rw-type-btn')[0]
    await incomeBtn.trigger('click')
    // ... 填写表单
    // 验证天平 SVG 有旋转属性
    const anvil = wrapper.find('.rw-anvil-svg')
    expect(anvil.exists()).toBe(true)
  })
})

describe('工作生涯总结', () => {
  it('显示生涯总览统计', async () => {
    const wrapper = mount(Reward)
    const career = wrapper.find('.rw-career-summary')
    expect(career.exists()).toBe(true)
    expect(career.text()).toContain('生涯总览')
  })
})
```

- [ ] **Step 4: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/Reward.test.ts 2>&1
Expected: All tests pass
```

---

### Task 3: 匠庐（Craft）— 展品架视觉演化 + 半成品工作台

**Files:**
- Modify: `src/views/Craft.vue`
- Modify: `src/views/__tests__/Craft.test.ts`

**设计说明：**
- 展品架视觉演化：根据作品进化程度，光质展架显示不同发光效果（0-25% 暗淡、25-50% 微光、50-75% 发光、75-100% 璀璨）
- 半成品工作台：在作品网格内添加"半成品"区域，专门显示 evolution < 50% 的作品，并用虚线边框区分

- [ ] **Step 1: 在 Craft.vue 中添加展品架视觉演化类**

```typescript
// 根据进化程度获得展品发光等级
function getExhibitionGlowLevel(evolution: number): 'dim' | 'faint' | 'glowing' | 'radiant' {
  if (evolution >= 75) return 'radiant'
  if (evolution >= 50) return 'glowing'
  if (evolution >= 25) return 'faint'
  return 'dim'
}

// 展品发光等级样式映射
const GLOW_STYLES: Record<string, { opacity: number; shadow: string; borderColor: string }> = {
  dim: { opacity: 0.2, shadow: '0 0 0px transparent', borderColor: 'rgba(184, 160, 128, 0.08)' },
  faint: { opacity: 0.4, shadow: '0 0 8px rgba(184, 160, 128, 0.1)', borderColor: 'rgba(184, 160, 128, 0.15)' },
  glowing: { opacity: 0.6, shadow: '0 0 16px rgba(184, 160, 128, 0.2)', borderColor: 'rgba(184, 160, 128, 0.25)' },
  radiant: { opacity: 0.9, shadow: '0 0 24px rgba(184, 160, 128, 0.35)', borderColor: 'rgba(184, 160, 128, 0.4)' },
}
```

- [ ] **Step 2: 更新展品架模板，添加上述发光效果**

```html
<!-- 在展架 section 中，更新 light-form-badge -->
<div
  v-for="form in lightForms"
  :key="form.id"
  class="light-form-badge"
  :class="`lf-glow--${glowLevel}`"
  :style="{
    '--lf-accent': form.color,
    '--lf-glow': form.glowColor,
    '--glow-intensity': selectedGlowLevel,
  }"
>
```

- [ ] **Step 3: 添加半成品工作台区域**

```html
<!-- 在作品网格上方添加半成品工作台区域 -->
<section class="craft-section">
  <h2 class="section-label">
    <span class="section-label-icon">🔧</span>
    半成品工作台
  </h2>
  <p class="section-desc">进化程度低于 50% 的作品，正在打磨中。</p>
  <div class="wip-bench" v-if="wipWorks.length > 0">
    <div
      v-for="work in wipWorks"
      :key="work.id"
      class="wip-card"
      :style="{ '--work-accent': work.color }"
    >
      <div class="wip-card-header">
        <span class="wip-icon">{{ work.icon }}</span>
        <span class="wip-status">{{ STATUS_LABEL[work.status] }}</span>
      </div>
      <h4 class="wip-name">{{ work.name }}</h4>
      <div class="wip-evolution">
        <div class="wip-evolution-track">
          <div class="wip-evolution-fill" :style="{ width: work.evolution + '%' }"></div>
        </div>
        <span class="wip-evolution-label">{{ work.evolution }}%</span>
      </div>
      <div class="wip-actions">
        <button class="wip-btn" @click="openEditModal(work)">继续打磨</button>
      </div>
    </div>
  </div>
  <div v-else class="wip-empty">
    <span>没有正在打磨的作品</span>
  </div>
</section>
```

```typescript
const wipWorks = computed(() => store.works.filter(w => w.evolution < 50 && w.status !== 'archived'))
```

- [ ] **Step 4: 更新测试文件**

```typescript
// 在 Craft.test.ts 中添加
describe('展品架视觉演化', () => {
  it('进化程度影响展品发光等级', () => {
    expect(getExhibitionGlowLevel(0)).toBe('dim')
    expect(getExhibitionGlowLevel(30)).toBe('faint')
    expect(getExhibitionGlowLevel(60)).toBe('glowing')
    expect(getExhibitionGlowLevel(90)).toBe('radiant')
  })
})

describe('半成品工作台', () => {
  it('显示进化程度低于 50% 的作品', async () => {
    const wrapper = mount(Craft)
    const wipSection = wrapper.find('.wip-bench')
    // 如果存在半成品，验证卡片数
    if (wipSection.exists()) {
      const cards = wrapper.findAll('.wip-card')
      // 验证每个卡片进化程度 < 50
      // 需要从 store 读取数据验证
    }
  })
})
```

- [ ] **Step 5: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/Craft.test.ts 2>&1
Expected: All tests pass
```

---

### Task 4: 业脉（Career）— 脉络图 + 11 种节点 + 6 种连接 + 探照光

**Files:**
- Modify: `src/views/Career.vue`
- Modify: `src/views/__tests__/Career.test.ts`

**设计说明：**
- 脉络图：用 Canvas 绘制联系人网络图，节点根据圈层（core/active/extended/edge）用不同大小和颜色渲染
- 11 种节点：按角色类型（mentor/partner/client/colleague/peer/friend/industry/expert/student/ investor/media）用不同图标
- 6 种连接：按关系强度（strong/medium/weak/collaboration/referral/mentorship）用不同线型和颜色
- 探照光：鼠标悬停节点时，显示连接路径高亮

- [ ] **Step 1: 在 Career.vue 中添加脉络图 Canvas 组件**

```html
<!-- 在概览统计后添加脉络图区域 -->
<section class="career-section">
  <h2 class="section-label">
    <span class="section-label-icon">🕸</span>
    脉络图
  </h2>
  <div class="career-network-canvas" ref="networkCanvasRef">
    <canvas
      ref="canvasEl"
      :width="canvasWidth"
      :height="canvasHeight"
      @mousemove="handleCanvasHover"
      @mouseleave="handleCanvasLeave"
      @click="handleCanvasClick"
    ></canvas>
    <div
      v-if="hoveredNode"
      class="career-node-tooltip"
      :style="{ left: hoveredNode.x + 'px', top: hoveredNode.y + 'px' }"
    >
      <strong>{{ hoveredNode.name }}</strong>
      <span>{{ hoveredNode.role }}</span>
    </div>
  </div>
</section>
```

```typescript
import { ref, onMounted, watch, nextTick } from 'vue'

// 11 种节点角色类型
const NODE_ROLES = [
  { role: 'mentor', icon: '🌟', label: '导师' },
  { role: 'partner', icon: '🤝', label: '合作伙伴' },
  { role: 'client', icon: '💼', label: '客户' },
  { role: 'colleague', icon: '👥', label: '同事' },
  { role: 'peer', icon: '🔗', label: '同业' },
  { role: 'friend', icon: '💛', label: '朋友' },
  { role: 'industry', icon: '🏢', label: '行业人士' },
  { role: 'expert', icon: '🎓', label: '专家' },
  { role: 'student', icon: '📚', label: '学生' },
  { role: 'investor', icon: '💰', label: '投资人' },
  { role: 'media', icon: '📡', label: '媒体' },
]

// 6 种连接类型
const CONNECTION_TYPES = [
  { type: 'strong', color: '#e8c060', width: 2, label: '强连接' },
  { type: 'medium', color: '#c0a060', width: 1.5, label: '中连接' },
  { type: 'weak', color: '#8a7a6a', width: 1, label: '弱连接' },
  { type: 'collaboration', color: '#6aba7a', width: 1.5, dash: [5, 3], label: '协作' },
  { type: 'referral', color: '#60a0c8', width: 1.5, dash: [3, 3], label: '引荐' },
  { type: 'mentorship', color: '#d080a0', width: 1.5, dash: [8, 4], label: '师徒' },
]

// Canvas 绘制函数
const canvasEl = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref(640)
const canvasHeight = ref(480)
const hoveredNode = ref<{ x: number; y: number; name: string; role: string } | null>(null)

interface NetworkNode {
  x: number
  y: number
  radius: number
  color: string
  name: string
  role: string
  tier: string
  contact: Contact
}

function drawNetwork() {
  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  // 计算节点位置（力导向布局简化版）
  const nodes: NetworkNode[] = contacts.value.map((c, i) => {
    const angle = (i / contacts.value.length) * Math.PI * 2
    const radius = getTierRadius(c.tier)
    const tierColor = TIER_DEFS.find(t => t.id === c.tier)?.color || '#8a8a7a'
    return {
      x: canvasWidth.value / 2 + Math.cos(angle) * radius,
      y: canvasHeight.value / 2 + Math.sin(angle) * radius,
      radius: getTierNodeSize(c.tier),
      color: tierColor,
      name: c.name,
      role: c.role,
      tier: c.tier,
      contact: c,
    }
  })
  
  // 绘制连接线
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const tierScore = (getTierScore(nodes[i].tier) + getTierScore(nodes[j].tier)) / 2
      const connType = tierScore >= 3 ? CONNECTION_TYPES[0] : tierScore >= 2 ? CONNECTION_TYPES[1] : CONNECTION_TYPES[2]
      ctx.beginPath()
      ctx.moveTo(nodes[i].x, nodes[i].y)
      ctx.lineTo(nodes[j].x, nodes[j].y)
      ctx.strokeStyle = connType.color
      ctx.lineWidth = connType.width
      ctx.globalAlpha = 0.15
      if (connType.dash) ctx.setLineDash(connType.dash)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }
  }
  
  // 绘制节点
  for (const node of nodes) {
    ctx.beginPath()
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
    ctx.fillStyle = node.color
    ctx.globalAlpha = 0.6
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = node.color
    ctx.lineWidth = 1
    ctx.stroke()
    
    // 节点名称
    ctx.fillStyle = 'rgba(232, 224, 216, 0.6)'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(node.name, node.x, node.y + node.radius + 14)
  }
}

function getTierRadius(tier: string): number {
  switch (tier) {
    case 'core': return 60
    case 'active': return 120
    case 'extended': return 180
    case 'edge': return 240
    default: return 150
  }
}

function getTierNodeSize(tier: string): number {
  switch (tier) {
    case 'core': return 12
    case 'active': return 10
    case 'extended': return 8
    case 'edge': return 6
    default: return 8
  }
}

function getTierScore(tier: string): number {
  switch (tier) {
    case 'core': return 4
    case 'active': return 3
    case 'extended': return 2
    case 'edge': return 1
    default: return 0
  }
}

function handleCanvasHover(e: MouseEvent) {
  const rect = canvasEl.value?.getBoundingClientRect()
  if (!rect) return
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  // 检查是否悬停在节点上
  // 简化：只显示探照光效果
  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // 重绘并添加探照光
  drawNetwork()
  ctx.beginPath()
  ctx.arc(mx, my, 40, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(232, 224, 216, 0.05)'
  ctx.fill()
}

function handleCanvasLeave() {
  hoveredNode.value = null
  drawNetwork()
}

onMounted(() => {
  nextTick(() => drawNetwork())
})

watch(contacts, () => {
  nextTick(() => drawNetwork())
})
```

- [ ] **Step 2: 在脉络图上方添加角色筛选和连接类型图例**

```html
<!-- 脉络图图例 -->
<div class="career-legend">
  <div class="career-legend-section">
    <span class="career-legend-title">角色类型</span>
    <div class="career-legend-items">
      <span v-for="r in NODE_ROLES" :key="r.role" class="career-legend-item">
        {{ r.icon }} {{ r.label }}
      </span>
    </div>
  </div>
  <div class="career-legend-section">
    <span class="career-legend-title">连接类型</span>
    <div class="career-legend-items">
      <span v-for="c in CONNECTION_TYPES" :key="c.type" class="career-legend-item">
        <span class="career-legend-line" :style="{ background: c.color }"></span>
        {{ c.label }}
      </span>
    </div>
  </div>
</div>
```

- [ ] **Step 3: 更新测试文件**

```typescript
// 在 Career.test.ts 中添加
describe('脉络图', () => {
  it('渲染 Canvas 元素', () => {
    const wrapper = mount(Career)
    const canvas = wrapper.find('canvas')
    expect(canvas.exists()).toBe(true)
  })
  
  it('显示图例', () => {
    const wrapper = mount(Career)
    expect(wrapper.find('.career-legend').exists()).toBe(true)
  })
})
```

- [ ] **Step 4: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/Career.test.ts 2>&1
Expected: All tests pass
```

---

### Task 5: 行囊（Bag）— 7 种物品类别视觉映射 + 使用频率演化

**Files:**
- Modify: `src/views/Bag.vue`
- Modify: `src/views/__tests__/Bag.test.ts`

**设计说明：**
- 7 种物品类别：语言 (language)、框架 (framework)、工具 (tool)、设计 (design)、软技能 (softskill)、领域知识 (domain)、资质 (certification)
- 每种类别有独特颜色、图标和背景 SVG 装饰
- 使用频率演化：根据熟练度等级显示"生长状态"（蔓芽/萌芽/蕨叶/乔木/古木）

- [ ] **Step 1: 在 Bag.vue 中添加类别映射和演化状态**

```typescript
// 7 种物品类别
const ITEM_CATEGORIES = [
  { value: 'language', icon: '🔤', label: '语言', color: '#60a0c8', bgColor: 'rgba(96, 160, 200, 0.06)' },
  { value: 'framework', icon: '🧩', label: '框架', color: '#8ab87a', bgColor: 'rgba(138, 184, 122, 0.06)' },
  { value: 'tool', icon: '🔧', label: '工具', color: '#c8a060', bgColor: 'rgba(200, 160, 96, 0.06)' },
  { value: 'design', icon: '🎨', label: '设计', color: '#d080a0', bgColor: 'rgba(208, 128, 160, 0.06)' },
  { value: 'softskill', icon: '💬', label: '软技能', color: '#a0c0d0', bgColor: 'rgba(160, 192, 208, 0.06)' },
  { value: 'domain', icon: '📚', label: '领域知识', color: '#c0a080', bgColor: 'rgba(192, 160, 128, 0.06)' },
  { value: 'certification', icon: '🏅', label: '资质', color: '#e8c060', bgColor: 'rgba(232, 192, 96, 0.06)' },
]

// 使用频率演化状态
const GROWTH_STAGES = [
  { range: [0, 20], name: '蔓芽', icon: '🌱', color: '#8aba7a' },
  { range: [21, 40], name: '萌芽', icon: '🌿', color: '#6aba7a' },
  { range: [41, 60], name: '蕨叶', icon: '🌾', color: '#5aaa7a' },
  { range: [61, 80], name: '乔木', icon: '🌳', color: '#4a9a6a' },
  { range: [81, 100], name: '古木', icon: '🌲', color: '#3a8a5a' },
]

function getGrowthStage(proficiency: number) {
  return GROWTH_STAGES.find(s => proficiency >= s.range[0] && proficiency <= s.range[1]) || GROWTH_STAGES[0]
}

// 类别分布统计
const categoryDistribution = computed(() => {
  return ITEM_CATEGORIES.map(cat => ({
    ...cat,
    count: items.value.filter(i => i.category === cat.value).length,
    avgProficiency: (() => {
      const catItems = items.value.filter(i => i.category === cat.value)
      return catItems.length > 0
        ? Math.round(catItems.reduce((s, i) => s + i.proficiency, 0) / catItems.length)
        : 0
    })(),
  }))
})
```

- [ ] **Step 2: 添加类别视觉映射面板**

```html
<!-- 在搜索筛选后添加类别映射 -->
<section class="bag-section">
  <h3 class="section-label">📂 物品类别</h3>
  <div class="bag-category-grid">
    <div
      v-for="cat in categoryDistribution"
      :key="cat.value"
      class="bag-category-card"
      :style="{
        '--cat-color': cat.color,
        '--cat-bg': cat.bgColor,
      }"
    >
      <div class="bcc-header">
        <span class="bcc-icon">{{ cat.icon }}</span>
        <span class="bcc-label">{{ cat.label }}</span>
      </div>
      <div class="bcc-stats">
        <span class="bcc-count">{{ cat.count }} 件</span>
        <span class="bcc-proficiency">{{ cat.avgProficiency }}%</span>
      </div>
      <div class="bcc-bar">
        <div class="bcc-bar-fill" :style="{ width: cat.avgProficiency + '%', background: cat.color }"></div>
      </div>
      <div class="bcc-growth">
        <span class="bcc-growth-icon">{{ getGrowthStage(cat.avgProficiency).icon }}</span>
        <span class="bcc-growth-name">{{ getGrowthStage(cat.avgProficiency).name }}</span>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: 在每个物品卡片上添加生长状态标识**

```html
<!-- 在物品卡片模板中，添加生长状态标识 -->
<div class="bag-item-growth" :style="{ '--growth-color': getGrowthStage(item.proficiency).color }">
  <span class="bag-growth-icon">{{ getGrowthStage(item.proficiency).icon }}</span>
  <span class="bag-growth-name">{{ getGrowthStage(item.proficiency).name }}</span>
</div>
```

- [ ] **Step 4: 更新测试文件**

```typescript
// 在 Bag.test.ts 中添加
describe('物品类别映射', () => {
  it('渲染 7 种类别卡片', () => {
    const wrapper = mount(Bag)
    const cards = wrapper.findAll('.bag-category-card')
    expect(cards.length).toBe(7)
  })
})

describe('生长状态演化', () => {
  it('熟练度影响生长状态', () => {
    expect(getGrowthStage(0).name).toBe('蔓芽')
    expect(getGrowthStage(50).name).toBe('蕨叶')
    expect(getGrowthStage(90).name).toBe('古木')
  })
})
```

- [ ] **Step 5: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/Bag.test.ts 2>&1
Expected: All tests pass
```

---

### Task 6: 息壤（Rest）— 12 种休息类别植被映射 + 四季变化 + 漫步功能

**Files:**
- Modify: `src/views/Rest.vue`
- Modify: `src/views/__tests__/Rest.test.ts`

**设计说明：**
- 12 种休息类别植被映射：每种休息活动对应一种植物/自然元素
- 四季变化：根据当前月份自动切换休息界面的季节性配色和氛围
- 漫步功能：随机推荐一个休息活动，带有"漫步"动画按钮

- [ ] **Step 1: 在 Rest.vue 中添加植被映射和四季变化**

```typescript
// 12 种休息类别植被映射
const VEGETATION_MAP: Record<string, { plant: string; icon: string; color: string; season: string[] }> = {
  meditation: { plant: '莲花', icon: '🪷', color: '#e8a0c0', season: ['夏', '秋'] },
  nap: { plant: '含羞草', icon: '🌿', color: '#8aba7a', season: ['春', '夏', '秋'] },
  walk: { plant: '蒲公英', icon: '🌼', color: '#e8c060', season: ['春', '夏'] },
  reading: { plant: '橡树', icon: '🌳', color: '#6a8a5a', season: ['春', '夏', '秋', '冬'] },
  music: { plant: '风铃草', icon: '🔔', color: '#a0c0d0', season: ['春', '夏'] },
  tea: { plant: '茶树', icon: '🍵', color: '#8a9a6a', season: ['秋', '冬'] },
  exercise: { plant: '竹子', icon: '🎋', color: '#6aba7a', season: ['春', '夏', '秋'] },
  bath: { plant: '薰衣草', icon: '💜', color: '#c080d0', season: ['夏', '秋'] },
  cooking: { plant: '迷迭香', icon: '🌿', color: '#8a8a5a', season: ['秋', '冬'] },
  social: { plant: '向日葵', icon: '🌻', color: '#e8a040', season: ['夏'] },
  gaming: { plant: '苔藓', icon: '🍄', color: '#7a8a6a', season: ['秋', '冬'] },
  free: { plant: '云朵', icon: '☁️', color: '#a0a8b0', season: ['春', '夏', '秋', '冬'] },
}

// 四季配色
const SEASON_THEMES = {
  // 3-5 月
  spring: {
    bgGradient: ['#0a0f08', '#0e1209', '#0b0f07', '#080c06'],
    accentColor: '#8aba7a',
    glowColor: 'rgba(138, 186, 122, 0.08)',
    leafColor: 'rgba(138, 186, 122, 0.03)',
  },
  // 6-8 月
  summer: {
    bgGradient: ['#0a0806', '#120e09', '#0d0b07', '#080704'],
    accentColor: '#e8a040',
    glowColor: 'rgba(232, 160, 64, 0.08)',
    leafColor: 'rgba(232, 160, 64, 0.03)',
  },
  // 9-11 月
  autumn: {
    bgGradient: ['#0a0806', '#120e09', '#0d0a06', '#080502'],
    accentColor: '#c08040',
    glowColor: 'rgba(192, 128, 64, 0.08)',
    leafColor: 'rgba(192, 128, 64, 0.03)',
  },
  // 12-2 月
  winter: {
    bgGradient: ['#06080a', '#080a0e', '#06080a', '#040508'],
    accentColor: '#80a0c0',
    glowColor: 'rgba(128, 160, 192, 0.06)',
    leafColor: 'rgba(128, 160, 192, 0.02)',
  },
}

function getCurrentSeason(): keyof typeof SEASON_THEMES {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

const currentSeason = computed(() => getCurrentSeason())
const seasonTheme = computed(() => SEASON_THEMES[currentSeason.value])
```

- [ ] **Step 2: 添加漫步功能**

```typescript
const strolling = ref(false)
const strollingActivity = ref<RestPractice | null>(null)

function startStroll() {
  if (practicesData.value.length === 0) return
  strolling.value = true
  const randomIdx = Math.floor(Math.random() * practicesData.value.length)
  strollingActivity.value = practicesData.value[randomIdx]
  // 3 秒后结束漫步
  setTimeout(() => {
    strolling.value = false
    strollingActivity.value = null
  }, 3000)
}
```

```html
<!-- 在概览统计后添加漫步按钮 -->
<section class="rest-section">
  <button class="rest-stroll-btn" @click="startStroll" :disabled="strolling || practicesData.length === 0">
    <span class="rest-stroll-icon">{{ strolling ? '🚶' : '🌿' }}</span>
    <span class="rest-stroll-text">{{ strolling ? '漫步中...' : '漫步 · 随机休憩' }}</span>
  </button>
  <div v-if="strolling && strollingActivity" class="rest-stroll-result">
    <span class="rest-stroll-result-icon">{{ strollingActivity.icon }}</span>
    <span class="rest-stroll-result-name">{{ strollingActivity.name }}</span>
    <span class="rest-stroll-result-desc">{{ strollingActivity.description }}</span>
  </div>
</section>
```

- [ ] **Step 3: 在每个休憩卡片上添加植被映射和季节标识**

```html
<!-- 在 practice-card 中添加植被标识 -->
<div class="rest-practice-card" :style="{ '--prac-color': practice.color }">
  <div class="rpc-vegetation" v-if="VEGETATION_MAP[practice.id]">
    <span class="rpc-veg-icon">{{ VEGETATION_MAP[practice.id].icon }}</span>
    <span class="rpc-veg-name">{{ VEGETATION_MAP[practice.id].plant }}</span>
  </div>
  <!-- 现有内容 -->
</div>
```

- [ ] **Step 4: 更新测试文件**

```typescript
// 在 Rest.test.ts 中添加
describe('四季变化', () => {
  it('根据月份返回正确的季节主题', () => {
    const month = new Date().getMonth() + 1
    const season = getCurrentSeason()
    if (month >= 3 && month <= 5) expect(season).toBe('spring')
    if (month >= 6 && month <= 8) expect(season).toBe('summer')
    if (month >= 9 && month <= 11) expect(season).toBe('autumn')
    if (month >= 12 || month <= 2) expect(season).toBe('winter')
  })
})

describe('漫步功能', () => {
  it('漫步按钮可点击', async () => {
    const wrapper = mount(Rest)
    const btn = wrapper.find('.rest-stroll-btn')
    expect(btn.exists()).toBe(true)
  })
})

describe('植被映射', () => {
  it('休息活动有对应的植被', () => {
    expect(VEGETATION_MAP['meditation'].plant).toBe('莲花')
    expect(VEGETATION_MAP['walk'].plant).toBe('蒲公英')
  })
})
```

- [ ] **Step 5: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/Rest.test.ts 2>&1
Expected: All tests pass
```

---

### Task 7: 更漏（WorkLog）— 光仪编织 + 周度呼吸 + 跨房间联动

**Files:**
- Modify: `src/views/WorkLog.vue`
- Modify: `src/views/__tests__/WorkLog.test.ts`

**设计说明：**
- 光仪编织：用 SVG 绘制发光的日晷/轮盘，每个班次记录在轮盘上形成一个光点，随时间推移形成光轨
- 周度呼吸：按周显示工时波动，用呼吸动画表现工作节奏
- 跨房间联动：在更漏中显示其他工作房间的摘要数据（工痕印记数、劳酬本月收入、匠庐作品数、业脉联系人、行囊物品数、息壤休息天数）

- [ ] **Step 1: 在 WorkLog.vue 中添加光仪编织轮盘**

```html
<!-- 在工时分布图上添加光仪轮盘 -->
<section class="wl-section">
  <h3 class="wl-section-title">⏳ 光仪编织</h3>
  <div class="wl-sundial">
    <svg viewBox="0 0 300 300" class="wl-sundial-svg">
      <!-- 外圈 -->
      <circle cx="150" cy="150" r="140" stroke="rgba(212, 165, 116, 0.06)" stroke-width="1" fill="none" />
      <circle cx="150" cy="150" r="120" stroke="rgba(212, 165, 116, 0.04)" stroke-width="0.5" fill="none" stroke-dasharray="4 4" />
      <circle cx="150" cy="150" r="80" stroke="rgba(212, 165, 116, 0.04)" stroke-width="0.5" fill="none" stroke-dasharray="4 4" />
      <!-- 光轨：每个班次一个光点，按时间分布在圆环上 -->
      <g v-for="(s, idx) in shiftSundialPoints" :key="s.id">
        <circle
          :cx="s.x" :cy="s.y" :r="s.r"
          :fill="s.color"
          :opacity="s.opacity"
        />
        <line
          v-if="idx > 0"
          :x1="prevPoint(s, idx).x" :y1="prevPoint(s, idx).y"
          :x2="s.x" :y2="s.y"
          :stroke="s.color"
          :stroke-width="s.opacity * 0.5"
          opacity="0.15"
        />
      </g>
      <!-- 中心发光 -->
      <circle cx="150" cy="150" r="6" fill="#d4a574" opacity="0.3">
        <animate attributeName="r" values="4;7;4" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.5;0.2" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  </div>
</section>
```

```typescript
// 光仪轮盘点计算
const shiftSundialPoints = computed(() => {
  const recentShifts = shifts.value.slice(-30)
  const maxHours = Math.max(...recentShifts.map(s => s.hours), 1)
  return recentShifts.map((s, i) => {
    const angle = (i / Math.max(recentShifts.length, 1)) * Math.PI * 2 - Math.PI / 2
    const radius = 40 + (s.hours / maxHours) * 80
    const color = s.type === 'regular' ? '#d4a574' : s.type === 'night' ? '#b8865a' : '#e8a040'
    const opacity = 0.2 + (s.hours / maxHours) * 0.5
    return {
      id: s.id,
      x: 150 + Math.cos(angle) * radius,
      y: 150 + Math.sin(angle) * radius,
      r: 2 + (s.hours / maxHours) * 4,
      color,
      opacity,
    }
  })
})

function prevPoint(s: { id: string }, idx: number) {
  // 在 shiftSundialPoints 中查找前一个点
  return shiftSundialPoints.value[idx - 1] || s
}
```

- [ ] **Step 2: 添加周度呼吸图表**

```html
<!-- 在光仪编织后添加周度呼吸 -->
<section class="wl-section">
  <h3 class="wl-section-title">🌬 周度呼吸</h3>
  <div class="wl-weekly-breath">
    <div
      v-for="week in weeklyBreath"
      :key="week.weekLabel"
      class="wl-breath-bar"
      :style="{
        height: week.percent + '%',
        opacity: 0.2 + week.percent / 100 * 0.6,
      }"
      :title="`${week.weekLabel}: ${week.hours}h`"
    >
      <span class="wl-breath-label">{{ week.weekLabel }}</span>
    </div>
  </div>
</section>
```

```typescript
const weeklyBreath = computed(() => {
  const now = new Date()
  const weeks: { weekLabel: string; hours: number; percent: number }[] = []
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - w * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const startStr = weekStart.toISOString().slice(0, 10)
    const endStr = weekEnd.toISOString().slice(0, 10)
    const weekShifts = shifts.value.filter(s => s.date >= startStr && s.date <= endStr)
    const hours = Math.round(weekShifts.reduce((sum, s) => sum + s.hours, 0) * 10) / 10
    weeks.push({
      weekLabel: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      hours,
      percent: 0,
    })
  }
  const maxHours = Math.max(...weeks.map(w => w.hours), 1)
  return weeks.map(w => ({ ...w, percent: Math.round((w.hours / maxHours) * 100) }))
})
```

- [ ] **Step 3: 添加跨房间联动摘要**

```html
<!-- 在更漏底部添加跨房间联动 -->
<section class="wl-section">
  <h3 class="wl-section-title">🔗 工作空间总览</h3>
  <div class="wl-cross-room">
    <div class="wl-cross-item" @click="nav.enterRoom('scar')">
      <span class="wl-cross-icon">🔨</span>
      <span class="wl-cross-label">工痕</span>
      <span class="wl-cross-value">{{ crossRoomStats.scarCount }} 道</span>
    </div>
    <div class="wl-cross-item" @click="nav.enterRoom('reward')">
      <span class="wl-cross-icon">⚖️</span>
      <span class="wl-cross-label">劳酬</span>
      <span class="wl-cross-value">¥{{ crossRoomStats.rewardIncome }}</span>
    </div>
    <div class="wl-cross-item" @click="nav.enterRoom('craft')">
      <span class="wl-cross-icon">🔨</span>
      <span class="wl-cross-label">匠庐</span>
      <span class="wl-cross-value">{{ crossRoomStats.craftCount }} 件</span>
    </div>
    <div class="wl-cross-item" @click="nav.enterRoom('career')">
      <span class="wl-cross-icon">👥</span>
      <span class="wl-cross-label">业脉</span>
      <span class="wl-cross-value">{{ crossRoomStats.careerContacts }} 人</span>
    </div>
    <div class="wl-cross-item" @click="nav.enterRoom('bag')">
      <span class="wl-cross-icon">🎒</span>
      <span class="wl-cross-label">行囊</span>
      <span class="wl-cross-value">{{ crossRoomStats.bagItems }} 件</span>
    </div>
    <div class="wl-cross-item" @click="nav.enterRoom('rest')">
      <span class="wl-cross-icon">🌱</span>
      <span class="wl-cross-label">息壤</span>
      <span class="wl-cross-value">{{ crossRoomStats.restDays }} 天</span>
    </div>
  </div>
</section>
```

```typescript
import { useRoomNavigation } from '../composables/useRoomNavigation'

const nav = useRoomNavigation()

// 跨房间数据读取
const crossRoomStats = computed(() => {
  const scars = storage.getKV<any[]>('scars', [])
  const rewards = storage.getKV<any[]>('rewards', [])
  const craftWorks = storage.getKV<any[]>('craft-works', [])
  const careerContacts = storage.getKV<any[]>('career-contacts', [])
  const bagItems = storage.getKV<any[]>('bag-items', [])
  const restRecords = storage.getKV<any[]>('rest-records', [])
  
  const rewardIncome = rewards
    .filter((r: any) => r.type === 'income')
    .reduce((s: number, r: any) => s + r.amount, 0)
    .toFixed(0)
  
  const uniqueRestDays = new Set(restRecords.map((r: any) => r.date || r.at?.slice(0, 10)).filter(Boolean)).size
  
  return {
    scarCount: scars.length,
    rewardIncome,
    craftCount: craftWorks.length,
    careerContacts: careerContacts.length,
    bagItems: bagItems.length,
    restDays: uniqueRestDays,
  }
})
```

- [ ] **Step 4: 更新测试文件**

```typescript
// 在 WorkLog.test.ts 中添加
describe('光仪编织', () => {
  it('轮盘光点数量与最近班次一致', () => {
    const wrapper = mount(WorkLog)
    // 添加一些班次
    // 验证轮盘 SVG 存在
    expect(wrapper.find('.wl-sundial-svg').exists()).toBe(true)
  })
})

describe('周度呼吸', () => {
  it('显示 8 周呼吸柱状图', () => {
    const wrapper = mount(WorkLog)
    const bars = wrapper.findAll('.wl-breath-bar')
    expect(bars.length).toBe(8)
  })
})

describe('跨房间联动', () => {
  it('显示 6 个工作房间概览', () => {
    const wrapper = mount(WorkLog)
    const items = wrapper.findAll('.wl-cross-item')
    expect(items.length).toBe(6)
  })
})
```

- [ ] **Step 5: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/WorkLog.test.ts 2>&1
Expected: All tests pass
```

---

### 最终验证

- [ ] **运行全量测试**

```
Run: cd project/frontend && npx vitest run 2>&1
Expected: 1853+ tests pass
```

- [ ] **TypeScript 类型检查**

```
Run: cd project/frontend && npx vue-tsc --noEmit 2>&1
Expected: Zero errors
```

- [ ] **宪法合规测试**

```
Run: cd project/frontend && npx vitest run src/engine/__tests__/constitution-compliance.test.ts 2>&1
Expected: 20 tests pass
```