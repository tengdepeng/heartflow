<template>
  <div v-if="activeCarrier" class="canvas-carrier">
    <!-- 呼吸光晕背景 -->
    <div class="carrier-glow" />

    <!-- 载体内容 -->
    <div class="carrier-body">
      <!-- 玉珠 SVG 圆阵 -->
      <svg
        class="carrier-beads-svg"
        :viewBox="`0 0 ${svgSize} ${svgSize}`"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <!-- 玉珠径向渐变 -->
          <radialGradient
            :id="beadGradId"
            cx="38%"
            cy="32%"
            r="62%"
          >
            <stop offset="0%" :stop-color="beadHighlight" />
            <stop offset="40%" :stop-color="beadBody" />
            <stop offset="100%" :stop-color="beadEdge" />
          </radialGradient>
          <!-- 空珠描边渐变 -->
          <linearGradient
            :id="emptyGradId"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" :stop-color="emptyBeadLight" />
            <stop offset="100%" :stop-color="emptyBeadDark" />
          </linearGradient>
          <!-- 呼吸辉光滤镜 -->
          <filter id="breathingGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- 背景圆环 -->
        <circle
          :cx="center"
          :cy="center"
          :r="orbitRadius + beadRadius + 4"
          fill="none"
          :stroke="ringColor"
          stroke-width="0.5"
          opacity="0.15"
          class="carrier-orbit-ring"
        />

        <!-- 每颗玉珠 -->
        <g
          v-for="(bead, index) in displayBeads"
          :key="index"
          class="carrier-bead"
          :class="{ 'bead--filled': bead.filled, 'bead--empty': !bead.filled }"
        >
          <circle
            :cx="bead.x"
            :cy="bead.y"
            :r="bead.filled ? beadRadius : beadRadius * 0.85"
            :fill="bead.filled ? `url(#${beadGradId})` : 'none'"
            :stroke="bead.filled ? 'none' : `url(#${emptyGradId})`"
            :stroke-width="bead.filled ? 0 : 0.6"
            :opacity="bead.filled ? 1 : 0.35"
            filter="url(#breathingGlow)"
          />
        </g>
      </svg>

      <!-- 信息区域 -->
      <div class="carrier-info">
        <div class="carrier-name">{{ activeCarrier.name }}</div>
        <div class="carrier-stats">
          <span class="carrier-bead-count">{{ activeCarrier.beadCount }} / {{ activeCarrier.maxBeads }}</span>
          <span class="carrier-stage" :style="{ color: stageColor }">{{ stageLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCarrier } from '../../carrier/index'
import { LIFECYCLE_STAGES } from '../../carrier/types'
import type { LifecycleStage } from '../../carrier/types'

const { activeCarrier } = useCarrier()

// ============================================================
// SVG 尺寸常量
// ============================================================
const svgSize = 180
const center = svgSize / 2
const orbitRadius = 62
const maxDisplayBeads = 108

// 自适应珠子半径
const beadRadius = computed(() => {
  if (!activeCarrier.value) return 3.5
  const total = Math.min(activeCarrier.value.maxBeads, maxDisplayBeads)
  if (total <= 18) return 5.5
  if (total <= 27) return 5
  if (total <= 54) return 4
  return 3
})

// 渐变 ID
const beadGradId = 'carrier-bead-grad'
const emptyGradId = 'carrier-empty-grad'

// ============================================================
// 颜色计算
// ============================================================
const carrierColors = computed(() => {
  if (!activeCarrier.value) return { primary: '#d4a574', secondary: '#c4956a', accent: '#f0d6b0' }
  const c = activeCarrier.value.colors
  return {
    primary: c?.primary || '#d4a574',
    secondary: c?.secondary || '#c4956a',
    accent: c?.accent || '#f0d6b0',
  }
})

const beadHighlight = computed(() => {
  // 高光比主色更亮
  return carrierColors.value.accent
})

const beadBody = computed(() => {
  return carrierColors.value.primary
})

const beadEdge = computed(() => {
  // 边缘比主色更深
  return carrierColors.value.secondary
})

const emptyBeadLight = computed(() => {
  return `${carrierColors.value.primary}44`
})

const emptyBeadDark = computed(() => {
  return `${carrierColors.value.primary}18`
})

const ringColor = computed(() => {
  return carrierColors.value.primary
})

// ============================================================
// 生命周期阶段
// ============================================================
const stageDef = computed(() => {
  if (!activeCarrier.value) return LIFECYCLE_STAGES[0]
  const stage = activeCarrier.value.lifecycleStage as LifecycleStage
  return LIFECYCLE_STAGES.find(s => s.value === stage) ?? LIFECYCLE_STAGES[0]
})

const stageLabel = computed(() => stageDef.value?.label ?? '')
const stageColor = computed(() => stageDef.value?.color ?? '#d4a574')

// ============================================================
// 珠子布局计算 — 圆形/水滴形排列
// ============================================================
interface BeadPos {
  x: number
  y: number
  filled: boolean
}

const displayBeads = computed<BeadPos[]>(() => {
  if (!activeCarrier.value) return []

  const total = Math.min(activeCarrier.value.maxBeads, maxDisplayBeads)
  const filled = Math.min(activeCarrier.value.beadCount, total)
  const positions: BeadPos[] = []

  // 水滴形排列：下半圆密度略高，呈现水滴汇聚感
  // 使用角度偏移使珠子在底部更密集（水滴形状）
  for (let i = 0; i < total; i++) {
    // 角度分布：从顶部 (270deg) 顺时针，底部区域角度步长略小
    const t = i / total
    // 水滴形调制：底部 (sin 接近 -1) 时角度步长压缩
    const angleAdjust = 1 + 0.15 * Math.sin(t * Math.PI * 2 + Math.PI)
    const angle = (t * Math.PI * 2 * angleAdjust - Math.PI / 2) % (Math.PI * 2)

    // 半径微调：底部珠子略向外，顶部略向内，增强水滴感
    const radiusAdjust = 1 + 0.06 * Math.cos(angle + Math.PI / 2)

    const r = orbitRadius * radiusAdjust
    const x = center + Math.cos(angle) * r
    const y = center + Math.sin(angle) * r

    positions.push({
      x,
      y,
      filled: i < filled,
    })
  }

  return positions
})
</script>

<style scoped>
/* ============================================================
   CanvasCarrier — 画布玉珠载体可视化
   ============================================================ */

.canvas-carrier {
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
  pointer-events: auto;
}

/* ---- 呼吸光晕 ---- */
.carrier-glow {
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 50%,
    var(--accent-glow, rgba(var(--accent-rgb), 0.08)) 0%,
    transparent 70%
  );
  animation: glow-breathe 6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes glow-breathe {
  0%, 100% {
    transform: scale(0.92);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.12);
    opacity: 0.85;
  }
}

