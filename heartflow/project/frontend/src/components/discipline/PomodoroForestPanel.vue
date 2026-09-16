<template>
  <section class="pfp" aria-label="番茄树园">
    <div class="pfp-head">
      <span class="pfp-title">🌳 番茄树园</span>
      <span class="pfp-sub">专注种树 · 任务聚合 · 中断记录</span>
    </div>

    <!-- 树园概览 -->
    <div class="pfp-block">
      <span class="pfp-block-label">树园概览</span>
      <div class="pfp-stats">
        <div class="pfp-stat"><span class="pfp-stat-num">{{ overview.totalTrees }}</span><span class="pfp-stat-label">总树</span></div>
        <div class="pfp-stat"><span class="pfp-stat-num">{{ overview.growingTrees }}</span><span class="pfp-stat-label">成活</span></div>
        <div class="pfp-stat"><span class="pfp-stat-num">{{ overview.witheredTrees }}</span><span class="pfp-stat-label">枯萎</span></div>
        <div class="pfp-stat"><span class="pfp-stat-num">{{ overview.survivalRate }}%</span><span class="pfp-stat-label">成活率</span></div>
        <div class="pfp-stat"><span class="pfp-stat-num">{{ overview.todayTrees }}</span><span class="pfp-stat-label">今日</span></div>
      </div>
      <span class="pfp-meta">累计专注 {{ fmtMin(overview.totalFocusMs) }} · 今日 {{ fmtMin(overview.todayFocusMs) }} · 最佳品种 {{ speciesLabel(overview.bestSpecies) }}</span>
    </div>

    <!-- 7 日趋势 -->
    <div class="pfp-block">
      <span class="pfp-block-label">7 日专注趋势</span>
      <div v-if="trend.length" class="pfp-trend">
        <div v-for="t in trend" :key="t.date" class="pfp-trend-col">
          <div class="pfp-trend-bar-wrap">
            <div class="pfp-trend-bar" :style="{ height: trendPct(t.focusMs) + '%' }" :title="fmtMin(t.focusMs)"></div>
          </div>
          <span class="pfp-trend-label">{{ t.date.slice(5).replace('-', '/') }}</span>
        </div>
      </div>
      <p v-else class="pfp-empty">暂无专注记录，完成一次专注后树园会开始生长。</p>
    </div>

    <!-- 树园列表 -->
    <div class="pfp-block">
      <span class="pfp-block-label">树园 · 最近 {{ trees.slice(0, 8).length }} 棵</span>
      <div v-if="trees.length" class="pfp-tree-list">
        <div v-for="t in trees.slice(0, 8)" :key="t.id" class="pfp-tree" :class="{ withered: t.status === 'withered' }">
          <span class="pfp-tree-icon">{{ speciesIcon(t.species) }}</span>
          <div class="pfp-tree-body">
            <strong class="pfp-tree-name">{{ speciesLabel(t.species) }}</strong>
            <span class="pfp-tree-meta">{{ fmtMin(t.focusMs) }} · {{ fmtDate(t.plantedAt) }}</span>
          </div>
          <span class="pfp-tree-status">{{ t.status === 'growing' ? '🌱 成活' : '🥀 枯萎' }}</span>
        </div>
      </div>
      <p v-else class="pfp-empty">还没有种下第一棵树。</p>
    </div>

    <!-- 任务专注聚合 -->
    <div class="pfp-block">
      <span class="pfp-block-label">任务专注投入</span>
      <div v-if="taskRows.length" class="pfp-task-list">
        <div v-for="r in taskRows.slice(0, 6)" :key="r.taskId" class="pfp-task">
          <span class="pfp-task-title">{{ r.taskTitle }}</span>
          <span class="pfp-task-count">{{ r.focusCount }} 次</span>
          <span class="pfp-task-min">{{ fmtMin(r.focusMs) }}</span>
        </div>
      </div>
      <p v-else class="pfp-empty">暂无与任务绑定的专注记录。</p>
    </div>

    <!-- 中断记录 -->
    <div class="pfp-block">
      <span class="pfp-block-label">中断记录 · {{ interruptions.length }}</span>
      <div v-if="interruptions.length" class="pfp-intr-stats">
        <span class="pfp-intr-chip">今日 {{ intrStats.today }} 次</span>
        <span v-if="intrStats.mostCommon !== 'none'" class="pfp-intr-chip">
          最常见 {{ categoryMeta(intrStats.mostCommon).icon }} {{ categoryMeta(intrStats.mostCommon).label }}
        </span>
        <span class="pfp-intr-chip">平均坚持 {{ fmtMin(intrStats.avgFocusMs) }}</span>
      </div>
      <div class="pfp-intr-row">
        <input v-model="intrReason" class="pfp-input" placeholder="中断原因…" />
        <select v-model="intrCategory" class="pfp-select">
          <option v-for="c in INTERRUPTION_CATEGORIES" :key="c" :value="c">{{ INTERRUPTION_CATEGORY_META[c].icon }} {{ INTERRUPTION_CATEGORY_META[c].label }}</option>
        </select>
        <button class="pfp-btn" @click="recordIntr">记录</button>
      </div>
      <div v-if="interruptions.length" class="pfp-intr-list">
        <div v-for="r in interruptions.slice(0, 6)" :key="r.id" class="pfp-intr">
          <span class="pfp-intr-icon">{{ INTERRUPTION_CATEGORY_META[r.category].icon }}</span>
          <span class="pfp-intr-text">{{ r.reason || INTERRUPTION_CATEGORY_META[r.category].label }}</span>
          <span class="pfp-intr-date">{{ fmtDate(r.occurredAt) }}</span>
          <button class="pfp-del" @click="removeIntr(r.id)">×</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePomodoroForest } from '../../modules/discipline/pomodoro-forest'
