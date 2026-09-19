# A 阶段：核心功能深度完善实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 6 个 P1 核心功能模块进行深度完善，打通"环境→状态→可视化"的完整交互链路

**Architecture:** 每个模块独立增强，在现有基础实现上叠加深度功能。情绪花房补充环境-花朵状态联动；逐日心锚补充光丝串联可视化；守护室拆分治理台+安全台为子页面；幕僚系统完善定音锤四幕叙事与调度UI；留光阁补充专项规划区；思绪书房补充4种内容导入方式。所有增强保持宪法合规（文案中立、交互默认值、数据主权）。

**Tech Stack:** Vue 3 (Composition API), TypeScript, SVG/CSS 动画, Pinia 状态管理, localStorage 持久化

---

### Task 1: A1-1 — 情绪花房·环境-花朵状态联动

**Files:**
- Modify: `src/views/EmotionGarden.vue`
- Modify: `src/components/GardenFlower.vue`
- Test: `src/views/__tests__/EmotionGarden.test.ts`

**背景**：当前情绪花房已有温度/湿度/光照调节控件，但环境参数仅作为数据显示，不实际影响花朵视觉状态。需要建立环境参数到花朵状态的映射关系。

**实现方案**：
- 花朵状态分为 3 级：`bloom`（盛开，环境优）、`normal`（正常，环境适中）、`wilt`（萎蔫，环境差）
- 每个环境参数有最佳区间，偏离越多花朵状态越差
- 花朵状态通过 CSS 类（`state-bloom` / `state-normal` / `state-wilt`）控制视觉表现
- 花房整体氛围根据平均花朵状态动态调整

- [ ] **Step 1: 更新 GardenFlower 组件，添加环境状态逻辑**

```vue
<!-- GardenFlower.vue 新增 props 和状态渲染 -->
<script setup lang="ts">
import { computed } from 'vue'
import type { EmotionType, FlowerConfig } from '../modules/emotion/types'

const props = defineProps<{
  type: EmotionType
  note: string
  createdAt: string
  config: FlowerConfig
  envScore?: number  // 0-100，环境综合评分
}>()

// 花朵状态：envScore >= 70 → bloom, 30-70 → normal, < 30 → wilt
const flowerState = computed(() => {
  if (props.envScore === undefined) return 'normal'
  if (props.envScore >= 70) return 'bloom'
  if (props.envScore >= 30) return 'normal'
  return 'wilt'
})

const stateClass = computed(() => `state-${flowerState.value}`)
</script>

<template>
  <div class="garden-flower" :class="[stateClass, `lod-${lodLevel}`]">
    <!-- 花朵 SVG 渲染，状态影响花瓣角度/颜色饱和度 -->
    <svg viewBox="0 0 40 40" class="flower-svg">
      <!-- 花朵状态影响花瓣旋转角度 -->
      <g :class="flowerState">
        <circle
          v-for="i in config.petals"
          :key="i"
          :cx="20 + Math.cos((i * 2 * Math.PI) / config.petals - Math.PI / 2) * 8"
          :cy="20 + Math.sin((i * 2 * Math.PI) / config.petals - Math.PI / 2) * 8"
          :r="stateClass === 'state-wilt' ? 2.5 : stateClass === 'state-bloom' ? 5 : 4"
          :fill="stateClass === 'state-wilt' ? adjustColor(config.petalColor, -40) : adjustColor(config.petalColor, stateClass === 'state-bloom' ? 20 : 0)"
          :opacity="stateClass === 'state-wilt' ? 0.5 : 1"
        />
        <circle cx="20" cy="20" r="3" :fill="stateClass === 'state-wilt' ? '#666' : config.coreColor" />
      </g>
    </svg>
    <div class="flower-note" v-if="note">{{ note }}</div>
  </div>
</template>

<style scoped>
.state-bloom .flower-svg { filter: drop-shadow(0 0 6px rgba(255,255,200,0.6)); }
.state-normal .flower-svg { filter: none; }
.state-wilt .flower-svg { filter: grayscale(0.4) sepia(0.3); opacity: 0.7; }
</style>
```

