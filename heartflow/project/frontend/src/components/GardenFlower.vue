<template>
  <div class="garden-flower" :class="stateClass" :style="flowerStyle">
    <svg viewBox="0 0 120 120" class="flower-svg">
      <!-- 茎 -->
      <line
        x1="60" y1="70" x2="60" y2="115"
        :stroke="config.color"
        stroke-width="2"
        opacity="0.4"
        :class="{ 'stem-sway': !paused }"
      />

      <!-- 花瓣 -->
      <g :class="{ 'petals-sway': !paused }">
        <path
          v-for="i in config.petals"
          :key="i"
          :d="petalPath()"
          :fill="config.petalColor"
          :opacity="0.7 + (i % 3) * 0.1"
          :transform="`rotate(${(360 / config.petals) * (i - 1)}, 60, 60)`"
        />
      </g>

      <!-- 花心 -->
      <circle cx="60" cy="60" r="10" :fill="coreColor" opacity="0.8" />
      <circle cx="60" cy="60" r="5" fill="rgba(255,255,255,0.2)" />

      <!-- 微光粒子 -->
      <circle
        v-for="gp in glowParticles"
        :key="gp.id"
        :cx="gp.cx"
        :cy="gp.cy"
        r="1.5"
        :fill="config.color"
        opacity="0.4"
        class="glow-dot"
        :style="{ animationDelay: gp.delay }"
      />
    </svg>

    <!-- 标签 -->
    <span class="flower-label">{{ config.label }}</span>
    <span v-if="note" class="flower-note">{{ note }}</span>
    <span class="flower-time">{{ timeLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EmotionType } from '../modules/emotion/types'
import { EMOTION_FLOWERS } from '../modules/emotion/types'

const props = withDefaults(defineProps<{
  type: EmotionType
  note?: string
  createdAt?: string
  paused?: boolean
  size?: number
  envScore?: number
}>(), {
  note: '',
  paused: false,
  size: 100,
  envScore: undefined,
})

const config = computed(() => EMOTION_FLOWERS[props.type] ?? EMOTION_FLOWERS.calm)

const glowParticles = computed(() =>
  [1, 2, 3].map(i => ({
    id: `gp${i}`,
    cx: 60 + Math.cos(i * 2.1) * 18,
    cy: 60 + Math.sin(i * 2.1) * 18,
    delay: `${i * 0.6}s`,
  }))
)

const timeLabel = computed(() => {
  if (!props.createdAt) return ''
  const d = new Date(props.createdAt)
  return `${d.getMonth() + 1}/${d.getDate()}`
})

const flowerStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size * 1.3}px`,
}))

const flowerState = computed(() => {
  if (props.envScore === undefined) return 'normal'
  if (props.envScore >= 70) return 'bloom'
  if (props.envScore >= 30) return 'normal'
  return 'wilt'
})

const stateClass = computed(() => `state-${flowerState.value}`)

const coreColor = computed(() => {
  if (flowerState.value === 'wilt') return '#666'
  return config.value.coreColor
})

function petalPath(): string {
  const shape = config.value.petalShape
  if (shape === 'pointed') {
    return 'M60,60 C50,38 55,25 60,18 C65,25 70,38 60,60'
  }
  if (shape === 'wavy') {
    return 'M60,60 C48,42 50,28 56,22 C58,30 62,38 60,60'
  }
  // rounded (default)
  return 'M60,60 C45,42 48,25 60,22 C72,25 75,42 60,60'
}
</script>

<style scoped>
.garden-flower {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: transform 0.3s;
}

.garden-flower:hover {
  transform: scale(1.15);
}

.flower-svg {
  width: 80px;
  height: 100px;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
  transition: filter 0.5s ease, opacity 0.5s ease;
}

.state-bloom .flower-svg {
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3)) drop-shadow(0 0 6px rgba(255,255,200,0.6)) brightness(1.15);
}

.state-normal .flower-svg {
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
}

.state-wilt .flower-svg {
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3)) grayscale(0.4) sepia(0.3);
  opacity: 0.7;
}

.stem-sway {
  transform-origin: 60px 70px;
  animation: stem-sway 4s ease-in-out infinite;
}

.petals-sway {
  transform-origin: 60px 60px;
  animation: petals-sway 5s ease-in-out infinite;
}

@keyframes stem-sway {
  0%, 100% { transform: rotate(-0.5deg); }
  50% { transform: rotate(0.5deg); }
}

@keyframes petals-sway {
  0%, 100% { transform: rotate(-0.3deg); }
  50% { transform: rotate(0.3deg); }
}

.glow-dot {
  animation: dot-glow 2s ease-in-out infinite;
}

@keyframes dot-glow {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.6; }
}

.flower-label {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.7;
}

.flower-note {
  font-size: 10px;
  opacity: 0.5;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.flower-time {
  font-size: 10px;
  opacity: 0.35;
}
</style>