import {
  buildForest,
  forestOverview,
  forestDailyTrend,
  taskFocusRows,
  interruptionStats,
  TREE_SPECIES_META,
  INTERRUPTION_CATEGORY_META,
  INTERRUPTION_CATEGORIES,
} from '../../modules/discipline/pomodoro-forest'
import type { InterruptionCategory } from '../../modules/discipline/pomodoro-forest'
import { getAllSessions } from '../../modules/timer'
import { useTaskManager } from '../../modules/tasks'

const forest = usePomodoroForest()
const taskManager = useTaskManager()

const intrReason = ref('')
const intrCategory = ref<InterruptionCategory>('distraction')

const interruptions = computed(() => forest.interruptions.value)
const intrStats = computed(() => interruptionStats(interruptions.value))

const trees = computed(() => buildForest(getAllSessions()))
const overview = computed(() => forestOverview(trees.value))
const trend = computed(() => forestDailyTrend(trees.value, 7))
const taskRows = computed(() =>
  taskFocusRows(trees.value, taskManager.tasks.value.map(t => ({ id: t.id, title: t.title })))
)

function speciesLabel(s: string): string {
  return TREE_SPECIES_META[s as keyof typeof TREE_SPECIES_META]?.label ?? s
}
function speciesIcon(s: string): string {
  return TREE_SPECIES_META[s as keyof typeof TREE_SPECIES_META]?.icon ?? '🌰'
}
function categoryMeta(cat: string) {
  return INTERRUPTION_CATEGORY_META[cat as InterruptionCategory] ?? INTERRUPTION_CATEGORY_META.other
}
function trendPct(ms: number): number {
  const max = Math.max(...trend.value.map(t => t.focusMs), 1)
  return Math.round((ms / max) * 100)
}
function fmtMin(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)} 秒`
  return `${Math.round(ms / 60000)} 分钟`
}
function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function recordIntr() {
  if (!intrReason.value.trim()) return
  forest.recordInterruption({
    sessionId: `manual_${Date.now()}`,
    reason: intrReason.value.trim(),
    category: intrCategory.value,
    focusMs: 0,
  })
  intrReason.value = ''
}
function removeIntr(id: string) {
  forest.removeInterruption(id)
}

onMounted(() => {
  forest.load()
  taskManager.load()
})
</script>

<style scoped>
.pfp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 14px;
  background: var(--card-bg, rgba(20, 18, 15, 0.6));
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.1);
}
.pfp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pfp-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--accent, #d4a574);
}
.pfp-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.45);
}
.pfp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.04);
}
.pfp-block-label {
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.55);
}
.pfp-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.pfp-stat {
  text-align: center;
  padding: 8px 4px;
  border-radius: 8px;
  background: var(--card-bg, rgba(20, 18, 15, 0.6));
}
.pfp-stat-num {
  display: block;
  font-size: 18px;
  font-weight: 500;
  color: var(--accent, #d4a574);
}
.pfp-stat-label {
  font-size: 10px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.4);
}
.pfp-meta {
  font-size: 11px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.4);
}
.pfp-trend {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 90px;
}
.pfp-trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.pfp-trend-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.pfp-trend-bar {
  width: 60%;
  max-width: 22px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, rgba(var(--accent-rgb, 212, 165, 116), 0.7), rgba(var(--accent-rgb, 212, 165, 116), 0.25));
  min-height: 2px;
}
.pfp-trend-label {
  font-size: 9px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.35);
  margin-top: 4px;
}
.pfp-tree-list, .pfp-task-list, .pfp-intr-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pfp-tree, .pfp-task, .pfp-intr {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--card-bg, rgba(20, 18, 15, 0.6));
}
.pfp-tree.withered {
  opacity: 0.6;
}
.pfp-tree-icon {
  font-size: 18px;
  flex-shrink: 0;
}
.pfp-tree-body {
  flex: 1;
  min-width: 0;
}
.pfp-tree-name {
  display: block;
  font-size: 13px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.85);
}
.pfp-tree-meta {
  font-size: 11px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.35);
}
.pfp-tree-status {
  font-size: 11px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.5);
  flex-shrink: 0;
}
.pfp-task-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.8);
}
.pfp-task-count {
  font-size: 11px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.4);
}
.pfp-task-min {
  font-size: 12px;
  color: var(--accent, #d4a574);
  flex-shrink: 0;
}
.pfp-intr-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pfp-intr-chip {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.08);
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.6);
}
.pfp-intr-row {
  display: flex;
  gap: 6px;
}
.pfp-input {
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.12);
  border-radius: 8px;
  background: var(--bg-card, rgba(13, 11, 9, 0.6));
  color: var(--accent, #d4a574);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.pfp-input::placeholder {
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.2);
}
.pfp-input:focus {
  border-color: rgba(var(--accent-rgb, 212, 165, 116), 0.3);
}
.pfp-select {
  padding: 7px 8px;
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.12);
  border-radius: 8px;
  background: var(--bg-card, rgba(13, 11, 9, 0.6));
  color: var(--accent, #d4a574);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}
.pfp-btn {
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.25);
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.1);
  color: var(--accent, #d4a574);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.pfp-btn:hover {
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.18);
  border-color: rgba(var(--accent-rgb, 212, 165, 116), 0.35);
}
.pfp-intr-icon {
  font-size: 14px;
  flex-shrink: 0;
}
.pfp-intr-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.75);
}
.pfp-intr-date {
  font-size: 10px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.3);
  flex-shrink: 0;
}
.pfp-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.2);
  cursor: pointer;
  font-size: 12px;
  flex-shrink: 0;

  min-height: 24px;
  min-width: 24px;
}
.pfp-del:hover {
  color: var(--accent, #d4a574);
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.1);
}
.pfp-empty {
  font-size: 12px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.3);
}
</style>
