<template>
  <section class="dmp">
    <header class="dmp-header">
      <h2 class="dmp-title">📊 维度映射</h2>
      <p class="dmp-sub">数据 · 视觉 · 隐喻</p>
    </header>

    <div class="dmp-body">
      <div class="dmp-list">
        <div
          v-for="m in mappings"
          :key="m.dataDimension"
          class="dmp-item"
          :class="{ 'dmp-item--active': selected === m.dataDimension }"
          @click="select(m.dataDimension)"
        >
          <span class="dmp-item-icon">{{ iconOf(m.visualDimension) }}</span>
          <div class="dmp-item-main">
            <span class="dmp-item-name">{{ m.name }}</span>
            <span class="dmp-item-desc">{{ m.description }}</span>
          </div>
          <span class="dmp-item-range">{{ fmtRange(m.defaultRange) }}</span>
        </div>
      </div>

      <div class="dmp-demo">
        <div class="dmp-demo-head">
          <span class="dmp-demo-label">实时演示</span>
          <span class="dmp-demo-dim">{{ dimLabel(selected) }}</span>
        </div>

        <input
          v-model.number="value"
          class="dmp-slider"
          type="range"
          :min="range[0]"
          :max="range[1]"
          step="0.01"
        />
        <div class="dmp-demo-value">{{ value.toFixed(2) }}</div>

        <div class="dmp-stage">
          <!-- 数值 → 颜色 -->
          <template v-if="selected === 'value'">
            <div class="dmp-swatch" :style="{ background: colorResult }"></div>
            <span class="dmp-result">{{ colorResult }}</span>
          </template>

          <!-- 趋势 → 方向 -->
          <template v-else-if="selected === 'trend'">
            <span class="dmp-arrow" :style="{ transform: `rotate(${dirResult.angle}deg)` }">{{ dirResult.arrow }}</span>
            <span class="dmp-result">{{ dirName(dirResult.direction) }}</span>
          </template>

          <!-- 幅度 → 尺寸 -->
          <template v-else-if="selected === 'magnitude'">
            <div class="dmp-size" :style="{ width: sizeResult + 'px', height: sizeResult + 'px' }"></div>
            <span class="dmp-result">{{ sizeResult.toFixed(0) }}px</span>
          </template>

          <!-- 密度 → 透明度 -->
          <template v-else-if="selected === 'density'">
            <div class="dmp-size" :style="{ opacity: opacityResult }"></div>
            <span class="dmp-result">{{ (opacityResult * 100).toFixed(0) }}%</span>
          </template>

          <!-- 复杂度 → 纹理 -->
          <template v-else-if="selected === 'complexity'">
            <svg class="dmp-texture" :style="{ background: textureColor }" viewBox="0 0 32 32">
              <defs>
                <pattern
                  :id="textureId"
                  width="8"
                  height="8"
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M0,0 L8,8 M8,0 L0,8" stroke="#c46a5a" stroke-width="1.5" :stroke-opacity="textureOpacity" />
                </pattern>
              </defs>
              <rect width="32" height="32" :fill="`url(#${textureId})`" />
            </svg>
            <span class="dmp-result">{{ textureLabel(textureResult.density) }}</span>
          </template>

          <!-- 紧急度 → 发光 -->
          <template v-else-if="selected === 'urgency'">
            <div
              class="dmp-glow"
              :style="{
                boxShadow: `0 0 ${glowResult.radius.toFixed(0)}px ${(glowResult.radius / 2).toFixed(0)}px ${glowResult.color}`,
              }"
            ></div>
            <span class="dmp-result">{{ (glowResult.intensity * 100).toFixed(0) }}%</span>
          </template>

          <!-- 进度 → 位置 -->
          <template v-else>
            <div class="dmp-track">
              <span class="dmp-track-dot" :style="{ left: posResult.normalized * 100 + '%' }"></span>
            </div>
            <span class="dmp-result">{{ (posResult.normalized * 100).toFixed(0) }}%</span>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  applyDimensionMapping,
  getDimensionMappings,
  type DataDimension,
  type VisualDimension,
  type DirectionResult,
  type TextureResult,
} from '../modules/visualization/dimension-mapping'

const mappings = getDimensionMappings()

const selected = ref<DataDimension>('value')
const value = ref(0.5)

const DIM_LABELS: Record<DataDimension, string> = {
  value: '数值',
  trend: '趋势',
  magnitude: '幅度',
  density: '密度',
  complexity: '复杂度',
  urgency: '紧急度',
  progress: '进度',
}

