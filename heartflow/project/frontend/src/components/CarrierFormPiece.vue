<template>
  <div class="carrier-piece">
    <div class="cp-geoms">
      <button
        v-for="g in OFFICIAL_CARRIER_GEOMETRIES"
        :key="g.value"
        type="button"
        class="cp-geom"
        :class="{ active: modelValue.kind === 'official-geometry' && modelValue.geometry === g.value }"
        :title="`官方几何 · ${g.label}`"
        @click="setGeom(g.value)"
      >
        <span class="cp-glyph">{{ g.glyph }}</span>
        <span class="cp-label">{{ g.label }}</span>
      </button>
      <label class="cp-geom cp-import" :class="{ active: modelValue.kind === 'user-image' }" title="导入本地图片（自动降采样，不触云）">
        <input type="file" accept="image/*" hidden @change="onImage" />
        <span class="cp-glyph">◈</span>
        <span class="cp-label">导入图片</span>
      </label>
    </div>

    <div class="cp-preview" :class="{ 'is-image': modelValue.kind === 'user-image' && !!modelValue.imageData }">
      <img v-if="modelValue.kind === 'user-image' && modelValue.imageData" :src="modelValue.imageData" alt="载体预览" />
      <span v-else class="cp-preview-glyph">{{ glyphOfCurrent }}</span>
    </div>

    <label class="cp-label-input">
      <span>形态标签</span>
      <input
        :value="modelValue.formLabel ?? ''"
        type="text"
        maxlength="32"
        placeholder="如 玉珠 / 我的守护灵"
        @input="onLabel"
      />
    </label>

    <div class="cp-controls">
      <label class="cp-range">
        <span class="cp-range-label">通透度 <em>{{ Math.round((modelValue.glass ?? 1) * 100) }}%</em></span>
        <input type="range" min="0" max="1" step="0.05" :value="modelValue.glass ?? 1" @input="onGlass" />
      </label>
      <label class="cp-range">
        <span class="cp-range-label">辉光 <em>{{ Math.round((modelValue.glow ?? 0.6) * 100) }}%</em></span>
        <input type="range" min="0" max="1" step="0.05" :value="modelValue.glow ?? 0.6" @input="onGlow" />
      </label>
      <label class="cp-range">
        <span class="cp-range-label">缩放 <em>{{ Math.round((modelValue.size ?? 1) * 100) }}%</em></span>
        <input type="range" min="0.8" max="1.4" step="0.05" :value="modelValue.size ?? 1" @input="onSize" />
      </label>
      <label class="cp-color">
        <span class="cp-range-label">色调</span>
        <input type="color" :value="modelValue.tint ?? '#d4a574'" @input="onTint" />
      </label>
    </div>

    <p v-if="imgError" class="cp-error">{{ imgError }}</p>
    <p class="cp-hint">系统不强制形态——几何或你自己的图片皆可；蓝图要求形象由你定义。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  OFFICIAL_CARRIER_GEOMETRIES,
  OFFICIAL_GEOMETRY_GLYPH,
  type AdvisorCarrier,
  type AdvisorCarrierGeometry,
} from '../types'
import { readImageAsDataURL } from '../modules/advisor/carrier-io'

const props = defineProps<{ modelValue: AdvisorCarrier }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: AdvisorCarrier): void }>()

const imgError = ref('')

const glyphOfCurrent = computed(() => {
  if (props.modelValue.kind === 'user-image') return '◈'
  return (props.modelValue.geometry && OFFICIAL_GEOMETRY_GLYPH[props.modelValue.geometry]) || '◉'
})

function patch(p: Partial<AdvisorCarrier>) {
  emit('update:modelValue', { ...props.modelValue, ...p })
}

function setGeom(g: AdvisorCarrierGeometry) {
  patch({ kind: 'official-geometry', geometry: g, imageData: undefined })
}

async function onImage(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  imgError.value = ''
  try {
    const data = await readImageAsDataURL(f)
    patch({ kind: 'user-image', imageData: data, geometry: undefined })
  } catch (err) {
    imgError.value = err instanceof Error ? err.message : '图片导入失败'
  } finally {
    ;(e.target as HTMLInputElement).value = ''
  }
}

function onLabel(e: Event) {
  patch({ formLabel: (e.target as HTMLInputElement).value })
}

function onGlass(e: Event) {
  patch({ glass: Number((e.target as HTMLInputElement).value) })
}

function onGlow(e: Event) {
  patch({ glow: Number((e.target as HTMLInputElement).value) })
}

function onSize(e: Event) {
  patch({ size: Number((e.target as HTMLInputElement).value) })
}

function onTint(e: Event) {
  patch({ tint: (e.target as HTMLInputElement).value })
}
</script>

<style scoped>
.carrier-piece {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cp-geoms {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cp-geom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 56px;
  padding: 8px 4px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 10px;
  background: transparent;
  color: var(--text-primary, #e8e0d8);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.18s;
}
.cp-geom:hover {
  border-color: rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.06);
}
.cp-geom.active {
  border-color: var(--accent, #d4a574);
  background: rgba(var(--accent-rgb), 0.14);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.18);
}
.cp-glyph {
  font-size: 18px;
  line-height: 1;
}
.cp-label {
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(var(--accent-rgb), 0.75);
}
.cp-import {
  justify-content: center;
}
.cp-preview {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: radial-gradient(circle at 50% 40%, rgba(var(--accent-rgb), 0.16), rgba(var(--accent-rgb), 0.04));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.cp-preview.is-image {
  border-radius: 14px;
}
.cp-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cp-preview-glyph {
  font-size: 28px;
  color: var(--accent, #d4a574);
}
.cp-label-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.7);
}
.cp-label-input input {
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary, #e8e0d8);
  font-family: inherit;
  font-size: 13px;
}
.cp-label-input input:focus {
  outline: none;
  border-color: var(--accent, #d4a574);
}
.cp-hint {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  line-height: 1.5;
}

/* ---- 视觉自定义控件（通透度 / 辉光 / 缩放 / 色调） ---- */
.cp-controls {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px dashed rgba(var(--accent-rgb), 0.16);
}
.cp-range {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.75);
}
.cp-range-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  letter-spacing: 1px;
}
.cp-range-label em {
  font-style: normal;
  font-variant-numeric: tabular-nums;
  color: var(--accent, #d4a574);
  font-weight: 600;
}
.cp-range input[type='range'] {
  width: 100%;
  accent-color: var(--accent, #d4a574);
  cursor: pointer;
}
.cp-color {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.75);
}
.cp-color input[type='color'] {
  width: 40px;
  height: 26px;
  padding: 0;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}
.cp-error {
  font-size: 12px;
  color: #f0a0a0;
}
</style>
