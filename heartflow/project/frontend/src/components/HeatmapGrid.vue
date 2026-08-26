<template>
  <div class="heatmap-wrap">
    <div class="heatmap-header">
      <span class="heatmap-title">专注热力</span>
      <span class="heatmap-subtitle">近 {{ days }} 天 · 24h</span>
    </div>
    <div class="heatmap-grid">
      <!-- 时间标签列 -->
      <div class="hour-labels">
        <span v-for="h in hourLabels" :key="h" class="hour-label">{{ h }}</span>
      </div>
      <!-- 热力图网格 -->
      <div class="heat-cells">
        <div
          v-for="(cell, idx) in cells"
          :key="idx"
          class="heat-cell"
          :style="{ background: cell.color }"
          :title="cell.title"
        />
      </div>
    </div>
    <!-- 图例 -->
    <div class="heatmap-legend">
      <span class="legend-label">少</span>
      <span v-for="l in legendColors" :key="l" class="legend-swatch" :style="{ background: l }" />
      <span class="legend-label">多</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storage } from '../engine/storage'

const props = withDefaults(defineProps<{
  days?: number
}>(), {
  days: 7,
})

const hourLabels = ['0', '3', '6', '9', '12', '15', '18', '21']

// 构建热力图数据
const cells = computed(() => {
  const sessions = storage.getSessions().filter(s => s.status === 'completed' || s.status === 'interrupted')
  const now = new Date()
  const result: { color: string; title: string }[] = []

  // 时间桶: day×hour 的分钟矩阵
  const buckets: number[][] = Array.from({ length: props.days }, () => new Array(24).fill(0))

  for (const s of sessions) {
    const start = s.startedAt ? new Date(s.startedAt) : null
    if (!start) continue
    const dayDiff = Math.floor((now.getTime() - start.getTime()) / 86400000)
    if (dayDiff < 0 || dayDiff >= props.days) continue
    const dayIdx = props.days - 1 - dayDiff
    const hour = start.getHours()
    buckets[dayIdx][hour] += Math.floor(s.elapsed / 60000) // 分钟
  }

  // 找到最大分钟数用于归一化
  const maxMin = Math.max(1, ...buckets.flat())

  for (let day = 0; day < props.days; day++) {
    const d = new Date(now)
    d.setDate(d.getDate() - (props.days - 1 - day))
    for (let hour = 0; hour < 24; hour++) {
      const min = buckets[day][hour]
      const intensity = min / maxMin
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
      result.push({
        color: getHeatColor(intensity, min > 0),
        title: min > 0
          ? `${dateStr} ${hour}:00 · ${Math.round(min)}分钟专注`
          : `${dateStr} ${hour}:00`,
      })
    }
  }

  return result
})

const legendColors = ['rgba(124,108,240,0.08)', 'rgba(124,108,240,0.2)', 'rgba(124,108,240,0.4)', 'rgba(124,108,240,0.65)', 'rgba(124,108,240,0.85)']

function getHeatColor(intensity: number, hasData: boolean): string {
  if (!hasData) return 'rgba(255,255,255,0.02)'
  const i = Math.min(intensity, 1)
  const alpha = 0.1 + i * 0.75
  const r = 100 + Math.round(i * 100)
  const g = 80 + Math.round(i * 60)
  const b = 200 + Math.round(i * 55)
  return `rgba(${r},${g},${b},${alpha})`
}
</script>

<style scoped>
.heatmap-wrap {
  padding: 16px 0;
}

.heatmap-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}

.heatmap-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.heatmap-subtitle {
  font-size: 11px;
  color: var(--text-secondary);
}

.heatmap-grid {
  display: flex;
  gap: 4px;
}

.hour-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0 4px 0 0;
  gap: 0;
  width: 16px;
}

.hour-label {
  font-size: 9px;
  color: rgba(255,255,255,0.2);
  line-height: 1;
}

.heat-cells {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  grid-template-rows: repeat(v-bind('props.days'), 1fr);
  gap: 2px;
  flex: 1;
  aspect-ratio: 6;
}

.heat-cell {
  border-radius: 2px;
  aspect-ratio: 1;
  transition: transform 0.1s;
}

.heat-cell:hover {
  transform: scale(1.4);
  z-index: 2;
  outline: 1px solid rgba(255,255,255,0.2);
}

.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  margin-top: 8px;
}

.legend-label {
  font-size: 10px;
  color: rgba(255,255,255,0.25);
}

.legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
</style>
