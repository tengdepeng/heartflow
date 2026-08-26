<template>
  <div
    ref="entranceRef"
    :class="['kc-wrap', 'view-entrance', entranceClass]"
  >
    <svg
      data-enter
      class="kc-svg"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <!-- 暖色光晕渐变 -->
        <radialGradient id="kc-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(var(--accent-rgb), 0.08)" />
          <stop offset="60%" stop-color="rgba(var(--accent-rgb), 0.02)" />
          <stop offset="100%" stop-color="rgba(var(--accent-rgb), 0)" />
        </radialGradient>
        <radialGradient id="kc-active-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(var(--accent-rgb), 0.2)" />
          <stop offset="50%" stop-color="rgba(var(--accent-rgb), 0.05)" />
          <stop offset="100%" stop-color="rgba(var(--accent-rgb), 0)" />
        </radialGradient>
        <!-- 标记点滤镜 -->
        <filter id="kc-marker-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- 环境光晕 -->
      <circle
        cx="200" cy="200" r="190"
        fill="url(#kc-glow)"
      />

      <!-- 活跃分类光晕 (动态位置) -->
      <circle
        v-if="activeCategory"
        :cx="activeMarker.cx"
        :cy="activeMarker.cy"
        r="40"
        fill="url(#kc-active-glow)"
        class="kc-active-glow"
      />

      <!-- 同心圆环 (书架轨道) -->
      <circle
        v-for="ring in rings"
        :key="'ring' + ring.radius"
        :cx="200" :cy="200"
        :r="ring.radius"
        fill="none"
        :stroke="ring.stroke"
        :stroke-width="ring.strokeWidth"
        :stroke-dasharray="ring.dashArray"
        :opacity="ring.opacity"
        class="kc-ring"
      />

      <!-- 分类轨道标记点 -->
      <g
        v-for="(marker, idx) in markers"
        :key="'m' + idx"
        :class="['kc-marker-group', { 'kc-marker-active': marker.active }]"
      >
        <!-- 标记点 -->
        <circle
          :cx="marker.cx"
          :cy="marker.cy"
          :r="marker.active ? 5 : 3"
          :fill="marker.active ? '#d4a574' : 'rgba(var(--accent-rgb), 0.25)'"
          :filter="marker.active ? 'url(#kc-marker-glow)' : undefined"
          class="kc-marker-dot"
        />
        <!-- 标记标签 -->
        <text
          :x="marker.labelCx"
          :y="marker.labelCy"
          :text-anchor="marker.labelAnchor"
          :dominant-baseline="marker.labelBaseline"
          :fill="marker.active ? 'rgba(232,224,216,0.7)' : 'rgba(232,224,216,0.2)'"
          font-size="8"
          font-family="'Georgia', 'Times New Roman', serif"
          class="kc-marker-label"
        >
          {{ marker.label }}
        </text>
      </g>

      <!-- 中心装饰文字 -->
      <text
        x="200" y="200"
        text-anchor="middle"
        dominant-baseline="central"
        fill="rgba(var(--accent-rgb), 0.12)"
        font-size="14"
        font-family="'Georgia', 'Times New Roman', serif"
        letter-spacing="2"
      >
        经略阁
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useViewEntrance } from '../../composables/useViewEntrance'

// ============================================================
// Props
// ============================================================

const props = defineProps<{
  activeCategory?: string
  categoriesCount: number
}>()

// ============================================================
// 入场动画
// ============================================================

const { entranceRef, entranceClass } = useViewEntrance()

// ============================================================
// 分类标签映射
// ============================================================

const CATEGORY_LABELS: Record<string, string> = {
  concept: '概念',
  rule: '法则',
  frame: '框架',
  insight: '直觉',
  pitfall: '误区',
  metaphor: '比喻',
}

// ============================================================
// 同心圆环数据
// ============================================================

interface RingData {
  radius: number
  stroke: string
  strokeWidth: number
  dashArray: string
  opacity: number
}

