<template>
  <section class="oa-panel" aria-label="高级检索与批量导出">
    <div class="oa-panel-head">
      <span class="oa-panel-title">⚙️ 高级检索 · 批量 · 导出</span>
      <span class="oa-panel-sub">多维过滤 · 预设 · 批量操作 · 导出历史</span>
    </div>

    <!-- ===== 高级检索 ===== -->
    <div class="oa-block">
      <span class="oa-block-label">高级检索</span>
      <div class="oa-row">
        <input v-model="search.filter.value.keyword" class="oa-input oa-grow" placeholder="关键词（内容 / 触发事件 / 情绪）…" />
        <select v-model="search.sortField.value" class="oa-select">
          <option value="createdAt">按创建时间</option>
          <option value="updatedAt">按更新时间</option>
          <option value="type">按类型</option>
        </select>
        <button class="oa-btn" @click="search.sortOrder.value = search.sortOrder.value === 'desc' ? 'asc' : 'desc'">
          {{ search.sortOrder.value === 'desc' ? '↓ 倒序' : '↑ 正序' }}
        </button>
      </div>
      <div class="oa-row oa-wrap">
        <span v-for="t in TYPE_OPTIONS" :key="t.value" class="oa-chip" :class="{ on: search.filter.value.types.includes(t.value) }" @click="toggleType(t.value)">
          {{ t.label }}
        </span>
        <select v-model="search.filter.value.statuses" class="oa-select" multiple size="1">
          <option value="published">已发布</option>
          <option value="draft">草稿</option>
          <option value="archived">已归档</option>
        </select>
        <select v-model="search.filter.value.emotionCategory" class="oa-select">
          <option :value="null">全部情绪</option>
          <option v-for="e in emotionOptions" :key="e" :value="e">{{ e }}</option>
        </select>
      </div>
      <div class="oa-row oa-wrap">
        <input v-model="dateStart" type="date" class="oa-input" />
        <span class="oa-sep">→</span>
        <input v-model="dateEnd" type="date" class="oa-input" />
        <span class="oa-sep">强度</span>
        <input v-model.number="intMin" type="number" min="0" max="10" class="oa-input oa-num" placeholder="最小" />
        <span class="oa-sep">~</span>
        <input v-model.number="intMax" type="number" min="0" max="10" class="oa-input oa-num" placeholder="最大" />
      </div>
      <div class="oa-row">
        <button class="oa-btn oa-btn-primary" @click="applySearch">应用过滤</button>
        <button class="oa-btn" @click="resetSearch">重置</button>
        <input v-model="presetName" class="oa-input oa-grow" placeholder="预设名称…" />
        <button class="oa-btn" :disabled="!presetName.trim()" @click="savePreset">保存预设</button>
      </div>
      <div v-if="search.presets.value.length" class="oa-presets">
        <span v-for="p in search.presets.value" :key="p.id" class="oa-preset" :class="{ active: activePresetId === p.id }" @click="applyPreset(p.id)">
          {{ p.name }}
          <button class="oa-preset-del" @click.stop="deletePreset(p.id)">×</button>
        </span>
      </div>
      <p class="oa-hint">命中 {{ filtered.length }} / {{ props.records.length }} 条</p>
    </div>

    <!-- ===== 批量操作 ===== -->
    <div class="oa-block">
      <span class="oa-block-label">批量操作 · 已选 {{ batch.selectedIds.value.size }}</span>
      <div class="oa-row">
        <label class="oa-check">
          <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
          <span>全选当前过滤</span>
        </label>
        <button class="oa-btn" :disabled="!batch.selectedIds.value.size" @click="runBatch('archive')">归档</button>
        <button class="oa-btn" :disabled="!batch.selectedIds.value.size" @click="runBatch('delete')">删除</button>
        <select v-model="batchStatus" class="oa-select">
          <option value="published">设为已发布</option>
          <option value="draft">设为草稿</option>
          <option value="archived">设为已归档</option>
        </select>
        <button class="oa-btn" :disabled="!batch.selectedIds.value.size" @click="runBatch('status')">改状态</button>
      </div>
      <div v-if="filtered.length" class="oa-select-list">
        <label v-for="r in filtered.slice(0, 50)" :key="r.id" class="oa-select-row" :class="{ on: batch.selectedIds.value.has(r.id) }">
          <input type="checkbox" :checked="batch.selectedIds.value.has(r.id)" @change="toggleSelect(r.id)" />
          <span class="oa-sr-type">{{ TYPE_LABELS[r.type] }}</span>
          <span class="oa-sr-content">{{ r.content.slice(0, 40) }}</span>
          <span class="oa-sr-room">{{ r.roomSource }}</span>
        </label>
      </div>
      <div v-if="opHistory.length" class="oa-history">
        <span class="oa-block-label">操作历史 · {{ opHistory.length }}</span>
        <div v-for="op in opHistory.slice(0, 5)" :key="op.id" class="oa-history-row">
          <span class="oa-history-type">{{ BATCH_META[op.type].label }}</span>
          <span class="oa-history-count">成功 {{ op.successCount }} · 失败 {{ op.failCount }}</span>
          <span class="oa-history-status" :class="op.status">{{ op.status }}</span>
        </div>
      </div>
    </div>

    <!-- ===== 导出 ===== -->
    <div class="oa-block">
      <span class="oa-block-label">导出</span>
      <div class="oa-row">
        <select v-model="exportFormat" class="oa-select">
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="markdown">Markdown</option>
        </select>
        <button class="oa-btn oa-btn-primary" :disabled="!filtered.length" @click="doExport">导出当前过滤</button>
      </div>
      <div v-if="exportHistory.length" class="oa-history">
        <span class="oa-block-label">导出历史 · {{ exportHistory.length }}</span>
        <div v-for="e in exportHistory.slice(0, 5)" :key="e.id" class="oa-history-row">
          <span class="oa-history-type">{{ e.format.toUpperCase() }}</span>
          <span class="oa-history-count">{{ e.recordCount }} 条 · {{ sizeLabel(e.size) }}</span>
          <button class="oa-btn oa-btn-sm" @click="downloadExport(e)">下载</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSearchFilter, useBatchOperations, useExport } from '../modules/output/advanced'
