<template>
  <!-- 羁绊之厅 · 关系可视化洞察（INCR-367 补挂载孤儿引擎 relation-visualization.ts，薄委托直引） -->
  <section class="rip" data-enter aria-label="关系可视化洞察">
    <header class="rip-head">
      <span class="rip-title">🕸 关系洞察</span>
      <span class="rip-sub">力导向网络 · 交互热力 · 关系时间线 · 关系雷达</span>
    </header>

    <!-- ================= 力导向网络 ================= -->
    <div class="rip-block">
      <h3 class="rip-btitle">力导向网络</h3>
      <p class="rip-hint">按亲密度与共同标签自动布局的人物关系网</p>
      <svg :viewBox="forceViewBox" class="rip-force-svg" role="img" aria-label="力导向网络图">
        <defs>
          <radialGradient id="rip-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(var(--accent-rgb), 0.25)" />
            <stop offset="100%" stop-color="rgba(var(--accent-rgb), 0)" />
          </radialGradient>
        </defs>
        <template v-for="edge in force.edges" :key="edge.source + '-' + edge.target">
          <line
            v-if="nodePos(edge.source) && nodePos(edge.target)"
            :x1="nodePos(edge.source)!.x" :y1="nodePos(edge.source)!.y"
            :x2="nodePos(edge.target)!.x" :y2="nodePos(edge.target)!.y"
            class="rip-edge"
            :stroke-opacity="0.06 + edge.strength * 0.25"
          />
        </template>
        <circle :cx="250" :cy="190" r="120" fill="url(#rip-glow)" />
        <!-- 中心：我 -->
        <g>
          <circle cx="250" cy="190" r="18" class="rip-self" />
          <text x="250" y="195" text-anchor="middle" class="rip-self-label">我</text>
        </g>
        <!-- 人物节点 -->
        <g v-for="n in personNodes" :key="n.id" class="rip-node-group">
          <circle :cx="n.x" :cy="n.y" :r="n.size" :fill="n.color" opacity="0.18" />
          <circle :cx="n.x" :cy="n.y" :r="Math.max(4, n.size * 0.45)" :fill="n.color" opacity="0.6" />
          <text :x="n.x" :y="n.y + (n.size + 14)" text-anchor="middle" class="rip-node-label">{{ n.name }}</text>
        </g>
      </svg>
    </div>

    <!-- ================= 交互热力图 ================= -->
    <div class="rip-block">
      <h3 class="rip-btitle">交互热力</h3>
      <template v-if="heatmap.total > 0">
        <div class="rip-heat-grid" data-test="heatmap">
          <span class="rip-heat-day" />
          <span v-for="h in HOUR_TICKS" :key="'h'+h" class="rip-heat-h" :class="{ minor: h % 6 !== 0 }">{{ h % 6 === 0 ? h : '' }}</span>
          <template v-for="d in 7" :key="'day'+d">
            <span class="rip-heat-day">{{ DAY_LABELS[d - 1] }}</span>
            <span
              v-for="h in 24"
              :key="d + '-' + h"
              class="rip-heat-cell"
              :class="{ hot: heatCell(d - 1, h - 1).intensity > 0.5 }"
              :style="{ background: cellColor(heatCell(d - 1, h - 1).intensity) }"
              :title="`${DAY_LABELS[d - 1]} ${String(h - 1).padStart(2, '0')}:00 · ${heatCell(d - 1, h - 1).count} 次`"
            />
          </template>
        </div>
        <div class="rip-heat-meta" data-test="heatmeta">
          <span>最活跃：{{ DAY_LABELS[heatmap.peakHour.dayOfWeek] }} {{ String(heatmap.peakHour.hourOfDay).padStart(2, '0') }}:00 · {{ heatmap.peakHour.count }} 次</span>
          <span v-if="heatmap.quietestHour.count === 0">尚未覆盖的时段还很多</span>
          <span v-else>最安静：{{ DAY_LABELS[heatmap.quietestHour.dayOfWeek] }} {{ String(heatmap.quietestHour.hourOfDay).padStart(2, '0') }}:00</span>
        </div>
      </template>
      <p v-else class="rip-empty">还没有互动记录，热力图将在记录互动后点亮。</p>
    </div>

    <!-- ================= 关系时间线 ================= -->
    <div class="rip-block">
      <h3 class="rip-btitle">关系时间线</h3>
      <template v-if="timeline.events.length > 0">
        <div class="rip-tl-meta" data-test="tlmeta">
          <span>跨度 {{ timeline.timeSpan.start }} ~ {{ timeline.timeSpan.end }}</span>
          <span>事件密度 {{ timeline.eventDensity.toFixed(1) }} 条/月 · 共 {{ timeline.events.length }} 条</span>
        </div>
        <ol class="rip-tl-list" data-test="timeline">
          <li v-for="ev in recentEvents" :key="ev.id" class="rip-tl-item">
            <span class="rip-tl-date">{{ ev.date }}</span>
            <span class="rip-tl-badge" :class="'rip-type-' + ev.type">{{ TYPE_LABEL[ev.type] }}</span>
            <span class="rip-tl-body">
              <strong>{{ ev.personName }}</strong>
              <em>{{ ev.title }}</em>
              <span v-if="ev.description" class="rip-tl-desc">{{ ev.description }}</span>
            </span>
          </li>
        </ol>
      </template>
      <p v-else class="rip-empty" data-test="tlempty">还没有互动与纪念日记录，时间线将随记录沉淀。</p>
    </div>

    <!-- ================= 关系雷达 ================= -->
    <div class="rip-block">
      <h3 class="rip-btitle">关系雷达</h3>
      <div class="rip-radar-head" v-if="radar">
        <select v-model="radarTargetId" class="rip-radar-select" data-test="radarselect">
          <option v-for="p in persons" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <div class="rip-radar-score">
          <span>综合评分</span>
          <strong>{{ radar.overallScore }}<em>/10</em></strong>
        </div>
      </div>
      <template v-if="radar">
        <svg :viewBox="radarViewBox" class="rip-radar-svg" data-test="radarsvg" role="img" aria-label="关系质量雷达图">
          <g v-for="lv in [0.33, 0.66, 1]" :key="lv">
            <polygon :points="radarRing(lv)" class="rip-radar-grid" />
          </g>
          <line v-for="(d, i) in radar.dimensions" :key="'ax'+d.key"
            :x1="radarAxes[i].x" :y1="radarAxes[i].y"
            :x2="radarAxes[i].x" :y2="radarAxes[i].y"
            class="rip-radar-axis" />
          <polygon :points="radarValue" class="rip-radar-value" />
          <g v-for="(d, i) in radar.dimensions" :key="'pt'+d.key">
            <circle :cx="radarPts[i].x" :cy="radarPts[i].y" r="3" class="rip-radar-dot" />
            <text :x="radarLabels[i].x" :y="radarLabels[i].y" text-anchor="middle" class="rip-radar-dim">{{ d.label }}</text>
          </g>
        </svg>
        <div class="rip-radar-verdict" data-test="radarverdict">
          <span v-for="s in radar.strengths" :key="'s'+s" class="rip-tag rip-tag-s">▲ {{ s }}</span>
          <span v-for="w in radar.weaknesses" :key="'w'+w" class="rip-tag rip-tag-w">▼ {{ w }}</span>
        </div>
        <ul v-if="radar.suggestions.length" class="rip-suggest" data-test="suggest">
          <li v-for="(sg, i) in radar.suggestions" :key="i">{{ sg }}</li>
        </ul>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { storageVersion } from '../engine/storage'
