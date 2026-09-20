<template>
  <section class="vzp" data-test="visualization-cockpit-panel" aria-label="可视化·驾驶舱总览">
    <header class="vzp-head">
      <div class="vzp-head-text">
        <h3 class="vzp-title">🛰️ 可视化·驾驶舱总览</h3>
        <p class="vzp-sub">渲染性能 · 数据源健康 · 图表交互 · 仪表盘布局 — 一屏守望视觉工坊的运转</p>
      </div>
      <div class="vzp-badge" data-test="vzp-badge">
        <span class="vzp-badge-dot" :class="statusKey" data-test="vzp-status"></span>
        <span class="vzp-badge-label">{{ statusLabel }}</span>
      </div>
    </header>

    <!-- 渲染性能 -->
    <div class="vzp-block" data-test="vzp-perf">
      <span class="vzp-block-label">渲染性能</span>
      <div class="vzp-grid">
        <div class="vzp-cell" data-test="vzp-cell">
          <b class="vzp-cell-value">{{ perf.fps }}</b>
          <span class="vzp-cell-label">FPS</span>
        </div>
        <div class="vzp-cell" data-test="vzp-cell">
          <b class="vzp-cell-value">{{ perf.layers }}</b>
          <span class="vzp-cell-label">图层</span>
        </div>
        <div class="vzp-cell" data-test="vzp-cell">
          <b class="vzp-cell-value">{{ perf.commands }}</b>
          <span class="vzp-cell-label">绘制命令</span>
        </div>
        <div class="vzp-cell" data-test="vzp-cell">
          <b class="vzp-cell-value">{{ perf.dirty }}</b>
          <span class="vzp-cell-label">脏区域</span>
        </div>
      </div>
    </div>

    <!-- 数据源健康 -->
    <div class="vzp-block" data-test="vzp-source">
      <span class="vzp-block-label">数据源健康</span>
      <div class="vzp-grid">
        <div class="vzp-cell" data-test="vzp-cell">
          <b class="vzp-cell-value">{{ source.connected }}</b>
          <span class="vzp-cell-label">已连接</span>
        </div>
        <div class="vzp-cell" data-test="vzp-cell">
          <b class="vzp-cell-value">{{ source.total }}</b>
          <span class="vzp-cell-label">源总数</span>
        </div>
        <div class="vzp-cell" data-test="vzp-cell">
          <b class="vzp-cell-value" :class="{ 'vzp-warn': source.errors > 0 }">{{ source.errors }}</b>
          <span class="vzp-cell-label">错误源</span>
        </div>
      </div>
    </div>

    <!-- 图表交互 -->
    <div class="vzp-block" data-test="vzp-interact">
      <span class="vzp-block-label">图表交互</span>
      <div class="vzp-grid">
        <div class="vzp-cell" data-test="vzp-cell">
          <b class="vzp-cell-value">{{ interact.annotations }}</b>
          <span class="vzp-cell-label">标注</span>
        </div>
        <div class="vzp-cell" data-test="vzp-cell">
          <b class="vzp-cell-value">{{ interact.scale }}</b>
          <span class="vzp-cell-label">缩放</span>
        </div>
        <div class="vzp-cell" data-test="vzp-cell">
          <b class="vzp-cell-value">{{ interact.state }}</b>
          <span class="vzp-cell-label">交互态</span>
        </div>
      </div>
    </div>

    <!-- 仪表盘布局 -->
    <div class="vzp-block" data-test="vzp-layout">
      <span class="vzp-block-label">仪表盘布局</span>
      <div class="vzp-grid">
        <div class="vzp-cell" data-test="vzp-cell">
          <b class="vzp-cell-value">{{ layout.panels }}</b>
          <span class="vzp-cell-label">面板</span>
        </div>
        <div class="vzp-cell" data-test="vzp-cell">
          <b class="vzp-cell-value">{{ layout.maxRow }}</b>
          <span class="vzp-cell-label">最大行</span>
        </div>
        <div class="vzp-cell" data-test="vzp-cell">
          <b class="vzp-cell-value">{{ layout.breakpoint }}</b>
          <span class="vzp-cell-label">断点</span>
        </div>
      </div>
    </div>

    <p v-if="isIdle" class="vzp-empty" data-test="vzp-empty">
      驾驶舱尚在待命。连接或创建数据源、开启一次渲染，性能与布局指标将在这里显影。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useVisualizationBridge } from '../modules/visualization/visualization-bridge'

const bridge = useVisualizationBridge()
const s = computed(() => unref(bridge.state))

const perf = computed(() => {
  const st = s.value
  return { fps: st.fps, layers: st.layerCount, commands: st.commandCount, dirty: st.dirtyRegionCount }
})
const source = computed(() => {
  const st = s.value
  return { connected: st.connectedSources, total: st.totalSources, errors: st.errorSources }
})
const interact = computed(() => {
  const st = s.value
  const scale = Math.round((st.viewport?.scale ?? 1) * 100) / 100
  const state = st.isPanning ? '平移' : st.isTransitioning ? '过渡' : '就绪'
  return { annotations: st.annotationCount, scale, state }
})
const layout = computed(() => {
  const st = s.value
  const bp = typeof st.currentBreakpoint?.name === 'string' ? st.currentBreakpoint.name : '—'
  return { panels: st.panelCount, maxRow: st.maxRow, breakpoint: bp }
})

const isIdle = computed(() => s.value.totalSources === 0 && s.value.panelCount === 0)

const statusKey = computed(() => {
  const st = s.value
  if (st.isTransitioning) return 'busy'
  if (st.errorSources > 0) return 'warn'
  if (st.connectedSources > 0) return 'active'
  return 'idle'
})
const statusLabel = computed(() => {
  const st = s.value
  if (st.isTransitioning) return '转译中'
  if (st.errorSources > 0) return '有异常'
  if (st.connectedSources > 0) return '运转中'
  return '待命'
})
</script>

<style scoped>
.vzp {
  background: linear-gradient(160deg, rgba(212, 165, 116, 0.08), rgba(212, 165, 116, 0.02));
  border: 1px solid rgba(212, 165, 116, 0.14);
  border-radius: 14px;
  padding: 16px 18px;
  color: var(--text);
}
.vzp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.vzp-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.vzp-sub {
  margin: 3px 0 0;
  font-size: 12px;
  opacity: 0.55;
}
.vzp-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(212, 165, 116, 0.08);
}
.vzp-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.vzp-badge-dot.idle { background: #95a5a6; }
.vzp-badge-dot.active { background: #8a9a7a; }
.vzp-badge-dot.busy { background: #d0b269; }
.vzp-badge-dot.warn { background: #c46a5a; }
.vzp-badge-label { font-size: 12px; opacity: 0.8; }
.vzp-block { margin-top: 12px; }
.vzp-block:first-of-type { margin-top: 0; }
.vzp-block-label {
  display: inline-block;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.55;
  margin-bottom: 8px;
}
.vzp-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.vzp-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(212, 165, 116, 0.05);
  border: 1px solid rgba(212, 165, 116, 0.08);
}
.vzp-cell-value {
  font-size: 15px;
  font-weight: 600;
}
.vzp-cell-value.vzp-warn { color: #d08a7a; }
.vzp-cell-label { font-size: 11px; opacity: 0.6; }
.vzp-empty {
  margin: 12px 0 0;
  font-size: 12px;
  opacity: 0.55;
}
</style>