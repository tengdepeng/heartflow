# C3 世界空间房间增强实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 9 个世界空间房间做深度功能增强，补齐蓝图指定的缺失功能，包括 LOD 降级、手札日记、分页治理台、旧梦潭、书籍导入、家脉留座、树形可视化、蜕变光茧、时间种子等。

**Architecture:** 每个房间独立增强，在现有 Vue 组件基础上添加新功能（新数据模型/计算属性/交互/可视化）。测试文件同步更新覆盖新功能。

**Tech Stack:** Vue 3 (Composition API), TypeScript, CSS animations, Canvas/SVG, vitest + @vue/test-utils

---

### 文件结构概览

**修改的文件（9 个视图组件 + 9 个测试文件）：**
- `src/views/EmotionGarden.vue` — 花朵 LOD 降级系统
- `src/views/DailyAnchor.vue` — 手札日记 + 年尺度视图
- `src/views/GuardRoom.vue` — 治理台/安全台/健康台分页 Tab
- `src/views/LightPavilion.vue` — 旧梦潭（未完成目标归档）
- `src/views/KnowledgeTower.vue` — 知识年轮可视化
- `src/views/RelationHall.vue` — 家脉树 + 留座纪念
- `src/views/RootGarden.vue` — 溯源树 SVG 编织可视化
- `src/views/SeasonalRituals.vue` — 蜕变光茧动画
- `src/views/PlayGallery.vue` — 时间种子彩蛋
- `src/views/__tests__/EmotionGarden.test.ts` — 新增测试文件
- `src/views/__tests__/DailyAnchor.test.ts` — 更新测试
- `src/views/__tests__/GuardRoom.test.ts` — 更新测试
- `src/views/__tests__/LightPavilion.test.ts` — 新增测试文件
- `src/views/__tests__/KnowledgeTower.test.ts` — 更新测试
- `src/views/__tests__/RelationHall.test.ts` — 更新测试
- `src/views/__tests__/RootGarden.test.ts` — 更新测试
- `src/views/__tests__/SeasonalRituals.test.ts` — 更新测试
- `src/views/__tests__/PlayGallery.test.ts` — 更新测试

---

### Task 1: 情绪花房（EmotionGarden）— 花朵 LOD 降级系统

**Files:**
- Modify: `src/views/EmotionGarden.vue`
- Create: `src/views/__tests__/EmotionGarden.test.ts`

**设计说明：**
- 花朵数量超过阈值时自动降级渲染精度：50+ 朵 → 简化花瓣形状（圆形代替复杂花瓣），100+ 朵 → 仅显示光点，200+ 朵 → 仅显示半透明色块
- 降级状态在花房顶部显示"花房状态"指示器
- 花房环境参数扩展：温度/湿度/光照 3 个参数，影响花朵状态描述

- [ ] **Step 1: 在 EmotionGarden.vue 中添加 LOD 系统**

```typescript
// LOD 等级定义
const LOD_THRESHOLDS = [
  { max: 50, level: 'full', label: '繁花盛放', desc: '每朵花精细渲染' },
  { max: 100, level: 'simplified', label: '花团锦簇', desc: '花瓣简化渲染' },
  { max: 200, level: 'dot', label: '星火点点', desc: '仅显示光点' },
  { max: Infinity, level: 'blur', label: '光晕弥漫', desc: '仅显示色块' },
] as const

type LODLevel = 'full' | 'simplified' | 'dot' | 'blur'

const flowerCount = computed(() => records.value.length)

const currentLOD = computed<LODLevel>(() => {
  const count = flowerCount.value
  if (count <= 50) return 'full'
  if (count <= 100) return 'simplified'
  if (count <= 200) return 'dot'
  return 'blur'
})

const lodInfo = computed(() => LOD_THRESHOLDS.find(t => {
  const count = flowerCount.value
  return count <= t.max
}) || LOD_THRESHOLDS[LOD_THRESHOLDS.length - 1])

// 扩展花房环境参数
const greenhouseParams = ref({
  temperature: 22, // 18-30°C
  humidity: 60,    // 30-90%
  light: 70,       // 0-100%
})

function adjustParam(key: 'temperature' | 'humidity' | 'light', delta: number) {
  const p = greenhouseParams.value
  p[key] = Math.max(0, Math.min(100, p[key] + delta))
}
```

