<template>
  <div class="mssc" role="list">
    <button
      v-for="it in visibleIntents"
      :key="it.category"
      class="mssc-card"
      type="button"
      role="listitem"
      :aria-label="it.label"
      @click="onLaunch(it.category)"
    >
      <span class="mssc-icon">{{ it.icon }}</span>
      <span class="mssc-label">{{ it.label }}</span>
      <span class="mssc-desc">{{ it.description }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { INTENT_INFO } from '../modules/mirror/intents'
import type { IntentCategory } from '../modules/mirror/types'

/** 场景卡展示所需的最小意图信息（与 INTENT_INFO 取值形状一致） */
export type TIntentCardInfo = {
  category: IntentCategory
  label: string
  icon: string
  description: string
}

const props = withDefaults(
  defineProps<{
    intents?: TIntentCardInfo[]
  }>(),
  {
    intents: () =>
      Object.values(INTENT_INFO).filter(i => i.category !== 'unknown') as TIntentCardInfo[],
  },
)

const emit = defineEmits<{
  (e: 'launch', category: IntentCategory): void
}>()

const visibleIntents = computed<TIntentCardInfo[]>(() => props.intents ?? [])

function onLaunch(category: IntentCategory) {
  emit('launch', category)
}
</script>

<style scoped>
.mssc {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
  margin-bottom: 24px;
}

.mssc-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-bottom: 2px solid rgba(var(--accent-rgb), 0.15);
  color: var(--text-high);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.mssc-card:hover {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.22);
  transform: translateY(-2px);
}

.mssc-icon {
  font-size: 22px;
  line-height: 1;
}

.mssc-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
}

.mssc-desc {
  font-size: 10px;
  line-height: 1.3;
  color: rgba(var(--accent-rgb), 0.4);
}
</style>
