<template>
  <section class="ost-panel" aria-label="输出统计">
    <div class="ost-panel-head">
      <span class="ost-panel-title">📊 输出统计</span>
      <span class="ost-panel-sub">类型 · 房间 · 时段 · 趋势</span>
    </div>

    <!-- 概览 -->
    <div class="ost-block">
      <span class="ost-block-label">总体概览</span>
      <div class="ost-stats">
        <div class="ost-stat">
          <span class="ost-stat-num">{{ stats?.totalRecords ?? 0 }}</span>
          <span class="ost-stat-label">总记录</span>
        </div>
        <div class="ost-stat">
          <span class="ost-stat-num">{{ stats?.averageIntensity ?? 0 }}</span>
          <span class="ost-stat-label">平均强度</span>
        </div>
        <div class="ost-stat">
          <span class="ost-stat-num">{{ stats ? stats.mostActiveHour + ':00' : '—' }}</span>
          <span class="ost-stat-label">最活跃时段</span>
        </div>
        <div class="ost-stat">
          <span class="ost-stat-num">{{ stats?.topRooms.length ?? 0 }}</span>
          <span class="ost-stat-label">活跃房间</span>
        </div>
      </div>
    </div>

    <!-- 类型分布 -->
    <div v-if="stats" class="ost-block">
      <span class="ost-block-label">类型分布</span>
      <div v-for="t in typeRows" :key="t.type" class="ost-bar-row">
        <span class="ost-bar-label">{{ t.label }}</span>
        <div class="ost-bar-track">
          <div class="ost-bar-fill" :style="{ width: t.pct + '%' }"></div>
        </div>
        <span class="ost-bar-num">{{ t.count }}</span>
      </div>
    </div>

    <!-- 房间分布 -->
    <div v-if="stats && stats.topRooms.length" class="ost-block">
      <span class="ost-block-label">热门房间</span>
      <div v-for="r in stats.topRooms" :key="r.room" class="ost-room-row">
        <span class="ost-room-name">{{ r.room }}</span>
        <span class="ost-room-count">{{ r.count }} 条</span>
      </div>
    </div>

    <!-- 月度趋势 -->
    <div v-if="stats && stats.monthlyTrend.length" class="ost-block">
      <span class="ost-block-label">月度趋势</span>
      <div class="ost-trend">
        <div v-for="m in stats.monthlyTrend" :key="m.month" class="ost-trend-col">
          <div class="ost-trend-bar" :style="{ height: trendHeight(m.count) + '%' }"></div>
          <span class="ost-trend-label">{{ m.month.slice(5) }}</span>
        </div>
      </div>
    </div>

    <p v-if="!stats || stats.totalRecords === 0" class="ost-hint">暂无输出记录，完成一次输出后这里会生成统计。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useOutputStats } from '../modules/output/advanced'
import type { OutputRecord, OutputRecordType } from '../modules/output'

const props = defineProps<{ records: OutputRecord[] }>()

const statsApi = useOutputStats()

const stats = computed(() => {
  if (props.records.length === 0) return null
  return statsApi.computeStats(props.records)
})

const TYPE_LABELS: Record<OutputRecordType, string> = {
  note: '📝 笔记',
  emotion: '💭 情绪',
  anchor: '⚓ 心锚',
  crystal: '💎 结晶',
  session: '⏱ 会话',
}

const typeRows = computed(() => {
  if (!stats.value) return []
  const total = stats.value.totalRecords || 1
  return (Object.keys(stats.value.byType) as OutputRecordType[])
    .map(type => ({
      type,
      label: TYPE_LABELS[type] || type,
      count: stats.value!.byType[type] || 0,
      pct: Math.round(((stats.value!.byType[type] || 0) / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
})

const maxMonthly = computed(() => {
  if (!stats.value || stats.value.monthlyTrend.length === 0) return 1
  return Math.max(...stats.value.monthlyTrend.map(m => m.count))
})

function trendHeight(count: number): number {
  return Math.max(6, Math.round((count / maxMonthly.value) * 100))
}

watch(() => props.records.length, () => {
  if (props.records.length > 0) statsApi.computeStats(props.records)
})
</script>

<style scoped>
.ost-panel {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.ost-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.ost-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.ost-panel-sub {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.ost-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.ost-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.ost-stats {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.ost-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ost-stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #c9d6b8;
}
.ost-stat-label {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.5);
}
.ost-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.ost-bar-label {
  width: 90px;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.75);
  flex-shrink: 0;
}
.ost-bar-track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.ost-bar-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(138, 154, 122, 0.5), rgba(138, 154, 122, 0.9));
}
.ost-bar-num {
  width: 32px;
  text-align: right;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
}
.ost-room-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.12);
}
.ost-room-row:last-child {
  border-bottom: none;
}
.ost-room-name {
  font-size: 13px;
  color: #e8e4d8;
}
.ost-room-count {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.5);
}
.ost-trend {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 90px;
}
.ost-trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  gap: 4px;
}
.ost-trend-bar {
  width: 70%;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, rgba(138, 154, 122, 0.9), rgba(138, 154, 122, 0.35));
}
.ost-trend-label {
  font-size: 10px;
  color: rgba(232, 228, 216, 0.45);
}
.ost-hint {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.5);
}
</style>