import { useInteractionJournal } from '../modules/relation/interaction-journal'
import {
  computeForceLayout,
  buildInteractionHeatmap,
  buildRelationshipTimeline,
  computeRelationshipRadar,
  DAY_LABELS,
  RADAR_DIMENSIONS,
} from '../modules/relation/relation-visualization'
import type { Person } from '../modules/relation/types'

const props = defineProps<{ persons: Person[] }>()

const journal = useInteractionJournal()
onMounted(() => {
  journal.loadInteractions()
  if (props.persons.length && !radarTargetId.value) {
    radarTargetId.value = props.persons[0].id
  }
})
watch(
  () => props.persons,
  (list) => {
    if (!list.length) radarTargetId.value = null
    else if (!list.some(p => p.id === radarTargetId.value)) radarTargetId.value = list[0].id
  },
)

const radarTargetId = ref<string | null>(null)

const interactions = computed(() => journal.interactions.value)

const force = computed(() => {
  storageVersion.value
  return computeForceLayout(props.persons, { width: 500, height: 380 })
})
const forceViewBox = '0 0 500 380'

interface Pos { x: number; y: number }
const nodeMap = computed<Record<string, Pos>>(() => {
  const map: Record<string, Pos> = {}
  for (const n of force.value.nodes) map[n.id] = { x: n.x, y: n.y }
  return map
})
function nodePos(id: string): Pos | undefined { return nodeMap.value[id] }
const personNodes = computed(() => force.value.nodes.filter(n => n.id !== 'self'))