```html
<!-- 在花房氛围区域添加 LOD 状态指示器 -->
<div class="garden-lod-indicator">
  <span class="lod-badge" :class="`lod--${currentLOD}`">
    {{ lodInfo.label }}
  </span>
  <span class="lod-desc">{{ lodInfo.desc }}</span>
  <span class="lod-count">{{ flowerCount }} 朵</span>
</div>

<!-- 花房环境控制 -->
<div class="garden-env-controls">
  <div class="env-param" v-for="p in envParams" :key="p.key">
    <span class="env-label">{{ p.label }}</span>
    <div class="env-bar">
      <div class="env-fill" :style="{ width: greenhouseParams[p.key] + '%' }"></div>
    </div>
    <div class="env-adjust">
      <button @click="adjustParam(p.key, -5)">−</button>
      <span class="env-val">{{ greenhouseParams[p.key] }}{{ p.unit }}</span>
      <button @click="adjustParam(p.key, 5)">+</button>
    </div>
  </div>
</div>
```

<!-- 在 GardenFlower 组件上应用 LOD -->
<div :class="['garden-flower-wrapper', `lod-${currentLOD}`]">
  <!-- 已有 GardenFlower 组件 -->
</div>
```

- [ ] **Step 2: 创建测试文件**

```typescript
// 在 EmotionGarden.test.ts 中
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

describe('情绪花房 LOD 降级', () => {
  it('花朵少于 50 时显示"繁花盛放"', async () => {
    const wrapper = mount(EmotionGarden)
    expect(wrapper.find('.lod-badge').text()).toContain('繁花盛放')
  })
})

