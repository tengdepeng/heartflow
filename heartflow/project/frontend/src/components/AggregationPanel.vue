<template>
  <section class="ag-panel" aria-label="聚合视图">
    <div class="ag-panel-head">
      <span class="ag-panel-title">📈 聚合视图</span>
      <span class="ag-panel-sub">按粒度俯瞰时间线密度</span>
    </div>

    <!-- 粒度选择 -->
    <div class="ag-block">
      <span class="ag-block-label">聚合粒度</span>
      <div class="ag-gran-row">
        <button
          v-for="g in GRANULARITIES"
          :key="g.value"
          class="ag-gran-btn"
          :class="{ 'ag-gran-btn--active': granularity === g.value }"
          @click="granularity = g.value"
        >{{ g.label }}</button>
      </div>
    </div>

    <!-- 概览 -->
    <div v-if="result" class="ag-block">
      <span class="ag-block-label">聚合概览</span>
      <div class="ag-stats">
        <div class="ag-stat">
          <span class="ag-stat-num">{{ result.totalEntries }}</span>
          <span class="ag-stat-label">条目</span>
        </div>
        <div class="ag-stat">
          <span class="ag-stat-num">{{ result.totalWeight }}</span>
          <span class="ag-stat-label">总权重</span>
        </div>
        <div class="ag-stat">
          <span class="ag-stat-num">{{ result.peakDay ? result.peakDay.count : '—' }}</span>
          <span class="ag-stat-label">峰值</span>
        </div>
        <div class="ag-stat">
          <span class="ag-stat-num">{{ result.quietestDay ? result.quietestDay.count : '—' }}</span>
          <span class="ag-stat-label">低谷</span>
        </div>
      </div>
      <p v-if="result.peakDay" class="ag-peak-note">
        最活跃：{{ result.peakDay.label }}（{{ result.peakDay.count }} 条）· 最安静：{{ result.quietestDay?.label }}（{{ result.quietestDay?.count }} 条）
      </p>
    </div>

    <!-- 分布 -->
    <div v-if="result" class="ag-block">
      <span class="ag-block-label">类型分布</span>
      <div v-for="[type, count] in typeRows" :key="type" class="ag-bar-row">
        <span class="ag-bar-label">{{ typeLabel(type) }}</span>
        <div class="ag-bar-track">
          <div class="ag-bar-fill" :style="{ width: typePct(count) + '%' }"></div>
        </div>
        <span class="ag-bar-num">{{ count }}</span>
      </div>
    </div>

    <!-- 聚合条目 -->
    <div v-if="result && result.items.length" class="ag-block">
      <span class="ag-block-label">分段时间线（{{ result.items.length }} 段）</span>
      <div v-for="item in result.items" :key="item.key" class="ag-item">
        <div class="ag-item-head">
          <span class="ag-item-label">{{ item.label }}</span>
          <span class="ag-item-count">{{ item.count }} 条 · 权重 {{ item.totalWeight }}</span>
        </div>
        <div class="ag-item-track">
          <div class="ag-item-fill" :style="{ width: itemPct(item.count) + '%' }"></div>
        </div>
      </div>
    </div>

    <p v-if="!result || result.totalEntries === 0" class="ag-hint">当前时间范围内没有索引条目。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAggregation } from '../modules/timeline-index/aggregation'
import type { AggregationGranularity } from '../modules/timeline-index/aggregation'
import type { IndexEntry } from '../modules/timeline-index'

const props = defineProps<{ entries: IndexEntry[] }>()

const GRANULARITIES: { value: AggregationGranularity; label: string }[] = [
  { value: 'day', label: '按日' },
  { value: 'week', label: '按周' },
  { value: 'month', label: '按月' },
]

const granularity = ref<AggregationGranularity>('day')
const aggregation = useAggregation(() => props.entries)

const result = computed(() => {
  if (props.entries.length === 0) return null
  return aggregation.aggregate({ granularity: granularity.value, startDate: '', endDate: '' })
})

const maxCount = computed(() => {
  if (!result.value || result.value.items.length === 0) return 1
  return Math.max(...result.value.items.map(i => i.count))
})

const typeRows = computed(() => {
  if (!result.value) return []
  return Object.entries(result.value.typeDistribution).sort((a, b) => b[1] - a[1])
})

function typePct(count: number): number {
  if (!result.value || result.value.totalEntries === 0) return 0
  return Math.round((count / result.value.totalEntries) * 100)
}

function itemPct(count: number): number {
  return Math.max(4, Math.round((count / maxCount.value) * 100))
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    crystal: '💎 结晶', note: '📝 笔记', emotion: '🌷 情绪',
    session: '⏱ 专注', anchor: '⚓ 心锚', output: '📤 输出',
  }
  return map[type] || type
}
</script>

<style scoped>
.ag-panel {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.ag-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.ag-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.ag-panel-sub {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.ag-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.ag-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.ag-gran-row {
  display: flex;
  gap: 8px;
}
.ag-gran-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(139, 155, 122, 0.3);
  background: rgba(10, 12, 10, 0.5);
  color: rgba(232, 228, 216, 0.7);
  font-size: 13px;
  cursor: pointer;
}
.ag-gran-btn--active {
  background: rgba(138, 154, 122, 0.35);
  color: #e8e4d8;
  border-color: rgba(138, 154, 122, 0.6);
}
.ag-stats {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.ag-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ag-stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #c9d6b8;
}
.ag-stat-label {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.5);
}
.ag-peak-note {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
}
.ag-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.ag-bar-label {
  width: 90px;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.75);
  flex-shrink: 0;
}
.ag-bar-track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.ag-bar-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(138, 154, 122, 0.5), rgba(138, 154, 122, 0.9));
}
.ag-bar-num {
  width: 32px;
  text-align: right;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
}
.ag-item {
  margin-bottom: 10px;
}
.ag-item-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.ag-item-label {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.8);
}
.ag-item-count {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.45);
}
.ag-item-track {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
.ag-item-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(107, 159, 196, 0.5), rgba(107, 159, 196, 0.9));
}
.ag-hint {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.5);
}
</style>
