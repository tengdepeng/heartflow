<template>
  <div class="fluid" aria-hidden="true">
    <div class="fluid__blob fluid__blob--a" :style="blobA"></div>
    <div class="fluid__blob fluid__blob--b" :style="blobB"></div>
    <div class="fluid__blob fluid__blob--c" :style="blobC"></div>
    <div class="fluid__veil"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  accent?: string
  density?: number
  speed?: number
}>(), {
  accent: '#5ab8a0',
  density: 60,
  speed: 1,
})

const dur = computed(() => `${(18 / (props.speed ?? 1)).toFixed(2)}s`)
const spread = computed(() => 0.3 + (props.density ?? 60) / 200) // 密度越高光晕越浓

const blobA = computed(() => ({
  background: `radial-gradient(circle, ${props.accent}99 0%, transparent 60%)`,
  animationDuration: dur.value,
}))
const blobB = computed(() => ({
  background: `radial-gradient(circle, ${props.accent}66 0%, transparent 55%)`,
  animationDuration: `${(Number(dur.value.replace('s', '')) * 1.4).toFixed(2)}s`,
}))
const blobC = computed(() => ({
  background: `radial-gradient(circle, ${props.accent}44 0%, transparent 50%)`,
  animationDuration: `${(Number(dur.value.replace('s', '')) * 0.8).toFixed(2)}s`,
}))
const veilOpacity = computed(() => spread.value)
</script>

<style scoped>
.fluid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0, 0, 0, 0.35) 100%);
}
.fluid__blob {
  position: absolute;
  width: 60vmax;
  height: 60vmax;
  border-radius: 50%;
  filter: blur(40px);
  mix-blend-mode: screen;
  animation: fluid-drift 18s ease-in-out infinite;
  will-change: transform;
}
.fluid__blob--a { top: -10%; left: -5%; }
.fluid__blob--b { top: 30%; left: 40%; animation-direction: reverse; }
.fluid__blob--c { top: 55%; left: 10%; animation-delay: -6s; }
.fluid__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 0%, v-bind(accent) 50%, transparent 100%);
  opacity: v-bind(veilOpacity);
  mix-blend-mode: overlay;
  animation: fluid-sheen 14s linear infinite;
}
@keyframes fluid-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(8%, 6%) scale(1.1); }
  66% { transform: translate(-6%, 4%) scale(0.95); }
}
@keyframes fluid-sheen {
  0% { transform: translateX(-30%) rotate(0deg); }
  100% { transform: translateX(30%) rotate(8deg); }
}
</style>