- [ ] **Step 2: 更新 EmotionGarden.vue，建立环境→花朵状态映射**

在 `EmotionGarden.vue` 的 `<script setup>` 中补充：

```typescript
// 环境参数最佳区间
const ENV_OPTIMAL = {
  temperature: { min: 20, max: 26, ideal: 23 },
  humidity: { min: 50, max: 75, ideal: 60 },
  light: { min: 40, max: 85, ideal: 65 },
}

// 计算环境综合评分 (0-100)
const envScore = computed(() => {
  const tempScore = scoreParam(temperature.value, ENV_OPTIMAL.temperature)
  const humidScore = scoreParam(humidity.value, ENV_OPTIMAL.humidity)
  const lightScore = scoreParam(light.value, ENV_OPTIMAL.light)
  return Math.round((tempScore + humidScore + lightScore) / 3)
})

function scoreParam(value: number, optimal: { min: number; max: number; ideal: number }): number {
  if (value >= optimal.min && value <= optimal.max) return 100
  const distance = value < optimal.min ? optimal.min - value : value - optimal.max
  const maxDistance = 20 // 超出20个单位得0分
  return Math.max(0, 100 - (distance / maxDistance) * 100)
}

// 花房整体氛围根据环境评分调整
const ambientMoodByEnv = computed(() => {
  if (envScore.value >= 80) return 'bright'
  if (envScore.value >= 50) return 'normal'
  return 'dim'
})
```

- [ ] **Step 3: 更新模板，传递 envScore 到花朵组件**

```vue
<!-- 在花朵循环中传递 envScore -->
<GardenFlower
  v-for="record in filteredRecords"
  :key="record.id"
  :type="record.type"
  :note="record.note"
  :createdAt="record.createdAt"
  :config="EMOTION_FLOWERS[record.type]"
  :envScore="envScore"
/>
```

- [ ] **Step 4: 添加环境状态 UI 提示**

在环境控制面板中补充环境评分显示：

```vue
<div class="env-status">
  <span class="env-score-label">花房生态评分</span>
  <div class="env-score-bar">
    <div class="env-score-fill" :style="{ width: envScore + '%' }" />
  </div>
  <span class="env-score-value">{{ envScore }}%</span>
  <span class="env-score-hint">{{ envScore >= 80 ? '🌿 花朵生机盎然' : envScore >= 50 ? '🌱 环境尚可' : '🍂 花儿有些萎蔫' }}</span>
</div>
```

- [ ] **Step 5: 运行测试验证**

Run: `cd project/frontend && npx vitest run src/views/__tests__/EmotionGarden.test.ts -v 2>&1 | tail -20`
Expected: 所有测试通过

- [ ] **Step 6: TypeScript 检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: 零错误

---

### Task 2: A2-1 — 逐日心锚·光丝串联可视化

**Files:**
- Modify: `src/views/DailyAnchor.vue`
- Create: `src/components/AnchorLightThread.vue`
- Test: `src/views/__tests__/DailyAnchor.test.ts`

**背景**：当前锚点系统已有完整 CRUD 和池化管理，但完成锚点之间没有视觉关联。需要实现"光丝串联"——完成锚点之间形成光丝路径。

**实现方案**：
- 在年视图下，完成锚点按时间顺序排列，之间用 SVG 曲线连接
- 光丝颜色 = 锚点优先级颜色渐变
- 光丝有微弱的呼吸动画（发光脉冲）

- [ ] **Step 1: 创建 AnchorLightThread 组件**

