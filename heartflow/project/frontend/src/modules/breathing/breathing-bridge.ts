// ============================================================
// Breathing 桥接层
// 简化透传：直接暴露 useBreathing 的原始 API
// ============================================================

import { computed, ref, type Ref } from 'vue'
import { useBreathing } from './index'
import type { BreathingMood, TimeOfDay } from './index'

export type { BreathingMood, TimeOfDay }

export function useBreathingBridge(opts?: {
  focusMode?: Ref<boolean>
  paused?: Ref<boolean>
  timeOfDay?: Ref<TimeOfDay>
}) {
  const breathing = useBreathing(opts)
  const activityCount = ref(0)

  // ---- 聚合状态 ----

  const moodLabel = computed(() => {
    const labels: Record<BreathingMood, string> = {
      calm: '宁静',
      present: '在场',
      focusing: '专注',
      pulsing: '脉冲',
    }
    return labels[breathing.mood.value] ?? breathing.mood.value
  })

  // ---- 操作 ----

  function pulse(): void {
    breathing.pulse()
  }

  function setMood(mood: BreathingMood): void {
    breathing.setMood(mood)
  }

  return {
    // 状态
    moodLabel,
    activityCount,
    // 原始响应式
    mood: breathing.mood,
    isPresent: breathing.isPresent,
    phase: breathing.phase,
    // 操作
    pulse,
    setMood,
    // 子模块直通
    breathing,
  }
}