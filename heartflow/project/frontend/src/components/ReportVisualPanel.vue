<template>
  <section class="rv-panel" aria-label="报表可视化">
    <header class="rv-head">
      <span class="rv-title">📊 报表可视化</span>
      <span class="rv-sub">同比环比 · 分类占比/趋势/排行榜 · 年度热力图</span>
    </header>

    <!-- 视图切换 -->
    <div class="rv-tabs" role="tablist">
      <button v-for="t in tabs" :key="t.id" :class="['rv-tab', { on: view === t.id }]" @click="view = t.id" role="tab">
        {{ t.label }}
      </button>
    </div>

    <!-- ① 同比环比 -->
    <div v-if="view === 'compare'">
      <p class="rv-section-hint">本月 vs 上月（环比）· 去年同期（同比）</p>
      <div class="rv-metrics">
        <div v-for="m in metricRows" :key="m.key" class="rv-metric">
          <span class="rv-metric-label">{{ m.label }}</span>
          <span class="rv-metric-val" :class="{ neg: m.val < 0 }">{{ m.sign }}{{ fmt(m.val) }}</span>
          <div class="rv-metric-deltas">
            <span class="rv-delta" :class="deltaCls(m.mom)">
              环比 <b>{{ fmtPct(m.mom) }}</b>
            </span>
            <span class="rv-delta" :class="deltaCls(m.yoy)">
              同比 <b>{{ fmtPct(m.yoy) }}</b>
            </span>
          </div>
        </div>
      </div>
      <div v-if="compare.prev" class="rv-compare-sub">
        上月 {{ compare.prev.label }}：收 ¥{{ fmt(compare.prev.income) }} / 支 ¥{{ fmt(compare.prev.expense) }} / 结余 {{ fmt(compare.prev.balance) }}
      </div>
      <div v-else class="rv-empty">暂无上月数据可比。</div>
    </div>

    <!-- ② 分类占比 -->
    <div v-if="view === 'share'">
      <div class="rv-kind-switch">
        <button :class="['rv-kind-btn', { on: share === 'expense' }]" @click="share = 'expense'">支出占比</button>
        <button :class="['rv-kind-btn', { on: share === 'income' }]" @click="share = 'income'">收入占比</button>
        <span class="rv-kind-total">合计 ¥{{ fmt(shareData.total) }}</span>
      </div>
      <div v-if="shareItems.length" class="rv-share">
        <div class="rv-share-bar">
          <div
            v-for="it in shareItems"
            :key="it.key"
            class="rv-share-seg"
            :style="{ width: Math.max(it.ratio * 100, 0.6) + '%', background: it.color }"
            :title="it.label + ' ¥' + fmt(it.amount)"
          ></div>
        </div>
        <div class="rv-share-legend">
          <div v-for="it in shareItems" :key="it.key" class="rv-share-item">
            <span class="rv-dot" :style="{ background: it.color }"></span>
            <span class="rv-share-name">{{ it.label }}</span>
            <span class="rv-share-barline"><span class="rv-share-barline-fill" :style="{ width: it.ratio * 100 + '%', background: it.color }"></span></span>
            <span class="rv-share-amt">¥{{ fmt(it.amount) }}</span>
            <span class="rv-share-pct">{{ Math.round(it.ratio * 100) }}%</span>
          </div>
        </div>
      </div>
      <p v-else class="rv-empty">暂无{{ share === 'expense' ? '支出' : '收入' }}记录。</p>
    </div>

    <!-- ③ 分类趋势 -->
    <div v-if="view === 'trend'">
      <p class="rv-section-hint">近 {{ trend.months.length }} 月收支 + 支出 Top{{ trendSeries.length }} 趋势</p>
      <svg v-if="trend.months.length" :viewBox="`0 0 ${trend.months.length * 24} 92`" class="rv-line" preserveAspectRatio="none">
        <!-- 支出总额柱（背景网格） -->
        <rect
          v-for="(p, i) in trend.months"
          :key="'b' + p.key"
          :x="i * 24 + 6"
          :y="92 - barH(p.expense)"
          :width="12"
          :height="barH(p.expense)"
          class="rv-line-expense-bar"
        />
        <!-- 分类折线 -->
        <g v-for="s in trendSeries" :key="s.key">
          <polyline
            :points="linePoints(s.data)"
            fill="none"
            :stroke="s.color"
            stroke-width="2"
            stroke-linejoin="round"
          />
        </g>
      </svg>
      <div class="rv-xlabels">
        <span v-for="(p, i) in trend.months" :key="'x' + p.key" :class="{ skip: i % 2 !== 0 && trend.months.length > 6 }">
          {{ shortMonth(p.label) }}
        </span>
      </div>
      <div class="rv-trend-legend">
        <span class="rv-trend-total"><span class="rv-dot" style="background:#8a9a7a"></span>收入 {{ fmt(trendTotalIncome) }}</span>
        <span class="rv-trend-total"><span class="rv-dot" style="background:#c46a5a"></span>支出 {{ fmt(trendTotalExpense) }}</span>
        <span v-for="s in trend.series" :key="'l' + s.key" class="rv-trend-cat">
          <span class="rv-dot" :style="{ background: s.color }"></span>{{ s.label }} {{ fmt(seriesTotal(s.data)) }}
        </span>
      </div>
    </div>

    <!-- ④ 分类排行榜 -->
    <div v-if="view === 'ranking'">
      <div class="rv-kind-switch">
        <button :class="['rv-kind-btn', { on: ranking === 'expense' }]" @click="ranking = 'expense'">支出排行</button>
        <button :class="['rv-kind-btn', { on: ranking === 'income' }]" @click="ranking = 'income'">收入排行</button>
      </div>
      <div v-if="rankList.length" class="rv-rank">
        <div v-for="(it, idx) in rankList" :key="it.key" class="rv-rank-row">
          <span class="rv-rank-no">{{ idx + 1 }}</span>
          <span class="rv-dot" :style="{ background: it.color }"></span>
          <span class="rv-rank-name">{{ it.label }}</span>
          <span class="rv-rank-line"><span class="rv-rank-line-fill" :style="{ width: it.ratio * 100 + '%', background: it.color }"></span></span>
          <span class="rv-rank-amt">¥{{ fmt(it.amount) }}</span>
          <span class="rv-rank-count">{{ it.count }} 笔</span>
        </div>
      </div>
      <p v-else class="rv-empty">暂无{{ ranking === 'expense' ? '支出' : '收入' }}记录。</p>
    </div>

    <!-- ⑤ 年度热力图 -->
    <div v-if="view === 'heat'">
      <div class="rv-heat-head">
        <div class="rv-kind-switch">
          <button :class="['rv-kind-btn', { on: heat === 'expense' }]" @click="heat = 'expense'">支出强度</button>
          <button :class="['rv-kind-btn', { on: heat === 'income' }]" @click="heat = 'income'">收入强度</button>
        </div>
        <div class="rv-year-nav">
          <button class="rv-year-btn" @click="shiftYear(-1)">‹</button>
          <span class="rv-year-val">{{ heatYear }} 年</span>
          <button class="rv-year-btn" @click="shiftYear(1)" :disabled="heatYear >= currentYear">›</button>
        </div>
      </div>
      <div v-if="heatMap.weeks.length" class="rv-heat">
        <div class="rv-heat-months">
          <span v-for="(m, i) in monthMarks" :key="'m' + i" class="rv-heat-month-mark">{{ m }}</span>
        </div>
        <div class="rv-heat-grid">
          <div v-for="(w, wi) in heatMap.weeks" :key="'w' + wi" class="rv-heat-week">
            <span
              v-for="(c, ci) in w.cells"
              :key="'c' + wi + ci"
              class="rv-heat-cell"
              :class="{ empty: !c.inYear }"
              :style="{ background: c.inYear ? heatColor(c.amount) : 'transparent' }"
              :title="c.date ? c.date + ' ¥' + fmt(c.amount) : ''"
            ></span>
          </div>
        </div>
      </div>
      <div class="rv-heat-foot">
        <span class="rv-heat-stat">{{ heatLabel }}活跃 {{ heatMap.activeDays }} 天 · 累计 ¥{{ fmt(heatMap.total) }}</span>
        <span class="rv-heat-legend">少<span class="rv-heat-cell rv-heat-legend-cell" style="background:#2a332c"></span><span class="rv-heat-legend-cell" style="background:#3f5a46"></span><span class="rv-heat-legend-cell" style="background:#5b7a63"></span><span class="rv-heat-legend-cell" style="background:#8a9a7a"></span>多</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { RewardRecord } from '../modules/reward/reward-list'
