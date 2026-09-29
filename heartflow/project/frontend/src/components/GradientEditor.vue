<template>
  <div class="gradient-editor">
    <div class="ge-preview" :style="previewStyle" aria-hidden="true">
      <span class="ge-preview__badge">预览</span>
    </div>

    <div class="ge-row">
      <label class="ge-label">
        <span>角度</span>
        <span class="ge-value">{{ modelValue.angle }}°</span>
      </label>
      <input
        class="ge-range"
        type="range"
        min="0"
        max="360"
        step="1"
        :value="modelValue.angle"
        @input="onAngle"
      />
    </div>

    <div class="ge-stops">
      <div v-for="(stop, i) in modelValue.stops" :key="i" class="ge-stop">
        <input
          class="ge-color"
          type="color"
          :value="stop.color"
          @input="onStopColor(i, $event)"
        />
        <input
          class="ge-range ge-range--stop"
          type="range"
          min="0"
          max="100"
          step="1"
          :value="stop.at"
          @input="onStopAt(i, $event)"
        />
        <span class="ge-stop__pos">{{ stop.at }}%</span>
        <button
          class="ge-stop__remove"
          type="button"
          :disabled="modelValue.stops.length <= 2"
          :title="modelValue.stops.length <= 2 ? '至少保留两个色标' : '移除该色标'"
          @click="removeStop(i)"
        >
          ×
        </button>
      </div>
    </div>

    <button class="ge-add" type="button" :disabled="modelValue.stops.length >= 6" @click="addStop">
      + 添加色标
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GradientConfig } from '../types'

const props = defineProps<{
  modelValue: GradientConfig
}>()

const emit = defineEmits<{
  'update:modelValue': [GradientConfig]
}>()

const previewStyle = computed(() => {
  const stops = props.modelValue.stops
    .map((s) => `${s.color} ${Math.max(0, Math.min(100, s.at))}%`)
    .join(', ')
  return { background: `linear-gradient(${props.modelValue.angle}deg, ${stops})` }
})

function clone(): GradientConfig {
  return {
    angle: props.modelValue.angle,
    stops: props.modelValue.stops.map((s) => ({ ...s })),
  }
}

function onAngle(e: Event) {
  const g = clone()
  g.angle = Number((e.target as HTMLInputElement).value)
  emit('update:modelValue', g)
}

function onStopColor(i: number, e: Event) {
  const g = clone()
  g.stops[i].color = (e.target as HTMLInputElement).value
  emit('update:modelValue', g)
}

function onStopAt(i: number, e: Event) {
  const g = clone()
  g.stops[i].at = Number((e.target as HTMLInputElement).value)
  emit('update:modelValue', g)
}

function removeStop(i: number) {
  if (props.modelValue.stops.length <= 2) return
  const g = clone()
  g.stops.splice(i, 1)
  emit('update:modelValue', g)
}

function addStop() {
  if (props.modelValue.stops.length >= 6) return
  const g = clone()
  // 新色标插在中点，取一个与末色对比明显的色相
  const last = g.stops[g.stops.length - 1]?.color ?? '#000000'
  g.stops.push({ color: last === '#000000' ? '#d4a574' : '#7c6cf0', at: 50 })
  emit('update:modelValue', g)
}
</script>

<style scoped>
.gradient-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ge-preview {
  position: relative;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ge-preview__badge {
  position: absolute;
  left: 8px;
  bottom: 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.ge-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ge-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.ge-value {
  color: var(--text-primary, #e8e0d8);
  font-variant-numeric: tabular-nums;
}

.ge-range {
  width: 100%;
  accent-color: var(--accent, #d4a574);
}

.ge-stops {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ge-stop {
  display: grid;
  grid-template-columns: 32px 1fr auto 28px;
  align-items: center;
  gap: 8px;
}

.ge-color {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}

.ge-stop__pos {
  font-size: 12px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  font-variant-numeric: tabular-nums;
}

.ge-stop__remove {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: all 0.18s ease;
}

.ge-stop__remove:hover:not(:disabled) {
  border-color: var(--accent, #d4a574);
  color: var(--accent, #d4a574);
}

.ge-stop__remove:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.ge-add {
  align-self: flex-start;
  padding: 7px 14px;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.ge-add:hover:not(:disabled) {
  border-color: var(--accent, #d4a574);
  color: var(--accent, #d4a574);
}

.ge-add:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
