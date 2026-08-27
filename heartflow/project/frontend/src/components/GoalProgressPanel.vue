<template>
  <section class="gp-panel" aria-label="进度统计">
    <div class="gp-panel-head">
      <span class="gp-panel-title">📈 进度统计</span>
      <span class="gp-panel-sub">生长阶段 · 日志 · 快照</span>
    </div>

    <!-- 页签切换 -->
    <div class="gp-tabs">
      <button
        v-for="t in TABS"
        :key="t.value"
        class="gp-tab"
        :class="{ 'gp-tab--active': tab === t.value }"
        @click="tab = t.value"
      >{{ t.label }}</button>
    </div>

    <!-- 概览 -->
    <div v-if="tab === 'overview'" class="gp-block">
      <div v-if="stats" class="gp-stats">
        <div class="gp-stat">
          <span class="gp-stat-num">{{ stats.totalGoals }}</span>
          <span class="gp-stat-label">总目标</span>
        </div>
        <div class="gp-stat">
          <span class="gp-stat-num">{{ stats.activeGoals }}</span>
          <span class="gp-stat-label">活跃</span>
        </div>
        <div class="gp-stat">
          <span class="gp-stat-num">{{ stats.completedGoals }}</span>
          <span class="gp-stat-label">已开花</span>
        </div>
        <div class="gp-stat">
          <span class="gp-stat-num">{{ stats.dormantGoals }}</span>
          <span class="gp-stat-label">休眠</span>
        </div>
        <div class="gp-stat">
          <span class="gp-stat-num">{{ Math.round(stats.averageProgress * 100) }}%</span>
          <span class="gp-stat-label">平均进度</span>
        </div>
        <div class="gp-stat">
          <span class="gp-stat-num">{{ stats.totalDoneAnchors }}/{{ stats.totalAnchors }}</span>
          <span class="gp-stat-label">锚点</span>
        </div>
      </div>
      <div v-if="stats" class="gp-block">
        <span class="gp-block-label">生长阶段分布</span>
        <div v-for="p in phaseRows" :key="p.phase" class="gp-bar-row">
          <span class="gp-bar-label">{{ p.icon }} {{ p.label }}</span>
          <div class="gp-bar-track">
            <div class="gp-bar-fill" :style="{ width: p.pct + '%', background: p.color }"></div>
          </div>
          <span class="gp-bar-num">{{ p.count }}</span>
        </div>
      </div>
      <p v-if="!stats || stats.totalGoals === 0" class="gp-hint">暂无目标数据，先种下一颗目标种子吧。</p>
    </div>

    <!-- 日志 -->
    <div v-if="tab === 'logs'" class="gp-block">
      <span class="gp-block-label">生长日志（{{ logs.length }}）</span>
      <div v-if="logs.length" class="gp-log-list">
        <div v-for="l in logs" :key="l.id" class="gp-log">
          <div class="gp-log-head">
            <span class="gp-log-event">{{ logEventLabel(l.event) }}</span>
            <span class="gp-log-time">{{ formatTime(l.recordedAt) }}</span>
          </div>
          <p class="gp-log-detail">{{ l.detail }}</p>
          <div class="gp-log-meta">
            <span>{{ goalTitle(l.goalId) }}</span>
            <span v-if="l.progress !== undefined">进度 {{ Math.round(l.progress * 100) }}%</span>
          </div>
        </div>
      </div>
      <p v-else class="gp-hint">暂无生长日志。目标状态变化与进度更新会自动记录。</p>
    </div>

    <!-- 快照 -->
    <div v-if="tab === 'snapshots'" class="gp-block">
      <div class="gp-snap-head">
        <span class="gp-block-label">进度快照</span>
        <button class="gp-btn gp-btn-primary" :disabled="!selectedGoalId" @click="takeSnapshot">拍摄快照</button>
      </div>
      <div class="gp-snap-goal">
        <select v-model="selectedGoalId" class="gp-select">
          <option value="">选择目标…</option>
          <option v-for="g in props.goals" :key="g.id" :value="g.id">{{ g.title }}</option>
        </select>
      </div>
      <div v-if="goalSnapshots.length" class="gp-block">
        <span class="gp-block-label">趋势：{{ trendText }}</span>
        <div class="gp-trend">
          <div v-for="s in goalSnapshots" :key="s.id" class="gp-trend-col">
            <div class="gp-trend-bar" :style="{ height: snapHeight(s.progress) + '%' }"></div>
            <span class="gp-trend-label">{{ s.recordedAt.slice(5, 10) }}</span>
          </div>
        </div>
        <div class="gp-snap-list">
          <div v-for="s in goalSnapshots" :key="s.id" class="gp-snap">
            <span class="gp-snap-progress">{{ Math.round(s.progress * 100) }}%</span>
            <span class="gp-snap-status">{{ statusLabel(s.status) }}</span>
            <span class="gp-snap-time">{{ formatTime(s.recordedAt) }}</span>
            <span v-if="s.note" class="gp-snap-note">{{ s.note }}</span>
          </div>
        </div>
      </div>
      <p v-else-if="selectedGoalId" class="gp-hint">该目标还没有快照，点击「拍摄快照」记录当前进度。</p>
      <p v-else class="gp-hint">选择一个目标查看其进度快照趋势。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProgressStats } from '../modules/goal/goal-progress'
