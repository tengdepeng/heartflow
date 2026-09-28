<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    type?: string
    placeholder?: string
    disabled?: boolean
    id?: string
    /** 校验失败态：补 danger 描边 + 环，并透出 aria-invalid 供读屏播报 */
    invalid?: boolean
  }>(),
  {
    modelValue: '',
    type: 'text',
    placeholder: '',
    disabled: false,
    invalid: false,
  },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="hf-field">
    <label v-if="label" :for="id" class="hf-field__label">{{ label }}</label>
    <input
      :id="id"
      class="hf-input"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.hf-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hf-field__label {
  font-size: 13px;
  /* 原 --text-medium（α0.5）在暖深底上约 4.3:1，贴 WCAG AA 边界；
     提到 --text-bright（α0.7 ≈ 6.6:1）更稳，且标签本就该比正文权重高 */
  color: var(--text-bright);
  font-family: var(--font-body-zh);
}
.hf-input {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 10px);
  padding: 10px 12px;
  font-family: var(--font-body-zh);
  font-size: 14px;
  transition:
    border-color calc(0.18s / var(--hf-animate-speed, 1)) ease,
    box-shadow calc(0.18s / var(--hf-animate-speed, 1)) ease,
    background-color calc(0.18s / var(--hf-animate-speed, 1)) ease;
}
.hf-input::placeholder {
  color: var(--text-dim);
}
/* 悬停预反馈：鼠标移入即给出「可输入」的边界提示 */
@media (hover: hover) {
  .hf-input:hover:not(:disabled) {
    border-color: var(--accent-dim);
    background: var(--bg-secondary);
  }
}
/* 输入框用 :focus 而非 :focus-visible —— 文本输入需「点进去就有环」 */
.hf-input:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--bg-secondary);
  /* 3px 环 + 琥珀外发光，聚焦如「点亮输入框」 */
  box-shadow:
    0 0 0 3px rgba(var(--accent-rgb), 0.2),
    0 0 16px rgba(var(--accent-rgb), 0.14);
}
/* 错误态：边框用实心 --danger（无需三元组），环色走 color-mix 渐进增强 */
.hf-input[aria-invalid='true'] {
  border-color: var(--danger);
}
.hf-input[aria-invalid='true']:focus {
  border-color: var(--danger);
}
@supports (box-shadow: 0 0 0 3px color-mix(in srgb, red 20%, transparent)) {
  .hf-input[aria-invalid='true'] {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--danger) 20%, transparent);
  }
  .hf-input[aria-invalid='true']:focus {
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--danger) 26%, transparent),
      0 0 16px color-mix(in srgb, var(--danger) 18%, transparent);
  }
}
.hf-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  /* 禁用时连带压掉悬停/聚焦的视觉暗示，避免「看起来能改」 */
  border-color: var(--border-light);
  box-shadow: none;
}
</style>
