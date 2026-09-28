<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    disabled?: boolean
    label?: string
    ariaLabel?: string
  }>(),
  { modelValue: false, disabled: false, label: '', ariaLabel: '' },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const on = computed(() => props.modelValue)

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    type="button"
    class="hf-toggle"
    :class="{ 'is-on': on, 'is-disabled': disabled }"
    role="switch"
    :aria-checked="on"
    :aria-label="ariaLabel || label || '切换'"
    :disabled="disabled"
    @click="toggle"
  >
    <span class="hf-toggle__track" aria-hidden="true">
      <span class="hf-toggle__knob" />
    </span>
    <span v-if="label || $slots.default" class="hf-toggle__label">
      <slot>{{ label }}</slot>
    </span>
  </button>
</template>

<style scoped>
.hf-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: var(--font-body-zh);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-medium);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.hf-toggle.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 轨道：底色/边框平滑过渡；时长挂 --hf-animate-speed 全局调速 */
.hf-toggle__track {
  position: relative;
  flex: none;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-color);
  transition:
    background-color calc(0.22s / var(--hf-animate-speed, 1)) ease,
    border-color calc(0.22s / var(--hf-animate-speed, 1)) ease;
}
.hf-toggle.is-on .hf-toggle__track {
  background: var(--accent);
  border-color: var(--accent-dim);
}

/* 旋钮滑动：纯合成层 transform，过冲缓动带回弹手感；on 态翻为深色与琥珀轨道对比 */
.hf-toggle__knob {
  position: absolute;
  top: 50%;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f4ede2;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  transform: translateY(-50%) translateX(0);
  transition: transform calc(0.26s / var(--hf-animate-speed, 1)) cubic-bezier(0.34, 1.56, 0.64, 1);
}
.hf-toggle.is-on .hf-toggle__knob {
  transform: translateY(-50%) translateX(20px);
  background: #1a1208;
}

.hf-toggle:focus-visible {
  outline: none;
  border-radius: 999px;
  box-shadow:
    0 0 0 2px var(--bg-primary),
    0 0 0 4px rgba(var(--accent-rgb), 0.6);
}

.hf-toggle__label {
  line-height: 1.3;
}

/* 减少动态：旋钮与轨道瞬切，保留开关语义 */
@media (prefers-reduced-motion: reduce) {
  .hf-toggle__track,
  .hf-toggle__knob {
    transition: none;
  }
}
</style>
