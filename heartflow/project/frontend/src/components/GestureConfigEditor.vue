<template>
  <section class="gesture-config-card">
    <!-- 标题与描述已由「殿堂设置」子分组头部提供，此处不再重复；仅保留变更提示徽标 -->
    <div v-if="recentlyChangedGesture" class="gesture-config-head">
      <span class="gesture-updated">已更新</span>
    </div>

    <div class="gesture-config-list">
      <label v-for="gesture in visibleGestureTypes" :key="gesture" class="gesture-config-row">
        <div class="gesture-copy">
          <span class="gesture-name">{{ gestureLabels[gesture] }}</span>
        </div>
        <select
          class="gesture-select"
          :value="bindings[gesture]"
          @change="onChange(gesture, ($event.target as HTMLSelectElement).value as GestureAction)"
        >
          <option v-for="option in actionOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <button class="gesture-toggle" type="button" @click="expanded = !expanded">
      {{ expanded ? '收起' : '展开更多' }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GestureAction, GestureBindings } from '../modules/gesture/contracts'
import type { GestureType } from '../modules/gesture/types'

defineProps<{
  bindings: GestureBindings
}>()

const emit = defineEmits<{
  change: [gesture: GestureType, action: GestureAction]
}>()

const gestureTypes: GestureType[] = [
  'tap',
  'long-press',
  'circle-cw',
  'circle-ccw',
  'cross',
  'wave',
  'horizontal-swipe-left',
  'horizontal-swipe-right',
]

const gestureLabels: Record<GestureType, string> = {
  tap: '轻点',
  'long-press': '长按',
  'circle-cw': '顺时针画圈',
  'circle-ccw': '逆时针画圈',
  cross: '画叉',
  wave: '波浪线',
  'horizontal-swipe-left': '向左横划',
  'horizontal-swipe-right': '向右横划',
}

const actionOptions: { value: GestureAction; label: string }[] = [
  { value: 'doNothing', label: '不执行任何操作' },
  { value: 'toggleFocusTimer', label: '开始 / 暂停计时' },
  { value: 'finishFocusSession', label: '结束当前专注' },
  { value: 'enterSafeIsland', label: '进入安全岛' },
  { value: 'exitSafeIsland', label: '退出安全岛' },
]

const expanded = ref(false)
const recentlyChangedGesture = ref<GestureType | null>(null)

const visibleGestureTypes = computed(() => {
  return expanded.value ? gestureTypes : gestureTypes.slice(0, 4)
})

function onChange(gesture: GestureType, action: GestureAction) {
  recentlyChangedGesture.value = gesture
  window.setTimeout(() => {
    if (recentlyChangedGesture.value === gesture) {
      recentlyChangedGesture.value = null
    }
  }, 1200)
  emit('change', gesture, action)
}
</script>

<style scoped>
.gesture-config-card {
  width: 100%;
  max-width: 420px;
}

.gesture-config-head {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 10px;
}

.gesture-updated {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(124, 108, 240, 0.14);
  border: 1px solid rgba(124, 108, 240, 0.24);
  font-size: 11px;
  color: rgba(240, 243, 255, 0.86);
  white-space: nowrap;
}

.gesture-config-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gesture-config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.gesture-config-row:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 108, 240, 0.18);
  background: rgba(255, 255, 255, 0.03);
}

.gesture-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gesture-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.76);
}

.gesture-select {
  min-width: 170px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(17, 19, 28, 0.35);
  backdrop-filter: blur(6px);
  color: #eef0ff;
  font-size: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.gesture-select:hover,
.gesture-select:focus {
  border-color: rgba(124, 108, 240, 0.4);
  box-shadow: 0 0 0 3px rgba(124, 108, 240, 0.12);
  outline: none;
}

.gesture-toggle {
  margin-top: 10px;
  padding: 0;
  border: none;
  background: transparent;
  color: rgba(198, 204, 255, 0.68);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.gesture-toggle:hover {
  color: rgba(240, 243, 255, 0.9);
}
</style>