```vue
<!-- src/components/AnchorLightThread.vue -->
<template>
  <svg class="light-thread" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
    <defs>
      <linearGradient v-for="(grad, i) in gradients" :key="i" :id="`thread-grad-${i}`">
        <stop offset="0%" :stop-color="grad.from" />
        <stop offset="100%" :stop-color="grad.to" />
      </linearGradient>
    </defs>
    <path
      v-for="(seg, i) in segments"
      :key="i"
      :d="seg.d"
      :stroke="`url(#thread-grad-${i})`"
      stroke-width="2"
      fill="none"
      class="thread-path"
      :class="{ 'thread-pulse': seg.pulse }"
    />
    <!-- 完成锚点标记 -->
    <circle
      v-for="(node, i) in nodes"
      :key="i"
      :cx="node.x"
      :cy="node.y"
      r="4"
      :fill="node.color"
      class="thread-node"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Anchor } from '../modules/anchor/types'

const props = defineProps<{
  anchors: Anchor[]
  width: number
  height: number
}>()

const doneAnchors = computed(() =>
  props.anchors.filter(a => a.done && a.doneAt).sort((a, b) => new Date(a.doneAt!).getTime() - new Date(b.doneAt!).getTime())
)

const PRIORITY_COLORS: Record<string, string> = { must: '#f0c040', can: '#80b8d0', float: 'rgba(255,255,255,0.3)' }

const nodes = computed(() => {
  const spacing = props.width / Math.max(doneAnchors.value.length, 2)
  return doneAnchors.value.map((a, i) => ({
    x: spacing * (i + 0.5),
    y: props.height / 2,
    color: PRIORITY_COLORS[a.priority] || '#aaa',
    id: a.id,
  }))
})

const segments = computed(() => {
  const result: { d: string; pulse: boolean; from: string; to: string }[] = []
  for (let i = 0; i < nodes.value.length - 1; i++) {
    const n1 = nodes.value[i]
    const n2 = nodes.value[i + 1]
    const cx = (n1.x + n2.x) / 2
    const cy = (n1.y + n2.y) / 2 - 20
    result.push({
      d: `M ${n1.x} ${n1.y} Q ${cx} ${cy} ${n2.x} ${n2.y}`,
      pulse: i % 2 === 0,
      from: n1.color,
      to: n2.color,
    })
  }
  return result
})
</script>

<style scoped>
.light-thread { pointer-events: none; }
.thread-path { transition: stroke-width 0.3s; }
.thread-path:hover { stroke-width: 3; }
.thread-pulse { animation: threadPulse 3s ease-in-out infinite; }
.thread-node { filter: drop-shadow(0 0 3px currentColor); }
@keyframes threadPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
</style>
```

- [ ] **Step 2: 在 DailyAnchor.vue 的年视图下集成光丝**

在年视图模板中，添加光丝 SVG：

```vue
<!-- 在年视图的统计卡片下方 -->
<section v-if="scale === 'year' && doneAnchors.length >= 2" class="light-thread-section">
  <div class="section-label">光丝串联 · {{ doneAnchors.length }} 个锚点已连接</div>
  <div class="light-thread-container">
    <AnchorLightThread :anchors="scopedAnchors" :width="600" :height="120" />
  </div>
</section>
```

在 script 中添加：

```typescript
import AnchorLightThread from '../components/AnchorLightThread.vue'

