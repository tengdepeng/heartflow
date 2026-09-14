<template>
  <section data-enter class="time-lens">
    <header class="tl-head">
      <span class="tl-icon">🔭</span>
      <div>
        <h3 class="tl-title">时间 · 透视</h3>
        <p class="tl-desc">把流淌的时间折叠成一面透镜——活动构成 / 活跃节律 / 专注窗口 / 情感曲线 / 年度回顾</p>
      </div>
    </header>

    <p v-if="empty" class="tl-empty">还没有足够的时间印记。先去更漏专注、留光阁记录情绪、写点什么或放一枚心锚，这里会慢慢亮起。</p>

    <template v-else>
      <!-- 概览条 -->
      <div class="tl-overview">
        <div class="tl-ov-item"><b>{{ fmtHours(report.radar.points[0].rawValue) }}</b><span>专注</span></div>
        <div class="tl-ov-item"><b>{{ report.radar.points[2].rawValue }}</b><span>结晶</span></div>
        <div class="tl-ov-item"><b>{{ report.radar.points[1].rawValue }}</b><span>情绪</span></div>
        <div class="tl-ov-item"><b>{{ report.radar.points[3].rawValue }}</b><span>笔记</span></div>
        <div class="tl-ov-item"><b>{{ report.radar.points[4].rawValue }}</b><span>心锚</span></div>
      </div>

      <div class="tl-grid">
        <!-- 活动雷达 -->
        <div class="tl-card">
          <h4 class="tl-card-title">活动构成雷达</h4>
          <svg :viewBox="`0 0 ${R * 2} ${R * 2}`" class="tl-radar" role="img" aria-label="活动构成雷达">
            <polygon
              v-for="lvl in [0.33, 0.66, 1]"
              :key="lvl"
              :points="gridPoints(lvl)"
              fill="none" :stroke="radarGridStroke" stroke-width="1"
            />
            <line
              :x1="cx" :y1="cy"
              :x2="radarAxisX(i)" :y2="radarAxisY(i)"
              v-for="i in report.radar.points.length"
              :key="'axis' + i"
              stroke="rgba(255,255,255,0.12)" stroke-width="1"
            />
            <polygon
              :points="radarShape"
              fill="rgba(138,180,255,0.25)" stroke="#8ab4ff" :stroke-width="1.5"
            />
            <template v-for="(p, i) in report.radar.points" :key="p.dimension">
              <circle
                :cx="radarVertex(i).x" :cy="radarVertex(i).y" r="3"
                fill="#8ab4ff" stroke="#fff" stroke-width="1"
              />
              <text
                :x="radarLabel(i).x" :y="radarLabel(i).y"
                class="tl-radar-label" text-anchor="middle"
              >{{ p.label }} · {{ Math.round(p.rawValue) }}</text>
            </template>
          </svg>
        </div>

        <!-- 活跃节律：星期 × 时段 -->
        <div class="tl-card">
          <h4 class="tl-card-title">活跃节律</h4>
          <div class="tl-heat" role="img" aria-label="周内活跃时段热力">
            <div v-for="row in 7" :key="'r' + row" class="tl-heat-row">
              <span class="tl-heat-day">周{{ DAYS[row - 1] }}</span>
              <div v-for="col in 4" :key="'c' + col" class="tl-heat-cell"
                :style="heatStyle(row - 1, col - 1)"></div>
            </div>
          </div>
          <p class="tl-kpi">最活跃：<b>周{{ DAYS[report.heatmap.mostActiveDay] }}</b> · 峰值
            <b>{{ hh(report.heatmap.mostActiveHour) }}</b> · 工作日/周末
            <b>{{ fmtRatio(report.heatmap.weekdayFocusRatio) }}</b></p>
          <h4 class="tl-card-title tl-sub">巅峰时段</h4>
          <ul class="tl-peak">
            <li v-for="p in report.heatmap.peakHours.slice(0, 4)" :key="p.dayOfWeek + '-' + p.hour">
              周{{ DAYS[p.dayOfWeek] }} {{ hh(p.hour) }} · {{ Math.round(p.focusMinutes) }} 分钟
            </li>
          </ul>
        </div>

        <!-- 专注窗口 -->
        <div class="tl-card">
          <h4 class="tl-card-title">专注窗口</h4>
          <div class="tl-window">
            <div class="tl-window-best">
              <span class="tl-win-tag">最佳窗口</span>
              <b>周{{ DAYS[focus.bestWindow.dayOfWeek] }} · {{ focus.bestWindow.timeOfDay }}</b>
              <span>平均 {{ focus.bestWindow.avgMinutes }} 分钟</span>
            </div>
            <div class="tl-window-score">
              <span class="tl-win-tag">效率评分</span>
              <b>{{ focus.overallEfficiency }}</b><span>/100</span>
            </div>
          </div>
          <div class="tl-bars">
            <div v-for="e in focus.byDayOfWeek" :key="e.label" class="tl-bar">
              <span class="tl-bar-label">{{ e.label }}</span>
              <div class="tl-bar-track">
                <div class="tl-bar-fill" :style="{ width: dayBarWidth(e.avgFocusMinutes) }"></div>
              </div>
              <span class="tl-bar-val">{{ e.avgFocusMinutes }}m</span>
            </div>
          </div>
        </div>

        <!-- 情感曲线 -->
        <div class="tl-card">
          <h4 class="tl-card-title">情感曲线</h4>
          <svg :viewBox="`0 0 ${W} ${H}`" class="tl-curve" role="img" aria-label="情感曲线">
            <path :d="curve.area" fill="rgba(138,180,255,0.15)" />
            <path :d="curve.path" fill="none" stroke="#8ab4ff" stroke-width="2" />
            <circle v-for="i in curve.points.length" :key="i"
              :cx="curve.pt(i - 1).x" :cy="curve.pt(i - 1).y" r="2"
              fill="rgba(138,180,255,0.6)"
            />
          </svg>
          <p class="tl-kpi">主导情绪：<b>{{ emotionInfo.dominant }}</b> · 趋势
            <b :style="{ color: emotionInfo.trendColor }">{{ emotionInfo.trendLabel }}</b></p>
          <div class="tl-emotions">
            <span v-for="(v, k) in emotionInfo.distribution" :key="k" class="tl-emotion-chip">
              {{ k }} · {{ v }}
            </span>
          </div>
        </div>

        <!-- 标签印记 -->
        <div class="tl-card">
          <h4 class="tl-card-title">专注标签印记</h4>
          <ul class="tl-tags" v-if="tags.length">
            <li v-for="t in tags" :key="t.tag" class="tl-tag">
              <b>{{ t.tag }}</b>
              <span class="tl-tag-dot" :style="{ width: tagWidth(t.influenceScore) }"></span>
              <span class="tl-tag-num">{{ t.count }}次 · {{ t.avgFocusMinutes }}m</span>
            </li>
          </ul>
          <p class="tl-kpi" v-else>暂无带标签的事件</p>
        </div>

        <!-- 年度回顾 -->
        <div class="tl-card">
          <h4 class="tl-card-title">本年回溯</h4>
          <p class="tl-kpi" v-if="reviewHasData">
            <b>{{ review.title || currentYear + ' 年回顾' }}</b> · 趋势
            <b :style="{ color: reviewTrendColor }">{{ reviewTrendLabel }}</b>
          </p>
          <p class="tl-kpi" v-else>本年度尚未沉淀足够数据</p>
          <ul class="tl-keywords" v-if="keywords.length">
            <li v-for="k in keywords" :key="k.text" class="tl-keyword">
              <span class="tl-kw-text">{{ k.text }}</span>
              <span class="tl-kw-cat">{{ categoryLabel(k.category) }}</span>
              <span class="tl-kw-weight">{{ Math.round(k.weight) }}%</span>
            </li>
          </ul>
          <div class="tl-kpi-row" v-if="reviewHasData">
            <span>专注 <b>{{ fmtHours(review.stats.totalFocusMinutes) }}</b></span>
            <span>结晶 <b>{{ review.stats.totalCrystals }}</b></span>
            <span>笔记 <b>{{ review.stats.totalNotes }}</b></span>
            <span>心锚 <b>{{ review.stats.totalAnchors }}</b></span>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { storage, storageVersion } from '../engine/storage'
