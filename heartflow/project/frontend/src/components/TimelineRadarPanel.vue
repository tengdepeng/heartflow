<template>
  <section class="tlr" data-enter aria-label="数据雷达">
    <header class="tlr-head">
      <span class="tlr-title">📡 数据雷达</span>
      <span class="tlr-sub">综合雷达 · 日时热力 · 情绪热力 · 标签雷达 · 专注雷达</span>
    </header>

    <!-- 空态 -->
    <div v-if="empty" class="tlr-empty">
      <span class="tlr-empty-icon">◎</span>
      <p>时间之河还静默着。记录专注、情绪与笔记后，这里会生长出属于你的活动图谱。</p>
    </div>

    <template v-else>
      <!-- 报告摘要 -->
      <div class="tlr-overview">
        <div class="tlr-ov-cell" data-test="summary"><span>专注总时长</span><b>{{ fmtHm(summaryFocusMinutes) }}</b></div>
        <div class="tlr-ov-cell"><span>主导情绪</span><b>{{ emoLabel(report.emotionHeatmap.dominantEmotion) }}</b></div>
        <div class="tlr-ov-cell"><span>活动维度</span><b>{{ activeDimCount }}</b></div>
        <div class="tlr-ov-cell"><span>标签数</span><b>{{ report.tagRadar.totalTags }}</b></div>
        <div class="tlr-ov-cell"><span>最佳窗口</span><b>{{ bestWindowText }}</b></div>
      </div>

      <!-- 综合雷达（SVG） -->
      <div class="tlr-card" data-test="radar-chart">
        <span class="tlr-card-t">🕸️ 综合雷达</span>
        <svg :viewBox="viewBox" class="tlr-svg" role="img">
          <!-- 同心网格圈 -->
          <g v-for="lv in [0.33, 0.66, 1]" :key="lv">
            <polygon :points="ringPoints(lv)" class="tlr-grid" />
          </g>
          <!-- 轴线 -->
          <line v-for="(p, i) in axisPoints" :key="'ax' + i" :x1="cx" :y1="cy" :x2="p.x" :y2="p.y" class="tlr-axis" />
          <!-- 数值多边形 -->
          <polygon :points="valuePoints" class="tlr-value" />
          <!-- 维度点 -->
          <circle v-for="(p, i) in dotPoints" :key="'dt' + i" :cx="p.x" :cy="p.y" :r="3" :fill="DIM_COLORS[i]" class="tlr-dot" />
          <!-- 标签 -->
          <text v-for="(p, i) in labelPoints" :key="'lb' + i" :x="p.x" :y="p.y" class="tlr-label" text-anchor="middle">
            {{ report.radar.points[i].label }} {{ round(report.radar.points[i].rawValue) }}
          </text>
        </svg>
      </div>

      <!-- 日时热力 -->
      <div class="tlr-card" data-test="dayhour">
        <span class="tlr-card-t">🌡️ 日时热力</span>
        <p class="tlr-card-kicker">最活跃时段 {{ hourLabel(heat.mostActiveHour) }} · 工作日/周末专注比 ×{{ round(heat.weekdayFocusRatio) }}</p>
        <div class="tlr-heat-grid">
          <span class="tlr-heat-y"></span>
          <span v-for="h in 24" :key="'hx' + h" class="tlr-heat-hx">{{ (h - 1) % 4 === 0 ? (h - 1) : '' }}</span>
          <template v-for="d in 7" :key="d">
            <span class="tlr-heat-y">{{ DAY_LABELS[d - 1] }}</span>
            <span v-for="h in 24" :key="d + '-' + h" class="tlr-heat-cell"
              :style="{ background: cellColor(cellFor(d - 1, h - 1)) }" />
          </template>
        </div>
      </div>

      <!-- 情绪热力 -->
      <div class="tlr-card" data-test="emotion">
        <span class="tlr-card-t">🌷 情绪热力</span>
        <div class="tlr-emo-meta">
          <span class="tlr-emo-badge">主导「{{ emoLabel(report.emotionHeatmap.dominantEmotion) }}」</span>
          <span class="tlr-emo-item">多样性 <b>{{ round(report.emotionHeatmap.diversityIndex) }}</b></span>
          <span class="tlr-emo-item">趋势
            <b :class="trendClass(report.emotionHeatmap.trend)">{{ trendText(report.emotionHeatmap.trend) }}</b>
          </span>
        </div>
        <div v-if="emoRows.length" class="tlr-emo-rows">
          <div v-for="r in emoRows" :key="r.emotion" class="tlr-emo-row">
            <span class="tlr-emo-label">{{ emoLabel(r.emotion) }}</span>
            <div class="tlr-emo-track"><div class="tlr-emo-fill" :style="{ width: r.pct + '%' }" /></div>
            <span class="tlr-emo-count">{{ r.count }}</span>
          </div>
        </div>
      </div>

      <!-- 标签雷达 -->
      <div class="tlr-card" data-test="tag">
        <span class="tlr-card-t">🏷️ 标签雷达</span>
        <p class="tlr-card-kicker">共 {{ report.tagRadar.totalTags }} 个标签 · 多样性 {{ round(report.tagRadar.diversity) }}</p>
        <div v-if="tagRows.length" class="tlr-tag-list">
          <div v-for="c in tagRows" :key="c.tag" class="tlr-tag-row">
            <span class="tlr-tag-name" :title="c.tag">{{ c.tag }}</span>
            <span class="tlr-tag-bar"><span class="tlr-tag-fill" :style="{ width: c.pct + '%' }" /></span>
            <span class="tlr-tag-sub">{{ c.count }}次 · {{ c.avgFocusMinutes }}min · {{ emoLabel(c.dominantEmotion) }}</span>
            <div v-if="c.related.length" class="tlr-tag-related">
              <span v-for="r in c.related" :key="r.tag" class="tlr-tag-chip">{{ r.tag }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 专注雷达 -->
      <div class="tlr-card" data-test="focus">
        <span class="tlr-card-t">⏱️ 专注雷达</span>
        <div class="tlr-focus-meta">
          <span class="tlr-emo-badge">整体效率 <b>{{ report.focusRadar.overallEfficiency }}</b></span>
          <span class="tlr-emo-item">最佳窗口 <b>{{ bestWindowText }}</b></span>
        </div>
        <div class="tlr-focus-groups">
          <div class="tlr-focus-group">
            <span class="tlr-focus-t">按星期</span>
            <div v-for="e in report.focusRadar.byDayOfWeek" :key="'d' + e.label" class="tlr-focus-row">
              <span class="tlr-focus-label">{{ e.label }}</span>
              <span class="tlr-focus-bar"><span class="tlr-focus-fill" :style="{ width: barPct(e, 45) + '%' }" /></span>
              <span class="tlr-focus-v">{{ e.avgFocusMinutes }}m</span>
            </div>
          </div>
          <div class="tlr-focus-group">
            <span class="tlr-focus-t">按时段</span>
            <div v-for="e in report.focusRadar.byTimeOfDay" :key="'t' + e.label" class="tlr-focus-row">
              <span class="tlr-focus-label">{{ periodShort(e.label) }}</span>
              <span class="tlr-focus-bar"><span class="tlr-focus-fill" :style="{ width: barPct(e, 45) + '%' }" /></span>
              <span class="tlr-focus-v">{{ e.avgFocusMinutes }}m</span>
            </div>
          </div>
        </div>
        <div v-if="report.focusRadar.byTag.length" class="tlr-focus-group">
          <span class="tlr-focus-t">按标签</span>
          <div v-for="e in report.focusRadar.byTag.slice(0, 6)" :key="'g' + e.label" class="tlr-focus-row">
            <span class="tlr-focus-label">{{ e.label }}</span>
            <span class="tlr-focus-bar"><span class="tlr-focus-fill" :style="{ width: barPct(e, 45) + '%' }" /></span>
            <span class="tlr-focus-v">{{ e.focusCount }}次 · {{ e.avgFocusMinutes }}m</span>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storageVersion } from '../engine/storage'