const rings = computed<RingData[]>(() => {
  const count = Math.min(props.categoriesCount, 6)
  const result: RingData[] = []

  for (let i = 0; i < count; i++) {
    const radius = 40 + i * 30
    const isOuter = i === count - 1
    result.push({
      radius,
      stroke: isOuter
        ? 'rgba(var(--accent-rgb), 0.1)'
        : 'rgba(var(--accent-rgb), 0.05)',
      strokeWidth: isOuter ? 1 : 0.5,
      dashArray: i % 2 === 0 ? 'none' : '3,5',
      opacity: 0.6 + (i / count) * 0.4,
    })
  }

  return result
})

// ============================================================
// 分类轨道标记点
// ============================================================

interface MarkerData {
  cx: number
  cy: number
  labelCx: number
  labelCy: number
  labelAnchor: string
  labelBaseline: string
  label: string
  active: boolean
}

const markers = computed<MarkerData[]>(() => {
  const count = Math.max(props.categoriesCount, 1)
  const baseRadius = 40 + (count - 1) * 30
  const result: MarkerData[] = []

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    const labelRadius = baseRadius + 18

    const cx = 200 + Math.cos(angle) * baseRadius
    const cy = 200 + Math.sin(angle) * baseRadius
    const labelCx = 200 + Math.cos(angle) * labelRadius
    const labelCy = 200 + Math.sin(angle) * labelRadius

    // 确定文本对齐方向
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)
    let labelAnchor: string
    let labelBaseline: string

    if (Math.abs(cosA) < 0.1) {
      labelAnchor = 'middle'
    } else if (cosA > 0) {
      labelAnchor = 'start'
    } else {
      labelAnchor = 'end'
    }

    if (Math.abs(sinA) < 0.1) {
      labelBaseline = 'central'
    } else if (sinA > 0) {
      labelBaseline = 'auto'
    } else {
      labelBaseline = 'hanging'
    }

    // 推断该标记对应的分类 key
    const catKeys = Object.keys(CATEGORY_LABELS)
    const catKey = catKeys[i] ?? ''

    result.push({
      cx,
      cy,
      labelCx,
      labelCy,
      labelAnchor,
      labelBaseline,
      label: CATEGORY_LABELS[catKey] ?? String(i + 1),
      active: props.activeCategory === catKey,
    })
  }

  return result
})

/** 活跃标记的中心坐标 (供光晕定位) */
const activeMarker = computed<{ cx: number; cy: number }>(() => {
  const active = markers.value.find(m => m.active)
  if (active) return { cx: active.cx, cy: active.cy }
  return { cx: 200, cy: 200 }
})
</script>

<style scoped>
/* ============================================================
   深夜食堂 · 暖琥珀
   圆形房间 · 书架轨道装饰
   ============================================================ */

.kc-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  overflow: hidden;
  border-radius: 12px;
  background: radial-gradient(
    ellipse at 50% 50%,
    rgba(var(--accent-rgb), 0.03) 0%,
    transparent 70%
  );
}

.kc-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* ---- 圆环动画 ---- */
.kc-ring {
  transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ---- 标记点 ---- */
.kc-marker-group {
  transition: all 0.4s ease;
}

.kc-marker-dot {
  transition: all 0.3s ease;
}

.kc-marker-label {
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
}

.kc-marker-active .kc-marker-dot {
  filter: drop-shadow(0 0 4px rgba(var(--accent-rgb), 0.5));
}

/* ---- 活跃光晕 ---- */
.kc-active-glow {
  transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  animation: kc-pulse 3s ease-in-out infinite;
}

@keyframes kc-pulse {
  0%, 100% {
    opacity: 0.6;
    r: 36;
  }
  50% {
    opacity: 1;
    r: 44;
  }
}

/* ---- 入场动画 ---- */
.view-entrance > [data-enter] {
  opacity: 0;
  transform: scale(0.85);
  transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.view-entrance.enter-to > [data-enter] {
  opacity: 1;
  transform: scale(1);
}
</style>