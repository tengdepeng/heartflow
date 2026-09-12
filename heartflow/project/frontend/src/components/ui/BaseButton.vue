<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    block?: boolean
  }>(),
  {
    variant: 'primary',
    type: 'button',
    disabled: false,
    block: false,
  },
)

defineEmits<{ (e: 'click', ev: MouseEvent): void }>()
</script>

<template>
  <button
    class="hf-btn"
    :class="[`hf-btn--${variant}`, { 'hf-btn--block': block }]"
    :type="type"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style scoped>
.hf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm, 8px);
  min-height: 40px;
  padding: 10px 20px;
  border: 1px solid transparent;
  border-radius: var(--radius-md, 10px);
  font-family: var(--font-body-zh);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  user-select: none;
  /* 具名属性过渡：不用 all，避免无关属性被拖进动画（如未来新增的 filter/padding）；
     时长 180ms 落在 150–300ms 区间，并挂宪法 --hf-animate-speed 全局调速 */
  transition:
    background-color calc(0.18s / var(--hf-animate-speed, 1)) ease,
    border-color calc(0.18s / var(--hf-animate-speed, 1)) ease,
    color calc(0.18s / var(--hf-animate-speed, 1)) ease,
    box-shadow calc(0.18s / var(--hf-animate-speed, 1)) ease,
    transform calc(0.18s / var(--hf-animate-speed, 1)) ease;
  -webkit-tap-highlight-color: transparent;
}
.hf-btn--block {
  width: 100%;
}

/* Primary */
.hf-btn--primary {
  background: var(--accent);
  color: #1a1208;
}
.hf-btn--primary:active:not(:disabled) {
  transform: translateY(1px);
}

/* Secondary */
.hf-btn--secondary {
  background: transparent;
  color: var(--accent);
  border-color: var(--border-color);
}
.hf-btn--secondary:active:not(:disabled) {
  /* 描边变体补按压缩进反馈（原实现只有 hover，点下去毫无回应） */
  transform: translateY(1px);
  background: var(--accent-glow);
  border-color: var(--accent-dim);
}

/* Ghost */
.hf-btn--ghost {
  background: transparent;
  color: var(--text-medium);
}
.hf-btn--ghost:active:not(:disabled) {
  transform: translateY(1px);
  background: var(--bg-surface);
  color: var(--text-primary);
}

/* Danger */
.hf-btn--danger {
  background: var(--danger);
  color: #1a0a0a;
}
.hf-btn--danger:active:not(:disabled) {
  transform: translateY(1px);
}

/* ---- 悬停族：收进 (hover:hover)，触屏上 :hover 会粘滞，避免「点完卡在抬起态」 ---- */
@media (hover: hover) {
  .hf-btn--primary:hover:not(:disabled) {
    filter: brightness(1.08);
    box-shadow: var(--shadow-glow);
    transform: translateY(-1px);
  }
  .hf-btn--secondary:hover:not(:disabled) {
    background: var(--bg-surface);
    border-color: var(--accent-dim);
  }
  .hf-btn--ghost:hover:not(:disabled) {
    background: var(--bg-surface);
    color: var(--text-primary);
  }
  .hf-btn--danger:hover:not(:disabled) {
    filter: brightness(1.06);
    transform: translateY(-1px);
  }
}

/* Disabled —— 修复：原实现用 --text-muted-alt 涂成灰块，导致 ghost/secondary
   被禁用后完全丢失变体身份（看起来像另一种按钮）。改为「褪色 + 轻度去饱和」，
   保留各变体自身底色与边框，语义仍清晰，且不再误导视觉层级。 */
.hf-btn:disabled {
  opacity: 0.45;
  filter: grayscale(0.25);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

/* A11y focus ring —— 双层环（底色间隙 + 琥珀环），
   保证在任意背景、以及「本身就是琥珀底」的 primary 上都清晰可辨 */
.hf-btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--bg-primary),
    0 0 0 4px rgba(var(--accent-rgb), 0.6);
}

/* 窄屏：略收尺寸与内边距，避免长文案按钮在 360px 屏溢出 */
@media (max-width: 640px) {
  .hf-btn {
    min-height: 38px;
    padding: 9px 16px;
    font-size: 13.5px;
  }
}
</style>
