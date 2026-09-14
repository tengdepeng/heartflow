<template>
  <section class="rtp">
    <div class="rtp-head">
      <span class="rtp-title">🌿 休息趋势</span>
      <span v-if="summary.totalBreaks > 0" class="rtp-tag">
        连续 {{ summary.streakDays }} 天
      </span>
      <span v-else class="rtp-tag">尚无记录</span>
    </div>

    <!-- 趋势摘要 -->
    <div class="rtp-block">
      <div class="rtp-block-title">趋势概览</div>
      <div class="rtp-metrics">
        <div class="rtp-metric"><b>{{ summary.totalBreaks }}</b><span>总休息</span></div>
        <div class="rtp-metric"><b>{{ fmtMin(summary.totalDuration) }}</b><span>总时长</span></div>
        <div class="rtp-metric"><b>{{ summary.avgMood }}</b><span>平均心情</span></div>
        <div class="rtp-metric"><b>{{ summary.avgRecovery }}</b><span>恢复度</span></div>
        <div class="rtp-metric"><b>{{ summary.streakDays }}</b><span>连续天数</span></div>
      </div>

      <!-- 趋势折线 -->
      <div v-if="trendPoints.length > 1" class="rtp-chart">
        <svg :viewBox="`0 0 ${W} ${H}`" class="rtp-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="rtp-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(138,154,122,0.28)" />
              <stop offset="100%" stop-color="rgba(138,154,122,0)" />
            </linearGradient>
          </defs>
          <polygon :points="areaPoints" fill="url(#rtp-fill)" />
          <polyline :points="linePoints" fill="none" stroke="rgba(138,154,122,0.7)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
        </svg>
      </div>
      <p v-else class="rtp-empty">记录几次休憩后，趋势会在这里展开。</p>
    </div>

    <!-- 成就系统 -->
    <div class="rtp-block">
      <div class="rtp-block-title">
        成就 · {{ unlockedCount }}/{{ totalCount }}
      </div>
      <div class="rtp-achievements">
        <div
          v-for="a in achievements"
          :key="a.id"
          class="rtp-ach"
          :class="{ 'rtp-ach--locked': !a.unlocked }"
        >
          <span class="rtp-ach-icon">{{ a.icon }}</span>
          <div class="rtp-ach-body">
            <span class="rtp-ach-title">{{ a.title }}</span>
            <div class="rtp-ach-bar">
              <i :style="{ width: Math.round(a.progress * 100) + '%' }"></i>
            </div>
            <span class="rtp-ach-progress">{{ a.progressLabel }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { BreakRecord, RestPractice } from '../modules/rest'
import { useRestTrend, useRestAchievements } from '../modules/rest'

const props = defineProps<{ records: BreakRecord[]; practices: RestPractice[] }>()

const { computeTrend } = useRestTrend(() => props.records, () => props.practices)
const { achievements, unlockedCount, totalCount, checkAchievements } = useRestAchievements(
  () => props.records,
  () => props.practices,
)

const trend = computed(() => computeTrend(30))
const summary = computed(() => trend.value.summary)
const trendPoints = computed(() => trend.value.points)

watch(
  () => props.records,
  () => { checkAchievements() },
  { deep: true, immediate: true },
)

const W = 320
const H = 72

const linePoints = computed(() => {
  const pts = trendPoints.value
  if (pts.length < 2) return ''
  const max = Math.max(...pts.map(p => p.count), 1)
  return pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * W
    const y = H - (p.count / max) * (H - 8) - 4
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})

const areaPoints = computed(() => {
  const line = linePoints.value
  if (!line) return ''
  const pts = line.split(' ')
  return `${pts[0].split(',')[0]},${H} ${line} ${pts[pts.length - 1].split(',')[0]},${H}`
})

function fmtMin(min: number): string {
  if (min >= 60) return (min / 60).toFixed(1) + 'h'
  return min + 'm'
}
</script>

<style scoped>
.rtp {
  position: relative;
  z-index: 1;
  margin: 20px 32px 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.rtp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.rtp-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 2px;
  color: rgba(var(--accent-rgb), 0.75);
}

.rtp-tag {
  font-size: 11px;
  padding: 3px 12px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
}

.rtp-block {
  padding: 14px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.07);
  margin-bottom: 12px;
}

.rtp-block:last-child { margin-bottom: 0; }

.rtp-block-title {
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(var(--accent-rgb), 0.45);
  margin-bottom: 10px;
}

.rtp-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 8px;
}

.rtp-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.05);
}

.rtp-metric b { font-size: 16px; font-weight: 600; color: var(--accent); }
.rtp-metric span { font-size: 10px; color: rgba(var(--accent-rgb), 0.4); }

.rtp-chart { margin-top: 12px; }
.rtp-svg { width: 100%; height: 72px; display: block; }

/* 成就 */
.rtp-achievements {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.rtp-ach {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.rtp-ach--locked { opacity: 0.45; }

.rtp-ach-icon { font-size: 16px; }

.rtp-ach-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.rtp-ach-title {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rtp-ach-bar {
  height: 4px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}

.rtp-ach-bar i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.4);
  transition: width 0.4s;
}

.rtp-ach-progress {
  font-size: 9px;
  color: rgba(var(--accent-rgb), 0.4);
}

.rtp-empty {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.35);
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .rtp { margin: 16px 16px 0; padding: 14px; }
}
</style>
