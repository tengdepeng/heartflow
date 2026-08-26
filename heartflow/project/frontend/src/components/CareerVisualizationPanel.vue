<template>
  <section class="cvp" aria-label="可视化数据">
    <div class="cvp-head">
      <div class="cvp-title-wrap">
        <span class="cvp-title">📊 可视化数据</span>
        <span class="cvp-sub">把技能与职业路径画成图形，让结构一目了然</span>
      </div>
      <span v-if="radar.length" class="cvp-tag">{{ radar.length }} 个维度</span>
    </div>

    <!-- 空态 -->
    <div v-if="!props.skills.length" class="cvp-empty">
      <span class="cvp-empty-icon">📊</span>
      <p class="cvp-empty-text">先在技能图谱中录入技能，才能生成能力雷达</p>
    </div>

    <template v-else>
      <!-- 技能雷达 -->
      <div class="cvp-block">
        <span class="cvp-block-label">技能雷达 · 当前 vs 目标</span>
        <div class="cvp-radar-wrap">
          <svg
            v-if="radar.length"
            class="cvp-radar"
            :viewBox="`0 0 ${SIZE} ${SIZE}`"
            role="img"
            aria-label="技能能力雷达图"
          >
            <!-- 网格 -->
            <g v-for="ring in 4" :key="ring" class="cvp-grid">
              <polygon
                :points="gridPoints(ring / 4)"
                fill="none"
                stroke="rgba(232,221,208,0.08)"
                stroke-width="1"
              />
            </g>
            <!-- 轴线 -->
            <g class="cvp-axes">
              <line
                v-for="i in radar.length"
                :key="'ax' + i"
                :x1="cx"
                :y1="cy"
                :x2="axisPoint(i - 1, 1).x"
                :y2="axisPoint(i - 1, 1).y"
                stroke="rgba(232,221,208,0.1)"
                stroke-width="1"
              />
            </g>
            <!-- 目标多边形 -->
            <polygon
              v-if="radar.some(r => r.targetScore > 0)"
              :points="polyPoints('target')"
              fill="rgba(240,192,64,0.08)"
              stroke="#f0c040"
              stroke-width="1.5"
              stroke-dasharray="4 3"
            />
            <!-- 当前多边形 -->
            <polygon
              :points="polyPoints('current')"
              fill="rgba(138,154,122,0.16)"
              stroke="#8a9a7a"
              stroke-width="2"
            />
            <!-- 当前顶点 -->
            <g class="cvp-dots">
              <circle
                v-for="i in radar.length"
                :key="'dot' + i"
                :cx="axisPoint(i - 1, radar[i - 1].currentScore / 100).x"
                :cy="axisPoint(i - 1, radar[i - 1].currentScore / 100).y"
                r="3"
                fill="#8a9a7a"
              />
            </g>
            <!-- 标签 -->
            <g class="cvp-labels">
              <text
                v-for="i in radar.length"
                :key="'lb' + i"
                :x="axisPoint(i - 1, 1.22).x"
                :y="axisPoint(i - 1, 1.22).y"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                {{ radar[i - 1].label }}
              </text>
            </g>
          </svg>
          <div v-if="radar.length" class="cvp-legend">
            <span class="cvp-legend-item"><i class="is-current"></i>当前</span>
            <span class="cvp-legend-item"><i class="is-target"></i>目标</span>
          </div>
        </div>

        <!-- 维度明细 -->
        <div v-if="radar.length" class="cvp-dims">
          <div v-for="r in radar" :key="r.category" class="cvp-dim">
            <span class="cvp-dim-name">{{ r.label }}</span>
            <div class="cvp-dim-bar">
              <i class="is-current" :style="{ width: r.currentScore + '%' }"></i>
              <i class="is-target" :style="{ width: r.targetScore + '%' }"></i>
            </div>
            <span class="cvp-dim-val">{{ r.currentScore }}<em>/{{ r.targetScore }}</em></span>
          </div>
        </div>
      </div>

      <!-- 职业路径 -->
      <div class="cvp-block">
        <span class="cvp-block-label">职业路径</span>
        <div v-if="!pathViz || !pathViz.nodes.length" class="cvp-path-empty">
          <span class="cvp-path-empty-icon">🛤</span>
          <p class="cvp-path-empty-text">暂无职位记录，职业路径将在录入职位后生成</p>
        </div>
        <div v-else class="cvp-path">
          <div
            v-for="(n, i) in pathViz.nodes"
            :key="n.id"
            class="cvp-path-node"
            :class="{ pivot: n.isPivot }"
          >
            <div class="cvp-path-line" v-if="i > 0"></div>
            <div class="cvp-path-dot">
              <span class="cvp-path-dot-core"></span>
            </div>
            <div class="cvp-path-body">
              <div class="cvp-path-head">
                <b>{{ n.label }}</b>
                <span v-if="n.isPivot" class="cvp-path-pivot">转折</span>
              </div>
              <span class="cvp-path-org">{{ n.organization }}</span>
              <span class="cvp-path-duration">{{ n.duration }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useCareerVisualization } from '../modules/career/skill-path'
import { useCareerPath } from '../modules/career/path'
import type { SkillNode } from '../modules/career/skill-map'

const props = defineProps<{ skills: SkillNode[] }>()

