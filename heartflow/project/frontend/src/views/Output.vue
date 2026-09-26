<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance output-vault">
    <!-- 统一房间壳层：RoomLayout 提供标准化头部（装饰菱形 / 标题 / 眉标） -->
    <RoomLayout
      title="输出管理"
      kicker="所有产出的汇集之地"
      data-enter
    >
      <template #meta>
        <div class="overview-cards">
          <div class="overview-card">
            <span class="overview-num">{{ totalRecords }}</span>
            <span class="overview-label">总记录</span>
          </div>
          <div class="overview-card">
            <span class="overview-num">{{ typeStats.note }}</span>
            <span class="overview-label">笔记</span>
          </div>
          <div class="overview-card">
            <span class="overview-num">{{ typeStats.emotion }}</span>
            <span class="overview-label">情绪</span>
          </div>
          <div class="overview-card">
            <span class="overview-num">{{ typeStats.anchor }}</span>
            <span class="overview-label">心锚</span>
          </div>
        </div>
      </template>

    <!-- 统计面板 -->
    <div data-enter class="stats-panel">
      <div class="stat-row">
        <div class="stat-item">
          <span class="stat-dot type-note"></span>
          <span class="stat-label">笔记</span>
          <span class="stat-bar">
            <span class="stat-fill fill-note" :style="{ width: pct('note') + '%' }"></span>
          </span>
          <span class="stat-pct">{{ pct('note') }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-dot type-emotion"></span>
          <span class="stat-label">情绪</span>
          <span class="stat-bar">
            <span class="stat-fill fill-emotion" :style="{ width: pct('emotion') + '%' }"></span>
          </span>
          <span class="stat-pct">{{ pct('emotion') }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-dot type-anchor"></span>
          <span class="stat-label">心锚</span>
          <span class="stat-bar">
            <span class="stat-fill fill-anchor" :style="{ width: pct('anchor') + '%' }"></span>
          </span>
          <span class="stat-pct">{{ pct('anchor') }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-dot type-crystal"></span>
          <span class="stat-label">结晶</span>
          <span class="stat-bar">
            <span class="stat-fill fill-crystal" :style="{ width: pct('crystal') + '%' }"></span>
          </span>
          <span class="stat-pct">{{ pct('crystal') }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-dot type-session"></span>
          <span class="stat-label">会话</span>
          <span class="stat-bar">
            <span class="stat-fill fill-session" :style="{ width: pct('session') + '%' }"></span>
          </span>
          <span class="stat-pct">{{ pct('session') }}%</span>
        </div>
      </div>
    </div>

    <!-- 顶栏：搜索 + 过滤 + 导出 -->
    <header data-enter class="output-header">
      <div class="header-actions">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索输出内容…"
            class="output-search"
            @input="applySearch"
          />
        </div>
        <div class="filter-group">
          <select v-model="typeFilter" class="output-select" @change="applyFilters">
            <option value="">全部类型</option>
            <option value="note">📝 笔记</option>
            <option value="emotion">💭 情绪</option>
            <option value="anchor">⚓ 心锚</option>
            <option value="crystal">💎 结晶</option>
            <option value="session">⏱ 会话</option>
          </select>
          <select v-model="statusFilter" class="output-select" @change="applyFilters">
            <option value="">全部状态</option>
            <option value="published">已发布</option>
            <option value="draft">草稿</option>
            <option value="archived">已归档</option>
          </select>
          <select v-model="sortOrder" class="output-select" @change="applyFilters">
            <option value="newest">最新优先</option>
            <option value="oldest">最早优先</option>
            <option value="type">按类型</option>
          </select>
        </div>
        <div class="export-group">
          <button class="st-btn-export" @click="exportData('json')">JSON</button>
          <button class="st-btn-export" @click="exportData('csv')">CSV</button>
          <button class="st-btn-export" @click="exportData('markdown')">MD</button>
        </div>
        <div class="batch-group" v-if="selectedIds.length > 0">
          <button class="st-btn-batch" @click="batchArchive">归档 ({{ selectedIds.length }})</button>
          <button class="st-btn-batch st-btn-danger" @click="batchDelete">删除 ({{ selectedIds.length }})</button>
        </div>
      </div>
    </header>

    <!-- 记录列表 -->
    <div class="record-list">
      <div v-if="filteredRecords.length === 0" class="empty-vault">
        <span class="empty-icon">📭</span>
        <p class="empty-text">暂无输出记录</p>
        <p class="empty-hint">各房间的产出将汇集于此</p>
      </div>

      <div
        v-for="record in paginatedRecords"
        :key="record.id"
        :class="['record-card', { selected: selectedIds.includes(record.id) }]"
        role="checkbox"
        tabindex="0"
        :aria-checked="selectedIds.includes(record.id)"
        :aria-label="(selectedIds.includes(record.id) ? '取消选择' : '选择') + '记录：' + (record.content ? truncateContent(record.content, 30) : '无内容')"
        @click="toggleSelect(record.id)"
        @keydown.enter.prevent="toggleSelect(record.id)"
        @keydown.space.prevent="toggleSelect(record.id)"
      >
        <div class="card-check">
          <span class="check-box" :class="{ checked: selectedIds.includes(record.id) }"></span>
        </div>
        <div class="card-body">
          <div class="card-top">
            <span :class="['type-tag', 'tag-' + record.type]">{{ typeLabel(record.type) }}</span>
            <span :class="['status-dot', 'status-' + record.status]"></span>
            <span class="card-room">{{ record.roomSource }}</span>
          </div>
          <div class="card-content" v-if="record.content">
            {{ truncateContent(record.content, 120) }}
          </div>
          <div class="card-content card-empty" v-else>
            （无内容）
          </div>
          <div class="card-meta">
            <span class="meta-time">{{ formatTime(record.createdAt) }}</span>
            <span v-if="record.format" class="meta-format">{{ record.format }}</span>
            <span v-if="record.emotionCategory" class="meta-emotion">{{ record.emotionCategory }}</span>
            <span v-if="record.intensity" class="meta-intensity">强度 {{ record.intensity }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button
            v-if="record.status !== 'archived'"
            class="card-btn"
            title="归档"
            @click.stop="archiveOne(record.id)"
          >📦</button>
          <button
            class="card-btn card-btn-del"
            title="删除"
            @click.stop="deleteOne(record.id)"
          >🗑</button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="totalPages > 1">
      <button
        class="page-btn"
        :disabled="currentPage <= 1"
        @click="goToPage(currentPage - 1)"
      >‹ 上一页</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button
        class="page-btn"
        :disabled="currentPage >= totalPages"
        @click="goToPage(currentPage + 1)"
      >下一页 ›</button>
    </div>

    <!-- 输出统计 -->
    <OutputStatsPanel :records="allRecords" />

    <!-- 版本快照 -->
    <OutputSnapshotsPanel :records="allRecords" @restored="onSnapshotsRestored" />

    <!-- 高级检索 · 批量 · 导出 -->
    <OutputAdvancedPanel
      :records="allRecords"
      :update-record="updateRecord"
      :delete-record="deleteRecord"
      @changed="onAdvancedChanged"
    />

    <!-- 发布流水线（INCR-411：usePublishPipeline 引擎能力面零 UI 消费，薄委托直引） -->
    <PublishPipelinePanel />
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOutputManager } from '../modules/output'
import { useViewEntrance } from '../composables/useViewEntrance'
import type { OutputRecord, OutputRecordType } from '../modules/output'
import OutputSnapshotsPanel from '../components/OutputSnapshotsPanel.vue'
import OutputStatsPanel from '../components/OutputStatsPanel.vue'
import RoomLayout from '../components/RoomLayout.vue'
import OutputAdvancedPanel from '../components/OutputAdvancedPanel.vue'
import PublishPipelinePanel from '../components/PublishPipelinePanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()

// ---- 输出管理器 ----
const manager = useOutputManager()

// ---- 过滤状态 ----
const searchQuery = ref('')
const typeFilter = ref<OutputRecordType | ''>('')
const statusFilter = ref<string>('')
const sortOrder = ref<'newest' | 'oldest' | 'type'>('newest')
const currentPage = ref(1)
const pageSize = 20
const selectedIds = ref<string[]>([])

// ---- 原始记录 ----
const allRecords = ref<OutputRecord[]>([])

onMounted(() => {
  allRecords.value = manager.getAll()
})

// ---- 类型标签 ----
const TYPE_LABELS: Record<OutputRecordType, string> = {
  note: '📝 笔记',
  emotion: '💭 情绪',
  anchor: '⚓ 心锚',
  crystal: '💎 结晶',
  session: '⏱ 会话',
}

function typeLabel(type: OutputRecordType): string {
  return TYPE_LABELS[type] || type
}

// ---- 类型统计 ----
const typeStats = computed(() => {
  const stats = { note: 0, emotion: 0, anchor: 0, crystal: 0, session: 0 }
  for (const r of allRecords.value) {
    if (r.type in stats) {
      stats[r.type as keyof typeof stats]++
    }
  }
  return stats
})

const totalRecords = computed(() => allRecords.value.length)

function pct(type: keyof typeof typeStats.value): number {
  if (totalRecords.value === 0) return 0
  return Math.round((typeStats.value[type] / totalRecords.value) * 100)
}

// ---- 过滤与排序 ----
const filteredRecords = computed(() => {
  let result = [...allRecords.value]

  // 类型过滤
  if (typeFilter.value) {
    result = result.filter(r => r.type === typeFilter.value)
  }

  // 状态过滤
  if (statusFilter.value) {
    result = result.filter(r => r.status === statusFilter.value)
  }

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(r =>
      r.content?.toLowerCase().includes(q) ||
      r.roomSource?.toLowerCase().includes(q) ||
      r.emotionCategory?.toLowerCase().includes(q)
    )
  }

  // 排序
  switch (sortOrder.value) {
    case 'oldest':
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      break
    case 'type':
      result.sort((a, b) => a.type.localeCompare(b.type))
      break
    case 'newest':
    default:
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
  }

  return result
})

const totalPages = computed(() => Math.ceil(filteredRecords.value.length / pageSize) || 1)

const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredRecords.value.slice(start, start + pageSize)
})

function applySearch() {
  currentPage.value = 1
}

function applyFilters() {
  currentPage.value = 1
  selectedIds.value = []
}

function goToPage(page: number) {
  currentPage.value = page
  selectedIds.value = []
}

// ---- 选择操作 ----
function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function archiveOne(id: string) {
  manager.update(id, { status: 'archived' })
  allRecords.value = manager.getAll()
  selectedIds.value = selectedIds.value.filter(sid => sid !== id)
}

function deleteOne(id: string) {
  manager.delete(id)
  allRecords.value = manager.getAll()
  selectedIds.value = selectedIds.value.filter(sid => sid !== id)
}

function onSnapshotsRestored() {
  allRecords.value = manager.getAll()
  currentPage.value = 1
}

function updateRecord(id: string, updates: Partial<OutputRecord>): boolean {
  const ok = manager.update(id, updates)
  if (ok) allRecords.value = manager.getAll()
  return ok
}

function deleteRecord(id: string): boolean {
  const ok = manager.delete(id)
  if (ok) allRecords.value = manager.getAll()
  return ok
}

function onAdvancedChanged() {
  allRecords.value = manager.getAll()
  currentPage.value = 1
}

function batchArchive() {
  for (const id of selectedIds.value) {
    manager.update(id, { status: 'archived' })
  }
  allRecords.value = manager.getAll()
  selectedIds.value = []
}

function batchDelete() {
  if (!confirm(`确定删除选中的 ${selectedIds.value.length} 条记录？此操作不可撤销。`)) return
  for (const id of selectedIds.value) {
    manager.delete(id)
  }
  allRecords.value = manager.getAll()
  selectedIds.value = []
}

// ---- 导出 ----
function exportData(format: 'json' | 'csv' | 'markdown') {
  const records = filteredRecords.value

  let content = ''
  let filename = ''
  let mimeType = ''

  switch (format) {
    case 'json': {
      content = JSON.stringify(records, null, 2)
      filename = `output_export_${new Date().toISOString().slice(0, 10)}.json`
      mimeType = 'application/json'
      break
    }
    case 'csv': {
      const headers = 'ID,类型,内容,来源房间,状态,创建时间,情绪标签,强度,格式'
      const rows = records.map(r => {
        const safeContent = `"${(r.content || '').replace(/"/g, '""')}"`
        return [r.id, r.type, safeContent, r.roomSource, r.status, r.createdAt, r.emotionCategory || '', r.intensity || '', r.format || ''].join(',')
      })
      content = [headers, ...rows].join('\n')
      filename = `output_export_${new Date().toISOString().slice(0, 10)}.csv`
      mimeType = 'text/csv;charset=utf-8'
      break
    }
    case 'markdown': {
      const lines = ['# 输出管理导出报告', '', `> 导出时间：${new Date().toLocaleString()}`, `> 总记录数：${records.length}`, '']
      const typeOrder: OutputRecordType[] = ['note', 'emotion', 'anchor', 'crystal', 'session']
      for (const type of typeOrder) {
        const typed = records.filter(r => r.type === type)
        if (typed.length === 0) continue
        lines.push(`## ${typeLabel(type)}（${typed.length}）`, '')
        for (const r of typed) {
          lines.push(`### ${r.roomSource || '未知房间'} — ${formatTime(r.createdAt)}`)
          lines.push('')
          if (r.content) lines.push(r.content)
          if (r.emotionCategory) lines.push(`- 情绪：${r.emotionCategory}`)
          if (r.intensity) lines.push(`- 强度：${r.intensity}`)
          if (r.format) lines.push(`- 格式：${r.format}`)
          lines.push('')
        }
      }
      content = lines.join('\n')
      filename = `output_export_${new Date().toISOString().slice(0, 10)}.md`
      mimeType = 'text/markdown;charset=utf-8'
      break
    }
  }

  const blob = new Blob(['\uFEFF' + content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---- 工具函数 ----
function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function truncateContent(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '…'
}
</script>

<style scoped>
/* ===== 输出管理 ===== */
.output-vault {
  max-width: 960px;
  margin: 0 auto;
}

/* 概览卡片 */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.overview-card {
  background: var(--bg2, #1a1d27);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.overview-num {
  display: block;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--accent, #d4a574);
}

.overview-label {
  font-size: 0.8rem;
  color: var(--muted, #7a7f8c);
  margin-top: 4px;
}

/* 统计面板 */
.stats-panel {
  background: var(--bg2, #1a1d27);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 24px;
}

.stat-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.type-note { background: #6b9fc4; }
.type-emotion { background: #d98c7a; }
.type-anchor { background: #f0c040; }
.type-crystal { background: #a07c8c; }
.type-session { background: #5ab8a0; }

.stat-label {
  font-size: 0.85rem;
  color: var(--muted, #7a7f8c);
  width: 40px;
  flex-shrink: 0;
}

.stat-bar {
  flex: 1;
  height: 6px;
  background: var(--rule, #2a2d37);
  border-radius: 3px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.fill-note { background: #6b9fc4; }
.fill-emotion { background: #d98c7a; }
.fill-anchor { background: #f0c040; }
.fill-crystal { background: #a07c8c; }
.fill-session { background: #5ab8a0; }

.stat-pct {
  font-size: 0.8rem;
  color: var(--accent, #d4a574);
  width: 35px;
  text-align: right;
  flex-shrink: 0;
}

/* 顶栏 */
.output-header {
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.search-box {
  display: flex;
  align-items: center;
  background: var(--bg2, #1a1d27);
  border: 1px solid var(--rule, #2a2d37);
  border-radius: 6px;
  padding: 0 10px;
  flex: 1;
  min-width: 180px;
}

.search-icon {
  font-size: 0.9rem;
  margin-right: 6px;
  opacity: 0.5;
}

.output-search {
  flex: 1;
  background: none;
  border: none;
  color: var(--ink, #e4e6ed);
  font-size: 0.9rem;
  padding: 8px 0;
  outline: none;
}

.output-search::placeholder {
  color: var(--muted, #7a7f8c);
}

.filter-group {
  display: flex;
  gap: 6px;
}

.output-select {
  background: var(--bg2, #1a1d27);
  border: 1px solid var(--rule, #2a2d37);
  border-radius: 6px;
  color: var(--ink, #e4e6ed);
  font-size: 0.85rem;
  padding: 6px 10px;
  cursor: pointer;
  outline: none;
}

.export-group {
  display: flex;
  gap: 4px;
}

.st-btn-export {
  background: var(--bg2, #1a1d27);
  border: 1px solid var(--rule, #2a2d37);
  border-radius: 6px;
  color: var(--accent, #d4a574);
  font-size: 0.8rem;
  padding: 6px 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.st-btn-export:hover {
  background: var(--rule, #2a2d37);
}

.batch-group {
  display: flex;
  gap: 6px;
  width: 100%;
}

.st-btn-batch {
  background: var(--bg2, #1a1d27);
  border: 1px solid var(--accent, #d4a574);
  border-radius: 6px;
  color: var(--accent, #d4a574);
  font-size: 0.85rem;
  padding: 6px 14px;
  cursor: pointer;
}

.st-btn-danger {
  border-color: var(--red, #ef4444);
  color: var(--red, #ef4444);
}

/* 记录列表 */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-vault {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 1.1rem;
  color: var(--ink, #e4e6ed);
  margin: 0 0 4px;
}

.empty-hint {
  font-size: 0.85rem;
  color: var(--muted, #7a7f8c);
  margin: 0;
}

/* 记录卡片 */
.record-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--bg2, #1a1d27);
  border: 1px solid var(--rule, #2a2d37);
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.record-card:hover {
  border-color: var(--accent, #d4a574);
}

.record-card:focus-visible {
  outline: 2px solid var(--accent, #d4a574);
  outline-offset: 1px;
}

.record-card.selected {
  border-color: var(--accent, #d4a574);
  background: rgba(108, 156, 245, 0.05);
}

.card-check {
  padding-top: 2px;
  flex-shrink: 0;
}

.check-box {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--rule, #2a2d37);
  border-radius: 3px;
  transition: all 0.2s;
}

.check-box.checked {
  background: var(--accent, #d4a574);
  border-color: var(--accent, #d4a574);
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.type-tag {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  color: #fff;
  flex-shrink: 0;
}

.tag-note { background: #6b9fc4; }
.tag-emotion { background: #d98c7a; }
.tag-anchor { background: #c8960c; }
.tag-crystal { background: #a07c8c; }
.tag-session { background: #5ab8a0; }

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-published { background: var(--green, #34d399); }
.status-draft { background: var(--yellow, #f0c040); }
.status-archived { background: var(--muted, #7a7f8c); }
.status-deleted { background: var(--red, #ef4444); }

.card-room {
  font-size: 0.8rem;
  color: var(--muted, #7a7f8c);
  flex-shrink: 0;
}

.card-content {
  font-size: 0.9rem;
  color: var(--ink, #e4e6ed);
  line-height: 1.5;
  margin-bottom: 6px;
  word-break: break-all;
}

.card-content.card-empty {
  color: var(--muted, #7a7f8c);
  font-style: italic;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-time {
  font-size: 0.75rem;
  color: var(--muted, #7a7f8c);
}

.meta-format,
.meta-emotion,
.meta-intensity {
  font-size: 0.75rem;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(108, 156, 245, 0.1);
  color: var(--accent, #d4a574);
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.card-btn {
  background: none;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.2s;
  opacity: 0.5;
}

.card-btn:hover {
  opacity: 1;
  background: var(--rule, #2a2d37);
}

.card-btn-del:hover {
  color: var(--red, #ef4444);
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding: 16px 0;
}

.page-btn {
  background: var(--bg2, #1a1d27);
  border: 1px solid var(--rule, #2a2d37);
  border-radius: 6px;
  color: var(--ink, #e4e6ed);
  font-size: 0.85rem;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: var(--rule, #2a2d37);
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.85rem;
  color: var(--muted, #7a7f8c);
}
</style>