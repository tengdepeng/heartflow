<template>
  <section class="lmt-panel" aria-label="成就路线">
    <div class="lmt-head">
      <span class="lmt-title">🏅 成就路线</span>
      <span class="lmt-sub">长期目标的发光轨迹</span>
    </div>

    <!-- 已达成 -->
    <div v-if="achieved.length" class="lmt-group">
      <span class="lmt-group-label">已点亮（{{ achieved.length }}）</span>
      <div class="lmt-trail">
        <div v-for="m in achieved" :key="m.id" class="lmt-node lmt-achieved" :title="m.goalTitle">
          <span class="lmt-dot">✦</span>
          <div class="lmt-node-body">
            <span class="lmt-node-title">{{ m.title }}</span>
            <span class="lmt-node-goal">{{ m.goalTitle }}<span v-if="m.achievedAt" class="lmt-node-date"> · {{ fmtDate(m.achievedAt) }}</span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 即将达成 -->
    <div v-if="upcoming.length" class="lmt-group">
      <span class="lmt-group-label">即将点亮（{{ upcoming.length }}）</span>
      <div class="lmt-trail">
        <div v-for="m in upcoming" :key="m.id" class="lmt-node lmt-upcoming" :title="m.goalTitle">
          <span class="lmt-dot">○</span>
          <div class="lmt-node-body">
            <span class="lmt-node-title">{{ m.title }}</span>
            <span class="lmt-node-goal">{{ m.goalTitle }} · {{ m.currentProgress }}%</span>
          </div>
        </div>
      </div>
    </div>

    <p v-if="!achieved.length && !upcoming.length" class="lmt-empty">
      尚无里程碑轨迹。点击「同步成就路线」为长期目标自动点亮路标。
    </p>

    <!-- 进度快照趋势 -->
    <div class="lmt-history">
      <div class="lmt-history-head">
        <span class="lmt-group-label">进度快照 · 趋势：{{ trendLabel }}</span>
        <button class="lmt-btn lmt-snap-btn" @click="shootSnapshot">拍摄快照</button>
      </div>
      <div v-if="trend.dates.length" class="lmt-trend">
        <div v-for="(d, i) in trend.dates" :key="d" class="lmt-trend-col">
          <div class="lmt-trend-bar" :style="{ height: trendHeight(trend.values[i]) + '%' }"></div>
          <span class="lmt-trend-label">{{ d.slice(5) }}</span>
        </div>
      </div>
      <p v-else class="lmt-empty-sm">暂无进度快照，点击「拍摄快照」记录当前脉络亮度。</p>
    </div>

    <div class="lmt-actions">
      <button class="lmt-btn lmt-sync-btn" @click="syncRoute">同步成就路线</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGoalMilestones, useProgressHistory } from '../modules/goal/goal-visualization'
import type { Goal } from '../modules/goal/types'

const props = defineProps<{ goals: Goal[] }>()

const milestonesApi = useGoalMilestones(() => props.goals)
const historyApi = useProgressHistory(() => props.goals)

const achieved = computed(() => milestonesApi.achievedMilestones.value)
const upcoming = computed(() => milestonesApi.upcomingMilestones.value)
const trend = computed(() => historyApi.getProgressTrend())

const trendLabel = computed(() => {
  const t = historyApi.history.value.trend
  return t === 'improving' ? '上升 ↑' : t === 'declining' ? '下降 ↓' : '平稳 →'
})

const maxTrend = computed(() => {
  const vals = trend.value.values
  return vals.length ? Math.max(...vals, 1) : 1
})

function trendHeight(v: number): number {
  return Math.max(8, Math.round((v / maxTrend.value) * 100))
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function syncRoute() {
  for (const g of props.goals) {
    milestonesApi.autoGenerateMilestones(g.id)
  }
}

function shootSnapshot() {
  historyApi.takeSnapshot()
}
</script>

<style scoped>
.lmt-panel {
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  position: relative;
  z-index: 1;
}
.lmt-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.lmt-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-high);
}
.lmt-sub {
  font-size: 11px;
  color: var(--text-secondary);
}
.lmt-group {
  margin-bottom: 12px;
}
.lmt-group-label {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}
.lmt-trail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 4px;
  border-left: 2px solid rgba(var(--accent-rgb), 0.15);
}
.lmt-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background 0.15s;
}
.lmt-node:hover {
  background: rgba(var(--accent-rgb), 0.05);
}
.lmt-dot {
  font-size: 14px;
  flex-shrink: 0;
}
.lmt-achieved .lmt-dot {
  color: var(--accent);
  filter: drop-shadow(0 0 5px rgba(var(--accent-rgb), 0.6));
  animation: lmt-glow 2.6s ease-in-out infinite;
}
@keyframes lmt-glow {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
.lmt-upcoming .lmt-dot {
  color: var(--text-dim);
}
.lmt-node-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.lmt-node-title {
  font-size: 13px;
  color: var(--text-high);
}
.lmt-node-goal {
  font-size: 10px;
  color: var(--text-dim);
}
.lmt-empty {
  font-size: 12px;
  color: var(--text-dim);
  margin: 4px 0 12px;
}
.lmt-history {
  margin-top: 12px;
}
.lmt-history-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.lmt-trend {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 72px;
}
.lmt-trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  gap: 3px;
}
.lmt-trend-bar {
  width: 70%;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.9), rgba(var(--accent-rgb), 0.35));
  transition: height 0.4s ease;
}
.lmt-trend-label {
  font-size: 8px;
  color: var(--text-faint);
}
.lmt-empty-sm {
  font-size: 11px;
  color: var(--text-faint);
}
.lmt-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.lmt-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.lmt-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.3);
}
</style>
