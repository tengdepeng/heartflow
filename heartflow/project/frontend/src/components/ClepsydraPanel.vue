<template>
  <section class="clp" aria-label="更漏工作光仪">
    <div class="clp-head">
      <span class="clp-title">⏳ 工作光仪</span>
      <span class="clp-sub">手动计时 · 分类组织 · 光仪编织 · 时间哨塔</span>
    </div>

    <!-- 光仪状态 -->
    <div class="clp-block">
      <span class="clp-block-label">光仪聚集</span>
      <div class="clp-state">
        <div class="clp-state-ring" :style="ringStyle">
          <span class="clp-state-core">{{ running ? '⏸' : '▶' }}</span>
        </div>
        <div class="clp-state-meta">
          <div class="clp-state-row">
            <span class="clp-state-name">光丝密度</span>
            <span class="clp-state-val">{{ Math.round(state.threadDensity * 100) }}%</span>
          </div>
          <div class="clp-state-row">
            <span class="clp-state-name">主导色相</span>
            <span class="clp-state-val">{{ dominantLabel }}</span>
          </div>
          <div class="clp-state-row">
            <span class="clp-state-name">旋转速度</span>
            <span class="clp-state-val">{{ Math.round(state.rotationSpeed * 100) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 工作计时 -->
    <div class="clp-block">
      <span class="clp-block-label">工作计时</span>
      <div v-if="running" class="clp-running">
        <span class="clp-running-icon">{{ WORK_CATEGORY_META[running.category].icon }}</span>
        <div class="clp-running-body">
          <strong class="clp-running-name">{{ WORK_CATEGORY_META[running.category].label }} · {{ intensityLabel(running.intensity) }}</strong>
          <span class="clp-running-time">{{ fmtClock(runningStartedAt) }}</span>
        </div>
        <button type="button" class="clp-btn clp-btn--stop" @click="stop">⏹ 结束</button>
      </div>
      <div v-else class="clp-start">
        <select v-model="startCategory" class="clp-select">
          <option v-for="c in categoryOptions" :key="c.key" :value="c.key">{{ c.icon }} {{ c.label }}</option>
        </select>
        <button type="button" class="clp-btn clp-btn--primary" @click="start">▶ 开始计时</button>
      </div>
    </div>

    <!-- 今日 / 本周汇总 -->
    <div class="clp-block">
      <div class="clp-tabs">
        <button
          v-for="m in summaryModes"
          :key="m.key"
          type="button"
          class="clp-tab"
          :class="{ active: summaryMode === m.key }"
          @click="summaryMode = m.key"
        >
          {{ m.label }}
        </button>
      </div>
      <div class="clp-summary">
        <div class="clp-summary-stat">
          <span class="clp-summary-val">{{ formatSeconds(summary.totalSeconds) }}</span>
          <span class="clp-summary-label">总时长</span>
        </div>
        <div class="clp-summary-stat">
          <span class="clp-summary-val">{{ summary.count }}</span>
          <span class="clp-summary-label">记录数</span>
        </div>
        <div class="clp-summary-stat">
          <span class="clp-summary-val">{{ formatSeconds(summary.avgSeconds) }}</span>
          <span class="clp-summary-label">平均单条</span>
        </div>
      </div>
      <div class="clp-bars">
        <div v-for="c in categoryOptions" :key="c.key" class="clp-bar-row">
          <span class="clp-bar-name">{{ c.icon }} {{ c.label }}</span>
          <div class="clp-bar-track">
            <i class="clp-bar-fill" :style="{ width: barWidth(c.key) + '%', background: c.color }" />
          </div>
          <span class="clp-bar-val">{{ formatSeconds(summary.byCategory[c.key]) }}</span>
        </div>
      </div>
    </div>

    <!-- 时间哨塔（倒计时） -->
    <div class="clp-block">
      <span class="clp-block-label">时间哨塔 · {{ timers.length }}</span>
      <div class="clp-countdown-add">
        <input v-model="cdLabel" class="clp-input" placeholder="名称（如：番茄专注）" />
        <select v-model="cdCategory" class="clp-select">
          <option v-for="c in categoryOptions" :key="c.key" :value="c.key">{{ c.icon }} {{ c.label }}</option>
        </select>
        <input v-model.number="cdSeconds" type="number" min="1" class="clp-input clp-input--num" placeholder="秒数" />
        <select v-model="cdRepeat" class="clp-select">
          <option v-for="(m, k) in COUNTDOWN_REPEAT_META" :key="k" :value="k">{{ m.icon }} {{ m.label }}</option>
        </select>
        <button type="button" class="clp-btn clp-btn--primary" :disabled="!cdLabel.trim() || cdSeconds < 1" @click="addCountdown">添加</button>
      </div>
      <div v-if="timers.length" class="clp-cd-list">
        <div v-for="t in timers" :key="t.id" class="clp-cd" :class="`clp-cd--${t.status}`">
          <span class="clp-cd-icon">{{ WORK_CATEGORY_META[t.category].icon }}</span>
          <div class="clp-cd-body">
            <div class="clp-cd-head">
              <strong class="clp-cd-name">{{ t.label }}</strong>
              <span class="clp-cd-status">{{ countdownStatusLabel(t.status) }}</span>
            </div>
            <span class="clp-cd-time">{{ fmtCountdown(t) }}</span>
            <span class="clp-cd-meta">{{ countdownRepeatLabel(t.repeat) }} · {{ formatSeconds(t.totalSeconds) }}</span>
          </div>
          <div class="clp-cd-actions">
            <button v-if="t.status === 'idle' || t.status === 'paused'" type="button" class="clp-btn" @click="cdStart(t.id)">▶</button>
            <button v-else-if="t.status === 'running'" type="button" class="clp-btn" @click="cdPause(t.id)">⏸</button>
            <button v-if="t.status !== 'idle'" type="button" class="clp-btn" @click="cdReset(t.id)">↺</button>
            <button type="button" class="clp-btn clp-btn--danger" @click="cdRemove(t.id)">✕</button>
          </div>
        </div>
      </div>
      <p v-else class="clp-empty">还没有倒计时。添加一个哨塔，到点静默转为工作记录。</p>
    </div>

    <!-- 记录列表 -->
    <div class="clp-block">
      <span class="clp-block-label">记录 · {{ records.length }}</span>
      <div v-if="records.length" class="clp-records">
        <div v-for="g in recordsByDate" :key="g.date" class="clp-date-group">
          <span class="clp-date-label">{{ g.date }}</span>
          <div v-for="r in g.items" :key="r.id" class="clp-record">
            <span class="clp-record-icon">{{ WORK_CATEGORY_META[r.category].icon }}</span>
            <div class="clp-record-body">
              <div class="clp-record-head">
                <strong class="clp-record-name">{{ WORK_CATEGORY_META[r.category].label }}</strong>
                <span class="clp-record-meta">{{ intensityLabel(r.intensity) }} · {{ formatSeconds(r.durationSeconds) }}</span>
              </div>
              <span v-if="r.note" class="clp-record-note">{{ r.note }}</span>
            </div>
            <button type="button" class="clp-btn clp-btn--danger" @click="removeRecord(r.id)">✕</button>
          </div>
        </div>
      </div>
      <p v-else class="clp-empty">暂无工作记录。开始一段计时，光仪将随之聚集。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  useClepsydra,
  useClepsydraCountdown,
  WORK_CATEGORY_META,
  intensityLabel,
  formatSeconds,
  COUNTDOWN_REPEAT_META,
  countdownStatusLabel,
  countdownRepeatLabel,
  countdownRemaining,
} from '../modules/clepsydra'
import type { WorkCategory, CountdownRepeat, CountdownTimer } from '../modules/clepsydra'

const clepsydra = useClepsydra()
const countdown = useClepsydraCountdown()

const records = computed(() => clepsydra.records.value)
const running = computed(() => clepsydra.running.value)
const timers = computed(() => countdown.timers.value)

const summaryMode = ref<'day' | 'week'>('day')
const now = ref(new Date())

const summary = computed(() => clepsydra.summary(summaryMode.value, now.value))
const state = computed(() => clepsydra.state(now.value))
const recordsByDate = computed(() => clepsydra.recordsByDate())

const categoryOptions = (Object.keys(WORK_CATEGORY_META) as WorkCategory[]).map(k => ({
  key: k,
  label: WORK_CATEGORY_META[k].label,
  icon: WORK_CATEGORY_META[k].icon,
  color: WORK_CATEGORY_META[k].color,
}))

const summaryModes = [
  { key: 'day' as const, label: '今日' },
  { key: 'week' as const, label: '本周' },
]

const dominantLabel = computed(() => {
  const order: WorkCategory[] = ['project', 'daily', 'study', 'create', 'custom']
  const maxIdx = state.value.balanceIndex.reduce(
    (best, v, i) => (v > best.v ? { v, i } : best),
    { v: -1, i: 0 },
  ).i
  return WORK_CATEGORY_META[order[maxIdx]].label
})

const ringStyle = computed(() => ({
  background: `conic-gradient(hsl(${state.value.dominantHue} 60% 60%) ${Math.round(state.value.threadDensity * 360)}deg, rgba(var(--accent-rgb), 0.08) 0deg)`,
  animation: `clp-spin ${Math.round(20 - state.value.rotationSpeed * 12)}s linear infinite`,
  // 提升为独立合成层：conic-gradient 只在首帧绘制，后续旋转由 GPU 变换纹理，
  // 避免每帧重绘渐变（移动端 WebView 上表现为闪烁）。
  willChange: 'transform',
}))

function barWidth(key: WorkCategory): number {
  const total = summary.value.totalSeconds
  if (total <= 0) return 0
  return Math.round((summary.value.byCategory[key] / total) * 100)
}

// ---- 工作计时 ----
const startCategory = ref<WorkCategory>('project')
const runningStartedAt = ref(new Date())

function start() {
  clepsydra.startTimer({ category: startCategory.value })
  runningStartedAt.value = new Date()
}

function stop() {
  clepsydra.stopTimer()
}

function fmtClock(d: Date): string {
  const diff = Math.max(0, Math.floor((now.value.getTime() - d.getTime()) / 1000))
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ---- 倒计时 ----
const cdLabel = ref('')
const cdCategory = ref<WorkCategory>('project')
const cdSeconds = ref(1500)
const cdRepeat = ref<CountdownRepeat>('once')

function addCountdown() {
  countdown.add({
    label: cdLabel.value.trim(),
    category: cdCategory.value,
    totalSeconds: cdSeconds.value,
    repeat: cdRepeat.value,
  })
  cdLabel.value = ''
}

function cdStart(id: string) { countdown.start(id, now.value) }
function cdPause(id: string) { countdown.pause(id, now.value) }
function cdReset(id: string) { countdown.reset(id) }
function cdRemove(id: string) { countdown.remove(id) }

function fmtCountdown(t: CountdownTimer): string {
  const s = countdownRemaining(t, now.value)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function removeRecord(id: string) {
  clepsydra.removeRecord(id)
}

// ---- 每秒推进 ----
let timer: ReturnType<typeof setInterval> | null = null
timer = setInterval(() => {
  now.value = new Date()
  countdown.tickAll(now.value)
}, 1000)

watch(running, (r) => {
  if (r) runningStartedAt.value = new Date(r.startedAt)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.clp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.clp-head { display: flex; flex-direction: column; gap: 2px; }
.clp-title { font-size: 16px; font-weight: 600; letter-spacing: 1px; color: var(--text-primary); }
.clp-sub { font-size: 11px; color: var(--text-secondary); }
.clp-block { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }
.clp-block-label { font-size: 11px; letter-spacing: 1px; color: var(--text-secondary); }

.clp-state { display: flex; align-items: center; gap: 16px; }
.clp-state-ring {
  width: 72px; height: 72px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  box-shadow: 0 0 18px rgba(var(--accent-rgb), 0.12);
}
.clp-state-core { font-size: 20px; }
.clp-state-meta { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.clp-state-row { display: flex; justify-content: space-between; font-size: 12px; }
.clp-state-name { color: var(--text-secondary); }
.clp-state-val { color: var(--text-primary); font-variant-numeric: tabular-nums; }

.clp-running, .clp-start { display: flex; align-items: center; gap: 10px; }
.clp-running {
  padding: 10px 12px; border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
}
.clp-running-icon { font-size: 22px; }
.clp-running-body { flex: 1; display: flex; flex-direction: column; }
.clp-running-name { font-size: 13px; }
.clp-running-time { font-size: 18px; font-variant-numeric: tabular-nums; color: var(--accent); }
.clp-start { gap: 8px; }

.clp-tabs { display: flex; gap: 6px; }
.clp-tab {
  padding: 5px 14px; border-radius: 999px; font-size: 12px; cursor: pointer;
  border: 1px solid rgba(var(--accent-rgb), 0.1); background: transparent; color: var(--text-secondary);
}
.clp-tab.active { background: rgba(var(--accent-rgb), 0.14); color: var(--accent); border-color: rgba(var(--accent-rgb), 0.3); }

.clp-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.clp-summary-stat {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 6px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05);
}
.clp-summary-val { font-size: 15px; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.clp-summary-label { font-size: 10px; color: var(--text-secondary); }

.clp-bars { display: flex; flex-direction: column; gap: 6px; }
.clp-bar-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.clp-bar-name { width: 64px; flex-shrink: 0; color: var(--text-secondary); }
.clp-bar-track { flex: 1; height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.05); overflow: hidden; }
.clp-bar-fill { display: block; height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.clp-bar-val { width: 52px; text-align: right; color: var(--text-primary); font-variant-numeric: tabular-nums; }

.clp-countdown-add { display: flex; gap: 6px; flex-wrap: wrap; }
.clp-input, .clp-select {
  padding: 8px 10px; border-radius: 8px; font-size: 12px; color: var(--text-primary);
  border: 1px solid rgba(var(--accent-rgb), 0.12); background: rgba(255, 255, 255, 0.04); outline: none;
}
.clp-input { flex: 1; min-width: 120px; }
.clp-input--num { flex: 0 0 90px; }
.clp-select { flex: 0 0 auto; cursor: pointer; }

.clp-cd-list { display: flex; flex-direction: column; gap: 8px; }
.clp-cd {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-radius: 12px; background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.clp-cd--running { border-color: rgba(var(--accent-rgb), 0.25); background: rgba(var(--accent-rgb), 0.05); }
.clp-cd--done { opacity: 0.6; }
.clp-cd-icon { font-size: 20px; }
.clp-cd-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.clp-cd-head { display: flex; align-items: center; gap: 8px; }
.clp-cd-name { font-size: 13px; }
.clp-cd-status { font-size: 10px; padding: 1px 8px; border-radius: 999px; background: rgba(var(--accent-rgb), 0.1); color: var(--accent); }
.clp-cd-time { font-size: 16px; font-variant-numeric: tabular-nums; }
.clp-cd-meta { font-size: 10px; color: var(--text-secondary); }
.clp-cd-actions { display: flex; gap: 4px; }

.clp-btn {
  padding: 6px 12px; border-radius: 8px; font-size: 12px; cursor: pointer;
  border: 1px solid rgba(var(--accent-rgb), 0.15); background: rgba(255, 255, 255, 0.04); color: var(--text-secondary);
}
.clp-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.12); color: var(--text-primary); }
.clp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.clp-btn--primary { background: rgba(var(--accent-rgb), 0.14); color: var(--accent); border-color: rgba(var(--accent-rgb), 0.3); }
.clp-btn--stop { color: #c46a5a; border-color: rgba(196, 106, 90, 0.3); }
.clp-btn--danger { color: #c46a5a; border-color: rgba(196, 106, 90, 0.2); }

.clp-records { display: flex; flex-direction: column; gap: 10px; }
.clp-date-group { display: flex; flex-direction: column; gap: 6px; }
.clp-date-label { font-size: 11px; color: var(--text-secondary); letter-spacing: 1px; }
.clp-record {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  border-radius: 10px; background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.clp-record-icon { font-size: 16px; }
.clp-record-body { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.clp-record-head { display: flex; align-items: center; gap: 8px; }
.clp-record-name { font-size: 12px; }
.clp-record-meta { font-size: 10px; color: var(--text-secondary); }
.clp-record-note { font-size: 11px; color: var(--text-secondary); }

.clp-empty { font-size: 12px; color: var(--text-secondary); text-align: center; padding: 12px 0; }

@keyframes clp-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
