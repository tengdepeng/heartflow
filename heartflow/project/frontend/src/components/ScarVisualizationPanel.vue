<template>
  <section class="svp" aria-label="伤痕可视化">
    <div class="svp-head">
      <span class="svp-title">🗺️ 伤痕可视化</span>
      <span class="svp-sub">身体分布 · 愈合时间线 · 成长曲线 · 严重度雷达</span>
    </div>

    <div v-if="marks.length === 0" class="svp-empty">
      <span>🕊️</span>
      <p>还没有伤痕记录，记录第一道工痕后这里会展开你的伤痕地图与愈合轨迹。</p>
    </div>

    <template v-else>
      <!-- 身体分布图 -->
      <div class="svp-block">
        <div class="svp-block-head">
          <span class="svp-block-label">身体伤痕分布 · {{ data.bodyMap.length }} 处部位</span>
          <span class="svp-block-note">节点大小随数量，颜色随平均严重度</span>
        </div>
        <div class="svp-body">
          <svg viewBox="0 0 100 100" class="svp-body-svg">
            <path d="M50 2 C 44 6 40 10 40 15 L 40 24 C 30 24 24 30 24 38 L 24 46 C 24 52 30 55 36 55 L 36 70 L 30 92 L 38 92 L 44 72 L 56 72 L 62 92 L 70 92 L 64 70 L 64 55 C 70 55 76 52 76 46 L 76 38 C 76 30 70 24 60 24 L 60 15 C 60 10 56 6 50 2 Z" class="svp-body-silhouette"/>
            <g
              v-for="n in data.bodyMap"
              :key="n.bodyPart"
              :transform="`translate(${n.x}, ${n.y})`"
              class="svp-body-node"
              @click="selectedPart = selectedPart === n.bodyPart ? null : n.bodyPart"
            >
              <circle
                :r="bodyRadius(n.count)"
                :fill="severityColor(n.avgSeverity)"
                :fill-opacity="selectedPart === n.bodyPart ? 0.5 : 0.28"
                :stroke="severityColor(n.avgSeverity)"
                :stroke-width="selectedPart === n.bodyPart ? 2 : 1"
              />
              <text text-anchor="middle" :dy="3" :fill="severityColor(n.avgSeverity)" class="svp-body-text">{{ BODY_LABEL[n.bodyPart] }}</text>
            </g>
          </svg>
          <div class="svp-body-side">
            <div v-for="n in data.bodyMap" :key="n.bodyPart" class="svp-body-row" :class="{ 'svp-body-row--sel': selectedPart === n.bodyPart }" @click="selectedPart = selectedPart === n.bodyPart ? null : n.bodyPart">
              <span class="svp-body-icon">{{ BODY_ICON[n.bodyPart] }}</span>
              <span class="svp-body-name">{{ BODY_LABEL[n.bodyPart] }}</span>
              <span class="svp-body-count">{{ n.count }} 道</span>
              <span class="svp-body-heal">{{ n.avgHealingProgress }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 严重度雷达 -->
      <div class="svp-block">
        <span class="svp-block-label">严重度与韧性雷达</span>
        <div class="svp-radar">
          <svg viewBox="0 0 240 240" class="svp-radar-svg">
            <g v-for="ring in [1, 2, 3, 4]" :key="ring">
              <polygon
                :points="radarPoints(data.severityRadar, ring / 4)"
                class="svp-radar-ring"
              />
            </g>
            <line
              v-for="r in data.severityRadar"
              :key="r.axis"
              :x1="120" :y1="120"
              :x2="radarX(r, 1)" :y2="radarY(r, 1)"
              class="svp-radar-axis"
            />
            <polygon :points="radarPoints(data.severityRadar, 1)" class="svp-radar-fill" />
            <g v-for="r in data.severityRadar" :key="r.axis">
              <circle :cx="radarX(r, norm(r))" :cy="radarY(r, norm(r))" r="2.5" class="svp-radar-dot" />
              <text :x="radarX(r, 1.18)" :y="radarY(r, 1.18)" text-anchor="middle" class="svp-radar-label">{{ r.axis }} {{ r.value }}</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- 类型分布 -->
      <div class="svp-block">
        <span class="svp-block-label">伤痕类型分布</span>
        <div class="svp-types">
          <div v-for="t in data.typeDistribution" :key="t.type" class="svp-type">
            <div class="svp-type-head">
              <span class="svp-type-label" :style="{ color: t.color }">{{ t.label }}</span>
              <span class="svp-type-meta">{{ t.count }} 道 · {{ t.percentage }}% · 平均 {{ t.avgHealingTime }} 天</span>
            </div>
            <div class="svp-type-track"><i :style="{ width: t.percentage + '%', background: t.color }"></i></div>
          </div>
        </div>
      </div>

      <!-- 愈合时间线 -->
      <div class="svp-block" v-if="data.healingTimeline.length > 0">
        <span class="svp-block-label">愈合时间线 · {{ data.healingTimeline.length }} 个节点</span>
        <div class="svp-timeline">
          <div v-for="n in data.healingTimeline" :key="n.scarId" class="svp-tl-item">
            <span class="svp-tl-date">{{ n.date }}</span>
            <div class="svp-tl-track"><i :style="{ width: n.healingProgress + '%' }" :class="healClass(n.healingProgress)"></i></div>
            <span class="svp-tl-val">{{ n.healingProgress }}%</span>
            <span class="svp-tl-label">{{ n.label }}</span>
          </div>
        </div>
      </div>

      <!-- 成长曲线 -->
      <div class="svp-block" v-if="data.growthCurve.length > 0">
        <span class="svp-block-label">逆境成长曲线 · 按季度</span>
        <div class="svp-curve">
          <div v-for="g in data.growthCurve" :key="g.date" class="svp-curve-col">
            <div class="svp-curve-bars">
              <div class="svp-curve-bar svp-curve-bar--adv" :style="{ height: g.adversityScore + '%' }" :title="'逆境 ' + g.adversityScore"></div>
              <div class="svp-curve-bar svp-curve-bar--ins" :style="{ height: Math.min(100, g.insightCount * 20) + '%' }" :title="'洞察 ' + g.insightCount"></div>
              <div class="svp-curve-bar svp-curve-bar--tra" :style="{ height: Math.min(100, g.transformationCount * 20) + '%' }" :title="'转化 ' + g.transformationCount"></div>
            </div>
            <span class="svp-curve-date">{{ g.date }}</span>
          </div>
        </div>
        <div class="svp-curve-legend">
          <span class="svp-curve-leg"><i class="svp-curve-bar--adv"></i>逆境</span>
          <span class="svp-curve-leg"><i class="svp-curve-bar--ins"></i>洞察</span>
          <span class="svp-curve-leg"><i class="svp-curve-bar--tra"></i>转化</span>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useScarMarks } from '../modules/scar/marks'