import type { OutputRecord, OutputRecordType, OutputRecordStatus } from '../modules/output'
import type { ExportFormat } from '../modules/output/advanced'

const props = defineProps<{
  records: OutputRecord[]
  updateRecord?: (id: string, updates: Partial<OutputRecord>) => boolean
  deleteRecord?: (id: string) => boolean
}>()

const emit = defineEmits<{ (e: 'changed'): void }>()

const TYPE_LABELS: Record<OutputRecordType, string> = {
  note: '📝 笔记',
  emotion: '💭 情绪',
  anchor: '⚓ 心锚',
  crystal: '💎 结晶',
  session: '⏱ 会话',
}

const TYPE_OPTIONS = (Object.keys(TYPE_LABELS) as OutputRecordType[]).map(t => ({ value: t, label: TYPE_LABELS[t] }))

const BATCH_META: Record<string, { label: string }> = {
  archive: { label: '归档' },
  delete: { label: '删除' },
  'status-change': { label: '改状态' },
  'tag-add': { label: '加标签' },
  'tag-remove': { label: '去标签' },
}

const search = useSearchFilter(() => props.records)
const batch = useBatchOperations(
  () => props.records,
  (id, updates) => props.updateRecord ? props.updateRecord(id, updates) : false,
  (id) => props.deleteRecord ? props.deleteRecord(id) : false,
)
const exporter = useExport()

const presetName = ref('')
const activePresetId = ref<string | null>(null)
const batchStatus = ref<OutputRecordStatus>('published')
const exportFormat = ref<ExportFormat>('json')
const dateStart = ref('')
const dateEnd = ref('')
const intMin = ref<number | null>(null)
const intMax = ref<number | null>(null)

const emotionOptions = computed(() => {
  const set = new Set<string>()
  props.records.forEach(r => { if (r.emotionCategory) set.add(r.emotionCategory) })
  return [...set]
})

const filtered = computed(() => search.applyFilter(props.records))

const allSelected = computed(() =>
  filtered.value.length > 0 && batch.selectedIds.value.size === filtered.value.length,
)

const opHistory = computed(() => batch.getOperationHistory())
const exportHistory = computed(() => exporter.getExportHistory())

function toggleType(t: OutputRecordType) {
  const types = search.filter.value.types
  const idx = types.indexOf(t)
  if (idx >= 0) types.splice(idx, 1)
  else types.push(t)
}

function applySearch() {
  const f = search.filter.value
  if (dateStart.value || dateEnd.value) {
    f.dateRange = {
      start: dateStart.value || dateEnd.value,
      end: dateEnd.value || dateStart.value,
    }
  } else {
    f.dateRange = null
  }
  if (intMin.value !== null || intMax.value !== null) {
    f.intensityRange = {
      min: intMin.value ?? 0,
      max: intMax.value ?? 10,
    }
  } else {
    f.intensityRange = null
  }
  activePresetId.value = null
}

function resetSearch() {
  search.resetFilter()
  dateStart.value = ''
  dateEnd.value = ''
  intMin.value = null
  intMax.value = null
  activePresetId.value = null
}