import type { Goal, GoalStatus } from '../modules/goal'

const props = defineProps<{ goals: Goal[] }>()

const TABS = [
  { value: 'overview', label: '概览' },
  { value: 'logs', label: '日志' },
  { value: 'snapshots', label: '快照' },
] as const

const tab = ref<string>('overview')
const selectedGoalId = ref<string>('')

const statsStore = useProgressStats()

const stats = computed(() => {
  if (props.goals.length === 0) return null
  return statsStore.computeStats(props.goals)
})

const logs = computed(() => statsStore.getRecentLogs(12))

const goalSnapshots = computed(() => {
  if (!selectedGoalId.value) return []
  return statsStore.getGoalSnapshots(selectedGoalId.value)
})

const trend = computed(() => {
  if (!selectedGoalId.value) return { direction: 'flat' as const, rate: 0 }
  return statsStore.computeProgressTrend(selectedGoalId.value)
})

const trendText = computed(() => {
  const t = trend.value
  if (t.direction === 'up') return `上升 ${t.rate}/天`
  if (t.direction === 'down') return `下降 ${Math.abs(t.rate)}/天`
  return '平稳'
})

const phaseRows = computed(() => {
  const s = stats.value
  if (!s) return []
  const total = Math.max(1, s.totalGoals)
  return (Object.keys(s.phaseDistribution) as GoalStatus[])
    .map(phase => ({
      phase,
      icon: PHASE_META[phase].icon,
      label: PHASE_META[phase].label,
      color: PHASE_META[phase].color,
      count: s.phaseDistribution[phase],
      pct: Math.round((s.phaseDistribution[phase] / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
})

watch(() => props.goals.length, () => {
  if (props.goals.length > 0) {
    statsStore.loadSnapshots()
    statsStore.loadLogs()
  }
})

function takeSnapshot() {
  const goal = props.goals.find(g => g.id === selectedGoalId.value)
  if (!goal) return
  statsStore.takeSnapshot(goal)
}

function snapHeight(progress: number): number {
  return Math.max(6, Math.round(progress * 100))
}

function goalTitle(id: string): string {
  return props.goals.find(g => g.id === id)?.title || '未知目标'
}

function logEventLabel(e: string): string {
  return { status_change: '状态变化', progress_update: '进度更新' }[e] || e
}

function statusLabel(s: GoalStatus): string {
  return { seed: '种子', sprout: '发芽', growing: '生长中', bloom: '已开花', dormant: '休眠中' }[s] || s
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const PHASE_META: Record<GoalStatus, { icon: string; label: string; color: string }> = {
  seed: { icon: '🌱', label: '种子', color: '#8B6914' },
  sprout: { icon: '🌿', label: '发芽', color: '#8a9a7a' },
  growing: { icon: '🌳', label: '生长中', color: '#6b9fc4' },
  bloom: { icon: '🌸', label: '已开花', color: '#d98c7a' },
  dormant: { icon: '💤', label: '休眠中', color: '#7a7f8c' },
}
</script>

<style scoped>
.gp-panel {
  background: linear-gradient(135deg, rgba(60, 70, 90, 0.35), rgba(40, 48, 64, 0.25));
  border: 1px solid rgba(140, 160, 190, 0.18);
  border-radius: 14px;
  padding: 16px;
  margin: 12px 0;
}
.gp-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.gp-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #dce4f0;
}
.gp-panel-sub {
  font-size: 12px;
  color: #8a97ad;
}
.gp-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.gp-tab {
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid rgba(140, 160, 190, 0.2);
  background: transparent;
  color: #aab6c9;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.gp-tab:hover { border-color: rgba(140, 160, 190, 0.4); }
.gp-tab--active {
  background: rgba(120, 150, 200, 0.2);
  border-color: rgba(140, 170, 220, 0.5);
  color: #dce4f0;
}
.gp-block { margin-bottom: 10px; }
.gp-block-label {
  display: block;
  font-size: 12px;
  color: #8a97ad;
  margin-bottom: 8px;
}
.gp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.gp-stat {
  background: rgba(20, 26, 38, 0.45);
  border: 1px solid rgba(140, 160, 190, 0.12);
  border-radius: 10px;
  padding: 10px;
  text-align: center;
}
.gp-stat-num {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #dce4f0;
}
.gp-stat-label {
  display: block;
  font-size: 11px;
  color: #8a97ad;
  margin-top: 2px;
}
.gp-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.gp-bar-label {
  width: 72px;
  font-size: 12px;
  color: #aab6c9;
}
.gp-bar-track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(140, 160, 190, 0.15);
  overflow: hidden;
}
.gp-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}
.gp-bar-num {
  width: 24px;
  text-align: right;
  font-size: 12px;
  color: #8a97ad;
}
.gp-log {
  background: rgba(20, 26, 38, 0.45);
  border: 1px solid rgba(140, 160, 190, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.gp-log-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.gp-log-event {
  font-size: 12px;
  font-weight: 600;
  color: #9fc4e8;
}
.gp-log-time {
  font-size: 11px;
  color: #7a879c;
}
.gp-log-detail {
  font-size: 13px;
  color: #c6d0e0;
  margin: 0 0 4px;
  line-height: 1.5;
}
.gp-log-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #7a879c;
}
.gp-snap-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.gp-snap-head .gp-block-label { margin-bottom: 0; }
.gp-btn {
  padding: 5px 14px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.25);
  background: transparent;
  color: #aab6c9;
  font-size: 12px;
  cursor: pointer;
}
.gp-btn-primary {
  background: rgba(120, 150, 200, 0.2);
  border-color: rgba(140, 170, 220, 0.5);
  color: #dce4f0;
}
.gp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.gp-select {
  width: 100%;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.2);
  background: rgba(20, 26, 38, 0.6);
  color: #c6d0e0;
  font-size: 13px;
}
.gp-trend {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 90px;
  padding: 4px 0;
}
.gp-trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}
.gp-trend-bar {
  width: 70%;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(180deg, #9fc4e8, #6b9fc4);
}
.gp-trend-label {
  font-size: 9px;
  color: #7a879c;
  margin-top: 2px;
}
.gp-snap-list {
  margin-top: 8px;
}
.gp-snap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(140, 160, 190, 0.08);
  font-size: 12px;
}
.gp-snap-progress {
  font-weight: 600;
  color: #9fc4e8;
  width: 44px;
}
.gp-snap-status {
  color: #aab6c9;
  width: 56px;
}
.gp-snap-time {
  color: #7a879c;
}
.gp-snap-note {
  color: #8a97ad;
  font-style: italic;
}
.gp-hint {
  font-size: 12px;
  color: #7a879c;
  margin: 8px 0 0;
}
</style>
