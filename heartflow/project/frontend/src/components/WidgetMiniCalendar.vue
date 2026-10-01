<template>
  <div class="wcal" :class="['wcal-' + variant, { 'wcal-compact': compact }]">
    <!-- 月历：整月网格，可切月，今日高亮 + 有纪录日标点 -->
    <template v-if="variant === 'calendar'">
      <header class="wcal-head">
        <button class="wcal-nav" aria-label="上个月" @click.stop="shift(-1)">‹</button>
        <span class="wcal-title">{{ viewYear }}年{{ viewMonth + 1 }}月</span>
        <button class="wcal-nav" aria-label="下个月" @click.stop="shift(1)">›</button>
      </header>
      <div class="wcal-week">
        <span v-for="w in WEEKDAYS" :key="w" class="wcal-week-cell">{{ w }}</span>
      </div>
      <div class="wcal-grid">
        <div
          v-for="(day, i) in matrix"
          :key="i"
          class="wcal-cell"
          :class="{
            'is-empty': day === null,
            'is-today': day !== null && isViewingCurrent && day === todayDay,
            'has-mark': day !== null && markCount(day) > 0,
          }"
          :title="day !== null ? cellTitle(day) : ''"
        >
          <span v-if="day !== null" class="wcal-day">{{ day }}</span>
          <span v-if="day !== null && markCount(day) > 0" class="wcal-dot" />
        </div>
      </div>
    </template>

    <!-- 热力图：滚动 N 周，每格按活跃度着色 -->
    <template v-else>
      <header class="wcal-head">
        <span class="wcal-title">近 {{ weeks }} 周活跃</span>
        <span class="wcal-sub">{{ total }} 次 · 峰值 {{ maxCount }}</span>
      </header>
      <div class="wcal-heat">
        <div v-for="w in weeks" :key="w" class="wcal-heat-week">
          <span
            v-for="d in 7"
            :key="d"
            class="wcal-heat-cell"
            :style="cellStyle(heatCells[(w - 1) * 7 + (d - 1)])"
            :title="heatTitle(heatCells[(w - 1) * 7 + (d - 1)])"
          />
        </div>
      </div>
      <div class="wcal-legend">
        <span class="wcal-legend-label">少</span>
        <span
          v-for="(o, i) in LEGEND_STEPS"
          :key="i"
          class="wcal-legend-swatch"
          :style="{ background: 'var(--ww-accent, #d4a15a)', opacity: String(o) }"
        />
        <span class="wcal-legend-label">多</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// ============================================================
// 小组件卡片 · 月历 / 热力图（供 WidgetCard 的 calendar / calendar-heatmap 两类复用）
// 纯展示：数据由 marks 注入（父组件 activityMarks()），逻辑在 widget-calendar.ts。
// ============================================================
import { computed, ref } from 'vue'
import {
  WEEKDAY_LABELS,
  monthMatrix,
  heatmapCells,
  heatIntensity,
  toDayKey,
} from '../modules/touchpoints/widget-calendar'

const props = withDefaults(
  defineProps<{
    variant?: 'calendar' | 'heatmap'
    /** 每日活跃度：YYYY-MM-DD → 分数 */
    marks?: Record<string, number>
    /** 热力图滚动周数 */
    weeks?: number
    compact?: boolean
  }>(),
  { variant: 'calendar', weeks: 6, compact: false },
)

const WEEKDAYS = WEEKDAY_LABELS
const marksRef = computed<Record<string, number>>(() => props.marks || {})

// ---- 月历 ----
const now = new Date()
const cursor = ref({ y: now.getFullYear(), m: now.getMonth() })
const viewYear = computed(() => cursor.value.y)
const viewMonth = computed(() => cursor.value.m)
const isViewingCurrent = computed(
  () => cursor.value.y === now.getFullYear() && cursor.value.m === now.getMonth(),
)
const todayDay = now.getDate()
const matrix = computed(() => monthMatrix(cursor.value.y, cursor.value.m))

function shift(delta: number) {
  const d = new Date(cursor.value.y, cursor.value.m + delta, 1)
  cursor.value = { y: d.getFullYear(), m: d.getMonth() }
}
function markCount(day: number): number {
  return marksRef.value[toDayKey(new Date(cursor.value.y, cursor.value.m, day))] || 0
}
function cellTitle(day: number): string {
  const n = markCount(day)
  return n > 0 ? `${cursor.value.m + 1}/${day} · ${n} 次记录` : `${cursor.value.m + 1}/${day}`
}

// ---- 热力图 ----
const heatCells = computed(() => heatmapCells(props.weeks, marksRef.value))
const maxCount = computed(() => Math.max(1, ...heatCells.value.map((c) => c.count)))
const total = computed(() => heatCells.value.reduce((s, c) => s + c.count, 0))
const LEGEND_STEPS = [0.12, 0.35, 0.6, 0.85]

function cellStyle(c?: { count: number; inFuture: boolean }) {
  const opacity = !c ? 0 : c.inFuture ? 0.03 : heatIntensity(c.count, maxCount.value) || 0.05
  return { background: 'var(--ww-accent, #d4a15a)', opacity: String(opacity) }
}
function heatTitle(c?: { key: string; count: number; inFuture: boolean }): string {
  if (!c || c.inFuture) return ''
  return c.count > 0 ? `${c.key} · ${c.count}` : c.key
}
</script>

<style scoped>
.wcal { display: flex; flex-direction: column; gap: 6px; }

/* ---- 头部 ---- */
.wcal-head { display: flex; align-items: center; gap: 6px; }
.wcal-title { font-size: 13px; font-weight: 600; color: var(--text-primary, #dbe3f7); }
.wcal-sub { margin-left: auto; font-size: 10px; color: var(--text-secondary, #8a94ad); }
.wcal-nav {
  width: 20px; height: 20px; border-radius: 6px; flex: none;
  border: 1px solid rgba(150, 170, 210, 0.18); background: transparent;
  color: #9fb0d4; font-size: 13px; line-height: 1; cursor: pointer;
}
.wcal-nav:hover { background: rgba(120, 140, 200, 0.16); color: #fff; }
.wcal-calendar .wcal-head { justify-content: space-between; }

/* ---- 月历网格 ---- */
.wcal-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.wcal-week-cell { text-align: center; font-size: 10px; color: #8a94ad; }
.wcal-grid { display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: 1fr; gap: 2px; }
.wcal-cell {
  position: relative; aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  border-radius: 7px; font-size: 11px; color: #c6d0e8;
  font-variant-numeric: tabular-nums;
}
.wcal-cell.is-empty { color: transparent; }
.wcal-cell.has-mark { background: rgba(120, 140, 200, 0.09); }
.wcal-cell.is-today {
  background: var(--ww-accent, #d4a15a); color: #1a1206; font-weight: 700;
}
.wcal-day { line-height: 1; }

/* ---- 热力图 ---- */
.wcal-heat { display: flex; gap: 3px; }
.wcal-heat-week { display: flex; flex-direction: column; gap: 3px; flex: 1; }
.wcal-heat-cell { aspect-ratio: 1; border-radius: 3px; transition: transform 0.1s; }
.wcal-heat-cell:hover { transform: scale(1.35); }
.wcal-legend { display: flex; align-items: center; justify-content: flex-end; gap: 3px; }
.wcal-legend-label { font-size: 9px; color: #8a94ad; }
.wcal-legend-swatch { width: 10px; height: 10px; border-radius: 2px; }

/* ---- 紧凑态（系统小窗）---- */
.wcal-compact .wcal-title { font-size: 12px; }
.wcal-compact .wcal-cell { font-size: 10px; border-radius: 5px; }
</style>