function savePreset() {
  search.savePreset(presetName.value.trim())
  presetName.value = ''
}

function applyPreset(id: string) {
  if (search.applyPreset(id)) activePresetId.value = id
}

function deletePreset(id: string) {
  search.deletePreset(id)
  if (activePresetId.value === id) activePresetId.value = null
}

function toggleSelectAll() {
  batch.toggleSelectAll(filtered.value)
}

function toggleSelect(id: string) {
  batch.toggleSelect(id)
}

function runBatch(kind: 'archive' | 'delete' | 'status') {
  const ids = [...batch.selectedIds.value]
  if (kind === 'archive') batch.batchArchive(ids)
  else if (kind === 'delete') {
    if (!confirm(`确定删除选中的 ${ids.length} 条记录？此操作不可撤销。`)) return
    batch.batchDelete(ids)
  } else {
    batch.batchChangeStatus(ids, batchStatus.value)
  }
  emit('changed')
}

function doExport() {
  exporter.exportRecords(filtered.value, exportFormat.value)
}

function downloadExport(e: { filename: string; content: string }) {
  const blob = new Blob([e.content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = e.filename
  a.click()
  URL.revokeObjectURL(url)
}

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}
</script>

<style scoped>
.oa-panel {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.oa-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.oa-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.oa-panel-sub {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.oa-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.oa-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.oa-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.oa-row:last-child {
  margin-bottom: 0;
}
.oa-wrap {
  flex-wrap: wrap;
}
.oa-grow {
  flex: 1;
  min-width: 120px;
}
.oa-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(139, 155, 122, 0.2);
  border-radius: 6px;
  color: #e8e4d8;
  font-size: 12px;
  padding: 6px 10px;
  outline: none;
}
.oa-input::placeholder {
  color: rgba(232, 228, 216, 0.4);
}
.oa-num {
  width: 64px;
}
.oa-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(139, 155, 122, 0.2);
  border-radius: 6px;
  color: #e8e4d8;
  font-size: 12px;
  padding: 6px 8px;
  outline: none;
}
.oa-sep {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.45);
}
.oa-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(139, 155, 122, 0.25);
  color: rgba(232, 228, 216, 0.7);
  cursor: pointer;
  transition: all 0.2s;
}
.oa-chip.on {
  background: rgba(138, 154, 122, 0.25);
  border-color: rgba(138, 154, 122, 0.6);
  color: #e8e4d8;
}
.oa-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 6px;
  color: rgba(232, 228, 216, 0.85);
  font-size: 12px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.2s;
}
.oa-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}
.oa-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.oa-btn-primary {
  background: rgba(138, 154, 122, 0.3);
  border-color: rgba(138, 154, 122, 0.6);
  color: #e8e4d8;
}
.oa-btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 2px 8px;
  font-size: 11px;

  min-height: 26px;
}
.oa-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.oa-preset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(139, 155, 122, 0.2);
  color: rgba(232, 228, 216, 0.7);
  cursor: pointer;

  min-height: 26px;
}
.oa-preset.active {
  background: rgba(138, 154, 122, 0.25);
  color: #e8e4d8;
}
.oa-preset-del {
  background: none;
  border: none;
  color: rgba(232, 228, 216, 0.5);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}
.oa-hint {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.45);
  margin: 6px 0 0;
}
.oa-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.75);
  cursor: pointer;
}
.oa-select-list {
  max-height: 220px;
  overflow-y: auto;
  margin-top: 8px;
  border: 1px solid rgba(139, 155, 122, 0.12);
  border-radius: 8px;
}
.oa-select-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.1);
  cursor: pointer;
  font-size: 12px;
}
.oa-select-row:last-child {
  border-bottom: none;
}
.oa-select-row.on {
  background: rgba(138, 154, 122, 0.12);
}
.oa-sr-type {
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(232, 228, 216, 0.6);
}
.oa-sr-content {
  flex: 1;
  color: rgba(232, 228, 216, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.oa-sr-room {
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(232, 228, 216, 0.45);
}
.oa-history {
  margin-top: 10px;
}
.oa-history-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.1);
  font-size: 12px;
}
.oa-history-row:last-child {
  border-bottom: none;
}
.oa-history-type {
  flex-shrink: 0;
  color: rgba(232, 228, 216, 0.8);
}
.oa-history-count {
  flex: 1;
  color: rgba(232, 228, 216, 0.5);
}
.oa-history-status {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
}
.oa-history-status.completed {
  background: rgba(138, 154, 122, 0.2);
  color: #c9d6b8;
}
.oa-history-status.failed {
  background: rgba(196, 106, 90, 0.2);
  color: #d98c7a;
}
</style>