import {
  compareMonth,
  categoryShare,
  categoryTrend,
  categoryRanking,
  yearHeatmap,
} from '../modules/reward/report-visual'
import type { MetaResolver } from '../modules/reward/report-visual'
import { useCustomCategories, resolveMetaAny } from '../modules/reward/custom-category'

const props = withDefaults(defineProps<{
  records: RewardRecord[]
  today?: string
}>(), { today: '' })

const { categories } = useCustomCategories()

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const today = computed(() => props.today || localToday())
const curMonth = computed(() => String(today.value).slice(0, 7))
const currentYear = new Date().getFullYear()

function fmt(n: number): string {
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}
function fmtPct(v: number | null): string {
  if (v === null) return '—'
  const s = (v * 100).toFixed(1)
  return (v > 0 ? '+' : '') + s + '%'
}
function deltaCls(v: number | null): string {
  if (v === null) return 'na'
  return v > 0 ? 'up' : v < 0 ? 'down' : 'flat'
}

const resolve: MetaResolver = (key) => {
  const m = resolveMetaAny(categories.value, key)
  return { label: m.label, color: m.color }
}

// ---- 同比环比 ----
const compare = computed(() => compareMonth(props.records, curMonth.value))
const metricRows = computed(() => {
  const c = compare.value.current
  return [
    { key: 'income', label: '收入', val: c.income, sign: '+', mom: compare.value.mom.income, yoy: compare.value.yoy.income },
    { key: 'expense', label: '支出', val: c.expense, sign: '-', mom: compare.value.mom.expense, yoy: compare.value.yoy.expense },
    { key: 'balance', label: '净结余', val: c.balance, sign: '', mom: compare.value.mom.balance, yoy: compare.value.yoy.balance },
  ]
})

