<template>
  <section class="hgp" aria-label="健康目标">
    <div class="hgp-head">
      <div class="hgp-title-wrap">
        <span class="hgp-title">健康目标</span>
        <span class="hgp-sub">立目标 · 追进度 · 看达成</span>
      </div>
      <span class="hgp-count">{{ goals.length }} 个目标</span>
    </div>

    <div class="hgp-stats">
      <div class="hgp-stat"><b>{{ activeGoals.length }}</b><span>进行中</span></div>
      <div class="hgp-stat"><b>{{ achievedGoals.length }}</b><span>已达成</span></div>
      <div class="hgp-stat"><b>{{ pausedGoals.length }}</b><span>已暂停</span></div>
      <div class="hgp-stat"><b>{{ avgProgress }}%</b><span>平均进度</span></div>
    </div>

    <!-- 新建目标 -->
    <form class="hgp-form" @submit.prevent="submitGoal">
      <div class="hgp-form-head">
        <span class="hgp-block-label">立目标</span>
        <button type="button" class="hgp-toggle" @click="showForm = !showForm">
          {{ showForm ? '收起' : '展开' }}
        </button>
      </div>
      <template v-if="showForm">
        <div class="hgp-form-row">
          <select v-model="goalForm.type" class="hgp-select">
            <option v-for="(m, k) in METRIC_META" :key="k" :value="k">{{ m.icon }} {{ m.label }}</option>
          </select>
          <input v-model="goalForm.name" type="text" class="hgp-input" placeholder="目标名称" />
          <input v-model.number="goalForm.targetValue" type="number" min="1" class="hgp-input hgp-input--num" placeholder="目标值" />
          <span class="hgp-unit">{{ METRIC_META[goalForm.type].unit }}</span>
        </div>
        <div class="hgp-form-row">
          <input v-model="goalForm.targetDate" type="date" class="hgp-input" />
          <select v-model="goalForm.priority" class="hgp-select">
            <option v-for="(m, k) in PRIORITY_META" :key="k" :value="k">{{ m }}</option>
          </select>
          <select v-model="goalForm.reminderFrequency" class="hgp-select">
            <option v-for="(m, k) in FREQ_META" :key="k" :value="k">{{ m }}</option>
          </select>
          <button type="submit" class="hgp-btn" :disabled="!goalForm.name.trim() || !goalForm.targetValue">设定目标</button>
        </div>
      </template>
    </form>

    <!-- 状态筛选 -->
    <div v-if="goals.length" class="hgp-tabs" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        class="hgp-tab"
        :class="{ 'is-active': tab === t.key }"
        role="tab"
        :aria-selected="tab === t.key"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 目标列表 -->
    <p v-if="!goals.length" class="hgp-empty">还没有健康目标，从上方立一个吧。</p>
    <p v-else-if="!filteredGoals.length" class="hgp-empty">这个状态下还没有目标。</p>
    <template v-else>
      <div v-for="g in filteredGoals" :key="g.id" class="hgp-goal">
        <div class="hgp-goal-head">
          <span class="hgp-goal-icon">{{ METRIC_META[g.type]?.icon }}</span>
          <div class="hgp-goal-main">
            <b class="hgp-goal-name">{{ g.name }}</b>
            <span class="hgp-goal-meta">{{ METRIC_META[g.type]?.label }} · 目标日 {{ fmt(g.targetDate) }}</span>
          </div>
          <span class="hgp-goal-status" :style="{ color: STATUS_META[g.status].color }">{{ STATUS_META[g.status].label }}</span>
        </div>
        <div class="hgp-goal-bar"><i :style="{ width: Math.round(g.progress * 100) + '%' }"></i></div>
        <div class="hgp-goal-foot">
          <span class="hgp-goal-progress">{{ g.currentValue }}/{{ g.targetValue }} {{ g.unit }} · {{ Math.round(g.progress * 100) }}%</span>
          <div class="hgp-goal-actions">
            <input v-model.number="progressInputs[g.id]" type="number" min="0" class="hgp-input hgp-input--num" placeholder="当前值" />
            <button type="button" class="hgp-btn hgp-btn--sm" @click="updateGoal(g.id)">更新</button>
            <button type="button" class="hgp-btn hgp-btn--sm" @click="syncFromMetrics(g.id)">同步</button>
            <button type="button" class="hgp-btn hgp-btn--sm" @click="toggleGoal(g.id)">
              {{ g.status === 'active' ? '暂停' : '恢复' }}
            </button>
            <button type="button" class="hgp-btn hgp-btn--sm hgp-btn--danger" @click="removeGoal(g.id)">删除</button>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useHealthGoals, useBodyGreenhouse, BODY_METRIC_META } from '../modules/body'
import type { BodyMetricType } from '../modules/body'

const TABS = [
  { key: 'active', label: '进行中' },
  { key: 'achieved', label: '已达成' },
  { key: 'paused', label: '已暂停' },
] as const

type TabKey = (typeof TABS)[number]['key']
const tab = ref<TabKey>('active')

const METRIC_META = BODY_METRIC_META

const PRIORITY_META: Record<string, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
}

