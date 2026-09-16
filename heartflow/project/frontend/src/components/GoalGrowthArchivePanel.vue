<template>
  <section class="ggap-panel" aria-label="目标生长进度档案">
    <!-- 面板头 -->
    <div class="ggap-head">
      <div class="ggap-head-left">
        <span class="ggap-title">🌱 目标生长进度档案</span>
        <span class="ggap-sub">{{ targetsCount }} 个目标 · 已开花 {{ stats.completedGoals }} 个</span>
      </div>
      <span class="ggap-badge" :class="{ 'ggap-badge-neutral': stats.totalGoals === 0 }">
        {{ badgeText }}
      </span>
    </div>

    <!-- 空态 -->
    <p v-if="stats.totalGoals === 0" class="ggap-empty">
      留光阁尚未点亮目标。在穹顶点亮一颗星、为中等距离的光立下方向——每一次目标生长都会在此留下进度快照、生长日志与里程碑轨迹。
    </p>

    <template v-if="stats.totalGoals > 0">
      <!-- 档案概览 -->
      <div class="ggap-block">
        <h3 class="ggap-block-title">档案概览</h3>
        <div class="ggap-grid">
          <div class="ggap-cell"><b>{{ stats.totalGoals }}</b><span>总目标</span></div>
          <div class="ggap-cell"><b>{{ stats.activeGoals }}</b><span>进行中</span></div>
          <div class="ggap-cell"><b>{{ stats.completedGoals }}</b><span>已开花</span></div>
          <div class="ggap-cell"><b>{{ stats.dormantGoals }}</b><span>休眠中</span></div>
          <div class="ggap-cell"><b>{{ (stats.averageProgress * 100).toFixed(0) }}%</b><span>平均进度</span></div>
          <div class="ggap-cell"><b>{{ stats.totalDoneAnchors }}/{{ stats.totalAnchors }}</b><span>已锚点</span></div>
        </div>
      </div>

      <!-- 生长阶段分布 -->
      <div class="ggap-block">
        <h3 class="ggap-block-title">生长阶段分布</h3>
        <div class="ggap-phase-list">
          <div v-for="p in phases" :key="p.phase" class="ggap-phase-row">
            <span class="ggap-phase-icon" :style="{ color: p.color }">{{ p.icon }}</span>
            <span class="ggap-phase-label">{{ p.label }}</span>
            <div class="ggap-phase-track">
              <div
                class="ggap-phase-fill"
                :style="{ width: phasePct(p.count) + '%', background: p.color }"
              ></div>
            </div>
            <span class="ggap-phase-count">{{ p.count }}</span>
          </div>
        </div>
      </div>

      <!-- 目标生长趋势 -->
      <div class="ggap-block">
        <h3 class="ggap-block-title">目标生长趋势</h3>
        <p class="ggap-hint">选择目标查看进度快照、生长趋势与里程碑轨迹</p>
        <div class="ggap-target-tabs">
          <button
            v-for="g in goals"
            :key="g.id"
            class="ggap-target-tab"
            :class="{ active: selectedId === g.id }"
            @click="selectedId = g.id"
          >
            {{ g.title }}
            <span class="ggap-trend-dot" v-if="trendLabel(g.id)" :title="`趋势：${trendLabel(g.id)}`">{{ trendDot(g.id) }}</span>
          </button>
        </div>

        <div v-if="selected" class="ggap-target-detail">
          <div class="ggap-detail-top">
            <span class="ggap-detail-status">{{ statusLabel(selected.status) }}</span>
            <span class="ggap-detail-steps">{{ selected.anchorDone }}/{{ selected.anchorCount || 0 }} 步</span>
            <button class="ggap-snap-btn" @click="handleSnapshot">记录本次进度快照</button>
          </div>
          <div class="ggap-progress-track">
            <div class="ggap-progress-fill" :style="{ width: selectedProgress + '%' }"></div>
          </div>
          <span class="ggap-progress-text">进度 {{ selectedProgress }}%</span>

          <div class="ggap-snap-row">
            <span class="ggap-snap-label">已记录快照 {{ snapshotCount }} 次 · 近期趋势
              <b class="ggap-trend" :class="trendClass">{{ trendGlyph }}</b>
            </span>
          </div>

          <!-- 里程碑时间线 -->
          <div class="ggap-milestone-box">
            <div class="ggap-ms-head">
              <span>里程碑</span>
              <span class="ggap-ms-progress">{{ milestoneProgress.progress * 100 }}%</span>
            </div>
            <template v-if="milestones.length">
              <div
                v-for="m in milestones"
                :key="m.id"
                class="ggap-ms-row"
                :class="`ms-${m.status}`"
              >
                <span class="ggap-ms-check" @click="toggleMilestone(m)">{{ m.status === 'achieved' ? '✓' : m.status === 'missed' ? '✕' : '○' }}</span>
                <span class="ggap-ms-label">{{ m.label }}</span>
                <span class="ggap-ms-date">{{ shortDate(m.date) }}</span>
              </div>
            </template>
            <p v-else class="ggap-ms-empty">暂无里程碑</p>
            <div class="ggap-ms-add">
              <input
                v-model="msInput"
                class="ggap-ms-input"
                placeholder="添加里程碑…"
                @keyup.enter="handleAddMilestone"
              />
              <button class="ggap-ms-add-btn" @click="handleAddMilestone">+</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 近期生长日志 -->
      <div class="ggap-block">
        <h3 class="ggap-block-title">生长日志</h3>
        <template v-if="recentLogs.length">
          <div v-for="log in recentLogs" :key="log.id" class="ggap-log-row">
            <span class="ggap-log-dot"></span>
            <div class="ggap-log-main">
              <span class="ggap-log-event">{{ log.event }}</span>
              <span class="ggap-log-detail">{{ log.detail }}</span>
            </div>
            <span class="ggap-log-time">{{ shortDate(log.recordedAt) }}</span>
          </div>
        </template>
        <p v-else class="ggap-sub-empty">暂无生长日志</p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Goal } from '../modules/goal'