import {
  generateTimelineRadarReport,
  createRiverItems,
  useEmotionCurve,
  useAnnualReview,
} from '../modules/timeline'
import type { RiverSource, RiverItem } from '../modules/timeline'

useViewEntrance()

const DAYS = ['日', '一', '二', '三', '四', '五', '六']

const source = computed<RiverSource>(() => {
  storageVersion.value
  return {
    crystals: storage.getCrystals(),
    sessions: storage.getSessions(),
    notes: storage.getNotes(),
    emotions: storage.getEmotions(),
    anchors: storage.getAnchors(),
    bodyLogs: [],
    habits: [],
    movementRecords: [],
    breakRecords: [],
    dialogueSessions: [],
  }
})

const RIVER_TYPES = ['crystal', 'note', 'emotion', 'session', 'anchor'] as const
const items = computed<RiverItem[]>(() =>
  createRiverItems(source.value, [...RIVER_TYPES]),
)
const report = computed(() => generateTimelineRadarReport(source.value))
const focus = computed(() => report.value.focusRadar)

const empty = computed(() =>
  source.value.crystals.length === 0 &&
  source.value.sessions.length === 0 &&
  source.value.emotions.length === 0 &&
  source.value.notes.length === 0 &&
  source.value.anchors.length === 0,
)