/* ---- 载体主体 ---- */
.carrier-body {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: carrier-float 8s ease-in-out infinite;
}

@keyframes carrier-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

/* ---- SVG 玉珠圆阵 ---- */
.carrier-beads-svg {
  width: 150px;
  height: 150px;
  filter: drop-shadow(0 0 20px var(--accent-glow, rgba(var(--accent-rgb), 0.12)));
  transition: filter 0.5s ease;
}

.carrier-beads-svg:hover {
  filter: drop-shadow(0 0 32px var(--accent-dim, rgba(var(--accent-rgb), 0.25)));
}

/* 轨道环动画 */
.carrier-orbit-ring {
  animation: ring-rotate 20s linear infinite;
  transform-origin: center;
}

@keyframes ring-rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 玉珠动画 */
.carrier-bead {
  transition: opacity 0.3s ease;
}

.carrier-bead.bead--filled {
  animation: bead-pulse 3s ease-in-out infinite;
  animation-delay: calc(var(--bead-index, 0) * 0.05s);
}

.carrier-bead.bead--filled circle {
  transition: r 0.3s ease, fill 0.3s ease;
}

.carrier-bead.bead--empty circle {
  transition: r 0.3s ease, stroke 0.3s ease;
}

@keyframes bead-pulse {
  0%, 100% {
    opacity: 0.85;
  }
  50% {
    opacity: 1;
  }
}

/* ---- 信息区域 ---- */
.carrier-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;
}

.carrier-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  letter-spacing: 0.5px;
  opacity: 0.85;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.carrier-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.carrier-bead-count {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
}

.carrier-stage {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--bg-elevated, rgba(35, 30, 24, 0.8));
  border: 1px solid var(--border-light, rgba(var(--accent-rgb), 0.06));
  letter-spacing: 0.5px;
  transition: color 0.5s ease, background 0.5s ease;
}
</style>