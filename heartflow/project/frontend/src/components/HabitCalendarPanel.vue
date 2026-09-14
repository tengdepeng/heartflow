<template>
  <section class="hcp-panel" aria-label="习惯打卡日历">
    <!-- 面板头 -->
    <div class="hcp-head">
      <div class="hcp-head-left">
        <span class="hcp-title">🗓 打卡日历</span>
        <span class="hcp-sub">近 28 天热图 · 维度统计</span>
      </div>
      <span class="hcp-badge" :class="{ 'hcp-badge-neutral': stats.totalHits === 0 }">
        {{ badgeText }}
      </span>
    </div>

    <!-- 空态 -->
    <p v-if="habits.length === 0" class="hcp-empty">
      成长庭院尚未种下习惯。先在习惯追踪里补上一次打卡，这里便会铺开一张近 28 天的热力图，记录每一日的坚持。
    </p>

    <template v-if="habits.length > 0">
      <!-- 打卡概览 -->
      <div class="hcp-overview">
        <div class="hcp-cell-stats"><b>{{ stats.weekHits }}</b><span>本周打卡</span></div>
        <div class="hcp-cell-stats"><b>{{ stats.totalHits }}</b><span>累计打卡</span></div>
        <div class="hcp-cell-stats"><b>{{ stats.activeHabits }}</b><span>活跃习惯</span></div>
        <div class="hcp-cell-stats"><b>{{ stats.todayHits }}</b><span>今日</span></div>
      </div>

      <!-- 热力图 -->
      <div class="hcp-block">
        <h3 class="hcp-block-title">热度</h3>
        <div class="hcp-heatmap">
          <div class="hcp-dow">
            <span v-for="d in dowLabels" :key="d" class="hcp-dow-label">{{ d }}</span>
          </div>
          <div class="hcp-weeks">
            <div v-for="(week, wi) in weeks" :key="wi" class="hcp-week">
              <div
                v-for="cell in week"
                :key="cell.date"
                class="hcp-cell"
                :class="cellClass(cell)"
                :title="cell.title"
              >
                <span class="hcp-daynum">{{ cell.day }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 维度统计 -->
      <div class="hcp-block">
        <div class="hcp-dim-head">
          <h3 class="hcp-block-title">维度统计</h3>
          <span class="hcp-summary">平均连续 {{ avgStreak.toFixed(1) }} 天</span>
        </div>
        <template v-if="dimensions.length">
          <div v-for="d in dimensions" :key="d.id" class="hcp-dim">
            <span class="hcp-dim-name" :title="d.text">{{ d.text }}</span>
            <span class="hcp-dim-hits">{{ d.hits }} 次</span>
            <span class="hcp-dim-last">最近 {{ shortDate(d.lastDate) }}</span>
            <span v-if="d.streak > 0" class="hcp-streak">🔥 {{ d.streak }} 天</span>
            <span v-else class="hcp-streak hcp-streak-zero">未起步</span>
          </div>
        </template>
        <p v-else class="hcp-sub-empty">暂无维度数据</p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HabitLike } from '../modules/garden/growth-meteor'
import {
  habitCalendarAggregate,
  habitDimensionStats,
  toLocalDate,
} from '../modules/garden/habit-calendar'

const props = defineProps<{
  habits: HabitLike[]
  now?: Date
}>()

const DOW = ['日', '一', '二', '三', '四', '五', '六']
const dowLabels = ref(DOW)

const calendar = computed(() => habitCalendarAggregate(props.habits, props.now ?? new Date(), 28))
const dimensions = computed(() => habitDimensionStats(props.habits))

const stats = computed(() => ({
  weekHits: calendar.value.weekHits,
  totalHits: calendar.value.totalHits,
  activeHabits: calendar.value.activeHabits,
  todayHits: calendar.value.todayHits,
}))

const badgeText = computed(() => {
  if (stats.value.totalHits === 0) return '尚未播种'
  if (stats.value.todayHits > 0) return `今日 ${stats.value.todayHits} 打卡`
  return '今日未打卡'
})

const avgStreak = computed(() => {
  const arr = dimensions.value
  if (!arr.length) return 0
  return arr.reduce((s, d) => s + d.streak, 0) / arr.length
})

// 单元格是否命中日期（用于无数据留空）
const byDate = computed(() => {
  const m = new Map<string, number>()
  for (const d of calendar.value.days) m.set(d.date, d.count)
  return m
})
const firstDate = computed(() => {
  const dl = calendar.value.days
  if (!dl.length) return toLocalDate(new Date())
  return dl[0].date
})
const daysSpan = computed(() => (props.now ?? new Date()))

// 4 列（近 4 周）× 7 行（日~六），首列对齐到最早日期所在周周日
interface HeatCell { date: string; day: string; title: string; count: number; inWindow: boolean }

