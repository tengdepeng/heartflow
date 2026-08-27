<template>
  <section class="ce-panel" aria-label="日历导出">
    <div class="ce-panel-head">
      <span class="ce-panel-title">📅 日历导出</span>
      <span class="ce-panel-sub">导出锚点为 ICS / JSON · 本地生成</span>
    </div>

    <div class="ce-block">
      <span class="ce-block-label">导出设置</span>
      <div class="ce-row">
        <select v-model="format" class="ce-select">
          <option value="ics">ICS（日历订阅）</option>
          <option value="json">JSON（数据备份）</option>
        </select>
        <input v-model="startDate" type="date" class="ce-input" />
        <span class="ce-sep">→</span>
        <input v-model="endDate" type="date" class="ce-input" />
      </div>
      <div class="ce-row">
        <button class="ce-btn ce-btn-primary" :disabled="!exportableCount" @click="doExport">
          导出 {{ exportableCount }} 个锚点
        </button>
        <span class="ce-hint">按目标日期筛选</span>
      </div>
    </div>

    <!-- 导出结果 -->
    <div v-if="result" class="ce-block">
      <span class="ce-block-label">导出结果 · {{ result.filename }}</span>
      <div class="ce-result-meta">
        <span class="ce-meta-item">格式 {{ result.format.toUpperCase() }}</span>
        <span class="ce-meta-item">{{ result.anchorCount }} 个事件</span>
        <span class="ce-meta-item">{{ sizeLabel }}</span>
      </div>
      <pre class="ce-preview">{{ result.content.slice(0, 600) }}{{ result.content.length > 600 ? '…' : '' }}</pre>
      <div class="ce-row">
        <button class="ce-btn" @click="copyResult">复制内容</button>
        <button class="ce-btn" @click="downloadResult">下载文件</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCalendarExport } from '../modules/anchor/celebration'
import type { Anchor } from '../modules/anchor/types'

const props = defineProps<{ anchors: Anchor[] }>()

const calendar = useCalendarExport()

const format = ref<'ics' | 'json'>('ics')
const startDate = ref('')
const endDate = ref('')
const result = ref(calendar.exportResult.value)

const exportableCount = computed(() =>
  props.anchors.filter(a => a.targetDate).length,
)

const sizeLabel = computed(() => {
  if (!result.value) return ''
  const kb = result.value.content.length / 1024
  return kb < 1 ? `${Math.round(result.value.content.length)} B` : `${kb.toFixed(1)} KB`
})

function doExport() {
  const anchors = props.anchors
  if (startDate.value && endDate.value) {
    result.value = calendar.exportByDateRange(anchors, startDate.value, endDate.value, format.value)
  } else if (format.value === 'ics') {
    result.value = calendar.exportAsICS(anchors)
  } else {
    result.value = calendar.exportAsJSON(anchors)
  }
}

async function copyResult() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value.content)
  } catch {
    // 剪贴板不可用时静默
  }
}

function downloadResult() {
  if (!result.value) return
  const blob = new Blob([result.value.content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = result.value.filename
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.ce-panel {
  background: linear-gradient(135deg, rgba(60, 70, 90, 0.35), rgba(40, 48, 64, 0.25));
  border: 1px solid rgba(140, 160, 190, 0.18);
  border-radius: 14px;
  padding: 16px;
  margin: 12px 0;
}
.ce-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.ce-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #dce4f0;
}
.ce-panel-sub {
  font-size: 12px;
  color: #8a97ad;
}
.ce-block { margin-bottom: 12px; }
.ce-block-label {
  display: block;
  font-size: 12px;
  color: #8a97ad;
  margin-bottom: 8px;
}
.ce-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.ce-select,
.ce-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.2);
  background: rgba(20, 26, 38, 0.6);
  color: #c6d0e0;
  font-size: 13px;
}
.ce-sep {
  color: #7a879c;
  font-size: 12px;
}
.ce-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.25);
  background: transparent;
  color: #aab6c9;
  font-size: 12px;
  cursor: pointer;
}
.ce-btn-primary {
  background: rgba(120, 150, 200, 0.2);
  border-color: rgba(140, 170, 220, 0.5);
  color: #dce4f0;
}
.ce-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ce-hint {
  font-size: 11px;
  color: #7a879c;
}
.ce-result-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}
.ce-meta-item {
  font-size: 11px;
  color: #9fc4e8;
}
.ce-preview {
  background: rgba(20, 26, 38, 0.6);
  border: 1px solid rgba(140, 160, 190, 0.12);
  border-radius: 8px;
  padding: 10px;
  font-size: 11px;
  line-height: 1.5;
  color: #aab6c9;
  max-height: 180px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0 0 8px;
}
</style>