import { useScarVisualization } from '../modules/scar/narrative-template'
import type { SeverityRadarData } from '../modules/scar/narrative-template'
import { BODY_PART_META } from '../modules/scar/types'
import type { BodyMark, HealingStage, SeverityLevel } from '../modules/scar/types'

const marksStore = useScarMarks()
const viz = useScarVisualization()

const selectedPart = ref<string | null>(null)

onMounted(() => marksStore.load())

const BODY_PART_ALIAS: Record<string, string> = {
  '头': 'head', '颈': 'neck', '肩': 'shoulder', '臂': 'arm', '手': 'hand',
  '背': 'back', '腰': 'waist', '腿': 'leg', '足': 'foot', '眼': 'eye',
  '全身': 'chest',
}

function getHealingStage(at: string): HealingStage {
  const days = (Date.now() - new Date(at).getTime()) / (1000 * 60 * 60 * 24)
  if (days < 3) return 'acute'
  if (days < 14) return 'proliferation'
  if (days < 90) return 'remodeling'
  return 'matured'
}

function healProgress(at: string): number {
  const days = (Date.now() - new Date(at).getTime()) / (1000 * 60 * 60 * 24)
  if (days >= 7) return 100
  if (days <= 0) return 0
  return Math.round((days / 7) * 100)
}

