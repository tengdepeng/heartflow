<script setup lang="ts">
// ============================================================
// 全局 UI · 角落缩放展开弹层（可复用）
// 打开时把 transform-origin 指向触发元素中心（mode='auto'）或固定角落，
// 弹层由 scaleFrom 生长到 1；关闭时收缩归位。零网络。
// ============================================================
import { ref, watch, nextTick } from 'vue'
import { cornerOrigin } from '../modules/corner-transition'
import type { CornerMode } from '../modules/corner-transition'

const props = withDefaults(
  defineProps<{
    open: boolean
    /** 触发元素（mode='auto' 时用其中心作生长原点） */
    trigger?: HTMLElement | null
    mode?: CornerMode
    durationMs?: number
    scaleFrom?: number
  }>(),
  { trigger: null, mode: 'auto', durationMs: 260, scaleFrom: 0.05 },
)

const emit = defineEmits<{ close: [] }>()

const panelRef = ref<HTMLElement | null>(null)
const origin = ref('center center')

async function computeOrigin(): Promise<void> {
  await nextTick()
  if (props.mode !== 'auto') {
    origin.value = cornerOrigin(props.mode)
    return
  }
  const panel = panelRef.value
  const trigger = props.trigger
  if (!panel || !trigger) {
    origin.value = 'center center'
    return
  }
  const pr = panel.getBoundingClientRect()
  const tr = trigger.getBoundingClientRect()
  if (!pr.width || !pr.height) {
    origin.value = 'center center'
    return
  }
  const x = tr.left + tr.width / 2 - pr.left
  const y = tr.top + tr.height / 2 - pr.top
  origin.value = `${Math.round(Math.max(0, Math.min(pr.width, x)))}px ${Math.round(Math.max(0, Math.min(pr.height, y)))}px`
}

watch(
  () => props.open,
  (v) => {
    if (v) void computeOrigin()
  },
)
watch(
  () => props.mode,
  () => {
    if (props.open) void computeOrigin()
  },
)
</script>

<template>
  <Transition name="cgm">
    <div v-if="open" class="cgm-mask" @click.self="emit('close')">
      <div
        ref="panelRef"
        class="cgm-panel"
        :style="{ transformOrigin: origin, '--cgm-dur': durationMs + 'ms', '--cgm-scale': String(scaleFrom) }"
        role="dialog"
        aria-modal="true"
      >
        <slot />
        <button class="cgm-close" type="button" @click="emit('close')">关闭</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.cgm-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 10, 18, 0.55);
  backdrop-filter: blur(3px);
}

.cgm-panel {
  position: relative;
  width: min(340px, 84vw);
  padding: 22px 22px 20px;
  border-radius: 18px;
  border: 1px solid rgba(var(--accent-rgb), 0.22);
  background: linear-gradient(160deg, rgba(var(--bg-card-rgb), 0.96), rgba(var(--bg-card-rgb), 0.86));
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  color: var(--text-primary);
  transform-origin: center center;
  will-change: transform, opacity;
}

.cgm-close {
  display: block;
  margin: 16px auto 0;
  padding: 5px 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.28);
  border-radius: 999px;
  background: none;
  color: rgba(var(--accent-rgb), 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.cgm-close:hover { color: var(--text-primary); }

.cgm-enter-active,
.cgm-leave-active {
  transition: opacity var(--cgm-dur, 260ms) ease;
}
.cgm-enter-active .cgm-panel,
.cgm-leave-active .cgm-panel {
  transition: transform var(--cgm-dur, 260ms) cubic-bezier(0.22, 1, 0.36, 1);
}
.cgm-enter-from,
.cgm-leave-to {
  opacity: 0;
}
.cgm-enter-from .cgm-panel,
.cgm-leave-to .cgm-panel {
  transform: scale(var(--cgm-scale, 0.05));
}

@media (prefers-reduced-motion: reduce) {
  .cgm-enter-active .cgm-panel,
  .cgm-leave-active .cgm-panel {
    transition-duration: 1ms;
  }
}
</style>