const doneAnchors = computed(() => scopedAnchors.value.filter(a => a.done))
```

- [ ] **Step 3: 运行测试验证**

Run: `cd project/frontend && npx vitest run src/views/__tests__/DailyAnchor.test.ts -v 2>&1 | tail -20`
Expected: 所有测试通过

- [ ] **Step 4: TypeScript 检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: 零错误

---

### Task 3: A3-1 — 守护室·治理台四页面板

**Files:**
- Modify: `src/views/GuardRoom.vue`
- Test: `src/views/__tests__/GuardRoom.test.ts`

**背景**：当前治理台是一个整体页面，需要拆分为 4 个子页面：数据治理、存储治理、权限治理、隐私治理。

**实现方案**：
- 在治理台 tab 内添加 4 个子标签（sub-tabs）
- 每个子页面展示对应维度的治理状态和操作入口

- [ ] **Step 1: 定义治理台子页面结构**

```typescript
// 在 GuardRoom.vue 的 script setup 中补充
const GOVERN_SUB_TABS = [
  {
    id: 'data',
    label: '数据治理',
    desc: '管理你的数据生命周期——哪些数据被收集、如何存储、谁可以访问',
    icon: '📊',
    items: [
      { label: '本地存储数据量', value: computed(() => formatBytes(storageSize.value)) },
      { label: '加密备份', value: computed(() => configStore.config.encryptedBackup ? '已启用' : '未启用') },
      { label: '数据回流', value: computed(() => configStore.config.data回流 ? '已开启' : '已关闭') },
    ],
  },
  {
    id: 'storage',
    label: '存储治理',
    desc: '查看和管理各模块的存储占用，合理分配空间',
    icon: '💾',
    items: [
      { label: '情绪记录', value: computed(() => `${emotionCount.value} 条`) },
      { label: '锚点数据', value: computed(() => `${anchorCount.value} 条`) },
      { label: '目标', value: computed(() => `${goalCount.value} 条`) },
      { label: '知识节点', value: computed(() => `${kNodeCount.value} 条`) },
    ],
  },
  {
    id: 'permission',
    label: '权限治理',
    desc: '控制各功能的访问权限和数据共享范围',
    icon: '🔑',
    items: [
      { label: '幕僚访问权限', value: computed(() => configStore.config.advisorEnabled ? '已授权' : '未授权') },
      { label: '数据导出', value: '仅限本地导出' },
      { label: '外部集成', value: '暂无' },
    ],
  },
  {
    id: 'privacy',
    label: '隐私治理',
    desc: '管理你的隐私偏好和数据保留策略',
    icon: '🔍',
    items: [
      { label: '匿名模式', value: computed(() => configStore.config.privacy?.anonymousMode ? '已开启' : '已关闭') },
      { label: '数据保留期', value: computed(() => configStore.config.privacy?.retentionDays ? `${configStore.config.privacy.retentionDays} 天` : '永久保留') },
      { label: '清除历史数据', value: '操作入口' },
    ],
  },
]
```

- [ ] **Step 2: 改造治理台模板，添加子标签导航**

```vue
<!-- 替换原有的治理台内容 -->
<template v-if="activeTab === 'govern'">
  <div class="governance-view">
    <div class="govern-sub-tabs">
      <button
        v-for="tab in GOVERN_SUB_TABS"
        :key="tab.id"
        class="govern-sub-tab"
        :class="{ active: activeGovernTab === tab.id }"
        @click="activeGovernTab = tab.id"
      >
        <span class="govern-sub-icon">{{ tab.icon }}</span>
        <span class="govern-sub-label">{{ tab.label }}</span>
      </button>
    </div>
    
    <div class="govern-content">
      <h3 class="govern-title">{{ currentGovernTab.label }}</h3>
      <p class="govern-desc">{{ currentGovernTab.desc }}</p>
      <div class="govern-items">
        <div v-for="item in currentGovernTab.items" :key="item.label" class="govern-item">
          <span class="govern-item-label">{{ item.label }}</span>
          <span class="govern-item-value">{{ item.value }}</span>
        </div>
      </div>
      <!-- 隐私治理特殊操作 -->
      <div v-if="currentGovernTab.id === 'privacy'" class="govern-actions">
        <button class="govern-action-btn" @click="clearAllData">清除所有数据</button>
        <button class="govern-action-btn secondary" @click="exportAllData">导出数据备份</button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 添加支持函数**

```typescript
const activeGovernTab = ref('data')

const currentGovernTab = computed(() =>
  GOVERN_SUB_TABS.find(t => t.id === activeGovernTab.value) || GOVERN_SUB_TABS[0]
)

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
```

- [ ] **Step 4: 运行测试验证**

Run: `cd project/frontend && npx vitest run src/views/__tests__/GuardRoom.test.ts -v 2>&1 | tail -20`
Expected: 所有测试通过

- [ ] **Step 5: TypeScript 检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: 零错误

---

### Task 4: A3-2 — 守护室·安全台四令牌