const marks = computed(() => marksStore.marks.value)
const adaptedMarks = computed<BodyMark[]>(() =>
  marks.value.map(m => ({
    id: m.id,
    bodyPart: (BODY_PART_ALIAS[m.bodyPart] ?? 'chest') as BodyMark['bodyPart'],
    severity: m.severity as SeverityLevel,
    description: m.description,
    scarType: m.scarType,
    recordedAt: m.at,
    healingStage: getHealingStage(m.at),
    healingProgress: healProgress(m.at),
    transformed: false,
  })),
)
const data = computed(() => viz.generateVisualizationData(adaptedMarks.value))

const BODY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(BODY_PART_META).map(([k, v]) => [k, v.label]),
)
const BODY_ICON: Record<string, string> = Object.fromEntries(
  Object.entries(BODY_PART_META).map(([k, v]) => [k, v.icon]),
)

function bodyRadius(count: number): number {
  return Math.min(9, 3 + count * 1.4)
}

function severityColor(sev: number): string {
  if (sev >= 4) return '#c46a5a'
  if (sev >= 3) return '#e8b64c'
  if (sev >= 2) return '#8a9a7a'
  return '#6b9fc4'
}

function healClass(p: number): string {
  if (p >= 80) return 'heal-done'
  if (p >= 50) return 'heal-mid'
  return 'heal-fresh'
}

function norm(r: SeverityRadarData): number {
  return Math.max(0.05, Math.min(1, r.value / r.max))
}

function radarX(r: SeverityRadarData, scale: number): number {
  const i = data.value.severityRadar.indexOf(r)
  const angle = (Math.PI * 2 * i) / data.value.severityRadar.length - Math.PI / 2
  return 120 + Math.cos(angle) * 88 * scale
}
function radarY(r: SeverityRadarData, scale: number): number {
  const i = data.value.severityRadar.indexOf(r)
  const angle = (Math.PI * 2 * i) / data.value.severityRadar.length - Math.PI / 2
  return 120 + Math.sin(angle) * 88 * scale
}
function radarPoints(radar: SeverityRadarData[], scale: number): string {
  return radar.map(r => `${radarX(r, scale)},${radarY(r, scale)}`).join(' ')
}
</script>

