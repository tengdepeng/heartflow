<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import {
  useCanvasRenderer,
  adjustOpacity,
  VIZ_SUBJECTS,
  useVisualizationStudio,
} from '../modules/visualization'
import { useAdaptiveQuality } from '../modules/adaptive'
import type { SevenDimensionOutput, VizSubject } from '../modules/visualization'
import TransformPipelinePanel from '../components/TransformPipelinePanel.vue'
import VisualizationInteractionPanel from '../components/VisualizationInteractionPanel.vue'
import VisualizationCockpitPanel from '../components/VisualizationCockpitPanel.vue'
import DimensionMappingPanel from '../components/DimensionMappingPanel.vue'
import DataSourceConnectorPanel from '../components/DataSourceConnectorPanel.vue'

useViewEntrance()

const CHART = { width: 900, height: 540 }
const MAX_RADIUS = 40
const MIN_RADIUS = 3

const canvasRef = ref<HTMLCanvasElement | null>(null)
const studio = useVisualizationStudio()
const renderer = useCanvasRenderer()
// 性能自适应：低端设备降低 Canvas 设备像素比（M2）
const quality = useAdaptiveQuality()

/** 把引擎输出绘制到 Canvas（无 2D 上下文环境下降级，不抛错） */
function renderToCanvas(): void {
  const canvas = canvasRef.value
  if (!canvas) return

  renderer.updateContextConfig({
    width: CHART.width,
    height: CHART.height,
    transparent: true,
    devicePixelRatio: quality.profile.value.dprCap,
  })

  try {
    renderer.bindCanvas(canvas)
  } catch {
    return
  }

  // 响应式：保持逻辑分辨率，CSS 横向自适应
  canvas.style.maxWidth = '100%'
  canvas.style.height = 'auto'

  const output: SevenDimensionOutput = studio.engine.value.apply(studio.items.value, CHART)

  renderer.clearLayers()
  const dataLayer = renderer.createLayer('studio-data', 'data')

  for (const item of output.items) {
    const r = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, item.size.value || MIN_RADIUS))
    renderer.drawCircle(dataLayer.id, item.position[0], item.position[1], r, {
      fill: adjustOpacity(item.color.color, item.opacity),
    })
  }

  renderer.requestFrame()
}

function onSelectSubject(subject: VizSubject): void {
  studio.selectSubject(subject)
  nextTick(renderToCanvas)
}

function onApplyNl(): void {
  studio.applyNaturalLanguage(studio.nlDescription.value)
  nextTick(renderToCanvas)
}

function onReset(): void {
  studio.resetConfig()
  nextTick(renderToCanvas)
}

// 数据或主题变化时重绘
watch(
  () => [studio.activeSubject.value, studio.items.value.length, studio.engine.value],
  () => nextTick(renderToCanvas),
  { deep: false },
)

onMounted(renderToCanvas)
</script>

