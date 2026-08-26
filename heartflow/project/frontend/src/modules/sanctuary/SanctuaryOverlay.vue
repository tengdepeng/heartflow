<template>
  <Transition name="sanctuary-overlay-fade">
    <div
      v-if="isActive"
      class="sanctuary-overlay"
      role="status"
      aria-live="polite"
      aria-label="安全岛已激活"
      @click="handleClick"
      @keydown.escape="exit"
      tabindex="-1"
    >
      <!-- 暖色光晕背景 -->
      <div class="overlay-vignette" aria-hidden="true"></div>
      <div class="overlay-warm-light" aria-hidden="true"></div>

      <!-- 颗粒纹理 -->
      <div class="overlay-grain" aria-hidden="true"></div>

      <!-- 状态指示器 -->
      <div class="status-indicator">
        <div class="indicator-icon">✦</div>
        <div class="indicator-text">安全岛已激活</div>
        <div class="indicator-hint">轻触任意位置退出</div>
      </div>

      <!-- 呼吸进度环 -->
      <div class="breath-ring" :style="{ '--ring-progress': breathProgress }">
        <svg viewBox="0 0 100 100" class="ring-svg">
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="rgba(var(--accent-rgb), 0.08)"
            stroke-width="0.5"
          />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="rgba(var(--accent-rgb), 0.25)"
            stroke-width="1"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            class="progress-arc"
          />
        </svg>
        <div class="ring-label">呼吸</div>
      </div>

      <!-- 五击进度指示器（触发后渐隐） -->
      <Transition name="progress-fade">
        <div v-if="showTriggerFeedback" class="trigger-feedback" aria-hidden="true">
          <div
            v-for="i in maxTaps"
            :key="i"
            :class="['tap-dot', { 'tap-dot--filled': i <= tapProgress }]"
          ></div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRuntimeState } from '../../resonance/bridges/runtime'

const props = withDefaults(defineProps<{
  breathProgress?: number
  tapProgress?: number
  maxTaps?: number
}>(), {
  breathProgress: 0,
  tapProgress: 0,
  maxTaps: 5,
})

const emit = defineEmits<{
  (e: 'exit'): void
}>()

const { isSanctuaryActive, exitSanctuary } = useRuntimeState()

const isActive = isSanctuaryActive

const showTriggerFeedback = ref(false)
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

// 呼吸进度环
const circumference = 2 * Math.PI * 42
const dashOffset = computed(() => {
  return circumference * (1 - props.breathProgress)
})

// 监听五击进度变化，显示反馈
watch(() => props.tapProgress, (val) => {
  if (val > 0) {
    showTriggerFeedback.value = true
    if (feedbackTimer) clearTimeout(feedbackTimer)
    // 一旦触发或超时，渐隐反馈
    feedbackTimer = setTimeout(() => {
      showTriggerFeedback.value = false
    }, 3000)
  }
})

function handleClick() {
  if (isActive.value) {
    exit()
  }
}

function exit() {
  exitSanctuary()
  emit('exit')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isActive.value) {
    exit()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (feedbackTimer) clearTimeout(feedbackTimer)
})
</script>

<style scoped>
/* ============================================================
   安全岛全局覆盖层 — 温暖 · 静谧 · 包裹感
   置于 z-index: 1999（低于 Sanctuary.vue 的 2000）
   ============================================================ */

.sanctuary-overlay {
  position: fixed;
  inset: 0;
  z-index: 1999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  cursor: pointer;
  user-select: none;
  background: rgba(5, 3, 2, 0.85);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

/* ---- 暗角 vignette ---- */
.overlay-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 80% 70% at 50% 50%,
    transparent 0%,
    rgba(5, 3, 2, 0.4) 40%,
    rgba(3, 2, 1, 0.6) 70%,
    rgba(0, 0, 0, 0.8) 100%
  );
}

/* ---- 暖色中心光晕 ---- */
.overlay-warm-light {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 50% 45% at 50% 50%,
    rgba(var(--accent-rgb), 0.08) 0%,
    rgba(var(--accent-rgb), 0.03) 30%,
    transparent 65%
  );
  animation: warm-pulse 6s ease-in-out infinite;
}

@keyframes warm-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ---- 颗粒纹理 ---- */
.overlay-grain {
  position: absolute;
  inset: -50%;
  pointer-events: none;
  opacity: 0.15;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
  animation: grain-move 0.5s steps(6) infinite;
}

@keyframes grain-move {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-5%, -5%); }
  20% { transform: translate(-10%, 5%); }
  30% { transform: translate(5%, -10%); }
  40% { transform: translate(-5%, 15%); }
  50% { transform: translate(-10%, 5%); }
  60% { transform: translate(15%, 0); }
  70% { transform: translate(0, 10%); }
  80% { transform: translate(-15%, 0); }
  90% { transform: translate(10%, 5%); }
}

/* ---- 状态指示器 ---- */
.status-indicator {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: indicator-appear 0.8s ease-out;
}

@keyframes indicator-appear {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.indicator-icon {
  font-size: 28px;
  color: rgba(var(--accent-rgb), 0.5);
  animation: icon-float 4s ease-in-out infinite;
  filter: drop-shadow(0 0 12px rgba(var(--accent-rgb), 0.15));
}

@keyframes icon-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.indicator-text {
  font-size: 18px;
  font-weight: 300;
  color: rgba(var(--text-primary-rgb), 0.6);
  letter-spacing: 4px;
}

.indicator-hint {
  font-size: 11px;
  color: var(--text-faint);
  letter-spacing: 1px;
  margin-top: 4px;
}

/* ---- 呼吸进度环 ---- */
.breath-ring {
  position: relative;
  z-index: 1;
  width: 72px;
  height: 72px;
}

.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-arc {
  transition: stroke-dashoffset 0.3s ease;
}

.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.15);
  letter-spacing: 2px;
}

/* ---- 五击进度反馈 ---- */
.trigger-feedback {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.tap-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.08);
  transition: all 0.15s ease;
}

.tap-dot--filled {
  background: rgba(var(--accent-rgb), 0.4);
  box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.15);
}

/* ---- 过渡动画 ---- */
.sanctuary-overlay-fade-enter-active {
  transition: all 0.5s ease-out;
}
.sanctuary-overlay-fade-leave-active {
  transition: all 0.4s ease-in;
}
.sanctuary-overlay-fade-enter-from {
  opacity: 0;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}
.sanctuary-overlay-fade-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

.progress-fade-enter-active {
  transition: all 0.3s ease-out;
}
.progress-fade-leave-active {
  transition: all 0.4s ease-in;
}
.progress-fade-enter-from,
.progress-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .indicator-icon {
    font-size: 22px;
  }
  .indicator-text {
    font-size: 15px;
    letter-spacing: 3px;
  }
  .breath-ring {
    width: 56px;
    height: 56px;
  }
}
</style>