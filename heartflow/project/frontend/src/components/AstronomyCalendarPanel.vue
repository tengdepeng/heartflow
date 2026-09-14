<template>
  <section class="acld-panel" aria-label="月相历 · 逐月观星">
    <header class="acld-head">
      <span class="acld-title">☾ 月相历 · 逐月观星</span>
      <span class="acld-sub">逐日月相 · 流星雨峰值，均本地计算</span>
    </header>

    <!-- 月份切换 -->
    <div class="acld-nav">
      <button class="acld-nav-btn" title="上个月" @click="prevMonth">‹</button>
      <span class="acld-nav-value">{{ year }} 年 {{ month }} 月</span>
      <button class="acld-nav-btn" title="下个月" @click="nextMonth">›</button>
      <button
        v-if="!isCurrentMonth"
        class="acld-nav-today"
        title="回到本月"
        @click="gotoToday"
      >今月</button>
    </div>

    <!-- 星期表头 -->
    <div class="acld-week">
      <span v-for="w in WEEKDAYS" :key="w" class="acld-week-cell">{{ w }}</span>
    </div>

    <!-- 月相格子 -->
    <div class="acld-grid">
      <span
        v-for="(c, i) in cells"
        :key="i"
        class="acld-day"
        :class="{
          'blank': c.day === 0,
          'today': c.isToday,
          'peak': c.peak.length > 0,
          'window': c.window.length > 0 && c.peak.length === 0,
        }"
      >
        <template v-if="c.day !== 0">
          <span class="acld-day-num">{{ c.day }}<em v-if="c.isToday" class="acld-day-mark">今</em></span>
          <span class="acld-day-icon" :title="c.phase ? `${c.phase.label} · 照亮 ${Math.round(c.phase.illumination * 100)}%` : ''">{{ c.phase?.icon ?? '' }}</span>
          <span v-if="c.peak.length" class="acld-day-shower" title="流星雨峰值">☄</span>
          <span v-else-if="c.window.length" class="acld-day-shower acld-day-shower-soft" title="流星雨活动窗口">·</span>
        </template>
      </span>
    </div>

    <!-- 流星雨峰值说明 -->
    <div v-if="showers.length" class="acld-showers">
      <h6 class="acld-showers-title">☄ 本月流星雨</h6>
      <ul class="acld-showers-list">
        <li v-for="s in showers" :key="s.id" class="acld-showers-item">
          <span class="acld-showers-name">{{ s.name }}</span>
          <span class="acld-showers-meta">{{ month }}-{{ s.day }} 峰值 · ZHR {{ s.zhr }}</span>
          <span class="acld-showers-note">{{ s.note }}</span>
        </li>
      </ul>
    </div>

    <!-- 月相图例 -->
    <div class="acld-legend">
      <span v-for="d in legend" :key="d.name" class="acld-legend-item">
        <i class="acld-legend-icon">{{ d.icon }}</i>{{ d.label }}
      </span>
      <span class="acld-legend-peak">☄ 流星雨峰值</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getMonthPhases, getMeteorShowersInMonth } from '../modules/timeline/astronomy'
import type { MoonPhaseName, MeteorShower } from '../modules/timeline/astronomy'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** 月相图例展示顺序 */
const PHASE_ORDER_FULL_LOCAL: MoonPhaseName[] = [
  'new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous',
  'full', 'waning-gibbous', 'last-quarter', 'waning-crescent',
]

const PHASE_LABELS: Record<MoonPhaseName, { label: string; icon: string }> = {
  'new': { label: '新月', icon: '🌑' },
  'waxing-crescent': { label: '娥眉月', icon: '🌒' },
  'first-quarter': { label: '上弦月', icon: '🌓' },
  'waxing-gibbous': { label: '盈凸月', icon: '🌔' },
  'full': { label: '满月', icon: '🌕' },
  'waning-gibbous': { label: '亏凸月', icon: '🌖' },
  'last-quarter': { label: '下弦月', icon: '🌗' },
  'waning-crescent': { label: '残月', icon: '🌘' },
}

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)

const isCurrentMonth = computed(
  () => year.value === now.getFullYear() && month.value === now.getMonth() + 1,
)

const phases = computed(() => getMonthPhases(year.value, month.value))
const showers = computed(() => getMeteorShowersInMonth(year.value, month.value))

interface DayCell {
  day: number
  phase: (ReturnType<typeof getMonthPhases>)[number] | undefined
  peak: MeteorShower[]
  window: MeteorShower[]
  isToday: boolean
}

