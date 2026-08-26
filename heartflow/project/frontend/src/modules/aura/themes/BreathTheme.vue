<template>
  <div class="breath" aria-hidden="true">
    <div class="breath__core" :style="coreStyle"></div>
    <div class="breath__aura" :style="auraStyle"></div>
    <div class="breath__ring" :style="{ borderColor: accent }"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  accent?: string
  density?: number
  speed?: number
}>(), {
  accent: '#d4a574',
  density: 50,
  speed: 1,
})

const cycle = computed(() => `${(8 / (props.speed ?? 1)).toFixed(2)}s`)
const coreScale = computed(() => 0.9 + (props.density ?? 50) / 500) // 密度略增核心尺寸

const coreStyle = computed(() => ({
  background: `radial-gradient(circle at 50% 50%, ${props.accent}cc 0%, ${props.accent}33 45%, transparent 70%)`,
  animationDuration: cycle.value,
  '--core-scale': coreScale.value,
}))
const auraStyle = computed(() => ({
  background: `radial-gradient(circle at 50% 50%, ${props.accent}55 0%, transparent 55%)`,
  animationDuration: `${(Number(cycle.value.replace('s', '')) * 1.3).toFixed(2)}s`,
}))
</script>

<style scoped>
.breath {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.breath__core {
  position: absolute;
  width: 46vmin;
  height: 46vmin;
  border-radius: 50%;
  filter: blur(2px);
  animation: breath-core 8s ease-in-out infinite;
  will-change: transform, opacity;
}
.breath__aura {
  position: absolute;
  width: 72vmin;
  height: 72vmin;
  border-radius: 50%;
  filter: blur(28px);
  animation: breath-aura 10s ease-in-out infinite;
  will-change: transform, opacity;
}
.breath__ring {
  position: absolute;
  width: 30vmin;
  height: 30vmin;
  border-radius: 50%;
  border: 1px solid v-bind(accent);
  opacity: 0.35;
  animation: breath-ring 8s ease-in-out infinite;
}
@keyframes breath-core {
  0%, 100% { transform: scale(var(--core-scale, 0.9)); opacity: 0.5; }
  50% { transform: scale(calc(var(--core-scale, 0.9) * 1.08)); opacity: 0.9; }
}
@keyframes breath-aura {
  0%, 100% { transform: scale(0.94); opacity: 0.4; }
  50% { transform: scale(1.06); opacity: 0.7; }
}
@keyframes breath-ring {
  0%, 100% { transform: scale(0.9); opacity: 0.2; }
  50% { transform: scale(1.05); opacity: 0.5; }
}
</style>