**Files:**
- Modify: `src/views/GuardRoom.vue`
- Test: `src/views/__tests__/GuardRoom.test.ts`

**背景**：当前安全台包含反诈骗核验和紧急操作，需要拆分为 4 个安全令牌维度：数据安全、网络安全、设备安全、应急安全。

- [ ] **Step 1: 定义安全台子页面结构**

```typescript
const SECURITY_SUB_TABS = [
  {
    id: 'data-security',
    label: '数据安全',
    icon: '🔐',
    desc: '保护你的数据不被未授权访问或泄露',
    items: [
      { label: '本地存储加密', value: 'AES-256', status: 'secure' },
      { label: '备份状态', value: '最近备份：7天前', status: 'warning' },
      { label: '数据导出记录', value: '最近导出：从未', status: 'info' },
    ],
  },
  {
    id: 'network-security',
    label: '网络安全',
    icon: '🌐',
    desc: '确保网络通信的安全性和隐私保护',
    items: [
      { label: '网络请求', value: '仅本地存储，无外部网络请求', status: 'secure' },
      { label: '外部链接', value: '已阻止所有未授权外部链接', status: 'secure' },
    ],
  },
  {
    id: 'device-security',
    label: '设备安全',
    icon: '📱',
    desc: '管理当前设备的安全状态',
    items: [
      { label: '当前设备', value: navigator.platform || '未知', status: 'info' },
      { label: '解锁方式', value: '应用内无锁屏', status: 'warning' },
    ],
  },
  {
    id: 'emergency',
    label: '应急安全',
    icon: '🆘',
    desc: '紧急情况下的安全操作',
    items: [
      { label: 'SOS 快捷操作', value: '可用', status: 'info' },
      { label: '假来电', value: '可用', status: 'info' },
      { label: '报平安', value: '可用', status: 'info' },
    ],
  },
]
```

- [ ] **Step 2: 改造安全台模板，添加子标签导航**