const heatmap = computed(() => {
  storageVersion.value
  const hm = buildInteractionHeatmap(interactions.value)
  return { ...hm, total: interactions.value.length }
})
const HOUR_TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 23]
function heatCell(day: number, hour: number) {
  return heatmap.value.cells.find(c => c.dayOfWeek === day && c.hourOfDay === hour)
    ?? { dayOfWeek: day, hourOfDay: hour, count: 0, intensity: 0 }
}
function cellColor(intensity: number): string {
  return `rgba(var(--accent-rgb), ${(0.05 + intensity * 0.5).toFixed(2)})`
}

const timeline = computed(() => {
  storageVersion.value
  return buildRelationshipTimeline(props.persons, interactions.value)
})
const TYPE_LABEL: Record<string, string> = {
  interaction: '互动', anniversary: '纪念', contact: '联系', milestone: '里程碑', seat: '留座',
}
const recentEvents = computed(() => [...timeline.value.events].reverse().slice(0, 10))

const radarPerson = computed<Person | null>(() => {
  storageVersion.value
  if (!props.persons.length) return null
  return props.persons.find(p => p.id === radarTargetId.value) ?? props.persons[0]
})
const radar = computed(() => {
  if (!radarPerson.value) return null
  return computeRelationshipRadar(radarPerson.value, interactions.value)
})

const RADAR_CX = 130
const RADAR_CY = 130
const RADAR_R = 92
const radarViewBox = `0 0 260 260`
function radarPoint(index: number, ratio: number): Pos {
  const angle = -Math.PI / 2 + index * (Math.PI * 2 / RADAR_DIMENSIONS.length)
  return {
    x: RADAR_CX + Math.cos(angle) * RADAR_R * ratio,
    y: RADAR_CY + Math.sin(angle) * RADAR_R * ratio,
  }
}
const radarAxes = computed<Pos[]>(() =>
  RADAR_DIMENSIONS.map((_, i) => radarPoint(i, 1)),
)
const radarPts = computed<Pos[]>(() => {
  if (!radar.value) return []
  return radar.value.dimensions.map((d, i) => radarPoint(i, d.value / d.maxValue))
})
const radarLabels = computed<Pos[]>(() => {
  if (!radar.value) return []
  return radar.value.dimensions.map((_, i) => {
    const angle = -Math.PI / 2 + i * (Math.PI * 2 / RADAR_DIMENSIONS.length)
    return {
      x: RADAR_CX + Math.cos(angle) * (RADAR_R + 24),
      y: RADAR_CY + Math.sin(angle) * (RADAR_R + 24),
    }
  })
})
function radarRing(level: number): string {
  return RADAR_DIMENSIONS.map((_, i) => {
    const p = radarPoint(i, level)
    return `${p.x},${p.y}`
  }).join(' ')
}
const radarValue = computed(() => {
  if (!radar.value) return ''
  return radar.value.dimensions.map((d, i) => {
    const p = radarPoint(i, d.value / d.maxValue)
    return `${p.x},${p.y}`
  }).join(' ')
})
</script>