const currentYear = computed(() => new Date().getFullYear())

function fmtHours(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h <= 0) return `${m}m`
  return `${h}h${m > 0 ? `${m}m` : ''}`
}
function hh(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}
function fmtRatio(r: number): string {
  if (r === 999) return '集中工作日'
  if (r === 1) return '近乎均等'
  return `${Math.round(r * 10) / 10}x`
}

// ---- 雷达 ----
const R = 110
const cx = R
const cy = R
const run = report.value // 触发一次以取维度数（维度固定为 6）
const AXIS = (Math.PI * 2) / Math.max(run.radar.points.length, 1)
const radarGridStroke = 'rgba(255,255,255,0.14)'

function polar(value: number, i: number, radius: number) {
  const ang = i * AXIS - Math.PI / 2
  return { x: cx + radius * value * Math.cos(ang), y: cy + radius * value * Math.sin(ang) }
}
const gridPoints = (lvl: number) =>
  report.value.radar.points.map((_, i) => {
    const p = polar(1, i, R * lvl)
    return `${p.x},${p.y}`
  }).join(' ')
const radarShape = report.value.radar.points.map((p, i) => {
  const pt = polar(p.value, i, R)
  return `${pt.x},${pt.y}`
}).join(' ')
const radarAxisX = (i: number) => polar(1, i, R * 0.98).x
const radarAxisY = (i: number) => polar(1, i, R * 0.98).y
const radarVertex = (i: number) => polar(report.value.radar.points[i].value, i, R)
const radarLabel = (i: number) => polar(1, i, R + 20)

