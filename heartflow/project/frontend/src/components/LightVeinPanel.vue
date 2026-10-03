<template>
  <section class="lvp-panel" aria-label="光之脉络">
    <div class="lvp-head">
      <span class="lvp-title">✨ 光之脉络</span>
      <span class="lvp-sub">让长期目标成为可追踪的发光脉络</span>
    </div>

    <!-- 径向目标脉络 -->
    <div class="lvp-radial-wrap">
      <svg class="lvp-radial" viewBox="0 0 360 360" aria-hidden="true">
        <defs>
          <radialGradient id="lvpCoreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.08"/>
          </radialGradient>
        </defs>

        <!-- 光晕底环 -->
        <circle :cx="CX" :cy="CY" :r="RING_RADII[2]" class="lvp-halo" />

        <!-- 脉络连线 -->
        <g v-for="(ring, k) in radialNodes" :key="'ring' + k">
          <line
            v-for="(p, i) in ring"
            :key="'vein' + k + '-' + i"
            class="lvp-vein"
            :x1="CX" :y1="CY" :x2="p.x" :y2="p.y"
          />
        </g>

        <!-- 节点 -->
        <g v-for="(ring, k) in radialNodes" :key="'node' + k">
          <g v-for="(p, i) in ring" :key="'n' + k + '-' + i" class="lvp-node" :title="p.node.goal.title">
            <circle
              :cx="p.x" :cy="p.y" :r="NODE_R"
              :fill="p.color" :fill-opacity="p.opacity"
              :stroke="p.color"
            />
            <text :x="p.x" :y="p.y + NODE_R + 9" class="lvp-node-label">{{ truncate(p.node.goal.title) }}</text>
          </g>
        </g>

        <!-- 中心：留光阁总进度 -->
        <g class="lvp-center">
          <circle :cx="CX" :cy="CY" :r="CORE_R" fill="url(#lvpCoreGrad)" stroke="var(--accent)" stroke-opacity="0.4" />
          <text :x="CX" :y="CY - 4" class="lvp-center-num">{{ overallProgress }}<tspan class="lvp-pct">%</tspan></text>
          <text :x="CX" :y="CY + 14" class="lvp-center-label">留光</text>
        </g>
      </svg>
    </div>

    <!-- 领域进度 -->
    <div v-if="domainProgress.length" class="lvp-domains">
      <span class="lvp-block-label">领域脉络</span>
      <div v-for="d in domainProgress" :key="d.domain" class="lvp-domain-row">
        <span class="lvp-domain-label">{{ domainLabel(d.domain) }}</span>
        <div class="lvp-domain-track">
          <div class="lvp-domain-fill" :style="{ width: d.progress + '%', background: d.color }"></div>
        </div>
        <span class="lvp-domain-num">{{ d.completed }}/{{ d.total }}</span>
      </div>
    </div>

    <!-- 层级统计 -->
    <div v-if="tierStats" class="lvp-tiers">
      <div v-for="t in tierRows" :key="t.key" class="lvp-tier-chip">
        <span class="lvp-tier-name">{{ t.label }}</span>
        <span class="lvp-tier-num">{{ t.completed }}/{{ t.total }}</span>
        <span class="lvp-tier-pct">{{ t.progress }}%</span>
      </div>
    </div>

    <p v-if="!props.goals.length" class="lvp-empty">留光阁尚未点亮目标。在穹顶点亮一颗星，脉络便会生长。</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGoalVisualization } from '../modules/goal/goal-visualization'
import { DOMAIN_LABELS, DOMAIN_COLORS } from '../modules/goal/types'
import type { Goal } from '../modules/goal/types'

const props = defineProps<{ goals: Goal[] }>()

const CX = 180
const CY = 180
const CORE_R = 36
const NODE_R = 12
const RING_RADII: number[] = [84, 132, 178]
const MAX_RING = 2

const viz = useGoalVisualization(() => props.goals)

const overallProgress = computed(() => viz.buildGoalTree().overallProgress)
const radial = computed(() => viz.buildRadialLayout())
const domainProgress = computed(() => viz.getDomainProgress())
const tierStats = computed(() => viz.getTierStats())

const radialNodes = computed(() =>
  radial.value.rings
    .slice(0, MAX_RING + 1)
    .map((ring, k) => {
      const r = RING_RADII[Math.min(k, MAX_RING)]
      const n = ring.length
      return ring.map((node, i) => {
        const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2
        const x = CX + r * Math.cos(angle)
        const y = CY + r * Math.sin(angle)
        const color = DOMAIN_COLORS[node.goal.domain] || '#a07c8c'
        const opacity = 0.35 + 0.65 * (node.progress / 100)
        return { node, x, y, color, opacity }
      })
    }),
)

const tierRows = computed(() => {
  const s = tierStats.value
  if (!s) return []
  return [
    { key: 'vision', label: '愿景', ...s.vision },
    { key: 'target', label: '目标', ...s.target },
    { key: 'plan', label: '计划', ...s.plan },
  ] as { key: string; label: string; total: number; completed: number; progress: number }[]
})

function domainLabel(domain: string): string {
  return DOMAIN_LABELS[domain as Goal['domain']] || domain
}

function truncate(title: string): string {
  return title.length > 6 ? title.slice(0, 6) + '…' : title
}
</script>

<style scoped>
.lvp-panel {
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  position: relative;
  z-index: 1;
}
.lvp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.lvp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-high);
}
.lvp-sub {
  font-size: 11px;
  color: var(--text-secondary);
}
.lvp-radial-wrap {
  display: flex;
  justify-content: center;
}
.lvp-radial {
  width: 100%;
  max-width: 320px;
  height: auto;
  overflow: visible;
}
.lvp-halo {
  fill: none;
  stroke: rgba(var(--accent-rgb), 0.08);
  stroke-width: 1;
}
.lvp-vein {
  stroke: rgba(var(--accent-rgb), 0.18);
  stroke-width: 1;
}
.lvp-node circle {
  filter: drop-shadow(0 0 4px rgba(var(--accent-rgb), 0.25));
  transition: transform 0.3s ease;
  transform-box: fill-box;
  transform-origin: center;
  animation: lvp-pulse 3s ease-in-out infinite;
}
.lvp-node:hover circle {
  transform: scale(1.25);
}
@keyframes lvp-pulse {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
}
.lvp-node-label {
  font-size: 8px;
  fill: var(--text-secondary);
  text-anchor: middle;
  pointer-events: none;
}
.lvp-center-num {
  font-size: 20px;
  font-weight: 700;
  fill: var(--text-high);
  text-anchor: middle;
}
.lvp-pct {
  font-size: 11px;
  fill: var(--text-secondary);
}
.lvp-center-label {
  font-size: 10px;
  fill: var(--text-secondary);
  text-anchor: middle;
  letter-spacing: 2px;
}
.lvp-block-label {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  margin: 14px 0 8px;
  letter-spacing: 0.5px;
}
.lvp-domain-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.lvp-domain-label {
  width: 40px;
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.lvp-domain-track {
  flex: 1;
  height: 7px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.1);
  overflow: hidden;
}
.lvp-domain-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}
.lvp-domain-num {
  width: 40px;
  text-align: right;
  font-size: 11px;
  color: var(--text-low);
  flex-shrink: 0;
}
.lvp-tiers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 12px;
}
.lvp-tier-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}
.lvp-tier-name {
  font-size: 11px;
  color: var(--text-secondary);
}
.lvp-tier-num {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-high);
}
.lvp-tier-pct {
  font-size: 10px;
  color: var(--accent);
}
.lvp-empty {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 8px;
  text-align: center;
}
</style>