import { STATUS_LABELS, type GoalStatus } from '../modules/goal/types'
import {
  GROWTH_PHASE_META,
  useProgressSnapshots,
  useGrowthLogs,
  useMilestoneTimeline,
  useProgressStats,
  type GrowthPhase,
  type MilestoneEntry,
} from '../modules/goal/goal-progress'

const props = defineProps<{ goals: Goal[] }>()

const { computeStats } = useProgressStats()
const {
  loadSnapshots,
  takeSnapshot,
  getGoalSnapshots,
  computeProgressTrend,
} = useProgressSnapshots()
const { loadLogs, getRecentLogs } = useGrowthLogs()
const {
  loadTimelines,
  getTimeline,
  createTimeline,
  addMilestone,
  markAchieved,
  markMissed,
  computeMilestoneProgress,
} = useMilestoneTimeline()

onMounted(() => {
  loadSnapshots()
  loadLogs()
  loadTimelines()
})

const stats = computed(() => computeStats(props.goals))
const targetsCount = computed(() => props.goals.length)

const badgeText = computed(() => {
  if (stats.value.totalGoals === 0) return '尚未启程'
  if (stats.value.completedGoals === stats.value.totalGoals) return '满园收获'
  return '生长中'
})

const phases = computed(() => (Object.keys(GROWTH_PHASE_META) as GrowthPhase[]).map((phase) => ({
  ...(GROWTH_PHASE_META as Record<GrowthPhase, { phase: GrowthPhase; label: string; icon: string; color: string; description: string }>)[phase],
  count: stats.value.phaseDistribution[phase],
})))

function phasePct(count: number): string {
  const total = stats.value.totalGoals
  if (total === 0) return '0%'
  return Math.round((count / total) * 100) + '%'
}

function statusLabel(s: GoalStatus): string {
  return STATUS_LABELS[s] || s
}

// ---- 目标选择 ----
const selectedId = ref<string>('')
function ensureSelection(): void {
  if (!props.goals.length) return
  if (props.goals.every(g => g.id !== selectedId.value)) {
    selectedId.value = props.goals[0].id
  }
}
watch(() => props.goals, ensureSelection, { immediate: true })

const selected = computed<Goal | undefined>(() => props.goals.find(g => g.id === selectedId.value))

const selectedProgress = computed(() => {
  const g = selected.value
  if (!g) return 0
  return g.anchorCount > 0 ? Math.round((g.anchorDone / g.anchorCount) * 100) : 0
})

