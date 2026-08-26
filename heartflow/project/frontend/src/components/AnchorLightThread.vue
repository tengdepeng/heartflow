<template>
  <div class="light-thread-wrap">
    <svg class="light-thread" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
      <defs>
        <linearGradient v-for="(grad, i) in gradients" :key="i" :id="`thread-grad-${i}`">
          <stop offset="0%" :stop-color="grad.from" />
          <stop offset="100%" :stop-color="grad.to" />
        </linearGradient>
      </defs>
      <path
        v-for="(seg, i) in segments"
        :key="i"
        :d="seg.d"
        :stroke="`url(#thread-grad-${i})`"
        stroke-width="2"
        fill="none"
        class="thread-path"
        :class="{ 'thread-pulse': seg.pulse }"
      />
      <circle
        v-for="(node, i) in nodes"
        :key="i"
        :cx="node.x"
        :cy="node.y"
        r="4"
        :fill="node.color"
        class="thread-node"
      />
    </svg>
    <div class="thread-legend">
      <span class="thread-legend-item"><span class="thread-dot" style="background:#f0c040" />必锚</span>
      <span class="thread-legend-item"><span class="thread-dot" style="background:#80b8d0" />可锚</span>
      <span class="thread-legend-item"><span class="thread-dot" style="background:rgba(255,255,255,0.3)" />浮锚</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Anchor } from '../modules/anchor/types'

const props = defineProps<{
  anchors: Anchor[]
  width?: number
  height?: number
}>()

const w = computed(() => props.width ?? 600)
const h = computed(() => props.height ?? 120)

const PRIORITY_COLORS: Record<string, string> = { must: '#f0c040', can: '#80b8d0', float: 'rgba(255,255,255,0.3)' }

const doneAnchors = computed(() =>
  props.anchors.filter(a => a.done && a.doneAt).sort((a, b) => new Date(a.doneAt!).getTime() - new Date(b.doneAt!).getTime())
)

const nodes = computed(() => {
  const count = doneAnchors.value.length
  if (count === 0) return []
  const spacing = w.value / Math.max(count, 2)
  return doneAnchors.value.map((a, i) => ({
    x: spacing * (i + 0.5),
    y: h.value / 2,
    color: PRIORITY_COLORS[a.priority] || '#aaa',
    id: a.id,
  }))
})

const segments = computed(() => {
  const result: { d: string; pulse: boolean; from: string; to: string }[] = []
  for (let i = 0; i < nodes.value.length - 1; i++) {
    const n1 = nodes.value[i]
    const n2 = nodes.value[i + 1]
    const cx = (n1.x + n2.x) / 2
    const cy = (n1.y + n2.y) / 2 - 20
    result.push({
      d: `M ${n1.x} ${n1.y} Q ${cx} ${cy} ${n2.x} ${n2.y}`,
      pulse: i % 2 === 0,
      from: n1.color,
      to: n2.color,
    })
  }
  return result
})

const gradients = computed(() =>
  segments.value.map((seg, i) => ({ from: seg.from, to: seg.to, id: i }))
)
</script>

<style scoped>
.light-thread-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.light-thread {
  pointer-events: none;
  max-width: 100%;
  height: auto;
}
.thread-path {
  transition: stroke-width 0.3s;
}
.thread-path:hover {
  stroke-width: 3;
}
.thread-pulse {
  animation: threadPulse 3s ease-in-out infinite;
}
.thread-node {
  filter: drop-shadow(0 0 3px currentColor);
}
@keyframes threadPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
.thread-legend {
  display: flex;
  gap: 12px;
}
.thread-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-low);
}
.thread-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
</style>