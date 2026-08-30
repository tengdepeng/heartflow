<template>
  <div class="icon-picker">
    <div class="ip-current">
      <span v-if="isImageIcon(modelValue)" class="ip-preview ip-preview-img">
        <img :src="modelValue!" :alt="label" />
      </span>
      <span v-else class="ip-preview ip-preview-glyph">{{ modelValue || '✦' }}</span>
      <div class="ip-actions">
        <button type="button" class="ip-btn" @click="triggerUpload">上传图片</button>
        <button type="button" class="ip-btn ip-btn-ghost" @click="onClear">清除</button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="ip-file"
        @change="onFile"
      />
    </div>

    <div class="ip-grid">
      <button
        v-for="g in GLYPH_PALETTE"
        :key="g"
        type="button"
        class="ip-glyph"
        :class="{ 'is-active': modelValue === g }"
        :title="g"
        @click="onGlyph(g)"
      >{{ g }}</button>
    </div>

    <p class="ip-hint">点击字形直接选用；或用「上传图片」选用自定义图（以 data-uri 存入本地配置，刷新后仍生效）。</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GLYPH_PALETTE, isImageIcon, fileToDataUri } from '../utils/icon'

const { modelValue, label } = defineProps<{
  modelValue?: string | null
  label?: string
}>()

const emit = defineEmits<{
  (e: 'change', value: string | null): void
  (e: 'update:modelValue', value: string | null): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function emitValue(v: string | null) {
  emit('change', v)
  emit('update:modelValue', v)
}

function onGlyph(g: string) {
  emitValue(g)
}

function onClear() {
  emitValue(null)
}

function triggerUpload() {
  fileInput.value?.click()
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const uri = await fileToDataUri(file)
    emitValue(uri)
  } catch {
    /* 读取失败静默忽略 */
  } finally {
    input.value = ''
  }
}
</script>

<style scoped>
.icon-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ip-current {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ip-preview {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 22px;
  overflow: hidden;
  flex: 0 0 auto;
}
.ip-preview-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ip-actions {
  display: flex;
  gap: 8px;
}
.ip-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  cursor: pointer;
  font-size: 13px;
}
.ip-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}
.ip-btn-ghost {
  background: transparent;
}
.ip-file {
  display: none;
}
.ip-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
  max-width: 360px;
}
.ip-glyph {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  font-size: 18px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
}
.ip-glyph:hover {
  background: rgba(255, 255, 255, 0.12);
}
.ip-glyph.is-active {
  border-color: #b89a6a;
  background: rgba(184, 154, 106, 0.18);
}
.ip-hint {
  margin: 0;
  font-size: 12px;
  opacity: 0.55;
  line-height: 1.5;
}
</style>
