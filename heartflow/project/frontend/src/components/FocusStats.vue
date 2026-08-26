<template>
  <div class="focus-stats">
    <div class="stat-item">
      <span class="stat-icon">◌</span>
      <div class="stat-copy">
        <span class="stat-value">{{ sessions }}</span>
        <span class="stat-label">今日沉淀</span>
      </div>
    </div>
    <div class="stat-item">
      <span class="stat-icon">·</span>
      <div class="stat-copy">
        <span class="stat-value">{{ formattedDuration }}</span>
        <span class="stat-label">本轮流动</span>
      </div>
    </div>
    <div class="stat-item stat-item--progress">
      <div class="stat-copy stat-copy--progress">
        <span class="stat-value">{{ progressPercent }}%</span>
        <span class="stat-label">脉动进度</span>
      </div>
      <div class="mini-progress">
        <div class="mini-bar" :style="{ width: `${progress * 100}%` }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  sessions: number
  currentDuration: number
  progress: number
}>()

const formattedDuration = computed(() => {
  const s = props.currentDuration
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})

const progressPercent = computed(() => Math.round(Math.max(0, Math.min(1, props.progress)) * 100))
</script>

<style scoped>
.focus-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.16);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.56);
}

.stat-item--progress {
  min-width: 140px;
}

.stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 12px;
  opacity: 0.72;
}

.stat-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 11px;
  opacity: 0.68;
}

.stat-copy--progress {
  min-width: 56px;
}

.mini-progress {
  width: 72px;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.18);
}

.mini-bar {
  height: 100%;
  background: linear-gradient(90deg, rgba(134, 198, 255, 0.72), rgba(194, 185, 255, 0.92));
  border-radius: 999px;
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(194, 185, 255, 0.35);
}
</style>