```vue
<template v-if="activeTab === 'security'">
  <div class="security-view">
    <div class="govern-sub-tabs">
      <button
        v-for="tab in SECURITY_SUB_TABS"
        :key="tab.id"
        class="govern-sub-tab"
        :class="{ active: activeSecurityTab === tab.id }"
        @click="activeSecurityTab = tab.id"
      >
        <span class="govern-sub-icon">{{ tab.icon }}</span>
        <span class="govern-sub-label">{{ tab.label }}</span>
      </button>
    </div>
    <div class="govern-content">
      <h3 class="govern-title">{{ currentSecurityTab.label }}</h3>
      <p class="govern-desc">{{ currentSecurityTab.desc }}</p>
      <div class="govern-items">
        <div v-for="item in currentSecurityTab.items" :key="item.label" class="govern-item">
          <span class="govern-item-label">{{ item.label }}</span>
          <span class="govern-item-value">{{ item.value }}</span>
          <span v-if="item.status" class="govern-item-status" :class="item.status">
            {{ statusLabel(item.status) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 运行测试验证**

Run: `cd project/frontend && npx vitest run src/views/__tests__/GuardRoom.test.ts -v 2>&1 | tail -20`
Expected: 所有测试通过

- [ ] **Step 4: TypeScript 检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: 零错误

---

### Task 5: A4-1 — 镜我·定音锤四幕增强

**Files:**
- Modify: `src/stores/advisor.ts`
- Modify: `src/views/MirrorSelf.vue` (如果存在，需要确认路径)
- Test: `src/stores/__tests__/advisor.test.ts`

**背景**：当前定音锤系统是事件驱动的阈值触发总结（focus_complete/emotion_logged/note_created），需要增强为"四幕"叙事结构，每幕有独立的主题和内容。

- [ ] **Step 1: 查找幕僚对话视图文件位置**

Run: `findstr /sm "MirrorSelf" src/views/*.vue 2>nul || dir /b src\views\*Mirror* 2>nul`
Expected: 找到 MirrorSelf 视图文件路径

- [ ] **Step 2: 增强定音锤四幕结构**

在 `advisor.ts` 中补充四幕定义：

```typescript
// 定音锤四幕
const DINGYIN_ACTS = {
  act1: {
    id: 'act1',
    title: '第一幕·你做过的事',
    trigger: 'focus_complete',
    question: '在这段时间里，你完成了哪些值得记住的事？',
    narrative: (events: string[]) => `让我们回顾一下你完成的事：${events.join('、')}。每一个完成的锚点，都是时间河流中的一块踏脚石。`,
  },
  act2: {
    id: 'act2',
    title: '第二幕·你走过的路',
    trigger: 'emotion_logged',
    question: '这一路走来，你的情绪经历了怎样的起伏？',
    narrative: (emotions: string[]) => `你的情绪轨迹像一幅画：${emotions.join('、')}。每一种情绪都是你与世界对话的语言。`,
  },
  act3: {
    id: 'act3',
    title: '第三幕·你学会的',
    trigger: 'note_created',
    question: '这段旅程中，你学到了什么新东西？',
    narrative: (notes: string[]) => `你记录下了这些思考：${notes.join('、')}。每一个灵感都是你认知的延伸。`,
  },
  act4: {
    id: 'act4',
    title: '第四幕·你在成为的',
    trigger: 'comprehensive',
    question: '结合这些经历，你在成为什么样的人？',
    narrative: (summary: string) => `综合来看，${summary}。你正在成为你想成为的人，这个过程本身就是意义。`,
  },
}

// 增强 getDingyinHammer 返回四幕结构
function getDingyinHammerActs(): DingyinAct[] {
  const acts: DingyinAct[] = []
  for (const key of Object.keys(DINGYIN_ACTS)) {
    const act = DINGYIN_ACTS[key as keyof typeof DINGYIN_ACTS]
    // 检查触发条件是否满足
    const events = getEventsForTrigger(act.trigger)
    if (events.length > 0) {
      acts.push({
        ...act,
        narrative: typeof act.narrative === 'function' ? act.narrative(events) : act.narrative,
        events,
      })
    }
  }
  return acts
}
```

- [ ] **Step 3: 更新 MirrorSelf 视图，展示四幕**

在 MirrorSelf 视图中添加定音锤四幕展示区域：

```vue
<section class="dingyin-acts" v-if="dingyinActs.length > 0">
  <h2 class="dingyin-title">定音锤</h2>
  <p class="dingyin-subtitle">回顾你的足迹，每一幕都是一次沉淀</p>
  <div class="dingyin-act-list">
    <div
      v-for="act in dinyinActs"
      :key="act.id"
      class="dingyin-act-card"
      :class="act.id"
    >
      <div class="act-header">
        <span class="act-icon">{{ actIcons[act.id] }}</span>
        <h3 class="act-title">{{ act.title }}</h3>
      </div>
      <p class="act-question">{{ act.question }}</p>
      <p class="act-narrative">{{ act.narrative }}</p>
      <div class="act-events" v-if="act.events.length > 0">
        <span v-for="evt in act.events" :key="evt" class="act-event-tag">{{ evt }}</span>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 4: 运行测试验证**

Run: `cd project/frontend && npx vitest run src/stores/__tests__/advisor.test.ts -v 2>&1 | tail -20`
Expected: 所有测试通过

- [ ] **Step 5: TypeScript 检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: 零错误

---

### Task 6: A5-1 — 留光阁·专项规划区

**Files:**
- Modify: `src/views/LightPavilion.vue`
- Test: `src/views/__tests__/LightPavilion.test.ts`

**背景**：当前留光阁已有愿景→目标→计划三层结构，但缺少跨目标的专项规划能力。需要添加专项规划区，支持跨目标规划。

- [ ] **Step 1: 在 LightPavilion.vue 中添加专项规划区**

数据模型：

```typescript
interface SpecialPlan {
  id: string
  title: string
  description: string
  relatedGoalIds: string[]  // 关联的目标 ID
  milestones: { label: string; done: boolean }[]
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: 添加专项规划区 UI**

```vue
<section class="special-plan-section">
  <div class="section-label">
    专项规划区
    <button class="section-add-btn" @click="showSpecialPlanModal = true">+ 新建专项</button>
  </div>
  <div v-if="specialPlans.length === 0" class="special-plan-empty">
    <p>还没有跨目标规划，创建一个将多个目标串联起来</p>
  </div>
  <div v-else class="special-plan-list">
    <div v-for="plan in specialPlans" :key="plan.id" class="special-plan-card">
      <h4 class="plan-title">{{ plan.title }}</h4>
      <p class="plan-desc">{{ plan.description }}</p>
      <div class="plan-goals">
        <span v-for="goalId in plan.relatedGoalIds" :key="goalId" class="plan-goal-tag">
          {{ getGoalTitle(goalId) }}
        </span>
      </div>
      <div class="plan-milestones">
        <div v-for="(ms, i) in plan.milestones" :key="i" class="plan-milestone" :class="{ done: ms.done }">
          <span class="ms-check" @click="toggleMilestone(plan.id, i)">{{ ms.done ? '✓' : '○' }}</span>
          <span class="ms-label">{{ ms.label }}</span>
        </div>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: 运行测试验证**

Run: `cd project/frontend && npx vitest run src/views/__tests__/LightPavilion.test.ts -v 2>&1 | tail -20`
Expected: 所有测试通过

- [ ] **Step 4: TypeScript 检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: 零错误

---

### Task 7: A6-1 — 思绪书房·内容导入系统

**Files:**
- Modify: `src/views/KnowledgeTower.vue`
- Create: `src/components/ImportSourceModal.vue`
- Create: `src/modules/knowledge/importer.ts`
- Test: `src/views/__tests__/KnowledgeTower.test.ts`

**背景**：当前思绪书房（经略阁）仅有手动创建知识节点的能力，缺少外部内容导入。需要实现 4 种导入方式：书籍导入、聊天信笺、通话磁带、网页摘录。

- [ ] **Step 1: 创建导入模块**

```typescript
// src/modules/knowledge/importer.ts
export interface ImportSource {
  id: string
  type: 'book' | 'chat' | 'call' | 'web'
  title: string
  content: string
  sourceMeta?: Record<string, string>  // 来源元数据
  importedAt: string
}

export const IMPORT_SOURCE_TYPES = [
  { type: 'book', label: '书籍导入', icon: '📚', desc: '从外部书籍导入笔记和摘录' },
  { type: 'chat', label: '聊天信笺', icon: '✉️', desc: '关联 IM 聊天记录' },
  { type: 'call', label: '通话磁带', icon: '📻', desc: '关联通话记录' },
  { type: 'web', label: '网页摘录', icon: '🌐', desc: '从网页摘录笔记' },
] as const

export function createImportSource(data: Omit<ImportSource, 'id' | 'importedAt'>): ImportSource {
  return {
    ...data,
    id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    importedAt: new Date().toISOString(),
  }
}
```

- [ ] **Step 2: 创建导入弹窗组件**

```vue
<!-- src/components/ImportSourceModal.vue -->
<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2 class="modal-title">导入内容</h2>
      <div class="import-type-select">
        <button
          v-for="st in IMPORT_SOURCE_TYPES"
          :key="st.type"
          class="import-type-btn"
          :class="{ active: selectedType === st.type }"
          @click="selectedType = st.type"
        >
          <span class="import-type-icon">{{ st.icon }}</span>
          <span class="import-type-label">{{ st.label }}</span>
          <span class="import-type-desc">{{ st.desc }}</span>
        </button>
      </div>
      <div class="import-form">
        <input v-model="formTitle" class="import-input" placeholder="标题" />
        <textarea v-model="formContent" class="import-textarea" placeholder="内容…" rows="5"></textarea>
        <input v-if="selectedType === 'book'" v-model="formMeta.author" class="import-input" placeholder="作者" />
        <input v-if="selectedType === 'web'" v-model="formMeta.url" class="import-input" placeholder="网页链接" />
      </div>
      <div class="modal-actions">
        <button class="modal-btn secondary" @click="$emit('close')">取消</button>
        <button class="modal-btn primary" @click="handleImport" :disabled="!formTitle || !formContent">导入</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { IMPORT_SOURCE_TYPES, createImportSource } from '../modules/knowledge/importer'

const emit = defineEmits<{
  close: []
  import: [source: ReturnType<typeof createImportSource>]
}>()

const selectedType = ref<string>('book')
const formTitle = ref('')
const formContent = ref('')
const formMeta = reactive({ author: '', url: '' })

function handleImport() {
  const source = createImportSource({
    type: selectedType.value as any,
    title: formTitle.value,
    content: formContent.value,
    sourceMeta: { ...formMeta },
  })
  emit('import', source)
  formTitle.value = ''
  formContent.value = ''
  Object.assign(formMeta, { author: '', url: '' })
}
</script>

<style scoped>
.modal-overlay { /* 弹窗覆盖层样式 */ }
/* 其余样式遵循现有弹窗模式 */
</style>
```

- [ ] **Step 3: 在 KnowledgeTower 中添加导入入口和展示**

```vue
<!-- 在顶部操作栏添加导入按钮 -->
<div class="toolbar-actions">
  <button class="toolbar-btn" @click="showImportModal = true">📥 导入</button>
