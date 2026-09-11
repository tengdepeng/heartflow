<template>
  <section class="vip-panel">
    <header class="vip-head">
      <div class="vip-head-text">
        <h3 class="vip-title">可视化交互</h3>
        <p class="vip-sub">图表交互 · 可配置仪表盘布局</p>
      </div>
    </header>

    <div class="vip-body">
      <!-- 图表交互 -->
      <div class="vip-section">
        <h4 class="vip-section-title">图表交互</h4>
        <div class="vip-stats">
          <span class="vip-stat">缩放 {{ zoomScale }}</span>
          <span class="vip-stat">标注 {{ annotationCount }}</span>
          <span class="vip-stat">断点 {{ currentBreakpoint || '—' }}</span>
        </div>
        <div class="vip-actions">
          <button class="vip-btn" type="button" @click="chart.zoomIn()">放大</button>
          <button class="vip-btn" type="button" @click="chart.zoomOut()">缩小</button>
          <button class="vip-btn" type="button" @click="chart.resetView()">复位视图</button>
        </div>
      </div>

      <!-- 仪表盘布局 -->
      <div class="vip-section">
        <h4 class="vip-section-title">仪表盘布局</h4>
        <div class="vip-stats">
          <span class="vip-stat">面板 {{ panelCount }}</span>
          <span class="vip-stat">断点 {{ layoutBreakpoint || '—' }}</span>
          <span class="vip-stat" :class="{ 'vip-dirty': isDirty }">{{ isDirty ? '已修改' : '未修改' }}</span>
        </div>
        <div class="vip-actions">
          <button class="vip-btn" type="button" @click="layout.resetLayout()">重置布局</button>
          <button class="vip-btn" type="button" @click="layout.clearPanels()">清空面板</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useChartInteraction } from '@/modules/visualization/chart-interaction'
import { useDashboardLayout } from '@/modules/visualization/dashboard-layout'

// 薄委托：直接消费两引擎自建实例（工厂函数，非单例，不接 visualization-bridge）。
const chart = useChartInteraction()
const layout = useDashboardLayout()

const zoomScale = computed(() => {
  const vp = unref(chart.viewport)
  const scale = typeof vp?.scale === 'number' ? vp.scale : 1
  return Math.round(scale * 100) / 100
})

const annotationCount = computed(() => unref(chart.annotationCount) ?? 0)
const currentBreakpoint = computed(() => unref(chart.currentBreakpoint) ?? '')

const panelCount = computed(() => unref(layout.panelCount) ?? 0)
const layoutBreakpoint = computed(() => unref(layout.currentBreakpoint) ?? '')
const isDirty = computed(() => unref(layout.isDirty) ?? false)
</script>

<style scoped>
.vip-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--hf-border);
  background: var(--hf-surface);
  color: var(--hf-text);
  border-radius: var(--hf-radius);
  box-shadow: var(--hf-shadow);
}
.vip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.vip-head-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.vip-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--hf-text);
}
.vip-sub {
  margin: 0;
  font-size: 12px;
  color: var(--hf-text-muted);
}
.vip-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.vip-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--hf-border);
  border-radius: calc(var(--hf-radius) * 0.6);
  background: var(--hf-bg);
}
.vip-section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--hf-text);
}
.vip-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: var(--hf-text-muted);
}
.vip-stat {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--hf-surface);
}
.vip-dirty {
  color: #d98a00;
}
.vip-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.vip-btn {
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid var(--hf-border);
  border-radius: 4px;
  background: var(--hf-surface);
  color: var(--hf-text);
  cursor: pointer;
}
.vip-btn:hover {
  border-color: var(--hf-primary);
  color: var(--hf-primary);
}
</style>
