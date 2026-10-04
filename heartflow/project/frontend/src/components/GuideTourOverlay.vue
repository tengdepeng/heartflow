<script setup lang="ts">
// ============================================================
// 全局 UI · 分步引导蒙层 · 覆盖层（INCR-500）
// 逐目标高亮（聚光挖洞）+ 气泡说明，支持上/下一步、跳过、完成。
// 落点：触角页挂载一次，气泡位置由 computeTooltip 纯函数计算。
// ============================================================
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useGuideTour, computeTooltip } from '../modules/guide-tour/guide-tour'
import type { Rect } from '../modules/guide-tour/guide-tour'

const { isActive, activeStep, index, total, isLast, next, prev, skip } = useGuideTour()

const targetRect = ref<Rect>({ left: 0, top: 0, width: 0, height: 0 })
const tooltipStyle = ref<Record<string, string>>({})
const found = ref(false)
const bubbleRef = ref<HTMLElement | null>(null)

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight }
}

function positionBubble(): void {
  const step = activeStep.value
  if (!step) return
  const size = bubbleRef.value
    ? { width: bubbleRef.value.offsetWidth, height: bubbleRef.value.offsetHeight }
    : { width: 280, height: 150 }
  const p = computeTooltip(targetRect.value, size, viewport(), step.placement)
  tooltipStyle.value = { left: `${p.left}px`, top: `${p.top}px` }
}

function measure(): void {
  const step = activeStep.value
  if (!step) return
  const el = typeof document !== 'undefined' ? document.querySelector(step.target) : null
  if (el) {
    const r = el.getBoundingClientRect()
    targetRect.value = { left: r.left, top: r.top, width: r.width, height: r.height }
    found.value = true
  } else {
    targetRect.value = { left: 0, top: 0, width: 0, height: 0 }
    found.value = false
  }
  positionBubble()
}

async function refresh(): Promise<void> {
  await nextTick()
  measure()
}

watch(() => activeStep.value?.id, () => { void refresh() })
watch(isActive, (v) => { if (v) void refresh() })

onMounted(() => {
  window.addEventListener('resize', refresh)
  window.addEventListener('scroll', refresh, true)
  if (isActive.value) void refresh()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', refresh)
  window.removeEventListener('scroll', refresh, true)
})

const spotStyle = computed<Record<string, string>>(() => {
  const r = targetRect.value
  const style: Record<string, string> = {}
  if (found.value) {
    style.left = `${r.left - 6}px`
    style.top = `${r.top - 6}px`
    style.width = `${r.width + 12}px`
    style.height = `${r.height + 12}px`
  }
  return style
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isActive && activeStep" class="gt-root" role="dialog" aria-modal="true" aria-label="分步引导">
      <div class="gt-block" :class="{ 'gt-block--dim': !found }" />
      <div v-if="found" class="gt-spot" :style="spotStyle" />
      <div ref="bubbleRef" class="gt-bubble" :style="tooltipStyle">
        <div class="gt-bubble-head">
          <span class="gt-count">{{ index + 1 }} / {{ total }}</span>
          <button class="gt-close" type="button" aria-label="关闭引导" @click="skip">✕</button>
        </div>
        <h4 class="gt-title">{{ activeStep.title }}</h4>
        <p class="gt-content">{{ activeStep.content }}</p>
        <div class="gt-actions">
          <button v-if="index > 0" class="gt-btn" type="button" @click="prev">上一步</button>
          <button class="gt-btn gt-btn--ghost" type="button" @click="skip">跳过</button>
          <button class="gt-btn gt-btn--primary" type="button" @click="next">
            {{ isLast ? '完成' : '下一步' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gt-root {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 9999);
}

/* 透明点击拦截层：阻断底层页面交互 */
.gt-block {
  position: fixed;
  inset: 0;
  z-index: 1;
}
.gt-block--dim {
  background: rgba(6, 5, 4, 0.74);
}

/* 聚光挖洞：巨大外阴影把目标以外的区域压暗 */
.gt-spot {
  position: fixed;
  z-index: 2;
  pointer-events: none;
  border-radius: 12px;
  box-shadow:
    0 0 0 9999px rgba(6, 5, 4, 0.74),
    inset 0 0 0 1px rgba(var(--accent-rgb), 0.55);
  transition: left 0.25s ease, top 0.25s ease, width 0.25s ease, height 0.25s ease;
}

.gt-bubble {
  position: fixed;
  z-index: 3;
  width: min(300px, calc(100vw - 32px));
  padding: 14px 16px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: var(--bg-panel, #1a1612);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
  transition: left 0.25s ease, top 0.25s ease;
}

.gt-bubble-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.gt-count {
  font-size: 11px;
  letter-spacing: 0.1em;
  color: rgba(var(--accent-rgb), 0.75);
}

.gt-close {
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.5);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 6px;
}
.gt-close:hover { color: var(--text-primary); background: rgba(var(--accent-rgb), 0.12); }

.gt-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.5px;
}

.gt-content {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(var(--text-primary-rgb), 0.8);
}

.gt-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.gt-btn {
  padding: 6px 12px;
  font-size: 12px;
  font-family: inherit;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(var(--text-primary-rgb), 0.82);
  cursor: pointer;
  transition: all 0.2s;
}
.gt-btn:hover { border-color: rgba(var(--accent-rgb), 0.4); }

.gt-btn--ghost {
  margin-right: auto;
  border-color: transparent;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.5);
}
.gt-btn--ghost:hover { color: rgba(var(--text-primary-rgb), 0.8); background: rgba(var(--accent-rgb), 0.08); }

.gt-btn--primary {
  border-color: rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.16);
  color: var(--accent);
  font-weight: 600;
}
</style>