import { getRiverSource } from '../modules/timeline/river'
import { generateTimelineRadarReport } from '../modules/timeline/timeline-radar'

const DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const EMO_LABELS: Record<string, string> = {
  happy: '喜悦', calm: '平静', sad: '低落', anxious: '焦虑', angry: '愤怒', neutral: '中性',
}
const DIM_COLORS = ['#d4a574', '#8a9a7a', '#c46a5a', '#e0b060', '#7aa0c4', '#a08ac4']

const report = computed(() => {
  storageVersion.value
  return generateTimelineRadarReport(getRiverSource())
})

const heat = computed(() => report.value.heatmap)
const empty = computed(() =>
  report.value.radar.points.every(p => p.rawValue === 0) &&
  report.value.tagRadar.totalTags === 0 &&
  report.value.emotionHeatmap.points.length === 0,
)

const summaryFocusMinutes = computed(() =>
  Math.round(report.value.radar.points.find(p => p.dimension === 'focus')?.rawValue ?? 0),
)
const activeDimCount = computed(() => report.value.radar.points.filter(p => p.rawValue > 0).length)

const bestWindowText = computed(() => {
  const b = report.value.focusRadar.bestWindow
  return `${DAY_LABELS[b.dayOfWeek]}·${b.timeOfDay}`
})

