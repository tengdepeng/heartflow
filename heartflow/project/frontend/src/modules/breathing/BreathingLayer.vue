<template>
  <div
    class="breathing-layer"
    :style="styleBindings"
  >
    <!-- 核心光晕 -->
    <div class="br-glow" />
    <!-- 氛围光晕层（多层级呼吸） -->
    <div class="br-aura" />
    <!-- 微妙的线框光晕 -->
    <div class="br-ring" />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTimer } from '../../resonance/bridges/timer'
import { useRuntimeState } from '../../resonance/bridges/runtime'
import type { TimeOfDay } from './types'

import { useBreathing } from './breathing-core'

const props = withDefaults(defineProps<{
  /** 时段感知色温 0-5，默认 3=白昼，由 App.vue 传入 */
  timeOfDay?: TimeOfDay
}>(), {
  timeOfDay: 3,
})

const timer = useTimer()
const { isSanctuaryActive } = useRuntimeState()

const timeOfDayRef = computed(() => props.timeOfDay)

const br = useBreathing({
  focusMode: computed(() => timer.isFocusing),
  paused: isSanctuaryActive,
  timeOfDay: timeOfDayRef,
})

/** 将 styleVars 对象转为内联样式 */
const styleBindings = computed(() => {
  if (isSanctuaryActive.value) {
    return {
      '--br-glow-opacity': '0',
      '--br-glow-color': 'transparent',
      '--br-cycle-ms': '0ms',
      '--br-glow-calm': '0',
      '--br-glow-peak': '0',
      '--br-scale-calm': '1',
      '--br-scale-peak': '1',
    }
  }

  const v = br.phase.value.styleVars
  const ret: Record<string, string> = {}
  for (const [key, val] of Object.entries(v)) {
    ret[key] = val
  }
  return ret
})

// ---- 专注完成时触发脉冲 ----
watch(() => timer.isCompleted, (done) => {
  if (done) br.pulse()
})

// ---- 暴露引擎实例给父组件（可选：通过 defineExpose） ----
defineExpose({ br })
</script>

<style scoped>
.breathing-layer {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
  transition:
    --br-glow-opacity 1.2s ease,
    --br-glow-color  1.8s ease;
  /* 降级：不认得 @property 的浏览器直接忽略 transition */
}

/* ---- 核心光晕：中心径向呼吸 ---- */
.br-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 50%,
    var(--br-glow-color, transparent) 0%,
    transparent 65%
  );
  opacity: var(--br-glow-opacity, 0.15);
  animation: breathe-glow var(--br-cycle-ms, 8000ms) ease-in-out infinite;
  will-change: transform, opacity;
}

/* ---- 氛围光晕：更大半径、更低透明度、反相位 ---- */
.br-aura {
  position: absolute;
  inset: -20%;
  background: radial-gradient(
    circle at 50% 50%,
    var(--br-glow-color) 0%,
    transparent 50%
  );
  opacity: calc(var(--br-glow-opacity, 0.15) * 0.6);
  animation: breathe-aura calc(var(--br-cycle-ms, 8000ms) * 1.3) ease-in-out infinite;
  will-change: transform, opacity;
}

/* ---- 微妙线框光晕 ---- */
.br-ring {
  position: absolute;
  inset: 15%;
  border-radius: 50%;
  border: 1px solid var(--br-glow-color);
  opacity: calc(var(--br-glow-opacity, 0.15) * 0.5);
  animation: breathe-ring var(--br-cycle-ms, 8000ms) ease-in-out infinite;
  will-change: transform, opacity;
}

/* ---- 呼吸动画 ---- */
@keyframes breathe-glow {
  0%, 100% {
    transform: scale(var(--br-scale-calm, 0.98));
    opacity: var(--br-glow-calm, 0.10);
  }
  50% {
    transform: scale(var(--br-scale-peak, 1.01));
    opacity: var(--br-glow-peak, 0.20);
  }
}

@keyframes breathe-aura {
  0%, 100% {
    transform: scale(0.96);
    opacity: calc(var(--br-glow-calm, 0.10) * 0.4);
  }
  50% {
    transform: scale(1.03);
    opacity: calc(var(--br-glow-peak, 0.20) * 0.5);
  }
}

@keyframes breathe-ring {
  0%, 100% {
    transform: scale(0.92);
    opacity: calc(var(--br-glow-calm, 0.10) * 0.3);
  }
  50% {
    transform: scale(1.04);
    opacity: calc(var(--br-glow-peak, 0.20) * 0.4);
  }
}
</style>