<style scoped>
.rip {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 28px;
  padding: 22px;
  border-radius: 18px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.rip-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rip-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-high);
  letter-spacing: 1px;
}
.rip-sub {
  font-size: 11px;
  color: var(--text-low);
  letter-spacing: 0.5px;
}
.rip-block {
  padding: 16px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.rip-btitle {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-high);
}
.rip-hint {
  margin: 0 0 14px;
  font-size: 11px;
  color: var(--text-faint);
}
.rip-force-svg {
  width: 100%;
  height: auto;
}
.rip-edge {
  stroke: var(--accent);
  stroke-width: 1;
}
.rip-self {
  fill: var(--accent);
  opacity: 0.9;
}
.rip-self-label {
  fill: var(--bg-primary);
  font-size: 11px;
  font-weight: 600;
  dominant-baseline: middle;
}
.rip-node-group {
  cursor: default;
}
.rip-node-label {
  font-size: 10px;
  font-weight: 500;
  fill: rgba(var(--text-primary-rgb), 0.6);
}
/* 热力 */
.rip-heat-grid {
  display: grid;
  grid-template-columns: 44px repeat(24, 1fr);
  gap: 2px;
  align-items: center;
}
.rip-heat-day {
  font-size: 10px;
  color: var(--text-faint);
  text-align: right;
  padding-right: 6px;
  line-height: 1;
}
.rip-heat-h {
  font-size: 9px;
  color: var(--text-faint);
  text-align: center;
  line-height: 1;
}
.rip-heat-h.minor { opacity: 0.5; }
.rip-heat-cell {
  height: 14px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.05);
}
.rip-heat-meta {
  margin-top: 12px;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-secondary);
}
/* 时间线 */
.rip-tl-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}
.rip-tl-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
}
.rip-tl-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.25);
}
.rip-tl-date {
  font-size: 10px;
  color: var(--text-dim);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  padding-top: 1px;
}
.rip-tl-badge {
  font-size: 9px;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  color: var(--text-secondary);
}
.rip-type-interaction { color: var(--accent); }
.rip-type-anniversary { color: #f0c040; }
.rip-type-seat { color: #c46a5a; }
.rip-tl-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.rip-tl-body em {
  font-style: normal;
  color: var(--text-medium);
}
.rip-tl-desc {
  font-size: 11px;
  color: var(--text-faint);
}
/* 雷达 */
.rip-radar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.rip-radar-select {
  padding: 6px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.rip-radar-score {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  color: var(--text-low);
}
.rip-radar-score strong {
  font-size: 22px;
  color: var(--accent);
  font-weight: 600;
}
.rip-radar-score em {
  font-style: normal;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-faint);
}
.rip-radar-svg {
  width: 100%;
  max-width: 300px;
  height: auto;
  margin: 0 auto;
  display: block;
}
.rip-radar-grid {
  fill: none;
  stroke: rgba(var(--accent-rgb), 0.14);
  stroke-width: 0.6;
}
.rip-radar-axis {
  stroke: rgba(var(--accent-rgb), 0.1);
  stroke-width: 0.6;
  opacity: 0.35;
}
.rip-radar-value {
  fill: rgba(var(--accent-rgb), 0.16);
  stroke: var(--accent);
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.rip-radar-dot {
  fill: var(--accent);
}
.rip-radar-dim {
  font-size: 10px;
  fill: var(--text-secondary);
}
.rip-radar-verdict {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  justify-content: center;
}
.rip-tag {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
}
.rip-tag-s {
  color: #8a9a7a;
  border: 1px solid rgba(138, 154, 122, 0.3);
  background: rgba(138, 154, 122, 0.08);
}
.rip-tag-w {
  color: #c46a5a;
  border: 1px solid rgba(196, 106, 90, 0.3);
  background: rgba(196, 106, 90, 0.08);
}
.rip-suggest {
  margin: 12px 0 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--text-medium);
  line-height: 1.8;
}
.rip-empty {
  margin: 0;
  padding: 16px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-faint);
}
</style>