</div>

<!-- 导入源展示区 -->
<section class="import-sources" v-if="importSources.length > 0">
  <div class="section-label">导入内容 · {{ importSources.length }}</div>
  <div class="import-grid">
    <div v-for="src in importSources" :key="src.id" class="import-card" :class="`type-${src.type}`">
      <div class="import-card-header">
        <span class="import-type-icon">{{ typeIcon(src.type) }}</span>
        <span class="import-title">{{ src.title }}</span>
        <span class="import-date">{{ formatDate(src.importedAt) }}</span>
      </div>
      <p class="import-content">{{ src.content }}</p>
      <div class="import-meta" v-if="src.sourceMeta && Object.keys(src.sourceMeta).length > 0">
        <span v-for="(v, k) in src.sourceMeta" :key="k" class="import-meta-tag">{{ k }}: {{ v }}</span>
      </div>
    </div>
  </div>
</section>

<!-- 导入弹窗 -->
<ImportSourceModal v-if="showImportModal" @close="showImportModal = false" @import="addImportSource" />
```

- [ ] **Step 4: 运行测试验证**

Run: `cd project/frontend && npx vitest run src/views/__tests__/KnowledgeTower.test.ts -v 2>&1 | tail -20`
Expected: 所有测试通过

- [ ] **Step 5: TypeScript 检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: 零错误

---

### Task 8: 全量验证

**Files:** 无文件变更，仅运行验证命令

- [ ] **Step 1: 运行全量测试**

Run: `cd project/frontend && npx vitest run 2>&1 | tail -10`
Expected: 1963+ 测试全部通过，135+ 文件

- [ ] **Step 2: TypeScript 类型检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1`
Expected: 零错误

- [ ] **Step 3: 宪法合规测试**

Run: `cd project/frontend && npx vitest run src/engine/__tests__/constitution-compliance.test.ts -v 2>&1 | tail -20`
Expected: 20 项宪法合规测试全部通过

---

## 计划对照检查

| 规范要求 | 实现任务 | 覆盖 |
|---------|---------|------|
| A1: 环境→花朵状态联动 | Task 1 | ✅ |
| A2: 光丝串联可视化 | Task 2 | ✅ |
| A3: 治理台四页面板 | Task 3 | ✅ |
| A3: 安全台四令牌 | Task 4 | ✅ |
| A4: 定音锤四幕 | Task 5 | ✅ |
| A5: 专项规划区 | Task 6 | ✅ |
| A6: 内容导入系统 | Task 7 | ✅ |
| 全量验证 | Task 8 | ✅ |