<template>
  <div class="visualization-studio-room">
    <header class="studio-header">
      <h1 class="studio-title">数据视觉工坊</h1>
      <p class="studio-subtitle">
        用「数据视觉逻辑语言」把本地心流数据，转译成光点、光晕与排布
      </p>
    </header>

    <nav class="studio-tabs" role="tablist">
      <button
        v-for="s in VIZ_SUBJECTS"
        :key="s.key"
        class="studio-tab"
        :class="{ 'is-active': studio.activeSubject.value === s.key }"
        type="button"
        role="tab"
        :aria-selected="studio.activeSubject.value === s.key"
        :data-testid="`tab-${s.key}`"
        @click="onSelectSubject(s.key)"
      >
        {{ s.label }}
      </button>
    </nav>

    <section class="studio-control">
      <label class="studio-control__label" for="nl-input">用一句话描述你想要的视觉</label>
      <textarea
        id="nl-input"
        v-model="studio.nlDescription.value"
        class="studio-control__textarea"
        rows="2"
        placeholder="例如：用光点表示每个专注会话。会话的专注时长决定光点的大小。所有光点围绕同一圆心排列。"
        data-testid="nl-input"
      ></textarea>
      <div class="studio-control__actions">
        <button class="studio-btn studio-btn--primary" type="button" data-testid="nl-apply" @click="onApplyNl">
          应用语言
        </button>
        <button class="studio-btn" type="button" data-testid="nl-reset" @click="onReset">
          重置
        </button>
      </div>
      <p
        v-if="studio.lastApplied.value"
        class="studio-control__hint"
        data-testid="nl-hint"
      >
        <template v-if="studio.lastApplied.value.success">已按语言调整视觉</template>
        <template v-else>未能识别有效描述，已沿用默认视觉</template>
        <span v-if="studio.lastApplied.value.unrecognized.length" class="studio-control__unrecognized">
          （未识别：{{ studio.lastApplied.value.unrecognized.join('；') }}）
        </span>
      </p>
    </section>

    <!-- 数据变换流水线（datasource-connector 引擎：为视觉转译备好精炼数据集，INCR-226） -->
    <TransformPipelinePanel />

    <!-- 可视化交互（INCR-252 补挂载孤儿组件：图表缩放/标注/断点 + 仪表盘布局控制） -->
    <VisualizationInteractionPanel />

    <!-- 可视化·驾驶舱总览（INCR-388 补挂载孤儿桥接面板 VisualizationCockpitPanel：useVisualizationBridge 聚合 chart-interaction/canvas-renderer/datasource-connector/dashboard-layout 四引擎的驾驶舱态 渲染性能 fps/图层/绘制命令/脏区域 + 数据源健康 已连接/源总数/错误源 + 图表交互 标注/缩放/交互态 + 仪表盘布局 面板/最大行/断点, VisualizationStudio.vue 原仅直引 useVisualizationStudio+useCanvasRenderer 专项引擎+两个专项面板 Interaction(chart-interaction/dashboard-layout)/Transform(datasource 变换), 车接层驾驶舱聚合面零呈现, 真缺口） -->
    <VisualizationCockpitPanel />

    <!-- 维度映射（INCR-403 补挂载零消费引擎 DimensionMappingPanel：dimension-mapping 7 维映射定义 DIMENSION_MAPPINGS + applyDimensionMapping 执行 整体零 UI 消费, 可视化主题内真缺口） -->
    <DimensionMappingPanel />

    <!-- 数据源连接器（INCR-404 补挂载零 UI 引擎 DataSourceConnectorPanel：datasource-connector 的 useDataSourceConnector 数据源注册/连接生命周期/订阅/轮询/缓存/错误恢复 整体仅被 visualization-bridge 聚合, 驾驶舱只呈现健康计数, 管理面零 UI 消费, 可视化主题内真缺口） -->
    <DataSourceConnectorPanel />

    <section class="studio-canvas-wrap">
      <canvas ref="canvasRef" class="studio-canvas" data-testid="studio-canvas"></canvas>
      <p
        v-if="studio.isEmpty.value"
        class="studio-empty"
        data-testid="studio-empty"
      >
        {{ VIZ_SUBJECTS.find((s) => s.key === studio.activeSubject.value)?.hint }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.visualization-studio-room {
  min-height: 100%;
  padding: 28px 24px 48px;
  position: relative;
  background: transparent;
}

.visualization-studio-room::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, rgba(212, 165, 116, 0.10), transparent 60%);
  pointer-events: none;
}

.studio-header {
  position: relative;
  margin-bottom: 20px;
}

.studio-title {
  font-size: 26px;
  font-weight: 600;
  color: var(--text-primary, #f0e8dc);
  margin: 0 0 6px;
}

.studio-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, #a89a88);
  max-width: 560px;
  line-height: 1.6;
}

.studio-tabs {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.studio-tab {
  padding: 7px 16px;
  border-radius: 999px;
  border: 1px solid var(--border, rgba(212, 165, 116, 0.25));
  background: rgba(212, 165, 116, 0.06);
  color: var(--text-secondary, #a89a88);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.studio-tab.is-active {
  background: rgba(212, 165, 116, 0.18);
  color: var(--text-primary, #f0e8dc);
  border-color: rgba(212, 165, 116, 0.5);
}

.studio-control {
  position: relative;
  max-width: 720px;
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--border, rgba(212, 165, 116, 0.18));
  background: rgba(26, 22, 18, 0.45);
}

.studio-control__label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary, #a89a88);
  margin-bottom: 8px;
}

.studio-control__textarea {
  width: 100%;
  resize: vertical;
  border-radius: 10px;
  border: 1px solid var(--border, rgba(212, 165, 116, 0.25));
  background: rgba(15, 12, 10, 0.6);
  color: var(--text-primary, #f0e8dc);
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  font-family: inherit;
}

.studio-control__textarea:focus {
  outline: none;
  border-color: rgba(212, 165, 116, 0.55);
}

.studio-control__actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.studio-btn {
  padding: 7px 18px;
  border-radius: 10px;
  border: 1px solid var(--border, rgba(212, 165, 116, 0.3));
  background: rgba(212, 165, 116, 0.08);
  color: var(--text-primary, #f0e8dc);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.studio-btn--primary {
  background: rgba(212, 165, 116, 0.22);
  border-color: rgba(212, 165, 116, 0.55);
}

.studio-btn:hover {
  background: rgba(212, 165, 116, 0.3);
}

.studio-control__hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-secondary, #a89a88);
}

.studio-control__unrecognized {
  color: #c05050;
}

.studio-canvas-wrap {
  position: relative;
  width: 100%;
}

.studio-canvas {
  display: block;
  width: 100%;
  max-width: 900px;
  border-radius: 14px;
  background: transparent;
}

.studio-empty {
  margin-top: 14px;
  font-size: 13px;
  color: var(--text-secondary, #a89a88);
}

@media (max-width: 639px) {
  .visualization-studio-room {
    padding: 20px 14px 40px;
  }

  .studio-title {
    font-size: 22px;
  }
}
</style>
