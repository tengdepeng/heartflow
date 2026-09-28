<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'

export interface TabOption {
  key: string | number
  label: string
  icon?: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    options?: TabOption[]
    variant?: 'pill' | 'underline'
    disabled?: boolean
    ariaLabel?: string
  }>(),
  {
    modelValue: '',
    options: () => [],
    variant: 'pill',
    disabled: false,
    ariaLabel: '标签页',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'change', value: string | number): void
}>()

const rootEl = ref<HTMLElement | null>(null)
const indicator = ref({ left: 0, width: 0, ready: false })

/** 测量当前激活标签的位置/宽度，驱动滑动指示器（transform 滑动，不触发重排） */
function measure() {
  const root = rootEl.value
  if (!root) return
  const tabs = Array.from(root.querySelectorAll<HTMLElement>('.hf-tab'))
  const activeIdx = props.options.findIndex((o) => o.key === props.modelValue)
  const el = tabs[activeIdx]
  if (!el) {
    indicator.value = { left: 0, width: 0, ready: false }
    return
  }
  const rootRect = root.getBoundingClientRect()
  const rect = el.getBoundingClientRect()
  indicator.value = {
    left: rect.left - rootRect.left,
    width: rect.width,
    ready: true,
  }
}

function select(opt: TabOption) {
  if (props.disabled || opt.disabled) return
  if (opt.key === props.modelValue) return
  emit('update:modelValue', opt.key)
  emit('change', opt.key)
}

let ro: ResizeObserver | null = null
onMounted(async () => {
  await nextTick()
  measure()
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    ro = new ResizeObserver(() => measure())
    ro.observe(rootEl.value)
  }
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', measure)
})

watch(() => props.modelValue, () => nextTick(measure))
watch(() => props.options, () => nextTick(measure), { deep: true })

const indicatorStyle = computed(() => ({
  transform: `translateX(${indicator.value.left}px)`,
  width: `${indicator.value.width}px`,
  opacity: indicator.value.ready ? 1 : 0,
}))
</script>

<template>
  <div
    ref="rootEl"
    class="hf-tabs"
    :class="[`hf-tabs--${variant}`, { 'is-disabled': disabled }]"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <span
      class="hf-tabs__indicator"
      :class="{ 'is-ready': indicator.ready }"
      :style="indicatorStyle"
      aria-hidden="true"
    />
    <button
      v-for="opt in options"
      :key="opt.key"
      type="button"
      class="hf-tab"
      :class="{ 'is-active': opt.key === modelValue }"
      role="tab"
      :aria-selected="opt.key === modelValue"
      :disabled="disabled || opt.disabled"
      @click="select(opt)"
    >
      <span v-if="opt.icon" class="hf-tab__icon">{{ opt.icon }}</span>
      <span class="hf-tab__label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.hf-tabs {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius-md, 10px);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  font-family: var(--font-body-zh);
  -webkit-tap-highlight-color: transparent;
}
.hf-tabs.is-disabled {
  opacity: 0.55;
  pointer-events: none;
}

.hf-tab {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: none;
  background: transparent;
  border-radius: calc(var(--radius-md, 10px) - 3px);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition:
    color calc(0.2s / var(--hf-animate-speed, 1)) ease,
    background-color calc(0.2s / var(--hf-animate-speed, 1)) ease;
}
.hf-tab.is-active {
  color: var(--text-primary);
}
@media (hover: hover) {
  .hf-tab:not(.is-active):hover {
    color: var(--text-medium);
  }
}
.hf-tab:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.hf-tab:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--bg-primary),
    0 0 0 4px rgba(var(--accent-rgb), 0.6);
}
.hf-tab__icon {
  font-size: 14px;
  line-height: 1;
}

/* 滑动指示器：transform + width 滑动，premium 缓动；opacity 防首帧在 (0,0) 闪现 */
.hf-tabs__indicator {
  position: absolute;
  z-index: 0;
  top: 4px;
  left: 0;
  height: calc(100% - 8px);
  border-radius: calc(var(--radius-md, 10px) - 3px);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  transform: translateX(0);
  opacity: 0;
  transition:
    transform calc(0.32s / var(--hf-animate-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1),
    width calc(0.32s / var(--hf-animate-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1),
    opacity calc(0.2s / var(--hf-animate-speed, 1)) ease;
  pointer-events: none;
}
.hf-tabs__indicator.is-ready {
  opacity: 1;
}

/* 强调态：pill 用琥珀辉光填充并染活激活文字 */
.hf-tabs--pill .hf-tabs__indicator {
  background: var(--accent-glow);
  border-color: var(--accent-dim);
  box-shadow: 0 2px 12px rgba(var(--accent-rgb), 0.18);
}
.hf-tabs--pill .hf-tab.is-active {
  color: var(--accent);
}

/* 下划线变体：细条贴底，去掉面板填充，适合与内容区分界的场景 */
.hf-tabs--underline {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  padding: 0;
  gap: 18px;
}
.hf-tabs--underline .hf-tab {
  border-radius: 0;
  padding: 10px 2px;
}
.hf-tabs--underline .hf-tabs__indicator {
  top: auto;
  bottom: -1px;
  height: 2px;
  border: none;
  border-radius: 2px;
  background: var(--accent);
  box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.4);
}

/* 减少动态：指示器瞬跳；颜色过渡保留 */
@media (prefers-reduced-motion: reduce) {
  .hf-tabs__indicator {
    transition: opacity 0.15s ease;
  }
  .hf-tab {
    transition: color 0.15s ease;
  }
}
</style>