// ---- 活跃节律热力（聚合为星期×4时段） ----
const SLOTS = [[0, 6], [6, 12], [12, 18], [18, 24]]
function slotMinutes(dow: number, slot: number): number {
  const [min, max] = SLOTS[slot]
  return report.value.heatmap.cells
    .filter(c => c.dayOfWeek === dow && c.hour >= min && c.hour < max)
    .reduce((s, c) => s + c.focusMinutes, 0)
}
function heatStyle(dow: number, slot: number) {
  const v = slotMinutes(dow, slot)
  const max = Math.max(report.value.heatmap.maxFocusMinutes, 1)
  const alpha = Math.min(1, v / (max * 0.8))
  return { background: `rgba(138,180,255,${alpha})` }
}
function dayBarWidth(v: number): string {
  const max = Math.max(...focus.value.byDayOfWeek.map(e => e.avgFocusMinutes), 1)
  return `${Math.max(2, (v / max) * 100)}%`
}

// ---- 情感曲线 ----
const ec = useEmotionCurve()
const W = 300
const H = 96
interface CurvePoint { x: number; y: number }
interface CurveView {
  points: ReturnType<ReturnType<typeof useEmotionCurve>['buildCurve']>['dataPoints']
  pt: (i: number) => CurvePoint
  path: string
  area: string
}
const curve = computed<CurveView>(() => {
  const c = ec.buildCurve('情感曲线', items.value, 'daily')
  const pts = c.dataPoints.filter(p => p.hasData)
  const n = Math.max(pts.length, 1)
  const pt = (i: number) => ({
    x: 12 + (i / (n - 1)) * (W - 24),
    y: H - 14 - pts[i].intensity * (H - 28),
  })
  const path = pts.map((_, i) => (i === 0 ? 'M' : 'L') + `${pt(i).x},${pt(i).y}`).join(' ')
  const area = pts.length > 0
    ? `${path} L${pt(pts.length - 1).x},${H - 10} L${pt(0).x},${H - 10} Z`
    : ''
  return { points: pts, pt, path, area }
})

const emotionInfo = computed(() => {
  const heat = report.value.emotionHeatmap
  const trendLabel = heat.trend === 'rising' ? '上升' : heat.trend === 'falling' ? '下降' : '平稳'
  const trendColor = heat.trend === 'rising' ? '#8a9a7a' : heat.trend === 'falling' ? '#c46a5a' : '#d0b98a'
  return { dominant: heat.dominantEmotion, distribution: heat.distribution, trendLabel, trendColor }
})

// ---- 标签印记 ----
const tags = computed(() => report.value.tagRadar.clusters.slice(0, 5))
function tagWidth(score: number): string {
  return `${Math.max(4, Math.round(score * 100))}%`
}

// ---- 年度回顾 ----
const ar = useAnnualReview()
const review = computed(() => ar.generateReview(items.value, currentYear.value))
const reviewHasData = computed(() =>
  review.value.stats.totalFocusMinutes +
  review.value.stats.totalCrystals +
  review.value.stats.totalNotes +
  review.value.stats.totalAnchors +
  review.value.stats.totalEmotions > 0,
)
const reviewTrendLabel = computed(() => {
  const t = review.value.growthTrajectory.overallTrend
  if (t === 'significant_growth') return '显著增长'
  if (t === 'moderate_growth') return '稳健增长'
  if (t === 'declining') return '回落'
  return '平稳'
})
const reviewTrendColor = computed(() => {
  const t = review.value.growthTrajectory.overallTrend
  if (t === 'significant_growth' || t === 'moderate_growth') return '#8a9a7a'
  if (t === 'declining') return '#c46a5a'
  return '#d0b98a'
})
const keywords = computed(() => review.value.keywords.slice(0, 5))
function categoryLabel(c: string): string {
  return c === 'tag' ? '标签' : c === 'emotion' ? '情绪' : c === 'insight' ? '洞察' : '习惯'
}
</script>

