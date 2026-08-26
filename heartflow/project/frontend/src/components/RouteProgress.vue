<template>
  <div class="rp-container" :class="{ 'rp--active': visible }">
    <div class="rp-bar" :style="barStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const visible = ref(false)
const progress = ref(0)

let rafId = 0
let startTime = 0
const DURATION = 400 // ms

function start() {
  visible.value = true
  progress.value = 0
  startTime = performance.now()
  cancelAnimationFrame(rafId)
  animate()
}

function animate() {
  const elapsed = performance.now() - startTime
  // Ease-out cubic: fast start, slow finish
  const t = Math.min(elapsed / DURATION, 1)
  // 模拟进度：快速到 60%，然后缓慢到 95%
  const target = 0.6 + 0.35 * (1 - Math.pow(1 - Math.min(t * 2, 1), 3))
  progress.value = Math.min(target, 0.95)
  if (t < 1) {
    rafId = requestAnimationFrame(animate)
  }
}

function finish() {
  cancelAnimationFrame(rafId)
  progress.value = 1
  setTimeout(() => {
    visible.value = false
    progress.value = 0
  }, 200)
}

const barStyle = computed(() => ({
  width: `${progress.value * 100}%`,
  transition: 'width 0.05s linear',
}))

defineExpose({ start, finish })
</script>

<style scoped>
.rp-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 10001;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.rp--active {
  opacity: 1;
}

.rp-bar {
  height: 100%;
  background: linear-gradient(90deg, #b89a6a, #d4b080, #b89a6a);
  background-size: 200% 100%;
  animation: rp-shimmer 1.2s ease-in-out infinite;
  border-radius: 1px;
  box-shadow: 0 0 6px rgba(184, 154, 106, 0.3);
}

@keyframes rp-shimmer {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
</style>