const viz = useCareerVisualization()
const careerPath = useCareerPath()

const radar = computed(() => viz.buildSkillRadar(props.skills))
const pathViz = computed(() => {
  const positions = careerPath.positions.value
  if (!positions.length) return null
  return viz.buildCareerPathVisualization(positions.map(p => ({
    id: p.id,
    title: p.title,
    organization: p.organization,
    startDate: p.startDate,
    endDate: p.endDate,
  })))
})

onMounted(() => {
  careerPath.load()
})

// ---- 雷达图几何 ----
const SIZE = 260
const cx = SIZE / 2
const cy = SIZE / 2
const RADIUS = 86

function angle(i: number) {
  const n = radar.value.length || 5
  return (2 * Math.PI * i) / n - Math.PI / 2
}

function axisPoint(i: number, ratio: number) {
  return {
    x: cx + Math.cos(angle(i)) * RADIUS * ratio,
    y: cy + Math.sin(angle(i)) * RADIUS * ratio,
  }
}

function gridPoints(ratio: number) {
  const n = radar.value.length || 5
  return Array.from({ length: n }, (_, i) => {
    const p = axisPoint(i, ratio)
    return `${p.x},${p.y}`
  }).join(' ')
}

function polyPoints(kind: 'current' | 'target') {
  const n = radar.value.length || 5
  return Array.from({ length: n }, (_, i) => {
    const r = radar.value[i]
    const score = kind === 'current' ? r.currentScore : r.targetScore
    const p = axisPoint(i, score / 100)
    return `${p.x},${p.y}`
  }).join(' ')
}
</script>

<style scoped>
.cvp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.cvp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.cvp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.cvp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.cvp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.cvp-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #e0b88a; white-space: nowrap; }

.cvp-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px 0; text-align: center; }
.cvp-empty-icon { font-size: 30px; opacity: 0.5; }
.cvp-empty-text { font-size: 12px; color: rgba(232, 221, 208, 0.5); margin: 0; }

.cvp-block { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; padding-top: 14px; border-top: 1px solid rgba(var(--accent-rgb), 0.1); }
.cvp-block-label { font-size: 11px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.5); }

.cvp-radar-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.cvp-radar { width: 100%; max-width: 300px; height: auto; }
.cvp-labels text { font-size: 10px; fill: rgba(232, 221, 208, 0.55); }
.cvp-legend { display: flex; gap: 14px; }
.cvp-legend-item { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; color: rgba(232, 221, 208, 0.5); }
.cvp-legend-item i { width: 12px; height: 4px; border-radius: 3px; }
.cvp-legend-item .is-current { background: #8a9a7a; }
.cvp-legend-item .is-target { background: #f0c040; }

.cvp-dims { display: flex; flex-direction: column; gap: 6px; }
.cvp-dim { display: flex; align-items: center; gap: 10px; }
.cvp-dim-name { width: 56px; font-size: 11px; color: rgba(232, 221, 208, 0.65); flex-shrink: 0; }
.cvp-dim-bar { flex: 1; height: 7px; border-radius: 999px; background: rgba(255,255,255,0.05); position: relative; overflow: hidden; }
.cvp-dim-bar i { position: absolute; top: 0; left: 0; height: 100%; border-radius: 999px; }
.cvp-dim-bar .is-current { background: rgba(138,154,122,0.85); }
.cvp-dim-bar .is-target { background: rgba(240,192,64,0.4); }
.cvp-dim-val { width: 52px; text-align: right; font-size: 11px; color: rgba(232, 221, 208, 0.7); font-variant-numeric: tabular-nums; flex-shrink: 0; }
.cvp-dim-val em { font-style: normal; color: rgba(232, 221, 208, 0.35); }

.cvp-path-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 0; text-align: center; }
.cvp-path-empty-icon { font-size: 26px; opacity: 0.5; }
.cvp-path-empty-text { font-size: 11px; color: rgba(232, 221, 208, 0.45); margin: 0; }

.cvp-path { display: flex; flex-direction: column; gap: 0; }
.cvp-path-node { display: flex; gap: 14px; padding: 10px 0; position: relative; }
.cvp-path-line { position: absolute; left: 5px; top: -2px; bottom: -2px; width: 1px; background: rgba(138,154,122,0.15); }
.cvp-path-dot { width: 11px; height: 11px; border-radius: 50%; background: rgba(138,154,122,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 3px; }
.cvp-path-dot-core { width: 5px; height: 5px; border-radius: 50%; background: #8a9a7a; }
.cvp-path-node.pivot .cvp-path-dot { background: rgba(240,192,64,0.2); }
.cvp-path-node.pivot .cvp-path-dot-core { background: #f0c040; }
.cvp-path-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cvp-path-head { display: flex; align-items: center; gap: 8px; }
.cvp-path-head b { font-size: 13px; color: var(--text-high, #d8c3a5); font-weight: 500; }
.cvp-path-pivot { font-size: 9px; padding: 1px 6px; border-radius: 6px; background: rgba(240,192,64,0.16); color: #f0c040; }
.cvp-path-org { font-size: 11px; color: rgba(232, 221, 208, 0.5); }
.cvp-path-duration { font-size: 10px; color: rgba(232, 221, 208, 0.35); }

@media (max-width: 640px) {
  .cvp { padding: 14px 14px; }
}
</style>