<style scoped>
.time-lens {
  margin-top: 26px;
  padding: 20px 20px 24px;
  border-radius: 18px;
  background: radial-gradient(circle at 15% 0%, rgba(138, 180, 255, 0.08), rgba(0, 0, 0, 0.18));
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.tl-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.tl-icon { font-size: 24px; line-height: 1; }
.tl-title { margin: 0; font-size: 18px; letter-spacing: 2px; color: var(--text-high, #fff); }
.tl-desc { margin: 4px 0 0; font-size: 12px; opacity: 0.6; line-height: 1.6; }
.tl-empty { font-size: 13px; opacity: 0.55; line-height: 1.8; }

.tl-overview {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px;
}
.tl-ov-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 4px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06);
}
.tl-ov-item b { font-size: 16px; color: #8ab4ff; }
.tl-ov-item span { font-size: 11px; opacity: 0.6; }

.tl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.tl-card {
  padding: 16px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
}
.tl-card-title { margin: 0 0 10px; font-size: 14px; letter-spacing: 1px; color: var(--text-high, #fff); }
.tl-sub { margin-top: 12px; font-size: 12px; opacity: 0.7; }
.tl-kpi { margin: 10px 0 0; font-size: 12px; opacity: 0.75; line-height: 1.7; }
.tl-kpi b { color: var(--text-high, #fff); font-weight: 600; }
.tl-kpi-row { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 10px; font-size: 12px; opacity: 0.75; }

.tl-radar { width: 100%; max-height: 240px; }
.tl-radar-label { fill: rgba(255, 255, 255, 0.72); font-size: 10px; }

.tl-heat { display: flex; flex-direction: column; gap: 3px; }
.tl-heat-row { display: flex; align-items: center; gap: 6px; }
.tl-heat-day { width: 30px; font-size: 10px; opacity: 0.7; }
.tl-heat-cell { flex: 1; height: 14px; border-radius: 3px; background: rgba(255, 255, 255, 0.05); }
.tl-peak { margin: 6px 0 0; padding: 0; list-style: none; font-size: 12px; opacity: 0.75; display: flex; flex-wrap: wrap; gap: 4px 16px; }
.tl-peak li::before { content: '✦ '; color: #8ab4ff; }

.tl-window { display: flex; gap: 10px; margin-bottom: 12px; }
.tl-window-best, .tl-window-score {
  flex: 1; display: flex; flex-direction: column; gap: 4px;
  padding: 10px 12px; border-radius: 12px; font-size: 12px;
  background: rgba(138, 180, 255, 0.08); border: 1px solid rgba(138, 180, 255, 0.2);
}
.tl-window-best b, .tl-window-score b { font-size: 15px; color: #8ab4ff; }
.tl-window-score { align-items: center; }
.tl-win-tag { font-size: 10px; letter-spacing: 1px; opacity: 0.7; }

.tl-bars { display: flex; flex-direction: column; gap: 5px; }
.tl-bar { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.tl-bar-label { width: 26px; opacity: 0.7; }
.tl-bar-track { flex: 1; height: 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.06); }
.tl-bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #7f9d8a, #8ab4ff); }
.tl-bar-val { width: 40px; text-align: right; opacity: 0.7; }

.tl-curve { width: 100%; height: 120px; }

.tl-emotions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.tl-emotion-chip {
  padding: 3px 9px; border-radius: 999px; font-size: 11px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.09);
}

.tl-tags { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.tl-tag { display: flex; align-items: center; gap: 10px; font-size: 12px; }
.tl-tag b { width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-tag-dot { height: 6px; border-radius: 3px; background: linear-gradient(90deg, #f0cf6a, #8ab4ff); }
.tl-tag-num { margin-left: auto; font-size: 11px; opacity: 0.6; }

.tl-keywords { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.tl-keyword { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.tl-kw-text { flex: 1; }
.tl-kw-cat { padding: 1px 7px; border-radius: 999px; font-size: 10px; background: rgba(255, 255, 255, 0.06); }
.tl-kw-weight { color: #8ab4ff; font-weight: 600; }

@media (max-width: 640px) {
  .tl-overview { grid-template-columns: repeat(5, 1fr); }
  .tl-grid { grid-template-columns: 1fr; }
}
</style>