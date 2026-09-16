<template>
  <div class="record-list">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <!-- 搜索框 -->
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索标签或备注..."
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">✕</button>
      </div>

      <!-- 日期筛选器 -->
      <div class="date-filters">
        <button
          v-for="f in dateFilters"
          :key="f.id"
          :class="['filter-btn', { active: activeDateFilter === f.id }]"
          @click="activeDateFilter = f.id"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- 记录列表（虚拟滚动） -->
    <div class="records-container" ref="recordsContainerRef">
      <div v-if="filteredRecords.length > 0" class="records-spacer" :style="{ height: recordTotalHeight + 'px' }">
        <div
          v-for="row in recordVirtualRows"
          :key="row.data.id"
          class="record-entry record-virtual-row"
          :style="{ position: 'absolute', top: row.offset + 'px', left: 0, right: 0 }"
        >
          <div class="record-main">
            <span class="record-datetime">{{ formatDateTime(row.data.startTime) }}</span>
            <span class="record-duration">{{ formatDuration(row.data.duration) }}</span>
            <span v-if="row.data.tag" class="record-tag" :style="tagStyle(row.data.tag)">{{ row.data.tag }}</span>
          </div>
          <div v-if="row.data.note" class="record-note">{{ row.data.note }}</div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">📭</div>
        <p class="empty-text" v-if="searchQuery || activeDateFilter !== 'all'">
          没有找到匹配的记录
        </p>
        <p class="empty-text" v-else>
          还没有专注记录<br />去完成一个番茄钟吧 🍅
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FocusSession } from '../types'
import { storage } from '../engine/storage'
import { formatDuration } from '../utils/time'
import { CRYSTAL_COLORS, hexToRgba } from '../utils/colors'
import { useVirtualList } from '../composables/useVirtualList'

// ---- 数据适配 ----
interface RecordItem {
  id: string
  startTime: number
  endTime: number
  duration: number
  type: string
  tag: string
  note: string
}

function sessionsToRecords(sessions: FocusSession[]): RecordItem[] {
  return sessions
    .filter(s => s.status === 'completed' || s.status === 'interrupted')
    .map(s => ({
      id: s.id,
      startTime: s.startedAt ? new Date(s.startedAt).getTime() : 0,
      endTime: s.completedAt ? new Date(s.completedAt).getTime() : 0,
      duration: Math.floor(s.elapsed / 1000),
      type: s.mode,
      tag: s.tags.length > 0 ? s.tags[0] : '',
      note: s.note || '',
    }))
}

const records = computed<RecordItem[]>(() => sessionsToRecords(storage.getSessions()))

const searchQuery = ref('')
const activeDateFilter = ref('all')

const dateFilters = [
  { id: 'all',    label: '全部' },
  { id: 'today',  label: '今天' },
  { id: 'week',   label: '本周' },
  { id: 'month',  label: '本月' },
]

function getDateRange(filterId: string): { start: number; end: number } {
  const now = new Date()
  const start = new Date(now)

  switch (filterId) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      return { start: start.getTime(), end: Infinity }
    case 'week': {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      start.setDate(diff)
      start.setHours(0, 0, 0, 0)
      return { start: start.getTime(), end: Infinity }
    }
    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      return { start: start.getTime(), end: Infinity }
    default:
      return { start: 0, end: Infinity }
  }
}

const filteredRecords = computed(() => {
  let list = [...records.value]

  // 日期筛选
  const range = getDateRange(activeDateFilter.value)
  list = list.filter(r => r.startTime >= range.start && r.startTime <= range.end)

  // 搜索过滤
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(r => {
      const tagMatch = r.tag && r.tag.toLowerCase().includes(q)
      const noteMatch = r.note && r.note.toLowerCase().includes(q)
      return tagMatch || noteMatch
    })
  }

  // 按时间倒序
  return list.sort((a, b) => b.startTime - a.startTime)
})

// ---- 虚拟滚动 ----
const recordsContainerRef = ref<HTMLElement | null>(null)

const {
  virtualRows: recordVirtualRows,
  totalHeight: recordTotalHeight,
} = useVirtualList({
  containerRef: recordsContainerRef,
  items: filteredRecords,
  estimatedItemHeight: 60,
  buffer: 5,
})

function formatDateTime(ts: number): string {
  const d = new Date(ts)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
}

function tagStyle(tag: string) {
  const idx = tag.length % CRYSTAL_COLORS.length
  const color = CRYSTAL_COLORS[idx]
  return {
    background: hexToRgba(color, 0.15),
    color: color,
    borderColor: hexToRgba(color, 0.3),
  }
}
</script>

<style scoped>
.record-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Filter Bar ── */
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
  flex-shrink: 0;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0 12px;
  transition: border-color var(--transition);
}

.search-wrap:focus-within {
  border-color: var(--accent-cyan);
}

.search-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.clear-btn {
  font-size: 12px;
  color: var(--text-secondary);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition);
}

.clear-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.date-filters {
  display: flex;
  gap: 4px;
}

.filter-btn {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  transition: all var(--transition);
  cursor: pointer;
}

.filter-btn:hover {
  color: var(--text-secondary);
  border-color: var(--text-secondary);
}
.filter-btn:focus-visible {
  outline: 2px solid var(--accent-cyan);
  outline-offset: 2px;
}

.filter-btn.active {
  color: var(--accent-cyan);
  background: rgba(54, 214, 231, 0.1);
  border-color: var(--accent-cyan);
}

/* ── Records Container ── */
.records-container {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.records-spacer {
  position: relative;
  min-height: 100%;
}

.record-virtual-row {
  box-sizing: border-box;
}

.record-entry {
  padding: 12px 14px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: all var(--transition);
}

.record-entry:hover {
  border-color: rgba(79, 140, 255, 0.3);
  background: var(--bg-card);
}

.record-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.record-datetime {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 130px;
}

.record-duration {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-cyan);
  min-width: 60px;
}

.record-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid;
  font-weight: 500;
}

.record-note {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border-color);
}

/* ── Empty State ── */
.empty-state {
  text-align: center;
  padding: 60px 0;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}


</style>
