<template>
  <div class="ism-overlay" @click.self="$emit('close')">
    <div class="ism-card">
      <h2 class="ism-title">导入内容</h2>

      <!-- 导入类型选择 -->
      <div class="ism-type-grid">
        <button
          v-for="st in IMPORT_SOURCE_TYPES"
          :key="st.type"
          class="ism-type-btn"
          :class="{ active: selectedType === st.type }"
          @click="selectedType = st.type"
        >
          <span class="ism-type-icon">{{ st.icon }}</span>
          <span class="ism-type-label">{{ st.label }}</span>
          <span class="ism-type-desc">{{ st.desc }}</span>
        </button>
      </div>

      <!-- 表单 -->
      <div class="ism-form">
        <input v-model="formTitle" class="ism-input" placeholder="标题" />
        <textarea v-model="formContent" class="ism-textarea" placeholder="内容…" rows="4"></textarea>
        <input v-if="selectedType === 'book'" v-model="formMeta.author" class="ism-input" placeholder="作者" />
        <input v-if="selectedType === 'web'" v-model="formMeta.url" class="ism-input" placeholder="网页链接" />
        <input v-if="selectedType === 'chat'" v-model="formMeta.source" class="ism-input" placeholder="来源平台（如微信、飞书）" />
        <input v-if="selectedType === 'call'" v-model="formMeta.duration" class="ism-input" placeholder="通话时长（如 15min）" />
      </div>

      <div class="ism-actions">
        <button class="ism-btn-cancel" @click="$emit('close')">取消</button>
        <button class="ism-btn-import" @click="handleImport" :disabled="!formTitle || !formContent">导入</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { IMPORT_SOURCE_TYPES, createImportSource } from '../modules/knowledge/importer'
import type { ImportSourceType } from '../modules/knowledge/importer'

const emit = defineEmits<{
  close: []
  import: [source: ReturnType<typeof createImportSource>]
}>()

const selectedType = ref<ImportSourceType>('book')
const formTitle = ref('')
const formContent = ref('')
const formMeta = reactive({ author: '', url: '', source: '', duration: '' })

function handleImport() {
  const meta: Record<string, string> = {}
  if (selectedType.value === 'book' && formMeta.author) meta.author = formMeta.author
  if (selectedType.value === 'web' && formMeta.url) meta.url = formMeta.url
  if (selectedType.value === 'chat' && formMeta.source) meta.source = formMeta.source
  if (selectedType.value === 'call' && formMeta.duration) meta.duration = formMeta.duration

  const source = createImportSource({
    type: selectedType.value,
    title: formTitle.value,
    content: formContent.value,
    sourceMeta: Object.keys(meta).length > 0 ? meta : undefined,
  })
  emit('import', source)
  formTitle.value = ''
  formContent.value = ''
  Object.assign(formMeta, { author: '', url: '', source: '', duration: '' })
}
</script>

<style scoped>
/* ---- 弹窗覆盖层 ---- */
.ism-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 8, 6, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.ism-card {
  background: var(--bg-deep);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 14px;
  padding: 24px;
  width: 420px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

.ism-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-high);
  margin: 0;
  letter-spacing: 2px;
}

/* ---- 导入类型选择 ---- */
.ism-type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.ism-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.ism-type-btn:hover {
  background: rgba(55, 48, 40, 0.6);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.ism-type-btn.active {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.25);
}

.ism-type-icon {
  font-size: 24px;
}

.ism-type-label {
  font-size: 13px;
  color: var(--text-bright);
  font-weight: 500;
}

.ism-type-desc {
  font-size: 10px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.3;
}

/* ---- 表单 ---- */
.ism-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ism-input,
.ism-textarea {
  padding: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-high);
  font-family: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 0.25s;
  box-sizing: border-box;
}

.ism-input::placeholder,
.ism-textarea::placeholder {
  color: var(--text-secondary);
}

.ism-input:focus,
.ism-textarea:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.ism-textarea {
  resize: vertical;
  min-height: 60px;
}

/* ---- 操作按钮 ---- */
.ism-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ism-btn-cancel {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--text-medium);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.ism-btn-cancel:hover {
  background: var(--card-bg);
  color: var(--text-bright);
}

.ism-btn-import {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.ism-btn-import:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.2);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.ism-btn-import:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>