const cells = computed<DayCell[]>(() => {
  const y = year.value
  const m = month.value
  // 当月 1 号是星期几（0=周日）
  const firstWeekday = new Date(y, m - 1, 1).getDay()

  // 按日聚合流星雨：window [start,end] 为活动窗口（相对当月日号），day 为峰值日
  const peakMap = new Map<number, MeteorShower[]>()
  const windowMap = new Map<number, MeteorShower[]>()
  for (const s of showers.value) {
    const [start, end] = s.window
    for (let d = start; d <= end; d++) {
      const list = windowMap.get(d) ?? []
      list.push(s)
      windowMap.set(d, list)
      if (d === s.day) {
        const plist = peakMap.get(d) ?? []
        plist.push(s)
        peakMap.set(d, plist)
      }
    }
  }

  const out: DayCell[] = []
  for (let i = 0; i < firstWeekday; i++) {
    out.push({ day: 0, phase: undefined, peak: [], window: [], isToday: false })
  }
  const today = new Date()
  for (const p of phases.value) {
    const day = Number(p.date.slice(-2))
    out.push({
      day,
      phase: p,
      peak: peakMap.get(day) ?? [],
      window: windowMap.get(day) ?? [],
      isToday: y === today.getFullYear() && m === today.getMonth() + 1 && day === today.getDate(),
    })
  }
  return out
})

const legend = PHASE_ORDER_FULL_LOCAL.map(name => ({ name, ...PHASE_LABELS[name] }))

function prevMonth() {
  if (month.value === 1) {
    month.value = 12
    year.value -= 1
  } else {
    month.value -= 1
  }
}

function nextMonth() {
  if (month.value === 12) {
    month.value = 1
    year.value += 1
  } else {
    month.value += 1
  }
}

function gotoToday() {
  year.value = now.getFullYear()
  month.value = now.getMonth() + 1
}
</script>

<style scoped>
.acld-panel {
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.acld-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
.acld-title { font-size: 14px; letter-spacing: 2px; color: rgba(var(--accent-rgb), 0.75); }
.acld-sub { font-size: 11px; opacity: 0.5; }

.acld-nav { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.acld-nav-btn {
  width: 26px; height: 26px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04); color: #e8dcc8; font-size: 16px; line-height: 1; cursor: pointer;
}
.acld-nav-btn:hover { background: rgba(var(--accent-rgb), 0.15); }
.acld-nav-value { font-size: 13px; color: #e8dcc8; letter-spacing: 1px; }
.acld-nav-today {
  margin-left: auto; padding: 3px 10px; font-size: 11px; border-radius: 999px; cursor: pointer;
  border: 1px solid rgba(var(--accent-rgb), 0.3); color: rgba(var(--accent-rgb), 0.85);
  background: rgba(var(--accent-rgb), 0.08);
}

.acld-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; }
.acld-week-cell { text-align: center; font-size: 11px; opacity: 0.45; }

.acld-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.acld-day {
  position: relative; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-radius: 8px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); min-height: 40px;
}
.acld-day.blank { background: transparent; border-color: transparent; }
.acld-day.today { border-color: rgba(var(--accent-rgb), 0.55); box-shadow: 0 0 0 1px rgba(var(--accent-rgb), 0.3); }
.acld-day.peak { border-color: rgba(212, 175, 116, 0.6); background: rgba(212, 175, 116, 0.08); }
.acld-day.window { border-color: rgba(212, 175, 116, 0.25); }
.acld-day-num { font-size: 10px; opacity: 0.65; line-height: 1; }
.acld-day-mark { font-style: normal; color: rgba(var(--accent-rgb), 0.9); margin-left: 2px; }
.acld-day-icon { font-size: 18px; line-height: 1; margin-top: 2px; }
.acld-day-shower { position: absolute; top: 2px; right: 3px; font-size: 11px; line-height: 1; }
.acld-day-shower-soft { opacity: 0.5; }

.acld-showers { margin-top: 14px; }
.acld-showers-title { margin: 0 0 6px; font-size: 12px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.6); }
.acld-showers-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.acld-showers-item {
  display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 8px;
  background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06);
}
.acld-showers-name { font-size: 12px; color: #e8dcc8; }
.acld-showers-meta { font-size: 11px; opacity: 0.55; }
.acld-showers-note { font-size: 11px; opacity: 0.4; max-width: 45%; text-align: right; }

.acld-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.07); }
.acld-legend-item { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; opacity: 0.7; }
.acld-legend-icon { font-style: normal; }
.acld-legend-peak { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; opacity: 0.7; margin-left: auto; }
</style>