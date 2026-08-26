<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    type?: string
    placeholder?: string
    disabled?: boolean
    id?: string
  }>(),
  {
    modelValue: '',
    type: 'text',
    placeholder: '',
    disabled: false,
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
  color: var(--text-medium);
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
  transition: var(--transition, 0.25s cubic-bezier(0.4, 0, 0.2, 1));
}
.hf-input::placeholder {
  color: var(--text-dim);
}
.hf-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.2);
}
.hf-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