// ---- 分类占比 ----
const share = ref<'expense' | 'income'>('expense')
const shareData = computed(() => categoryShare(props.records, share.value, resolve, 8))
const shareItems = computed(() => shareData.value.items)

// ---- 趋势 ----
const trend = computed(() => categoryTrend(props.records, 12, 4, resolve))
const trendSeries = computed(() => trend.value.series)
const trendMax = computed(() => trend.value.maxValue || 1)
const trendTotalExpense = computed(() => trend.value.months.reduce((s, p) => s + p.expense, 0))
const trendTotalIncome = computed(() => trend.value.months.reduce((s, p) => s + p.income, 0))
function seriesTotal(data: number[]): number {
  return data.reduce((s, v) => s + v, 0)
}
function barH(v: number): number {
  return Math.max(0, Math.floor((v / trendMax.value) * 84))
}
function shortMonth(label: string): string {
  return label.replace('年', '/')
}
function linePoints(data: number[]): string {
  const n = data.length
  const step = n > 1 ? 24 : 24
  const pts: string[] = []
  data.forEach((v, i) => {
    const x = i * step + 12
    const y = 88 - (v / trendMax.value) * 78
    pts.push(`${x},${y.toFixed(1)}`)
  })
  return n ? pts.join(' ') : ''
}

// ---- 排行榜 ----
const ranking = ref<'expense' | 'income'>('expense')
const rankList = computed(() => categoryRanking(props.records, ranking.value, resolve))

// ---- 年度热力图 ----
const heat = ref<'expense' | 'income'>('expense')
const heatYear = ref(currentYear)
const heatMap = computed(() => yearHeatmap(props.records, heatYear.value, heat.value))
const heatLabel = computed(() => (heat.value === 'expense' ? '支出' : '收入'))
function shiftYear(dir: number): void {
  heatYear.value = Math.max(1990, Math.min(currentYear, heatYear.value + dir))
}
function heatColor(amount: number): string {
  if (amount <= 0) return '#2a332c'
  const r = heatMap.value.max > 0 ? amount / heatMap.value.max : 0
  // 低 → 高：#3f5a46 → #b7cfb0
  const a = [0x3f, 0x5a, 0x46]
  const b = [0xb7, 0xcf, 0xb0]
  const c = a.map((av, i) => Math.round(av + (b[i] - av) * r))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}
const monthMarks = computed(() => {
  const set = new Map<number, string>()
  for (const w of heatMap.value.weeks) set.set(w.month, `${w.month}月`)
  return [...set.values()]
})

const tabs = [
  { id: 'compare', label: '对比' },
  { id: 'share', label: '占比' },
  { id: 'trend', label: '趋势' },
  { id: 'ranking', label: '排行' },
  { id: 'heat', label: '热力' },
]
const view = ref('compare')
</script>

