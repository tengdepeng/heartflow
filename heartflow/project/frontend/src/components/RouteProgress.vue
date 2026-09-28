<template>
  <div class="rp-container" :class="{ 'rp--active': visible, 'rp--done': completing }">
    <div class="rp-bar" :style="barStyle">
      <span class="rp-comet" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const visible = ref(false)
const progress = ref(0)
const completing = ref(false)

let rafId = 0
let startTime = 0
const DURATION = 420 // ms

function start() {
  visible.value = true
  progress.value = 0
  completing.value = false
  startTime = performance.now()
  cancelAnimationFrame(rafId)
  animate()
}

function animate() {
  const elapsed = performance.now() - startTime
  // Ease-out cubic: fast start, slow finish
  const t = Math.min(elapsed / DURATION, 1)
  // 模拟进度：快速推进到 ~62%，随后缓入至 94%，为收尾留出空间
  const target = 0.62 + 0.32 * (1 - Math.pow(1 - Math.min(t * 2, 1), 3))
  progress.value = Math.min(target, 0.94)
  if (t < 1) {
    rafId = requestAnimationFrame(animate)
  }
}

function finish() {
  if (!visible.value) return
  cancelAnimationFrame(rafId)
  completing.value = true
  progress.value = 1
  // 宽度先以缓动滑到满，再整体柔和淡出，避免「戛然而止」的生硬感
  setTimeout(() => {
    visible.value = false
    setTimeout(() => {
      progress.value = 0
      completing.value = false
    }, 240)
  }, 300)
}

const barStyle = computed(() => ({
  width: `${progress.value * 100}%`,
  transition: completing.value
    ? 'width 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
    : 'width 0.09s linear',
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
  /* 出现/消失用更从容的淡入淡出，配合路由切换不突兀 */
  transition: opacity 0.3s ease;
}

.rp--active {
  opacity: 1;
}

.rp-bar {
  position: relative;
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, #b89a6a, #d4b080, #b89a6a);
  background-size: 200% 100%;
  border-radius: 1px;
  /* 仅裁切内部彗星高光（不让其溢出条体左侧），外发光 box-shadow 不受 overflow 影响 */
  overflow: hidden;
  box-shadow:
    0 0 10px rgba(212, 176, 128, 0.55),
    0 0 4px rgba(255, 236, 210, 0.5);
  animation: rp-shimmer 1.6s ease-in-out infinite;
  will-change: width;
}

/* 前导彗星高光：随进度右沿流动的柔光帽，强化「正在加载」的方向感与质感 */
.rp-comet {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 72px;
  background: linear-gradient(90deg, transparent, rgba(255, 240, 220, 0.7));
  border-radius: 1px;
  pointer-events: none;
}

/* 收尾：满格后光痕轻微提亮一次，给「完成」一个可被感知的收束 */
.rp--done .rp-bar {
  box-shadow:
    0 0 16px rgba(212, 176, 128, 0.7),
    0 0 6px rgba(255, 236, 210, 0.6);
}

@keyframes rp-shimmer {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
</style>
