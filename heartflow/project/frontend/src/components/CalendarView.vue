<template>
  <div class="calendar-view">
    <!-- 月份导航 -->
    <div class="calendar-header">
      <button class="nav-btn" @click="prevMonth" title="上个月">◀</button>
      <div class="month-title" @click="goToday">
        {{ year }}年{{ month + 1 }}月
        <span v-if="isCurrentMonth" class="today-badge">今天</span>
      </div>
      <button class="nav-btn" @click="nextMonth" title="下个月">▶</button>
    </div>

    <!-- 星期表头 -->
    <div class="weekday-header">
      <span v-for="w in weekdays" :key="w" class="weekday-cell">{{ w }}</span>
    </div>

    <!-- 日期网格 -->
    <div class="day-grid">
      <div
        v-for="(day, idx) in monthDays"
        :key="idx"
        :class="[
          'day-cell',
          { 'other-month': !day.isCurrentMonth },
          { today: day.isToday },
          { selected: selectedDate && sameDay(day.date, selectedDate) }
        ]"
        @click="selectDay(day)"
      >
        <span class="day-number">{{ day.date.getDate() }}</span>
        <div
          v-if="day.totalMinutes > 0"
          class="day-bar"
          :style="{ width: barWidth(day.totalMinutes) }"
        />
      </div>
    </div>

    <!-- 当天记录弹窗 -->
    <Transition name="slide-up">
      <div v-if="selectedDayRecords.length > 0" class="day-detail">
        <div class="day-detail-header">
          <span class="day-detail-title">
            📋 {{ formatDateFull(selectedDate) }}
            <span class="day-total">共 {{ formatDuration(selectedDayTotal) }}</span>
          </span>
          <button class="close-btn" @click="selectedDate = null">✕</button>
        </div>
        <div class="day-record-list">
          <div
            v-for="r in selectedDayRecords"
            :key="r.id"
            class="day-record-item"
          >
            <span class="record-time">{{ formatTime(r.startTime) }} - {{ formatTime(r.endTime) }}</span>
            <span class="record-duration">{{ formatDuration(r.duration) }}</span>
            <span v-if="r.tag" class="record-tag" :style="tagStyle(r.tag)">{{ r.tag }}</span>
            <span v-if="r.note" class="record-note">{{ r.note }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 无记录提示 -->
    <div v-if="selectedDate && selectedDayRecords.length === 0" class="no-records">
      这天还没有专注记录哦 💤
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FocusSession } from '../types'
import { storage } from '../engine/storage'
import { formatDuration, getMonthDays, formatClockTime as formatTime } from '../utils/time'
import { CRYSTAL_COLORS, hexToRgba } from '../utils/colors'

// ---- 数据适配：将 FocusSession 转为组件需要的记录格式 ----
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
      duration: Math.floor(s.elapsed / 1000), // ms → seconds
      type: s.mode,
      tag: s.tags.length > 0 ? s.tags[0] : '',
      note: s.note || '',
    }))
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth())
const selectedDate = ref<Date | null>(null)

const isCurrentMonth = computed(() => {
  const n = new Date()
  return year.value === n.getFullYear() && month.value === n.getMonth()
})

// 所有记录（适配）
const records = computed<RecordItem[]>(() => {
  return sessionsToRecords(storage.getSessions())
})

// 计算月度每天的总专注分钟数
const dailyTotals = computed(() => {
  const map: Record<string, number> = {}
  records.value
    .filter(r => r.type === 'focus')
    .forEach(r => {
      const d = new Date(r.startTime)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      map[key] = (map[key] || 0) + r.duration
    })
  return map
})

const monthDays = computed(() => {
  const days = getMonthDays(year.value, month.value)
  const today = new Date()
  return days.map(d => {
    const key = `${d.date.getFullYear()}-${d.date.getMonth()}-${d.date.getDate()}`
    const totalSeconds = dailyTotals.value[key] || 0
    return {
      ...d,
      totalMinutes: totalSeconds / 60,
      isToday:
        d.date.getFullYear() === today.getFullYear() &&
        d.date.getMonth() === today.getMonth() &&
        d.date.getDate() === today.getDate(),
    }
  })
})

// 本月最大日专注时长（用于计算 bar 宽度）
const maxDailyMinutes = computed(() => {
  let max = 0
  monthDays.value.forEach(d => {
    if (d.totalMinutes > max) max = d.totalMinutes
  })
  return max || 1
})

function barWidth(minutes: number): string {
  const pct = Math.min((minutes / maxDailyMinutes.value) * 100, 100)
  return `${Math.max(pct, 4)}%`
}

function prevMonth() {
  if (month.value === 0) {
    month.value = 11
    year.value--
  } else {
    month.value--
  }
}

function nextMonth() {
  if (month.value === 11) {
    month.value = 0
    year.value++
  } else {
    month.value++
  }
}

function goToday() {
  const n = new Date()
  year.value = n.getFullYear()
  month.value = n.getMonth()
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function selectDay(day: { date: Date }) {
  selectedDate.value = day.date
}

const selectedDayRecords = computed(() => {
  if (!selectedDate.value) return []
  const sd = selectedDate.value
  return records.value
    .filter(r => {
      const rd = new Date(r.startTime)
      return (
        rd.getFullYear() === sd.getFullYear() &&
        rd.getMonth() === sd.getMonth() &&
        rd.getDate() === sd.getDate()
      )
    })
    .sort((a, b) => b.startTime - a.startTime)
})

const selectedDayTotal = computed(() => {
  return selectedDayRecords.value.reduce((s, r) => s + r.duration, 0)
})

function formatDateFull(d: Date | null): string {
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
.calendar-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* ── Header ── */
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.nav-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  transition: all var(--transition);
  cursor: pointer;
}

.nav-btn:hover {
  color: var(--text-primary);
  background: var(--bg-card-hover);
  border-color: var(--accent-cyan);
}

.month-title {
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  transition: color var(--transition);
}

.month-title:hover {
  color: var(--accent-cyan);
}

.today-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(54, 214, 231, 0.15);
  color: var(--accent-cyan);
  font-weight: 500;
}

/* ── Weekday Header ── */
.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 4px;
}

.weekday-cell {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 0;
  font-weight: 500;
}

/* ── Day Grid ── */
.day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition);
  position: relative;
  padding: 2px;
  min-height: 44px;
}

.day-cell:hover {
  background: var(--bg-card-hover);
}

.day-cell.other-month {
  opacity: 0.25;
}

.day-cell.today .day-number {
  color: var(--accent-cyan);
  font-weight: 700;
}

.day-cell.today {
  background: rgba(54, 214, 231, 0.08);
}

.day-cell.selected {
  background: rgba(79, 140, 255, 0.12);
  outline: 2px solid var(--accent-blue);
  outline-offset: -2px;
}

.day-number {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  line-height: 1;
}

.day-bar {
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-blue));
  min-width: 4px;
  max-width: 100%;
  transition: width 0.3s ease;
}

/* ── Day Detail ── */
.day-detail {
  margin-top: 12px;
  padding: 14px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}

.day-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.day-detail-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.day-total {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
}

.close-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition);
}

.close-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.day-record-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.day-record-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  flex-wrap: wrap;
  font-size: 13px;
}

.record-time {
  color: var(--text-secondary);
  min-width: 100px;
  font-variant-numeric: tabular-nums;
}

.record-duration {
  color: var(--accent-cyan);
  font-weight: 600;
  min-width: 50px;
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
  width: 100%;
  padding-top: 4px;
  border-top: 1px solid var(--border-color);
  margin-top: 2px;
}

.no-records {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 24px 0;
}

/* ── Transitions ── */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
