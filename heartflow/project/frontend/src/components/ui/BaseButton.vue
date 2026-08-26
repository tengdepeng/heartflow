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
  gap: 8px;
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
  transition: var(--transition, 0.25s cubic-bezier(0.4, 0, 0.2, 1));
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
.hf-btn--primary:hover:not(:disabled) {
  filter: brightness(1.08);
  box-shadow: var(--shadow-glow);
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
.hf-btn--secondary:hover:not(:disabled) {
  background: var(--bg-surface);
}

/* Ghost */
.hf-btn--ghost {
  background: transparent;
  color: var(--text-medium);
}
.hf-btn--ghost:hover:not(:disabled) {
  background: var(--bg-surface);
  color: var(--text-primary);
}

/* Danger */
.hf-btn--danger {
  background: var(--danger);
  color: #1a0a0a;
}
.hf-btn--danger:hover:not(:disabled) {
  filter: brightness(1.06);
}
.hf-btn--danger:active:not(:disabled) {
  transform: translateY(1px);
}

/* Disabled */
.hf-btn:disabled {
  background: var(--text-muted-alt);
  color: #1a1208;
  cursor: not-allowed;
  box-shadow: none;
  filter: none;
}

/* A11y focus ring */
.hf-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.35);
}
</style>
