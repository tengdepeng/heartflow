<script setup lang="ts">
interface Props {
  modelValue: string
  placeholder?: string
  /** 输入防抖毫秒，0 表示即时 */
  debounce?: number
}
const props = withDefaults(defineProps<Props>(), {
  placeholder: '搜索…',
  debounce: 0,
})
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

let timer: ReturnType<typeof setTimeout> | undefined
function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  if (props.debounce > 0) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => emit('update:modelValue', v), props.debounce)
  } else {
    emit('update:modelValue', v)
  }
}
function clear() {
  if (timer) clearTimeout(timer)
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="hf-search" data-enter>
    <span class="hf-search__icon" aria-hidden="true">🔍</span>
    <input
      class="hf-search__input"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      @input="onInput"
    />
    <button
      v-if="modelValue"
      type="button"
      class="hf-search__clear"
      aria-label="清除"
      @click="clear"
    >✕</button>
  </div>
</template>

<style scoped>
.hf-search {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  transition: border-color calc(0.3s / var(--hf-animate-speed, 1)) ease;
}
.hf-search:focus-within {
  border-color: var(--accent-dim);
}
.hf-search__icon {
  font-size: 14px;
  opacity: 0.5;
}
.hf-search__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
}
.hf-search__input::placeholder {
  color: var(--text-muted);
}
.hf-search__clear {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  padding: 2px 4px;
  border-radius: var(--radius-sm);
}
.hf-search__clear:hover {
  color: var(--text-primary);
}
.hf-search__clear:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