<style scoped>
.rv-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.rv-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.rv-title { font-weight: 600; }
.rv-sub { font-size: 12px; color: #8a9a7a; flex: 1; }

.rv-tabs { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
.rv-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  background: #161a15; color: #b7c0a8; border: 1px solid #2f352d; border-radius: 6px;
  padding: 3px 12px; font-size: 12px; cursor: pointer;

  min-height: 26px;
}
.rv-tab.on { background: #8a9a7a; color: #161a15; border-color: #8a9a7a; font-weight: 600; }

.rv-section-hint { font-size: 11px; color: #6b7563; margin: 0 0 8px; }

.rv-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px; }
@media (max-width: 640px) { .rv-metrics { grid-template-columns: 1fr; } }
.rv-metric { background: #161a15; border: 1px solid #2c312b; border-radius: 8px; padding: 10px; }
.rv-metric-label { font-size: 11px; color: #8a9a7a; display: block; }
.rv-metric-val { font-size: 20px; font-weight: 800; display: block; margin: 2px 0 6px; }
.rv-metric-val.neg { color: #c46a5a; }
.rv-metric-deltas { display: flex; gap: 12px; font-size: 12px; }
.rv-delta.na { color: #6b7563; }
.rv-delta.up b { color: #8a9a7a; }
.rv-delta.down b { color: #c46a5a; }
.rv-delta.flat b { color: #b7c0a8; }
.rv-compare-sub { font-size: 11px; color: #6b7563; }

.rv-kind-switch { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
.rv-kind-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  background: #161a15; color: #b7c0a8; border: 1px solid #2f352d; border-radius: 6px;
  padding: 3px 10px; font-size: 12px; cursor: pointer;

  min-height: 26px;
}
.rv-kind-btn.on { background: #8a9a7a; color: #161a15; border-color: #8a9a7a; font-weight: 600; }
.rv-kind-total { margin-left: auto; font-size: 12px; color: #8a9a7a; }

.rv-share-bar { display: flex; height: 14px; border-radius: 4px; overflow: hidden; margin-bottom: 12px; background: #161a15; }
.rv-share-seg { height: 100%; }
.rv-share-legend { display: flex; flex-direction: column; gap: 4px; }
.rv-share-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.rv-dot { width: 9px; height: 9px; border-radius: 3px; flex: 0 0 auto; }
.rv-share-name { width: 72px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rv-share-barline { flex: 1; height: 6px; background: #161a15; border-radius: 3px; overflow: hidden; }
.rv-share-barline-fill { display: block; height: 100%; }
.rv-share-amt { width: 84px; text-align: right; font-weight: 600; }
.rv-share-pct { width: 42px; text-align: right; color: #8a9a7a; }

.rv-line { width: 100%; max-height: 120px; background: #161a15; border-radius: 8px; }
.rv-line-expense-bar { fill: #c46a5a; opacity: 0.35; }
.rv-xlabels { display: flex; margin-top: 2px; font-size: 10px; color: #6b7563; }
.rv-xlabels span { flex: 1; text-align: center; }
.rv-xlabels span.skip { visibility: hidden; }
.rv-trend-legend { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 8px; font-size: 12px; align-items: center; }
.rv-trend-cat {
  display: inline-flex; align-items: center; gap: 5px; }

.rv-rank { display: flex; flex-direction: column; gap: 4px; }
.rv-rank-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 4px 6px; border-bottom: 1px dashed #2c312b; }
.rv-rank-no { width: 16px; color: #6b7563; }
.rv-rank-name { width: 76px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
.rv-rank-line { flex: 1; height: 7px; background: #161a15; border-radius: 3px; overflow: hidden; }
.rv-rank-line-fill { display: block; height: 100%; }
.rv-rank-amt { width: 92px; text-align: right; font-weight: 600; }
.rv-rank-count { width: 52px; text-align: right; color: #8a9a7a; }

.rv-heat-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.rv-year-nav { display: flex; align-items: center; gap: 8px; }
.rv-year-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
   background: #161a15; color: #b7c0a8; border: 1px solid #2f352d; border-radius: 6px; padding: 2px 10px; cursor: pointer; 
  min-height: 26px;
}
.rv-year-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.rv-year-val { font-size: 13px; font-weight: 600; min-width: 64px; text-align: center; }
.rv-heat { display: flex; gap: 8px; }
.rv-heat-months { display: flex; flex-direction: column-reverse; justify-content: space-around; font-size: 10px; color: #6b7563; width: 22px; }
.rv-heat-grid { flex: 1; display: flex; gap: 3px; overflow-x: auto; padding-bottom: 4px; }
.rv-heat-week { display: flex; flex-direction: column; gap: 3px; }
.rv-heat-cell { width: 12px; height: 12px; border-radius: 2px; flex: 0 0 auto; }
.rv-heat-cell.empty { background: transparent; }
.rv-heat-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #8a9a7a; }
.rv-heat-legend {
  display: inline-flex; align-items: center; gap: 3px; }
.rv-heat-legend-cell { display: inline-block; margin: 0 1px; }
.rv-empty { font-size: 12px; color: #8a9a7a; }
</style>