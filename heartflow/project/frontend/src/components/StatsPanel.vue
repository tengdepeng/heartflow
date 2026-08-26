<template>
  <div class="stats-panel" v-if="statsPanelVisible.active.value">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">⏱️</div>
        <div class="stat-body">
          <span class="stat-value">{{ formatDuration(stats.totalFocusSeconds) }}</span>
          <span class="stat-label">总专注时间</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔥</div>
        <div class="stat-body">
          <span class="stat-value">{{ formatDuration(stats.todayFocusSeconds) }}</span>
          <span class="stat-label">今日专注</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚡</div>
        <div class="stat-body">
          <span class="stat-value">{{ stats.streak }}<span class="stat-unit">天</span></span>
          <span class="stat-label">连续天数</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💎</div>
        <div class="stat-body">
          <span class="stat-value">{{ stats.totalCrystals }}</span>
          <span class="stat-label">结晶总数</span>
        </div>
      </div>
    </div>

    <!-- 今日目标进度 -->
    <div class="trend-section" v-if="config.config.stats.dailyGoal > 0 && dailyProgress !== null">
      <h3 class="trend-title">🎯 今日专注目标</h3>
      <div class="goal-progress-bar">
        <div class="goal-progress-fill" :style="{ width: `${dailyProgress * 100}%` }" />
      </div>
      <div class="goal-progress-label">
        {{ Math.round(stats.todayFocusSeconds / 60) }} / {{ config.config.stats.dailyGoal }} 分钟
        <span v-if="dailyProgress >= 1">✅ 已完成</span>
      </div>
    </div>

    <!-- 近7天趋势 -->
    <div class="trend-section" v-if="config.config.stats.showTrendChart">
      <h3 class="trend-title">📈 近7天专注趋势</h3>
      <div class="trend-chart">
        <div
          v-for="(day, idx) in weekTrend"
          :key="idx"
          class="trend-bar-wrap"
        >
          <div class="trend-bar-container">
            <div
              class="trend-bar"
              :style="{ height: barHeight(day.minutes) }"
              :title="`${day.label}: ${formatDuration(day.minutes * 60)}`"
            />
          </div>
          <span class="trend-label">{{ day.shortLabel }}</span>
        </div>
      </div>
      <div v-if="weekTrend.every(d => d.minutes === 0)" class="trend-empty">
        最近7天还没有专注记录呢 🌙
      </div>
    </div>

    <!-- 专注热力图 -->
    <div class="trend-section">
      <HeatmapGrid :days="7" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storage } from '../engine/storage'
import { useConfig } from '../resonance/bridges/config'
import { formatDuration, formatDate } from '../utils/time'
import { useEffect } from '../modules/constitution/use-effect'
import HeatmapGrid from './HeatmapGrid.vue'

const config = useConfig()

// A2.3 批3：统计面板是否展示受宪法「统计面板显示」条款门控。
// 条款默认启用 → 默认行为不变；用户关闭后面板整体不渲染（不再消费 stats 数据）。
const statsPanelVisible = useEffect('stats:show-panel')

// ---- 统计数据 ----
const stats = computed(() => {
  const sessions = storage.getSessions()
  const completed = sessions.filter(s => s.status === 'completed')

  // 总专注时间（秒）
  const totalFocusSeconds = completed.reduce((sum, s) => sum + Math.floor(s.elapsed / 1000), 0)

  // 今日专注（秒）
  const todayStr = new Date().toISOString().slice(0, 10)
  const todaySessions = completed.filter(s => s.completedAt?.startsWith(todayStr))
  const todayFocusSeconds = todaySessions.reduce((sum, s) => sum + Math.floor(s.elapsed / 1000), 0)

  // 连续天数
  let streak = 0
  const checkDate = new Date()
  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10)
    const hasSession = completed.some(s => s.completedAt?.startsWith(dateStr))
    if (hasSession) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  // 结晶总数
  const totalCrystals = storage.getCrystals().length

  return { totalFocusSeconds, todayFocusSeconds, streak, totalCrystals }
})

// 今日目标进度
const dailyProgress = computed(() => {
  const goal = config.config.stats.dailyGoal * 60 // 秒
  if (goal <= 0) return null
  return Math.min(stats.value.todayFocusSeconds / goal, 1)
})

// 近7天趋势
const weekTrend = computed(() => {
  const days: { date: Date; label: string; shortLabel: string; minutes: number }[] = []
  const today = new Date()
  const sessions = storage.getSessions()
  const completed = sessions.filter(s => s.status === 'completed')

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dayStart = new Date(d)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(d)
    dayEnd.setHours(23, 59, 59, 999)

    const total = completed
      .filter(s => {
        if (!s.completedAt) return false
        const t = new Date(s.completedAt).getTime()
        return t >= dayStart.getTime() && t <= dayEnd.getTime()
      })
      .reduce((sum, s) => sum + Math.floor(s.elapsed / 1000), 0)

    const weekDay = formatDate(d.getTime(), 'weekday')
    days.push({
      date: d,
      label: `${formatDate(d.getTime(), 'short')} ${weekDay}`,
      shortLabel: weekDay.slice(0, 1),
      minutes: Math.round(total / 60),
    })
  }
  return days
})

function barHeight(minutes: number): string {
  const max = Math.max(...weekTrend.value.map(d => d.minutes), 1)
  return `${Math.max((minutes / max) * 100, 2)}%`
}
</script>

<style scoped>
.stats-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

/* ── Stats Grid ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  flex-shrink: 0;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: all var(--transition);
}

.stat-card:hover {
  border-color: var(--accent-cyan);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.stat-icon {
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-unit {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-secondary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ── Trend Section ── */
.trend-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.trend-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 8px;
  flex: 1;
  min-height: 120px;
  padding: 8px 0;
}

.trend-bar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  height: 100%;
}

.trend-bar-container {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  min-height: 40px;
}

.trend-bar {
  width: 60%;
  max-width: 32px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, var(--accent-cyan), var(--accent-blue));
  transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 0;
}

.trend-bar-wrap:nth-child(odd) .trend-bar {
  background: linear-gradient(180deg, var(--accent-purple), var(--accent-blue));
}

.trend-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
}

.trend-empty {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 40px 0;
}

/* Goal Progress Bar */
.goal-progress-bar {
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.06);
  overflow: hidden;
}
.goal-progress-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--accent, #a07c8c), var(--success));
  transition: width 0.5s ease;
}
.goal-progress-label {
  font-size: 11px;
  opacity: 0.5;
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
}
</style>