const FREQ_META: Record<string, string> = {
  daily: '每日提醒',
  weekly: '每周提醒',
  none: '不提醒',
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  active: { label: '进行中', color: '#6b9fc4' },
  achieved: { label: '已达成', color: '#8a9a7a' },
  failed: { label: '未达成', color: '#c46a5a' },
  paused: { label: '已暂停', color: '#a07c8c' },
}

const goalsStore = useHealthGoals()
const greenhouse = useBodyGreenhouse()

const goals = computed(() => goalsStore.goals.value)
const metrics = computed(() => greenhouse.metrics.value)
const activeGoals = computed(() => goalsStore.getActiveGoals())
const achievedGoals = computed(() => goalsStore.getAchievedGoals())
const pausedGoals = computed(() => goals.value.filter(g => g.status === 'paused'))

const avgProgress = computed(() => {
  const list = goals.value
  if (!list.length) return 0
  return Math.round((list.reduce((s, g) => s + g.progress, 0) / list.length) * 100)
})

const filteredGoals = computed(() => {
  if (tab.value === 'achieved') return achievedGoals.value
  if (tab.value === 'paused') return pausedGoals.value
  return activeGoals.value
})

const showForm = ref(false)
const goalForm = reactive({
  type: 'sleep' as BodyMetricType,
  name: '',
  targetValue: 8,
  targetDate: '',
  priority: 'medium' as 'high' | 'medium' | 'low',
  reminderFrequency: 'daily' as 'daily' | 'weekly' | 'none',
})

const progressInputs = reactive<Record<string, number | undefined>>({})

function submitGoal() {
  if (!goalForm.name.trim() || !goalForm.targetValue) return
  const targetDate = goalForm.targetDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  goalsStore.createGoal(
    goalForm.type,
    goalForm.name.trim(),
    goalForm.targetValue,
    METRIC_META[goalForm.type].unit,
    targetDate,
    goalForm.priority,
    goalForm.reminderFrequency,
  )
  goalForm.name = ''
  goalForm.targetValue = METRIC_META[goalForm.type].target || 8
  goalForm.targetDate = ''
}

function updateGoal(goalId: string) {
  const v = progressInputs[goalId]
  if (v === undefined || v === null || Number.isNaN(v)) return
  goalsStore.updateProgress(goalId, v)
  progressInputs[goalId] = undefined
}

function syncFromMetrics(goalId: string) {
  const goal = goals.value.find(g => g.id === goalId)
  if (!goal) return
  const latest = [...metrics.value]
    .filter(m => m.type === goal.type)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
  if (latest) goalsStore.updateProgress(goalId, latest.value)
}

function toggleGoal(goalId: string) {
  const goal = goals.value.find(g => g.id === goalId)
  if (!goal) return
  if (goal.status === 'active') goalsStore.pauseGoal(goalId)
  else goalsStore.resumeGoal(goalId)
}

function removeGoal(goalId: string) {
  goalsStore.removeGoal(goalId)
}

function fmt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return '今天'
  if (diff < 172800000) return '明天'
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.hgp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
}

.hgp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.hgp-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hgp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}
.hgp-sub {
  font-size: 11px;
  color: var(--text-secondary);
}
.hgp-count {
  flex-shrink: 0;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.hgp-stats {
  display: flex;
  gap: 8px;
}
.hgp-stat {
  flex: 1;
  text-align: center;
  padding: 10px 4px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
}
.hgp-stat b {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.3;
}
.hgp-stat span {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}

.hgp-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
}
.hgp-form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hgp-block-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}
.hgp-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-secondary);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;

  min-height: 26px;
}
.hgp-toggle:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.3);
}
.hgp-form-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.hgp-input {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.hgp-input:focus {
  border-color: rgba(var(--accent-rgb), 0.4);
}
.hgp-input::placeholder {
  color: var(--text-faint);
}
.hgp-input--num {
  flex: 0 0 80px;
}
.hgp-select {
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}
.hgp-unit {
  font-size: 11px;
  color: var(--text-muted);
  align-self: center;
}
.hgp-btn {
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.hgp-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.45);
}
.hgp-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.hgp-btn--sm {
  padding: 4px 10px;
  font-size: 11px;
}
.hgp-btn--danger {
  border-color: rgba(196, 106, 90, 0.3);
  color: #c46a5a;
  background: rgba(196, 106, 90, 0.08);
}

.hgp-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
}
.hgp-tab {
  flex: 1;
  padding: 6px 4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.hgp-tab:hover {
  color: var(--text-primary);
}
.hgp-tab.is-active {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  font-weight: 500;
}

.hgp-empty {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 24px 0;
}

.hgp-goal {
  padding: 12px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
}
.hgp-goal-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.hgp-goal-icon {
  font-size: 18px;
}
.hgp-goal-main {
  flex: 1;
  min-width: 0;
}
.hgp-goal-name {
  display: block;
  font-size: 13px;
  color: var(--text-primary);
}
.hgp-goal-meta {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}
.hgp-goal-status {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 8px;
  background: var(--card-bg);
  white-space: nowrap;
}
.hgp-goal-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--card-bg);
  overflow: hidden;
  margin-bottom: 8px;
}
.hgp-goal-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--accent);
  transition: width 0.4s ease;
}
.hgp-goal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.hgp-goal-progress {
  font-size: 11px;
  color: var(--text-secondary);
}
.hgp-goal-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
</style>