function fmtHm(min: number): string {
  if (min <= 0) return '0m'
  return min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? ' ' + (min % 60) + 'm' : ''}` : `${min}m`
}
function round(n: number): number {
  return Math.round(n * 100) / 100
}
function emoLabel(k: string): string {
  return EMO_LABELS[k] ?? k
}
function hourLabel(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}
function cellFor(dow: number, hour: number) {
  return heat.value.cells.find(c => c.dayOfWeek === dow && c.hour === hour)
}
function cellColor(c: { focusMinutes: number } | undefined): string {
  if (!c || c.focusMinutes <= 0) return 'rgba(0,0,0,0)'
  const a = 0.1 + 0.75 * (c.focusMinutes / Math.max(heat.value.maxFocusMinutes, 1))
  return `rgba(212,165,116,${a.toFixed(2)})`
}

// ---- 情绪趋势 ----
const emoRows = computed(() => {
  const dist = report.value.emotionHeatmap.distribution
  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1])
  const max = Math.max(...entries.map(([, c]) => c), 1)
  return entries.map(([emotion, count]) => ({ emotion, count, pct: Math.round((count / max) * 100) }))
})
function trendText(t: 'rising' | 'falling' | 'stable'): string {
  return t === 'rising' ? '上行 ↗' : t === 'falling' ? '下行 ↘' : '平稳 →'
}
function trendClass(t: 'rising' | 'falling' | 'stable'): string {
  return `is-${t}`
}

// ---- 标签 ----
const tagRows = computed(() => {
  const max = Math.max(...report.value.tagRadar.clusters.map(c => c.influenceScore), 0.0001)
  return report.value.tagRadar.clusters.slice(0, 8).map(c => ({
    ...c,
    pct: Math.max(4, Math.round((c.influenceScore / max) * 100)),
    related: c.relatedTags.slice(0, 3),
  }))
})

// ---- 专注 ----
function barPct(e: { avgFocusMinutes: number }, cap: number): number {
  return Math.round(Math.min(100, (e.avgFocusMinutes / cap) * 100))
}
function periodShort(label: string): string {
  return label.replace(' (6-12)', '').replace(' (12-18)', '').replace(' (18-24)', '').replace(' (0-6)', '')
}

// ---- 综合雷达 SVG ----
const cx = 130
const cy = 115
const R = 80
function angleAt(i: number): number {
  return (-Math.PI / 2) + (i * 2 * Math.PI) / 6
}
const axisPoints = computed(() =>
  report.value.radar.points.map((_, i) => ({ x: cx + R * Math.cos(angleAt(i)), y: cy + R * Math.sin(angleAt(i)) })),
)
function ringPoints(level: number): string {
  return report.value.radar.points
    .map((_, i) => {
      const x = cx + R * level * Math.cos(angleAt(i))
      const y = cy + R * level * Math.sin(angleAt(i))
      return `${x},${y}`
    })
    .join(' ')
}
const valuePoints = computed(() =>
  report.value.radar.points
    .map((p, i) => {
      // 开平方抬升小值，让低量维度在大数值下仍可见
      const r = R * (0.18 + 0.82 * Math.sqrt(Math.min(1, Math.max(0, p.value))))
      return `${cx + r * Math.cos(angleAt(i))},${cy + r * Math.sin(angleAt(i))}`
    })
    .join(' '),
)
const dotPoints = computed(() =>
  report.value.radar.points.map((p, i) => {
    const r = R * (0.18 + 0.82 * Math.sqrt(Math.min(1, Math.max(0, p.value))))
    return { x: cx + r * Math.cos(angleAt(i)), y: cy + r * Math.sin(angleAt(i)) }
  }),
)
const labelPoints = computed(() =>
  report.value.radar.points.map((_, i) => ({
    x: cx + (R + 26) * Math.cos(angleAt(i)),
    y: cy + (R + 26) * Math.sin(angleAt(i)) + 4,
  })),
)
const viewBox = '0 0 260 230'
</script>

<style scoped>
:root {
  --tlr-accent: var(--accent, #d4a574);
  --tlr-border: var(--border-color, rgba(var(--accent-rgb), 0.12));
  --tlr-card: var(--bg-card, rgba(42, 36, 30, 0.6));
}
.tlr {
  padding: 4px 2px 16px;
  color: var(--text-primary, #e8e0d8));
}
.tlr-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 4px 2px 12px;
  flex-wrap: wrap;
}
.tlr-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--tlr-accent);
}
.tlr-sub {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  letter-spacing: 0.5px;
}
.tlr-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 20px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
}
.tlr-empty-icon {
  font-size: 36px;
  opacity: 0.4;
}
.tlr-empty p {
  font-size: 13px;
  max-width: 420px;
  text-align: center;
}

.tlr-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.tlr-ov-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--tlr-card);
  border: 1px solid var(--tlr-border);
}
.tlr-ov-cell span {
  font-size: 11px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
}
.tlr-ov-cell b {
  font-size: 15px;
  font-weight: 600;
  color: var(--tlr-accent);
}

.tlr-card {
  padding: 14px 14px 12px;
  margin-bottom: 12px;
  border-radius: 12px;
  background: var(--tlr-card);
  border: 1px solid var(--tlr-border);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.03);
}
.tlr-card-t {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary, #e8e0d8));
}
.tlr-card-kicker {
  font-size: 11px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  margin: 0 0 8px;
}

/* 综合雷达 */
.tlr-svg {
  width: 100%;
  max-width: 340px;
  height: auto;
  margin: 0 auto;
  display: block;
}
.tlr-grid {
  fill: none;
  stroke: rgba(var(--accent-rgb), 0.18);
  stroke-width: 1;
}
.tlr-axis {
  stroke: rgba(var(--accent-rgb), 0.12);
  stroke-width: 1;
}
.tlr-value {
  fill: rgba(212, 165, 116, 0.16);
  stroke: var(--tlr-accent);
  stroke-width: 1.5;
  stroke-linejoin: round;
}
.tlr-dot {
  stroke: rgba(15, 12, 10, 0.4);
  stroke-width: 1;
}
.tlr-label {
  font-size: 11px;
  fill: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

/* 日时热力 */
.tlr-heat-grid {
  display: grid;
  grid-template-columns: 38px repeat(24, 1fr);
  gap: 2px;
  font-size: 9px;
  align-items: center;
}
.tlr-heat-y {
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  text-align: right;
  padding-right: 4px;
  white-space: nowrap;
}
.tlr-heat-hx {
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  text-align: center;
}
.tlr-heat-cell {
  height: 14px;
  border-radius: 2px;
}

/* 情绪 */
.tlr-emo-meta, .tlr-focus-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 6px 0 10px;
}
.tlr-emo-badge {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--accent-dim, rgba(var(--accent-rgb), 0.2));
  color: var(--tlr-accent);
}
.tlr-emo-item {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.tlr-emo-item b { margin-left: 2px; }
.tlr-emo-item b.is-rising { color: #8a9a7a; }
.tlr-emo-item b.is-falling { color: #c46a5a; }
.tlr-emo-item b.is-stable { color: var(--tlr-accent); }
.tlr-emo-rows { display: flex; flex-direction: column; gap: 6px; }
.tlr-emo-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.tlr-emo-label { width: 44px; color: var(--text-secondary, rgba(232, 224, 216, 0.55)); }
.tlr-emo-track { flex: 1; height: 6px; border-radius: 3px; background: rgba(var(--accent-rgb), 0.1); overflow: hidden; }
.tlr-emo-fill { height: 100%; background: var(--tlr-accent); border-radius: 3px; }
.tlr-emo-count { width: 24px; text-align: right; color: var(--text-muted, rgba(232, 224, 216, 0.44)); }

/* 标签 */
.tlr-tag-list { display: flex; flex-direction: column; gap: 7px; }
.tlr-tag-row { display: flex; align-items: center; gap: 8px; font-size: 11px; flex-wrap: wrap; }
.tlr-tag-name { width: 66px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary, rgba(232, 224, 216, 0.55)); }
.tlr-tag-bar { flex: 1; min-width: 60px; height: 6px; border-radius: 3px; background: rgba(var(--accent-rgb), 0.1); overflow: hidden; }
.tlr-tag-fill { display: block; height: 100%; background: linear-gradient(90deg, #8a9a7a, var(--tlr-accent)); border-radius: 3px; }
.tlr-tag-sub { width: 118px; color: var(--text-muted, rgba(232, 224, 216, 0.44)); white-space: nowrap; }
.tlr-tag-related { display: flex; gap: 4px; width: 100%; padding-left: 74px; margin-top: -1px; }
.tlr-tag-chip { font-size: 9px; padding: 1px 6px; border-radius: 8px; background: rgba(var(--accent-rgb), 0.12); color: var(--text-muted, rgba(232, 224, 216, 0.44)); }

/* 专注 */
.tlr-focus-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tlr-focus-group { display: flex; flex-direction: column; gap: 5px; }
.tlr-focus-t { font-size: 10px; color: var(--text-muted, rgba(232, 224, 216, 0.44)); letter-spacing: 1px; }
.tlr-focus-row { display: flex; align-items: center; gap: 7px; font-size: 11px; }
.tlr-focus-label { width: 56px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary, rgba(232, 224, 216, 0.55)); }
.tlr-focus-bar { flex: 1; height: 6px; border-radius: 3px; background: rgba(var(--accent-rgb), 0.1); overflow: hidden; }
.tlr-focus-fill { display: block; height: 100%; background: var(--tlr-accent); border-radius: 3px; }
.tlr-focus-v { color: var(--text-muted, rgba(232, 224, 216, 0.44)); white-space: nowrap; }

@media (max-width: 640px) {
  .tlr-focus-groups { grid-template-columns: 1fr; }
  .tlr-tag-sub { width: auto; }
}
</style>