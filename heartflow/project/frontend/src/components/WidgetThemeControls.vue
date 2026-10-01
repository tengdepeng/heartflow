<template>
  <div class="wtheme" :class="{ 'wtheme-compact': compact }" @pointerdown.stop @click.stop>
    <div class="wtheme-row">
      <span class="wtheme-label">强调色</span>
      <div class="wtheme-swatches">
        <button
          v-for="p in WIDGET_ACCENT_PRESETS"
          :key="p.id"
          class="wtheme-swatch"
          :class="{ active: current.accent.toLowerCase() === p.value.toLowerCase() }"
          :style="{ background: p.value }"
          :title="p.label"
          @click="setAccent(p.value)"
        />
      </div>
    </div>

    <div class="wtheme-row">
      <span class="wtheme-label">圆角</span>
      <button
        v-for="r in RADIUS_STEPS"
        :key="r.value"
        class="wtheme-chip"
        :class="{ active: current.radius === r.value }"
        @click="setRadius(r.value)"
      >{{ r.label }}</button>
    </div>

    <div class="wtheme-row">
      <span class="wtheme-label">透明</span>
      <input
        class="wtheme-range"
        type="range"
        min="0.4"
        max="1"
        step="0.05"
        :value="current.alpha"
        @input="onAlpha"
      />
      <span class="wtheme-val">{{ Math.round(current.alpha * 100) }}%</span>
    </div>

    <div class="wtheme-row">
      <span class="wtheme-label">背景</span>
      <button
        v-for="b in BG_PRESETS"
        :key="b.id"
        class="wtheme-chip"
        :class="{ active: (current.bg || '') === b.value }"
        @click="setBg(b.value)"
      >{{ b.label }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// ============================================================
// 小组件外观调节（颜色 / 圆角 / 透明度 / 背景）
// 对齐 136apk「2.130 小组件盒子」的「小组件主题一键切换」，
// 落到每个小组件实例的 theme 字段，经 CSS 变量在卡片外壳生效。
// 复用：/widgets 管理页（完整）与系统小窗（紧凑）同一实现。
// ============================================================
import { computed } from 'vue'
import type { WidgetInstance, WidgetTheme } from '../modules/touchpoints'
import {
  WIDGET_ACCENT_PRESETS,
  resolveWidgetTheme,
} from '../modules/touchpoints'
import { useWidgetManager } from '../modules/touchpoints'

const props = withDefaults(defineProps<{ instance: WidgetInstance; compact?: boolean }>(), {
  compact: false,
})

const manager = useWidgetManager()
const current = computed(() => resolveWidgetTheme(props.instance.theme))

const RADIUS_STEPS = [
  { value: 8, label: '小' },
  { value: 12, label: '中' },
  { value: 18, label: '大' },
]
const BG_PRESETS = [
  { id: 'glass', label: '玻璃', value: '' },
  { id: 'ink', label: '深墨', value: 'rgba(18, 24, 38, 0.96)' },
  { id: 'warm', label: '暖褐', value: 'rgba(42, 33, 24, 0.94)' },
]

function patch(p: WidgetTheme) {
  manager.setWidgetTheme(props.instance.id, p)
}
function setAccent(v: string) { patch({ accent: v }) }
function setRadius(v: number) { patch({ radius: v }) }
function setBg(v: string) { patch({ bg: v }) }
function onAlpha(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  if (!Number.isNaN(v)) patch({ alpha: v })
}
</script>

<style scoped>
.wtheme { display: flex; flex-direction: column; gap: 5px; }
.wtheme-row { display: flex; align-items: center; gap: 6px; }
.wtheme-label { width: 34px; flex: none; font-size: 10px; color: #8a94ad; }
.wtheme-swatches { display: flex; gap: 4px; flex-wrap: wrap; }
.wtheme-swatch {
  width: 16px; height: 16px; border-radius: 50%; padding: 0; cursor: pointer;
  border: 2px solid transparent; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
}
.wtheme-swatch.active { border-color: #fff; }
.wtheme-chip {
  padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(140, 160, 200, 0.2);
  background: transparent; color: #b6c0d8; font-size: 11px; cursor: pointer;
}
.wtheme-chip:hover { background: rgba(120, 140, 200, 0.14); }
.wtheme-chip.active { background: rgba(90, 120, 220, 0.24); border-color: #6b86d8; color: #fff; }
.wtheme-range { flex: 1; min-width: 60px; accent-color: #6b86d8; }
.wtheme-val { width: 32px; text-align: right; font-size: 10px; color: #9fb0d4; }

.wtheme-compact { gap: 4px; }
.wtheme-compact .wtheme-label { width: 28px; }
</style>