// ---- 快照趋势 ----
const snapshotCount = computed(() => selected.value ? getGoalSnapshots(selected.value.id).length : 0)
const selectedTrend = computed(() => {
  const g = selected.value
  if (!g) return { direction: 'flat' as const, rate: 0 }
  return computeProgressTrend(g.id)
})
const trendGlyph = computed(() => {
  const d = selectedTrend.value.direction
  return d === 'up' ? '↗' : d === 'down' ? '↘' : '→'
})
const trendClass = computed(() => `trend-${selectedTrend.value.direction}`)

function trendLabel(goalId: string): string {
  const t = computeProgressTrend(goalId)
  return t.direction === 'up' ? '上升' : t.direction === 'down' ? '下降' : '平稳'
}
function trendDot(goalId: string): string {
  const t = computeProgressTrend(goalId)
  return t.direction === 'up' ? '↗' : t.direction === 'down' ? '↘' : '→'
}

function handleSnapshot(): void {
  const g = selected.value
  if (!g) return
  takeSnapshot(g)
  loadSnapshots()
}

// ---- 里程碑 ----
const milestones = computed<MilestoneEntry[]>(() => {
  const g = selected.value
  if (!g) return []
  const t = getTimeline(g.id)
  return t ? [...t.milestones].sort((a, b) => a.date.localeCompare(b.date)) : []
})
const milestoneProgress = computed(() => {
  const g = selected.value
  if (!g) return { total: 0, achieved: 0, missed: 0, pending: 0, progress: 0 }
  return computeMilestoneProgress(g.id)
})

const msInput = ref('')
function handleAddMilestone(): void {
  const g = selected.value
  const label = msInput.value.trim()
  if (!g || !label) return
  if (!getTimeline(g.id)) createTimeline(g.id, g.title)
  addMilestone(g.id, label, new Date().toISOString(), 'checkpoint')
  msInput.value = ''
  loadTimelines()
}

function toggleMilestone(m: MilestoneEntry): void {
  const g = selected.value
  if (!g) return
  if (m.status === 'achieved') markMissed(g.id, m.id)
  else if (m.status === 'missed') markAchieved(g.id, m.id)
  else markAchieved(g.id, m.id)
  loadTimelines()
}

// ---- 日志 ----
const recentLogs = computed(() => getRecentLogs(10))

function shortDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.ggap-panel {
  margin-top: 18px;
  padding: 16px 18px;
  border: 1px solid rgba(195, 159, 106, 0.25);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(195, 159, 106, 0.05), rgba(138, 154, 122, 0.04));
}
.ggap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.ggap-head-left { display: flex; flex-direction: column; gap: 2px; }
.ggap-title { font-size: 17px; font-weight: 700; color: var(--text, #f0d9a8); }
.ggap-sub { font-size: 12px; opacity: 0.72; }
.ggap-badge {
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(196, 106, 90, 0.18);
  border: 1px solid rgba(196, 106, 90, 0.5);
  color: #d98c7a;
  font-size: 12px;
}
.ggap-badge-neutral { background: rgba(148, 145, 138, 0.12); border-color: rgba(148, 145, 138, 0.4); color: #a09b91; }
.ggap-empty { font-size: 13px; color: #a6a096; line-height: 1.7; }
.ggap-block { margin-top: 14px; }
.ggap-block-title { font-size: 13px; font-weight: 700; color: #d9c390; margin-bottom: 9px; }
.ggap-hint { font-size: 12px; opacity: 0.68; margin-bottom: 8px; }
.ggap-sub-empty { font-size: 12px; opacity: 0.6; }

/* 概览 */
.ggap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
}
.ggap-cell {
  background: rgba(195, 159, 106, 0.06);
  border: 1px solid rgba(195, 159, 106, 0.14);
  border-radius: 10px;
  padding: 9px 6px;
  text-align: center;
}
.ggap-cell b { display: block; font-size: 17px; color: #f0d9a8; }
.ggap-cell span { font-size: 11px; opacity: 0.7; }

/* 阶段分布 */
.ggap-phase-list { display: flex; flex-direction: column; gap: 7px; }
.ggap-phase-row { display: flex; align-items: center; gap: 8px; }
.ggap-phase-icon { font-size: 15px; width: 20px; }
.ggap-phase-label { font-size: 12px; width: 56px; color: #cdbfa0; }
.ggap-phase-track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.14);
  overflow: hidden;
}
.ggap-phase-fill { height: 100%; border-radius: 999px; transition: width 0.3s; }
.ggap-phase-count { font-size: 12px; width: 22px; text-align: right; color: #e6d3ad; }

/* 目标标签 */
.ggap-target-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.ggap-target-tab {
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 999px;
  border: 1px solid rgba(195, 159, 106, 0.3);
  background: transparent;
  color: #cdbfa0;
  cursor: pointer;
}
.ggap-target-tab.active { background: rgba(195, 159, 106, 0.16); border-color: rgba(195, 159, 106, 0.7); color: #f0d9a8; }
.ggap-trend-dot { margin-left: 4px; }
.ggap-target-detail {
  background: rgba(138, 154, 122, 0.06);
  border: 1px solid rgba(138, 154, 122, 0.16);
  border-radius: 10px;
  padding: 10px 12px;
}
.ggap-detail-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.ggap-detail-status { font-size: 12px; color: #d98c7a; }
.ggap-detail-steps { font-size: 12px; opacity: 0.72; }
.ggap-snap-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  margin-left: auto;
  padding: 3px 10px;
  font-size: 11px;
  border-radius: 999px;
  border: 1px solid rgba(196, 106, 90, 0.5);
  background: rgba(196, 106, 90, 0.12);
  color: #d98c7a;
  cursor: pointer;

  min-height: 26px;
}
.ggap-progress-track { height: 9px; border-radius: 999px; background: rgba(148, 145, 138, 0.16); overflow: hidden; }
.ggap-progress-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #c3b06a, #8a9a7a); transition: width 0.3s; }
.ggap-progress-text { font-size: 11px; opacity: 0.72; }
.ggap-snap-row { margin-top: 8px; display: flex; gap: 8px; font-size: 12px; opacity: 0.85; }
.ggap-trend.trend-up { color: #8a9a7a; }
.ggap-trend.trend-down { color: #c46a5a; }
.ggap-trend.trend-flat { color: #c3b06a; }

/* 里程碑 */
.ggap-milestone-box { margin-top: 10px; border-top: 1px dashed rgba(195, 159, 106, 0.22); padding-top: 9px; }
.ggap-ms-head { display: flex; justify-content: space-between; font-size: 12px; color: #d9c390; margin-bottom: 6px; }
.ggap-ms-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; }
.ggap-ms-row.ms-achieved { opacity: 0.72; }
.ggap-ms-row.ms-achieved .ggap-ms-label { text-decoration: line-through; }
.ggap-ms-row.ms-missed { opacity: 0.5; }
.ggap-ms-check { cursor: pointer; width: 16px; text-align: center; color: #c3b06a; }
.ggap-ms-label { flex: 1; color: #e0d4ba; }
.ggap-ms-date { font-size: 11px; opacity: 0.6; }
.ggap-ms-empty { font-size: 12px; opacity: 0.6; }
.ggap-ms-add { display: flex; gap: 6px; margin-top: 8px; }
.ggap-ms-input {
  flex: 1;
  padding: 4px 9px;
  font-size: 12px;
  border-radius: 999px;
  border: 1px solid rgba(195, 159, 106, 0.28);
  background: rgba(18, 18, 22, 0.4);
  color: #e0d4ba;
}
.ggap-ms-add-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(195, 159, 106, 0.5);
  background: rgba(195, 159, 106, 0.12);
  color: #e6d3ad;
  cursor: pointer;
}

/* 日志 */
.ggap-log-row { display: flex; gap: 9px; align-items: flex-start; padding: 4px 0; }
.ggap-log-dot { width: 7px; height: 7px; border-radius: 50%; background: #c3b06a; margin-top: 5px; flex-shrink: 0; }
.ggap-log-main { flex: 1; display: flex; flex-direction: column; }
.ggap-log-event { font-size: 12px; color: #e0d4ba; }
.ggap-log-detail { font-size: 11px; opacity: 0.62; }
.ggap-log-time { font-size: 11px; opacity: 0.55; }
</style>