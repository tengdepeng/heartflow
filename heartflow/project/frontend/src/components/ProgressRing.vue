<template>
  <div
    class="progress-ring"
    :style="{ width: size + 'px', height: size + 'px' }"
    role="progressbar"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
  >
    <svg class="ring-svg" :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <!-- 背景环 -->
      <circle
        class="ring-bg"
        :cx="center" :cy="center" :r="radius"
        :stroke-width="stroke"
      />
      <!-- 进度环 -->
      <circle
        class="ring-fill"
        :cx="center" :cy="center" :r="radius"
        :stroke-width="stroke"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <div class="ring-center">
      <slot>
        <span class="ring-value">{{ displayValue }}</span>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** 当前值 */
  value: number
  /** 最大值 */
  max?: number
  /** 直径（px） */
  size?: number
  /** 环宽（px） */
  stroke?: number
  /** 无障碍标签 */
  label?: string
  /** 居中显示原始值而非百分比 */
  showRaw?: boolean
}>(), {
  max: 100,
  size: 96,
  stroke: 8,
  label: '进度',
  showRaw: false,
})

const percent = computed(() => {
  if (props.max <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((props.value / props.max) * 100)))
})

const center = computed(() => props.size / 2)
const radius = computed(() => Math.max(1, (props.size - props.stroke) / 2))
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => {
  return circumference.value * (1 - percent.value / 100)
})
const displayValue = computed(() => (props.showRaw ? `${props.value}` : `${percent.value}%`))
</script>

<style scoped>
.progress-ring {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ring-svg {
  transform: rotate(-90deg);
  display: block;
}
.ring-bg {
  fill: none;
  stroke: rgba(100, 116, 139, 0.2);
}
.ring-fill {
  fill: none;
  stroke: var(--accent, #d4a574);
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s ease;
}
.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
</style>