<style scoped>
.svp {
  padding: 16px; border-radius: 14px;
  background: var(--card-bg); border: 1px solid rgba(196, 106, 90, 0.18);
  display: flex; flex-direction: column; gap: 16px;
}
.svp-head { display: flex; flex-direction: column; gap: 2px; }
.svp-title { font-size: 14px; font-weight: 600; color: #c46a5a; letter-spacing: 1px; }
.svp-sub { font-size: 11px; color: rgba(196, 106, 90, 0.5); }
.svp-empty { text-align: center; padding: 36px 16px; color: rgba(196, 106, 90, 0.35); }
.svp-empty span { font-size: 30px; display: block; margin-bottom: 8px; }
.svp-empty p { font-size: 12px; }

/* 区块 */
.svp-block { display: flex; flex-direction: column; gap: 10px; }
.svp-block-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.svp-block-label { font-size: 12px; font-weight: 600; color: rgba(196, 106, 90, 0.75); letter-spacing: 1px; }
.svp-block-note { font-size: 9px; color: rgba(196, 106, 90, 0.45); }

/* 身体分布 */
.svp-body { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
.svp-body-svg { width: 180px; height: 180px; flex: 0 0 180px; }
.svp-body-silhouette { fill: rgba(196, 106, 90, 0.05); stroke: rgba(196, 106, 90, 0.25); stroke-width: 0.6; }
.svp-body-node { cursor: pointer; }
.svp-body-text { font-size: 3.4px; }
.svp-body-side { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 150px; }
.svp-body-row { display: grid; grid-template-columns: 22px 1fr 34px 34px; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 7px; cursor: pointer; }
.svp-body-row:hover, .svp-body-row--sel { background: rgba(196, 106, 90, 0.08); }
.svp-body-icon { font-size: 13px; }
.svp-body-name { font-size: 11px; color: rgba(240, 210, 210, 0.8); }
.svp-body-count { font-size: 10px; color: rgba(196, 106, 90, 0.8); text-align: right; }
.svp-body-heal { font-size: 10px; color: rgba(138, 154, 122, 0.8); text-align: right; }

/* 雷达 */
.svp-radar { display: flex; justify-content: center; }
.svp-radar-svg { width: 240px; height: 240px; }
.svp-radar-ring { fill: none; stroke: rgba(196, 106, 90, 0.12); stroke-width: 1; }
.svp-radar-axis { stroke: rgba(196, 106, 90, 0.15); stroke-width: 0.6; }
.svp-radar-fill { fill: rgba(196, 106, 90, 0.18); stroke: #c46a5a; stroke-width: 1.2; }
.svp-radar-dot { fill: #c46a5a; }
.svp-radar-label { font-size: 8px; fill: rgba(240, 210, 210, 0.7); }

/* 类型 */
.svp-types { display: flex; flex-direction: column; gap: 7px; }
.svp-type { display: flex; flex-direction: column; gap: 4px; }
.svp-type-head { display: flex; justify-content: space-between; align-items: baseline; }
.svp-type-label { font-size: 11px; font-weight: 600; }
.svp-type-meta { font-size: 9px; color: rgba(196, 106, 90, 0.5); }
.svp-type-track { height: 6px; border-radius: 3px; background: rgba(196, 106, 90, 0.1); overflow: hidden; }
.svp-type-track i { display: block; height: 100%; transition: width 0.4s; }

/* 时间线 */
.svp-timeline { display: flex; flex-direction: column; gap: 6px; }
.svp-tl-item { display: grid; grid-template-columns: 78px 1fr 34px; align-items: center; gap: 8px; }
.svp-tl-date { font-size: 9px; color: rgba(196, 106, 90, 0.55); }
.svp-tl-track { height: 7px; border-radius: 4px; background: rgba(196, 106, 90, 0.1); overflow: hidden; }
.svp-tl-track i { display: block; height: 100%; }
.svp-tl-track .heal-fresh { background: #c46a5a; }
.svp-tl-track .heal-mid { background: #e8b64c; }
.svp-tl-track .heal-done { background: #8a9a7a; }
.svp-tl-val { font-size: 10px; color: rgba(196, 106, 90, 0.75); text-align: right; }
.svp-tl-label { grid-column: 1 / -1; font-size: 9px; color: rgba(240, 210, 210, 0.5); padding-left: 86px; margin-top: -4px; }

/* 成长曲线 */
.svp-curve { display: flex; gap: 8px; align-items: flex-end; height: 110px; padding: 4px 0; }
.svp-curve-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
.svp-curve-bars { flex: 1; display: flex; align-items: flex-end; gap: 3px; width: 100%; }
.svp-curve-bar { width: 30%; border-radius: 3px 3px 0 0; min-height: 2px; }
.svp-curve-bar--adv { background: #c46a5a; }
.svp-curve-bar--ins { background: #e8b64c; }
.svp-curve-bar--tra { background: #8a9a7a; }
.svp-curve-date { font-size: 8px; color: rgba(196, 106, 90, 0.5); }
.svp-curve-legend { display: flex; gap: 14px; }
.svp-curve-leg { display: flex; align-items: center; gap: 5px; font-size: 9px; color: rgba(196, 106, 90, 0.6); }
.svp-curve-leg i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
</style>