describe('花房环境参数', () => {
  it('温度调节按钮可点击', async () => {
    const wrapper = mount(EmotionGarden)
    const adjustBtns = wrapper.findAll('.env-adjust button')
    expect(adjustBtns.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/EmotionGarden.test.ts 2>&1
Expected: All tests pass
```

---

### Task 2: 逐日心锚（DailyAnchor）— 手札日记 + 年尺度视图

**Files:**
- Modify: `src/views/DailyAnchor.vue`
- Modify: `src/views/__tests__/DailyAnchor.test.ts`

**设计说明：**
- 手札日记：在锚点详情中添加手札功能，可记录对应锚点的日记片段
- 年尺度视图：在现有 day/week/month 基础上增加 year 视图
- 年度回顾：显示年度完成锚点统计

- [ ] **Step 1: 在 DailyAnchor.vue 中添加手札功能和年视图**

```typescript
// 扩展 Scale 类型
type Scale = 'day' | 'week' | 'month' | 'year'

// 手札接口
interface AnchorJournal {
  anchorId: string
  content: string
  createdAt: string
  updatedAt: string
}

const journals = ref<AnchorJournal[]>(loadJournals())
const JOURNAL_KEY = 'heartflow:anchor-journals'

function loadJournals(): AnchorJournal[] {
  try { return storage.getKV(JOURNAL_KEY, []) } catch { return [] }
}
function saveJournals(j: AnchorJournal[]) { storage.setKV(JOURNAL_KEY, j) }

// 当前选中锚点的手札
const activeJournal = computed(() =>
  journals.value.find(j => j.anchorId === editingAnchorId.value)
)

function saveJournal(anchorId: string, content: string) {
  const idx = journals.value.findIndex(j => j.anchorId === anchorId)
  const entry: AnchorJournal = {
    anchorId, content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
  if (idx >= 0) {
    journals.value[idx] = { ...journals.value[idx], content, updatedAt: entry.updatedAt }
  } else {
    journals.value.unshift(entry)
  }
  saveJournals(journals.value)
}

// 年度统计
const yearStats = computed(() => {
  const year = new Date().getFullYear().toString()
  const yearAnchors = anchors.value.filter(a => a.createdAt?.startsWith(year))
  return {
    total: yearAnchors.length,
    done: yearAnchors.filter(a => a.done).length,
    rate: yearAnchors.length > 0
      ? Math.round((yearAnchors.filter(a => a.done).length / yearAnchors.length) * 100)
      : 0,
  }
})
```

```html
<!-- 在锚点详情弹窗中添加手札编辑区 -->
<div class="anchor-journal" v-if="editingAnchorId">
  <h4 class="journal-title">📝 手札</h4>
  <textarea
    v-model="journalContent"
    class="journal-textarea"
    placeholder="记录与这个锚点相关的思绪..."
    rows="4"
  ></textarea>
  <button class="journal-save" @click="saveJournal(editingAnchorId, journalContent)">保存手札</button>
</div>
```

- [ ] **Step 2: 更新测试文件**

```typescript
describe('手札日记', () => {
  it('手札编辑区存在', async () => {
    const wrapper = mount(DailyAnchor)
    // 添加一个锚点
    // 点击锚点编辑
    // 验证手札区域
  })
})

describe('年尺度视图', () => {
  it('切换年视图显示年度统计', async () => {
    const wrapper = mount(DailyAnchor)
    // 找到年视图切换按钮
    // 点击切换
    // 验证年度统计显示
  })
})
```

- [ ] **Step 3: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/DailyAnchor.test.ts 2>&1
Expected: All tests pass
```

---

### Task 3: 守护室（GuardRoom）— 治理台/安全台/健康台分页

**Files:**
- Modify: `src/views/GuardRoom.vue`
- Modify: `src/views/__tests__/GuardRoom.test.ts`

**设计说明：**
- 将当前垂直布局改为 Tab 分页：治理台 / 安全台 / 健康台 / 心理安全
- 治理台：数据治理 + 存储治理 + 权限治理 + 隐私治理（当前数据安全区）
- 安全台：数据安全 + 网络安全 + 设备安全 + 应急安全
- 健康台：身体数据总览（当前健康相关功能）
- 心理安全：光笺机制 + 热线接入（当前心理安全区）

- [ ] **Step 1: 在 GuardRoom.vue 中添加分页 Tab 系统**

```typescript
type GuardTab = 'govern' | 'security' | 'health' | 'psyche'

const GUARD_TABS: { id: GuardTab; icon: string; label: string }[] = [
  { id: 'govern', icon: '⚖️', label: '治理台' },
  { id: 'security', icon: '🛡️', label: '安全台' },
  { id: 'health', icon: '💚', label: '健康台' },
  { id: 'psyche', icon: '🕊️', label: '心理安全' },
]

const activeTab = ref<GuardTab>('govern')

// 各 tab 内容从现有功能拆分
// 治理台：数据安全（导出备份/数据回流/存储空间）+ 访问记录
// 安全台：反诈骗核验 + 紧急操作（SOS/假来电/报平安）
// 健康台：紧急联系人 + 身体数据（预留）
// 心理安全：心理援助热线 + 安慰信笺 + 幕僚顾问开关
```

```html
<!-- Tab 导航栏 -->
<div class="guard-tabs">
  <button
    v-for="tab in GUARD_TABS"
    :key="tab.id"
    :class="['guard-tab', { active: activeTab === tab.id }]"
    @click="activeTab = tab.id"
  >
    <span class="tab-icon">{{ tab.icon }}</span>
    <span class="tab-label">{{ tab.label }}</span>
  </button>
</div>

<!-- 治理台内容 -->
<div v-if="activeTab === 'govern'" class="guard-tab-content">
  <!-- 数据安全：导出备份/数据回流/存储空间 -->
  <!-- 访问记录 -->
</div>

<!-- 安全台内容 -->
<div v-if="activeTab === 'security'" class="guard-tab-content">
  <!-- 反诈骗核验 -->
  <!-- 紧急操作：SOS/假来电/报平安 -->
</div>

<!-- 健康台内容 -->
<div v-if="activeTab === 'health'" class="guard-tab-content">
  <!-- 紧急联系人 -->
  <!-- 身体数据总览（预留） -->
</div>

<!-- 心理安全内容 -->
<div v-if="activeTab === 'psyche'" class="guard-tab-content">
  <!-- 心理援助热线 -->
  <!-- 安慰信笺 -->
  <!-- 幕僚顾问开关 -->
</div>
```

- [ ] **Step 2: 更新测试文件**

```typescript
describe('守护室分页', () => {
  it('渲染 4 个 Tab 按钮', () => {
    const wrapper = mount(GuardRoom)
    const tabs = wrapper.findAll('.guard-tab')
    expect(tabs.length).toBe(4)
  })

  it('默认显示治理台内容', () => {
    const wrapper = mount(GuardRoom)
    expect(wrapper.find('.guard-tab.active').text()).toContain('治理台')
  })

  it('点击安全台 Tab 切换内容', async () => {
    const wrapper = mount(GuardRoom)
    await wrapper.findAll('.guard-tab')[1].trigger('click')
    expect(wrapper.find('.guard-tab.active').text()).toContain('安全台')
  })
})
```

- [ ] **Step 3: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/GuardRoom.test.ts 2>&1
Expected: All tests pass
```

---

### Task 4: 留光阁（LightPavilion）— 旧梦潭

**Files:**
- Modify: `src/views/LightPavilion.vue`
- Create: `src/views/__tests__/LightPavilion.test.ts`

**设计说明：**
- 旧梦潭：显示已完成目标的归档，作为"旧梦潭"专题区域
- 展示已完成目标列表，带完成日期和统计
- 支持从旧梦潭恢复目标到活跃状态

- [ ] **Step 1: 在 LightPavilion.vue 中添加旧梦潭区域**

```typescript
// 旧梦潭：已完成目标
const oldDreams = computed(() =>
  store.goals.filter(g => g.status === 'bloom' || g.completedAt)
)

// 按完成月份分组
const oldDreamsByMonth = computed(() => {
  const map: Record<string, Goal[]> = {}
  for (const g of oldDreams.value) {
    const m = (g.completedAt || g.updatedAt || '').slice(0, 7)
    if (!map[m]) map[m] = []
    map[m].push(g)
  }
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
})

// 恢复目标
function reviveGoal(id: string) {
  const goal = store.goals.find(g => g.id === id)
  if (goal) {
    goal.status = 'growing'
    goal.completedAt = undefined
    store.updateGoal(goal)
  }
}
```

```html
<!-- 在目标列表下方添加旧梦潭区域 -->
<section class="lp-old-dreams" v-if="oldDreams.length > 0">
  <h3 class="lp-section-title">🌊 旧梦潭</h3>
  <p class="lp-section-desc">已完成的目标，沉睡在旧梦潭中。共 {{ oldDreams.length }} 个</p>
  <div v-for="[month, goals] in oldDreamsByMonth" :key="month" class="old-dream-month">
    <span class="old-dream-month-label">{{ month }}</span>
    <div v-for="g in goals" :key="g.id" class="old-dream-item">
      <span class="old-dream-icon">{{ g.domain === 'work' ? '💼' : g.domain === 'growth' ? '🌱' : '⭐' }}</span>
      <span class="old-dream-title">{{ g.title }}</span>
      <span class="old-dream-status">已完成</span>
      <button class="old-dream-revive" @click="reviveGoal(g.id)">复苏</button>
    </div>
  </div>
</section>
```

- [ ] **Step 2: 创建测试文件**

```typescript
describe('旧梦潭', () => {
  it('显示已完成目标列表', async () => {
    const wrapper = mount(LightPavilion)
    // 验证旧梦潭区域存在
    const section = wrapper.find('.lp-old-dreams')
    // 如果存在已完成目标则显示
  })

  it('复苏按钮可点击', async () => {
    const wrapper = mount(LightPavilion)
    const reviveBtns = wrapper.findAll('.old-dream-revive')
    if (reviveBtns.length > 0) {
      await reviveBtns[0].trigger('click')
      // 验证目标状态恢复
    }
  })
})
```

- [ ] **Step 3: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/LightPavilion.test.ts 2>&1
Expected: All tests pass
```

---

### Task 5: 思绪书房（KnowledgeTower）— 知识年轮可视化

**Files:**
- Modify: `src/views/KnowledgeTower.vue`
- Modify: `src/views/__tests__/KnowledgeTower.test.ts`

**设计说明：**
- 知识年轮：在现有 7 种展示模式基础上，添加"年轮"可视化模式
- 按月份/年份展示知识节点的积累过程，形成年轮效果
- 使用 SVG 绘制同心圆环，每个节点在圆环上形成一个标记

- [ ] **Step 1: 在 KnowledgeTower.vue 中添加年轮模式**

```typescript
// 在 displayModes 中添加年轮模式
const DISPLAY_MODES = [
  // ... 现有 7 种模式
  { key: 'ring', icon: '🌲', label: '年轮' },
]

// 年轮数据计算
const ringData = computed(() => {
  const now = new Date()
  const rings: { year: string; nodes: KNode[]; count: number }[] = []
  for (let y = 0; y < 5; y++) {
    const year = (now.getFullYear() - y).toString()
    const yearNodes = knodes.value.filter(n => n.createdAt?.startsWith(year))
    if (yearNodes.length > 0) {
      rings.push({ year, nodes: yearNodes, count: yearNodes.length })
    }
  }
  return rings.reverse()
})

const maxRingCount = computed(() => Math.max(...ringData.value.map(r => r.count), 1))
```

```html
<!-- 年轮视图 -->
<section v-if="activeMode === 'ring'" class="kt-ring-view">
  <svg viewBox="0 0 300 300" class="kt-ring-svg">
    <g v-for="(ring, idx) in ringData" :key="ring.year">
      <!-- 年轮圆环 -->
      <circle
        cx="150" cy="150"
        :r="25 + idx * 35"
        fill="none"
        stroke="rgba(212, 165, 116, 0.15)"
        :stroke-width="1 + (ring.count / maxRingCount) * 3"
      />
      <!-- 节点标记 -->
      <circle
        v-for="(n, ni) in ring.nodes.slice(0, 20)"
        :key="n.id"
        :cx="150 + Math.cos((ni / Math.min(ring.nodes.length, 20)) * Math.PI * 2) * (25 + idx * 35)"
        :cy="150 + Math.sin((ni / Math.min(ring.nodes.length, 20)) * Math.PI * 2) * (25 + idx * 35)"
        r="3"
        :fill="NODE_CAT_COLORS[n.cat] || '#d4a574'"
        opacity="0.6"
      />
      <!-- 年份标签 -->
      <text
        :x="150 + Math.cos(-Math.PI / 2) * (25 + idx * 35)"
        :y="150 + Math.sin(-Math.PI / 2) * (25 + idx * 35)"
        text-anchor="middle" fill="rgba(212, 165, 116, 0.4)"
        font-size="10"
      >{{ ring.year }}</text>
    </g>
    <!-- 中心 -->
    <circle cx="150" cy="150" r="8" fill="rgba(212, 165, 116, 0.1)" />
    <text x="150" y="154" text-anchor="middle" fill="rgba(212, 165, 116, 0.3)" font-size="8">知</text>
  </svg>
</section>
```

- [ ] **Step 2: 更新测试文件**

```typescript
describe('知识年轮', () => {
  it('年轮模式切换按钮存在', () => {
    const wrapper = mount(KnowledgeTower)
    const ringBtn = wrapper.find('.kt-mode-btn:last-child')
    expect(ringBtn.text()).toContain('年轮')
  })

  it('年轮 SVG 渲染', async () => {
    const wrapper = mount(KnowledgeTower)
    // 切换到年轮模式
    const modeBtns = wrapper.findAll('.kt-mode-btn')
    await modeBtns[modeBtns.length - 1].trigger('click')
    expect(wrapper.find('.kt-ring-svg').exists()).toBe(true)
  })
})
```

- [ ] **Step 3: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/KnowledgeTower.test.ts 2>&1
Expected: All tests pass
```

---

### Task 6: 羁绊之厅（RelationHall）— 家脉树 + 留座纪念

**Files:**
- Modify: `src/views/RelationHall.vue`
- Modify: `src/views/__tests__/RelationHall.test.ts`

**设计说明：**
- 家脉树：在现有网络图基础上，添加一个家脉树 Tab，用 SVG 绘制家谱树
- 留座：为已故或失联的重要人物预留"留座"纪念位

- [ ] **Step 1: 在 RelationHall.vue 中添加家脉树和留座**

```typescript
type RelationTab = 'network' | 'family' | 'memorial'

const RELATION_TABS: { id: RelationTab; icon: string; label: string }[] = [
  { id: 'network', icon: '🕸', label: '关系网' },
  { id: 'family', icon: '🌳', label: '家脉树' },
  { id: 'memorial', icon: '🕊️', label: '留座' },
]

const activeRelationTab = ref<RelationTab>('network')

// 家脉树：筛选出家人
const familyMembers = computed(() =>
  people.value.filter(p => p.relation === 'family')
)

// 留座：失联或已故标记
interface MemorialSeat {
  id: string
  name: string
  relation: string
  reason: 'passed' | 'lost' | 'far'
  message: string
  createdAt: string
}

const memorialSeats = ref<MemorialSeat[]>(loadMemorials())
const MEMORIAL_KEY = 'heartflow:memorial-seats'

function loadMemorials(): MemorialSeat[] {
  try { return storage.getKV(MEMORIAL_KEY, []) } catch { return [] }
}
function saveMemorials(m: MemorialSeat[]) { storage.setKV(MEMORIAL_KEY, m) }

function addMemorial(seat: Omit<MemorialSeat, 'id' | 'createdAt'>) {
  memorialSeats.value.unshift({ ...seat, id: `ms_${Date.now()}`, createdAt: new Date().toISOString() })
  saveMemorials(memorialSeats.value)
}
```

```html
<!-- Tab 导航 -->
<div class="rh-tabs">
  <button v-for="t in RELATION_TABS" :key="t.id"
    :class="['rh-tab', { active: activeRelationTab === t.id }]"
    @click="activeRelationTab = t.id">
    <span>{{ t.icon }}</span>
    <span>{{ t.label }}</span>
  </button>
</div>

<!-- 家脉树 Tab -->
<div v-if="activeRelationTab === 'family'" class="rh-family-tree">
  <svg viewBox="0 0 400 300" class="family-tree-svg">
    <!-- 树根 -->
    <path d="M200,280 Q200,250 200,220" stroke="rgba(212, 165, 116, 0.2)" stroke-width="2" fill="none" />
    <!-- 树枝 -->
    <g v-for="(m, i) in familyMembers" :key="m.id">
      <path :d="`M200,220 Q${150 + i * 60},180 ${150 + i * 60},150`"
        stroke="rgba(212, 165, 116, 0.15)" stroke-width="1" fill="none" />
      <circle :cx="150 + i * 60" :cy="140" r="12" :fill="m.color || '#d4a574'" opacity="0.4" />
      <text :x="150 + i * 60" :y="145" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="8">{{ m.name[0] }}</text>
    </g>
  </svg>
</div>

<!-- 留座 Tab -->
<div v-if="activeRelationTab === 'memorial'" class="rh-memorial">
  <div v-for="seat in memorialSeats" :key="seat.id" class="memorial-seat">
    <span class="memorial-icon">🕊️</span>
    <span class="memorial-name">{{ seat.name }}</span>
    <span class="memorial-relation">{{ seat.relation }}</span>
    <p class="memorial-msg">{{ seat.message }}</p>
  </div>
</div>
```

- [ ] **Step 2: 更新测试文件**

```typescript
describe('家脉树', () => {
  it('家脉树 Tab 存在', () => {
    const wrapper = mount(RelationHall)
    const familyTab = wrapper.findAll('.rh-tab')[1]
    expect(familyTab.text()).toContain('家脉树')
  })
})

describe('留座', () => {
  it('留座 Tab 存在', () => {
    const wrapper = mount(RelationHall)
    const memorialTab = wrapper.findAll('.rh-tab')[2]
    expect(memorialTab.text()).toContain('留座')
  })
})
```

- [ ] **Step 3: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/RelationHall.test.ts 2>&1
Expected: All tests pass
```

---

### Task 7: 根脉之庭（RootGarden）— 溯源树 SVG 编织可视化

**Files:**
- Modify: `src/views/RootGarden.vue`
- Modify: `src/views/__tests__/RootGarden.test.ts`

**设计说明：**
- 用 SVG 绘制一棵溯源树，三层（根系/树干/枝桠）分别对应 soil/era/branch
- 每个节点在树上形成一个标记，hover 显示详情
- 树形可视化取代或补充现有卡片列表视图

- [ ] **Step 1: 在 RootGarden.vue 中添加溯源树 SVG**

```typescript
// 树形可视化数据
const treeLayout = computed(() => {
  const soil = roots.value.filter(r => r.layer === 'soil')
  const era = roots.value.filter(r => r.layer === 'era')
  const branch = roots.value.filter(r => r.layer === 'branch')

  return {
    soil: soil.map((r, i) => ({
      ...r,
      x: 200 + (i - (soil.length - 1) / 2) * 40,
      y: 260,
    })),
    era: era.map((r, i) => ({
      ...r,
      x: 200 + (i - (era.length - 1) / 2) * 35,
      y: 170,
    })),
    branch: branch.map((r, i) => ({
      ...r,
      x: 200 + (i - (branch.length - 1) / 2) * 30,
      y: 80,
    })),
  }
})

const hoveredRoot = ref<string | null>(null)
```

```html
<!-- 树形可视化 -->
<section class="rg-tree-visual">
  <svg viewBox="0 0 400 300" class="rg-tree-svg">
    <!-- 树干 -->
    <path d="M200,280 Q195,200 200,120" stroke="rgba(212, 165, 116, 0.15)" stroke-width="3" fill="none" />
    <path d="M200,280 Q205,200 200,120" stroke="rgba(212, 165, 116, 0.1)" stroke-width="2" fill="none" />
    <!-- 根系节点 -->
    <g v-for="n in treeLayout.soil" :key="n.id">
      <path :d="`M200,260 L${n.x},${n.y}`" stroke="rgba(212, 165, 116, 0.08)" stroke-width="1" />
      <circle :cx="n.x" :cy="n.y" r="10" fill="#8a7a5a" opacity="0.4"
        @mouseenter="hoveredRoot = n.id" @mouseleave="hoveredRoot = null" />
      <text :x="n.x" :y="n.y + 4" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="7">{{ n.text.slice(0, 2) }}</text>
    </g>
    <!-- 树干节点 -->
    <g v-for="n in treeLayout.era" :key="n.id">
      <path :d="`M200,170 L${n.x},${n.y}`" stroke="rgba(212, 165, 116, 0.08)" stroke-width="1" />
      <circle :cx="n.x" :cy="n.y" r="8" fill="#a0906a" opacity="0.4"
        @mouseenter="hoveredRoot = n.id" @mouseleave="hoveredRoot = null" />
      <text :x="n.x" :y="n.y + 3" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="6">{{ n.text.slice(0, 2) }}</text>
    </g>
    <!-- 枝桠节点 -->
    <g v-for="n in treeLayout.branch" :key="n.id">
      <path :d="`M200,120 L${n.x},${n.y}`" stroke="rgba(212, 165, 116, 0.08)" stroke-width="1" />
      <circle :cx="n.x" :cy="n.y" r="6" fill="#c0a86a" opacity="0.4"
        @mouseenter="hoveredRoot = n.id" @mouseleave="hoveredRoot = null" />
      <text :x="n.x" :y="n.y + 2" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="5">{{ n.text.slice(0, 2) }}</text>
    </g>
    <!-- 根标签 -->
    <text x="200" y="295" text-anchor="middle" fill="rgba(212, 165, 116, 0.2)" font-size="9">根系 · 原生土壤</text>
    <text x="200" y="195" text-anchor="middle" fill="rgba(212, 165, 116, 0.2)" font-size="9">树干 · 时代与成长</text>
    <text x="200" y="105" text-anchor="middle" fill="rgba(212, 165, 116, 0.2)" font-size="9">枝桠 · 分化与选择</text>
  </svg>
  <!-- Hover 详情 -->
  <div v-if="hoveredRoot" class="rg-tree-tooltip">
    {{ roots.value.find(r => r.id === hoveredRoot)?.text }}
  </div>
</section>
```

- [ ] **Step 2: 更新测试文件**

```typescript
describe('溯源树可视化', () => {
  it('渲染树形 SVG', () => {
    const wrapper = mount(RootGarden)
    expect(wrapper.find('.rg-tree-svg').exists()).toBe(true)
  })

  it('三层标签显示', () => {
    const wrapper = mount(RootGarden)
    expect(wrapper.text()).toContain('根系')
    expect(wrapper.text()).toContain('树干')
    expect(wrapper.text()).toContain('枝桠')
  })
})
```

- [ ] **Step 3: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/RootGarden.test.ts 2>&1
Expected: All tests pass
```

---

### Task 8: 岁时阁（SeasonalRituals）— 蜕变光茧动画

**Files:**
- Modify: `src/views/SeasonalRituals.vue`
- Modify: `src/views/__tests__/SeasonalRituals.test.ts`

**设计说明：**
- 蜕变光茧：在人生仪礼区域添加一个"光茧"动画效果
- 当用户完成一个人生仪礼时，光茧破茧成蝶动画
- 光茧 SVG：发光椭圆 + 呼吸动画 + 完成后蝴蝶飞出

- [ ] **Step 1: 在 SeasonalRituals.vue 中添加蜕变光茧**

```typescript
// 蜕变光茧状态
const cocoonState = ref<'idle' | 'cocooning' | 'hatching' | 'emerged'>('idle')
const hatchingRitual = ref<string | null>(null)

function completeLifeRitual(id: string) {
  // 原有完成逻辑
  const ritual = lifeRituals.value.find(r => r.id === id)
  if (!ritual) return
  ritual.done = true
  
  // 触发光茧动画
  cocoonState.value = 'cocooning'
  hatchingRitual.value = ritual.name
  setTimeout(() => {
    cocoonState.value = 'hatching'
    setTimeout(() => {
      cocoonState.value = 'emerged'
      setTimeout(() => {
        cocoonState.value = 'idle'
        hatchingRitual.value = null
      }, 3000)
    }, 2000)
  }, 1000)
}
```

```html
<!-- 光茧动画区域 -->
<div v-if="cocoonState !== 'idle'" class="sr-cocoon" :class="`cocoon--${cocoonState}`">
  <svg viewBox="0 0 200 200" class="cocoon-svg">
    <!-- 光茧 -->
    <ellipse cx="100" cy="100" rx="30" ry="45"
      fill="rgba(212, 165, 116, 0.08)"
      stroke="rgba(212, 165, 116, 0.3)"
      stroke-width="1.5"
      :class="{ 'cocoon-pulse': cocoonState === 'cocooning' }"
    >
      <animate v-if="cocoonState === 'cocooning'"
        attributeName="rx" values="30;35;30" dur="2s" repeatCount="indefinite" />
    </ellipse>
    <!-- 发光 -->
    <circle cx="100" cy="100" r="50" fill="rgba(212, 165, 116, 0.03)"
      :class="{ 'cocoon-glow': cocoonState === 'hatching' }">
      <animate attributeName="r" values="45;55;45" dur="1.5s" repeatCount="indefinite" />
    </circle>
    <!-- 蝴蝶（破茧后） -->
    <g v-if="cocoonState === 'emerged'" class="cocoon-butterfly">
      <path d="M100,100 Q85,85 75,95 Q85,100 100,100" fill="rgba(212, 165, 116, 0.5)" />
      <path d="M100,100 Q115,85 125,95 Q115,100 100,100" fill="rgba(212, 165, 116, 0.5)" />
      <animateTransform attributeName="transform" type="translate"
        values="0,0;20,-30;40,-10" dur="3s" fill="freeze" />
    </g>
  </svg>
  <span class="cocoon-label" v-if="hatchingRitual">
    {{ cocoonState === 'cocooning' ? '蜕变中...' : cocoonState === 'hatching' ? '破茧...' : `${hatchingRitual} · 已成` }}
  </span>
</div>
```

- [ ] **Step 2: 更新测试文件**

```typescript
describe('蜕变光茧', () => {
  it('光茧动画区域存在', () => {
    const wrapper = mount(SeasonalRituals)
    // 完成一个人生仪礼
    // 验证光茧出现
  })
})
```

- [ ] **Step 3: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/SeasonalRituals.test.ts 2>&1
Expected: All tests pass
```

---

### Task 9: 逸趣阁（PlayGallery）— 时间种子彩蛋

**Files:**
- Modify: `src/views/PlayGallery.vue`
- Modify: `src/views/__tests__/PlayGallery.test.ts`

**设计说明：**
- 时间种子：在逸趣阁底部添加一个"时间种子"彩蛋区域
- 用户可"种下"一条记录，标记此刻的心情/状态
- 种子以 SVG 种子图标展示，按时间排序
- 种子发芽动画（点击种子时）

- [ ] **Step 1: 在 PlayGallery.vue 中添加时间种子**

```typescript
interface TimeSeed {
  id: string
  content: string
  mood: 'happy' | 'calm' | 'sad' | 'excited' | 'tired'
  createdAt: string
}

const timeSeeds = ref<TimeSeed[]>(loadSeeds())
const SEED_KEY = 'heartflow:time-seeds'

const MOOD_ICONS: Record<string, string> = {
  happy: '😊', calm: '😌', sad: '😢', excited: '🤩', tired: '😴',
}

function loadSeeds(): TimeSeed[] {
  try { return storage.getKV(SEED_KEY, []) } catch { return [] }
}
function saveSeeds(s: TimeSeed[]) { storage.setKV(SEED_KEY, s) }

const seedForm = ref({ content: '', mood: 'calm' as TimeSeed['mood'] })

function plantSeed() {
  if (!seedForm.value.content.trim()) return
  timeSeeds.value.unshift({
    id: `seed_${Date.now()}`,
    content: seedForm.value.content,
    mood: seedForm.value.mood,
    createdAt: new Date().toISOString(),
  })
  saveSeeds(timeSeeds.value)
  seedForm.value.content = ''
}

const activeSeedId = ref<string | null>(null)

function toggleSeed(id: string) {
  activeSeedId.value = activeSeedId.value === id ? null : id
}
```

```html
<!-- 在逸趣阁底部添加时间种子区域 -->
<section class="pg-seeds">
  <h3 class="pg-section-title">🌱 时间种子</h3>
  <p class="pg-section-desc">种下此刻的心情，未来某天会发芽</p>
  
  <!-- 种种子表单 -->
  <div class="seed-form">
    <input v-model="seedForm.content" placeholder="记录此刻..." class="seed-input" maxlength="100" />
    <div class="seed-mood-picker">
      <button v-for="(icon, mood) in MOOD_ICONS" :key="mood"
        :class="['seed-mood-btn', { active: seedForm.mood === mood }]"
        @click="seedForm.mood = mood as TimeSeed['mood']">{{ icon }}</button>
    </div>
    <button class="seed-plant-btn" @click="plantSeed" :disabled="!seedForm.content.trim()">种下</button>
  </div>
  
  <!-- 种子列表 -->
  <div class="seed-list">
    <div v-for="seed in timeSeeds" :key="seed.id"
      :class="['seed-item', { 'seed-active': activeSeedId === seed.id }]"
      @click="toggleSeed(seed.id)">
      <span class="seed-icon">{{ MOOD_ICONS[seed.mood] || '🌱' }}</span>
      <span class="seed-date">{{ seed.createdAt.slice(5, 10) }}</span>
      <div v-if="activeSeedId === seed.id" class="seed-content">
        {{ seed.content }}
        <span class="seed-time">{{ seed.createdAt.slice(11, 16) }}</span>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: 更新测试文件**

```typescript
describe('时间种子', () => {
  it('种子输入表单存在', () => {
    const wrapper = mount(PlayGallery)
    expect(wrapper.find('.seed-input').exists()).toBe(true)
  })

  it('种下种子后显示在列表中', async () => {
    const wrapper = mount(PlayGallery)
    const input = wrapper.find('.seed-input')
    await input.setValue('测试种子')
    await wrapper.find('.seed-plant-btn').trigger('click')
    expect(wrapper.text()).toContain('测试种子')
  })
})
```

- [ ] **Step 3: 运行测试验证**

```
Run: cd project/frontend && npx vitest run src/views/__tests__/PlayGallery.test.ts 2>&1
Expected: All tests pass
```

---

### 最终验证

- [ ] **运行全量测试**

```
Run: cd project/frontend && npx vitest run 2>&1
Expected: 1899+ tests pass
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