const VISUAL_ICONS: Record<VisualDimension, string> = {
  color: '🎨',
  direction: '🧭',
  size: '⭕',
  opacity: '◐',
  texture: '▦',
  glow: '✨',
  position: '📍',
}

const DIR_LABELS: Record<DirectionResult['direction'], string> = {
  up: '上升',
  down: '下降',
  flat: '持平',
}

const TEXTURE_LABELS: Record<TextureResult['density'], string> = {
  sparse: '稀疏',
  medium: '中等',
  dense: '致密',
}

function iconOf(v: VisualDimension): string {
  return VISUAL_ICONS[v]
}

function dimLabel(d: DataDimension): string {
  return DIM_LABELS[d]
}

function dirName(d: DirectionResult['direction']): string {
  return DIR_LABELS[d]
}

function textureLabel(d: TextureResult['density']): string {
  return TEXTURE_LABELS[d]
}

function fmtRange(r: [number, number]): string {
  return `${r[0]} ~ ${r[1]}`
}

function select(d: DataDimension): void {
  selected.value = d
  const m = mappings.find((mm) => mm.dataDimension === d)
  value.value = m ? (m.defaultRange[0] + m.defaultRange[1]) / 2 : 0.5
}

const range = computed<[number, number]>(() => {
  const m = mappings.find((mm) => mm.dataDimension === selected.value)
  return m ? m.defaultRange : [0, 1]
})

const config = {
  baseSize: 40,
  metaphor: {
    palette: {
      primary: '#8a9a7a',
      secondary: '#a8b59a',
      accent: '#c46a5a',
      muted: '#6a7a6a',
      bg: '#f4f1ea',
      surface: '#fffdf7',
      border: '#d8d2c4',
      positive: '#8a9a7a',
      negative: '#c46a5a',
      neutral: '#b8b2a4',
      gradient: [[0, '#8a9a7a'], [0.5, '#f0c040'], [1, '#c46a5a']] as [number, string][],
    },
  },
}

const result = computed(() => applyDimensionMapping(value.value, selected.value, config))

const colorResult = computed(() => (result.value.value as string))
const dirResult = computed(() => result.value.value as DirectionResult)
const sizeResult = computed(() => result.value.value as number)
const opacityResult = computed(() => result.value.value as number)
const textureResult = computed(() => result.value.value as TextureResult)
const textureOpacity = computed(() => {
  const t = Math.max(0, Math.min(1, value.value))
  return 0.35 + t * 0.55
})
const textureColor = computed(() => '#3a3328')
const textureId = 'dmp-texture-pattern'
const glowResult = computed(() => result.value.value as { intensity: number; radius: number; color: string })
const posResult = computed(() => result.value.value as { normalized: number; coordinate: number })
</script>

<style scoped>
.dmp {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 18px 20px;
  margin-top: 16px;
}

.dmp-header {
  margin-bottom: 14px;
}

.dmp-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.dmp-sub {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.55;
}

.dmp-body {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 18px;
}

.dmp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dmp-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.dmp-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.dmp-item--active {
  border-color: rgba(240, 192, 64, 0.45);
  background: rgba(240, 192, 64, 0.08);
}

.dmp-item-icon {
  font-size: 18px;
}

.dmp-item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.dmp-item-name {
  font-size: 13px;
  font-weight: 600;
}

.dmp-item-desc {
  font-size: 11px;
  opacity: 0.55;
  line-height: 1.4;
}

.dmp-item-range {
  font-size: 11px;
  opacity: 0.45;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.dmp-demo {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
}

.dmp-demo-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dmp-demo-label {
  font-size: 12px;
  opacity: 0.6;
}

.dmp-demo-dim {
  font-size: 13px;
  font-weight: 600;
  color: #f0c040;
}

.dmp-slider {
  width: 100%;
  accent-color: #f0c040;
}

.dmp-demo-value {
  font-size: 12px;
  opacity: 0.6;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.dmp-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-height: 96px;
  justify-content: center;
}

.dmp-swatch {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.dmp-arrow {
  font-size: 40px;
  line-height: 1;
}

.dmp-size {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #8a9a7a;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.dmp-texture {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.dmp-glow {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f0c040;
}

.dmp-track {
  position: relative;
  width: 220px;
  height: 10px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.1);
}

.dmp-track-dot {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #f0c040;
  transform: translate(-50%, -50%);
}

.dmp-result {
  font-size: 12px;
  opacity: 0.8;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 720px) {
  .dmp-body {
    grid-template-columns: 1fr;
  }
}
</style>
