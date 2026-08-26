<template>
  <section class="es-panel" aria-label="护眼盾">
    <div class="es-panel-head">
      <span class="es-panel-title">🫐 护眼盾</span>
      <span class="es-panel-sub">昼夜分时 · 蓝光过滤 · 用眼休息</span>
    </div>

    <!-- 当前状态 -->
    <div class="es-block">
      <span class="es-block-label">当前护眼状态</span>
      <div class="es-state">
        <span class="es-phase">{{ phaseMeta.icon }} {{ current.phaseLabel }}</span>
        <span class="es-chip" :style="{ color: warmthColor(current.effectiveWarmth) }">色温 {{ current.effectiveWarmth }}</span>
        <span class="es-chip" v-if="current.preset">{{ current.presetLabel }}</span>
        <span class="es-chip" v-if="current.grayscale">灰度</span>
        <span class="es-chip" v-if="!config.enabled">已停用</span>
      </div>
      <div class="es-curve">
        <div v-for="p in curve" :key="p.hour" class="es-curve-col" :title="`${p.hour}:00 · ${p.warmth}`">
          <div class="es-curve-bar" :style="{ height: p.warmth + '%', background: warmthColor(p.warmth) }"></div>
        </div>
      </div>
      <p class="es-hint">一日色温曲线（{{ curve.length }} 小时采样）</p>
    </div>

    <!-- 配置 -->
    <div class="es-block">
      <span class="es-block-label">护眼配置</span>
      <label class="es-toggle-row">
        <span>启用护眼盾</span>
        <input type="checkbox" :checked="config.enabled" @change="patch({ enabled: ($event.target as HTMLInputElement).checked })" />
      </label>
      <label class="es-toggle-row">
        <span>随昼夜自动调节</span>
        <input type="checkbox" :checked="config.autoByTime" @change="patch({ autoByTime: ($event.target as HTMLInputElement).checked })" />
      </label>
      <label class="es-slider-row">
        <span>暖色温 <em>{{ config.warmth }}</em></span>
        <input type="range" min="0" max="100" :value="config.warmth" @input="patch({ warmth: Number(($event.target as HTMLInputElement).value) })" />
      </label>
      <label class="es-slider-row">
        <span>低亮度遮罩 <em>{{ config.dim }}</em></span>
        <input type="range" min="0" max="100" :value="config.dim" @input="patch({ dim: Number(($event.target as HTMLInputElement).value) })" />
      </label>
      <label class="es-toggle-row">
        <span>灰度模式</span>
        <input type="checkbox" :checked="config.grayscale" @change="patch({ grayscale: ($event.target as HTMLInputElement).checked })" />
      </label>
      <label class="es-select-row">
        <span>20-20-20 用眼休息</span>
        <select :value="config.eyeBreakMinutes" @change="patch({ eyeBreakMinutes: Number(($event.target as HTMLSelectElement).value) })">
          <option :value="0">关闭</option>
          <option :value="20">每 20 分钟</option>
          <option :value="30">每 30 分钟</option>
          <option :value="45">每 45 分钟</option>
          <option :value="60">每 60 分钟</option>
        </select>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEyeShield, DAY_PHASE_META } from '../modules/eye-shield'

const shield = useEyeShield()
const config = computed(() => shield.config.value)
const current = computed(() => shield.current.value)
const curve = computed(() => shield.dayCurve.value)

const phaseMeta = computed(() => DAY_PHASE_META[current.value.phase])

function patch(p: Partial<typeof config.value>) {
  shield.patch(p)
}
function warmthColor(w: number): string {
  if (w >= 70) return '#e0a96d'
  if (w >= 40) return '#f0c040'
  return '#6b9fc4'
}
</script>

<style scoped>
.es-panel {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.es-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.es-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.es-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.es-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.es-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.es-state {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.es-phase {
  font-size: 13px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.9);
}
.es-chip {
  font-size: 9px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-medium);
}
.es-curve {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 64px;
  padding: 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.es-curve-col {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
}
.es-curve-bar {
  width: 100%;
  border-radius: 2px 2px 0 0;
  opacity: 0.75;
}
.es-hint {
  margin: 0;
  font-size: 10px;
  color: var(--text-low);
  text-align: center;
}
.es-toggle-row,
.es-slider-row,
.es-select-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: rgba(240, 242, 255, 0.8);
}
.es-slider-row em {
  font-style: normal;
  color: #f0c040;
}
.es-toggle-row input[type='checkbox'] {
  accent-color: #8a9a7a;
}
.es-slider-row input[type='range'] {
  flex: 1;
  max-width: 200px;
  accent-color: #e0a96d;
}
.es-select-row select {
  padding: 5px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 11px;
  font-family: inherit;
}
</style>
