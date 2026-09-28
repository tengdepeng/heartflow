<template>
  <section class="rcp-panel" aria-label="阅读日历">
    <div class="rcp-head">
      <span class="rcp-title">🗓️ 阅读日历</span>
      <span class="rcp-sub">每一天都是一次与书的相遇</span>
    </div>

    <!-- 月导航 -->
    <div class="rcp-nav">
      <button class="rcp-nav-btn" type="button" @click="prevMonth" aria-label="上一月">‹</button>
      <span class="rcp-nav-label">{{ viewYear }} 年 {{ viewMonth }} 月</span>
      <button class="rcp-nav-btn" type="button" @click="nextMonth" aria-label="下一月">›</button>
    </div>

    <!-- 星期表头 -->
    <div class="rcp-weekdays">
      <span v-for="(w, i) in weekdays" :key="i" class="rcp-wd">{{ w }}</span>
    </div>

    <!-- 热力图矩阵 -->
    <div class="rcp-grid">
      <div
        v-for="(cell, i) in flatCells"
        :key="i"
        class="rcp-cell"
        :class="{ 'rcp-cell--out': !cell.inMonth, 'rcp-cell--empty': cell.inMonth && cell.minutes === 0 }"
        :style="cellStyle(cell)"
        :title="cellTitle(cell)"
      >
        <span v-if="cell.inMonth && cell.minutes > 0" class="rcp-cell-num">{{ cell.date.slice(8, 10) }}</span>
      </div>
    </div>

    <!-- 图例 -->
    <div class="rcp-legend">
      <span class="rcp-legend-label">少</span>
      <span v-for="lv in 5" :key="lv" class="rcp-legend-cell" :class="'rcp-lv-' + (lv - 1)"></span>
      <span class="rcp-legend-label">多</span>
    </div>

    <!-- 本月 / 年度统计 -->
    <div class="rcp-stats">
      <div class="rcp-stat"><b>{{ monthCalendar.totalMinutes }}</b><span>本月(分)</span></div>
      <div class="rcp-stat"><b>{{ monthCalendar.activeDays }}</b><span>阅读天数</span></div>
      <div class="rcp-stat"><b>{{ monthCalendar.totalSessions }}</b><span>专注次数</span></div>
      <div class="rcp-stat"><b>{{ yearSummary.totalMinutes }}</b><span>年度(分)</span></div>
    </div>

    <p v-if="yearSummary.bestDay" class="rcp-best">
      本年度最投入的一天：{{ yearSummary.bestDay.date }} · {{ yearSummary.bestDay.minutes }} 分钟
    </p>
    <p v-else class="rcp-best rcp-best--none">今年还没有阅读记录，从今天开始吧。</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useReadingCalendar } from '../modules/reading'
import type { MonthCell } from '../modules/reading'

const cal = useReadingCalendar()
const viewYear = cal.viewYear
const viewMonth = cal.viewMonth
const monthCalendar = cal.monthCalendar
const yearSummary = cal.yearSummary
const prevMonth = cal.prevMonth
const nextMonth = cal.nextMonth

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const flatCells = computed<MonthCell[]>(() => monthCalendar.value.weeks.flat())

const LEVEL_OPACITY = [0, 0.22, 0.42, 0.66, 0.95]

function cellStyle(cell: MonthCell): Record<string, string> {
  if (!cell.inMonth) return {}
  if (cell.minutes === 0) return { background: 'rgba(var(--accent-rgb), 0.04)' }
  const op = LEVEL_OPACITY[cell.level] ?? 0.22
  return { background: `rgba(var(--accent-rgb), ${op})` }
}

function cellTitle(cell: MonthCell): string {
  if (!cell.inMonth) return ''
  if (cell.minutes === 0) return `${cell.date} · 未阅读`
  return `${cell.date} · ${cell.minutes} 分钟 · ${cell.books} 本 · ${cell.sessions} 次`
}
</script>

<style scoped>
.rcp-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  margin-bottom: 18px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
}

.rcp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rcp-title {
  font-size: 16px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
  letter-spacing: 1px;
}

.rcp-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  letter-spacing: 1px;
}

.rcp-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.rcp-nav-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--accent);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
}

.rcp-nav-btn:hover {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.28);
}

.rcp-nav-label {
  font-size: 14px;
  color: rgba(var(--text-primary-rgb), 0.78);
  letter-spacing: 1px;
  min-width: 120px;
  text-align: center;
}

.rcp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.rcp-wd {
  text-align: center;
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.5px;
}

.rcp-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.rcp-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  cursor: default;
  transition: transform 0.15s, box-shadow 0.15s;
  min-height: 26px;
}

.rcp-cell:hover {
  transform: scale(1.08);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  z-index: 2;
}

.rcp-cell--out {
  background: transparent;
  border-color: transparent;
  pointer-events: none;
}

.rcp-cell-num {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 9px;
  color: rgba(20, 16, 11, 0.7);
  line-height: 1;
}

:global(.theme-light) .rcp-cell-num {
  color: rgba(255, 255, 255, 0.85);
}

.rcp-cell--empty .rcp-cell-num {
  display: none;
}

.rcp-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-size: 10px;
  color: var(--text-low);
}

.rcp-legend-cell {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.rcp-lv-0 { background: rgba(var(--accent-rgb), 0.04); }
.rcp-lv-1 { background: rgba(var(--accent-rgb), 0.22); }
.rcp-lv-2 { background: rgba(var(--accent-rgb), 0.42); }
.rcp-lv-3 { background: rgba(var(--accent-rgb), 0.66); }
.rcp-lv-4 { background: rgba(var(--accent-rgb), 0.95); }

.rcp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
}

.rcp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 6px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  text-align: center;
}

.rcp-stat b {
  font-size: 18px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.rcp-stat span {
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.rcp-best {
  margin: 0;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.65);
  text-align: center;
  letter-spacing: 0.5px;
}

.rcp-best--none {
  color: var(--text-low);
}

@media (max-width: 480px) {
  .rcp-panel {
    padding: 14px 14px;
  }

  .rcp-cell {
    min-height: 22px;
    border-radius: 5px;
  }

  .rcp-stat b {
    font-size: 15px;
  }

  .rcp-stat span {
    font-size: 9px;
  }
}
</style>