const weeks = computed<HeatCell[][]>(() => {
  const now = daysSpan.value
  const earliest = new Date(`${firstDate.value}T00:00:00`)
  const colStart = new Date(earliest)
  colStart.setDate(colStart.getDate() - earliest.getDay()) // 回到周日
  colStart.setDate(colStart.getDate() - 21) // 再往前 3 周 / 共 4 列
  const maxStr = addDaysToStr(now, 0)
  const cols: HeatCell[][] = []
  for (let w = 0; w < 4; w++) {
    const col: HeatCell[] = []
    for (let d = 0; d < 7; d++) {
      const dt = new Date(colStart)
      dt.setDate(colStart.getDate() + w * 7 + d)
      const ds = toLocalDate(dt)
      const inWindow = ds >= firstDate.value && ds <= maxStr
      const count = inWindow ? (byDate.value.get(ds) ?? 0) : 0
      const weekday = DOW[dt.getDay()]
      col.push({
        date: ds,
        day: ds.slice(8),
        title: `${ds} ${weekday}${inWindow ? ` · ${count} 次打卡` : ''}`,
        count,
        inWindow,
      })
    }
    cols.push(col)
  }
  return cols
})

function addDaysToStr(d: Date, n: number): string {
  const t = new Date(d)
  t.setDate(t.getDate() + n)
  return toLocalDate(t)
}

function cellClass(cell: HeatCell): Record<string, boolean> {
  return {
    'hcp-cell-empty': !cell.inWindow,
    'hcp-lv0': cell.inWindow && cell.count === 0,
    'hcp-lv1': cell.count === 1,
    'hcp-lv2': cell.count === 2,
    'hcp-lv3': cell.count >= 3,
  }
}

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[1]}-${parts[2]}`
}
</script>

<style scoped>
.hcp-panel {
  margin-top: 18px;
  padding: 16px 18px;
  border: 1px solid rgba(195, 159, 106, 0.25);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(195, 159, 106, 0.05), rgba(138, 154, 122, 0.04));
}
.hcp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.hcp-head-left { display: flex; flex-direction: column; gap: 2px; }
.hcp-title { font-size: 17px; font-weight: 700; color: var(--text, #f0d9a8); }
.hcp-sub { font-size: 12px; opacity: 0.72; }
.hcp-badge {
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(196, 106, 90, 0.18);
  border: 1px solid rgba(196, 106, 90, 0.5);
  color: #d98c7a;
  font-size: 12px;
}
.hcp-badge-neutral { background: rgba(148, 145, 138, 0.12); border-color: rgba(148, 145, 138, 0.4); color: #a09b91; }
.hcp-empty { font-size: 13px; color: #a6a096; line-height: 1.7; }
.hcp-block { margin-top: 14px; }
.hcp-block-title { font-size: 13px; font-weight: 700; color: #d9c390; margin-bottom: 9px; }
.hcp-sub-empty { font-size: 12px; opacity: 0.6; }

/* 概览 */
.hcp-overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 8px; }
.hcp-cell-stats {
  background: rgba(195, 159, 106, 0.06);
  border: 1px solid rgba(195, 159, 106, 0.14);
  border-radius: 10px;
  padding: 9px 6px;
  text-align: center;
}
.hcp-cell-stats b { display: block; font-size: 17px; color: #f0d9a8; }
.hcp-cell-stats span { font-size: 11px; opacity: 0.7; }

/* 热图 */
.hcp-heatmap { display: flex; gap: 8px; }
.hcp-dow { display: flex; flex-direction: column-reverse; gap: 6px; justify-content: flex-start; }
.hcp-dow-label { font-size: 10px; opacity: 0.6; width: 12px; height: 20px; line-height: 20px; text-align: center; }
.hcp-weeks { display: flex; gap: 6px; flex: 1; }
.hcp-week { display: flex; flex-direction: column-reverse; gap: 6px; flex: 1; }
.hcp-cell {
  height: 20px;
  border-radius: 5px;
  color: rgba(240, 217, 168, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}
.hcp-cell-empty { opacity: 0; }
.hcp-daynum { pointer-events: none; }
.hcp-lv0 { background: rgba(148, 145, 138, 0.16); }
.hcp-lv1 { background: rgba(195, 159, 106, 0.4); }
.hcp-lv2 { background: rgba(195, 159, 106, 0.66); color: #1a1916; }
.hcp-lv3 { background: rgba(196, 106, 90, 0.85); color: #fff7ec; }

/* 维度统计 */
.hcp-dim-head { display: flex; align-items: baseline; justify-content: space-between; }
.hcp-summary { font-size: 12px; opacity: 0.72; }
.hcp-dim {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(195, 159, 106, 0.14);
  font-size: 12px;
}
.hcp-dim-name { flex: 1; color: #e0d4ba; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hcp-dim-hits { color: #f0d9a8; min-width: 48px; }
.hcp-dim-last { opacity: 0.62; min-width: 64px; }
.hcp-streak { color: #d98c7a; }
.hcp-streak-zero { opacity: 0.45; }
</style>