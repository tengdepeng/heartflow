<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'

withDefaults(
  defineProps<{
    modelValue?: boolean
    title?: string
  }>(),
  { modelValue: false, title: '' },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

function close() {
  emit('update:modelValue', false)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="hf-modal">
      <div v-if="modelValue" class="hf-modal-mask" @click.self="close">
        <div class="hf-modal" role="dialog" aria-modal="true" :aria-label="title || '对话框'">
          <header v-if="title || $slots.header" class="hf-modal__head">
            <slot name="header">
              <h3 class="hf-modal__title">{{ title }}</h3>
            </slot>
            <button class="hf-modal__close" aria-label="关闭" type="button" @click="close">
              ×
            </button>
          </header>
          <div class="hf-modal__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="hf-modal__foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.hf-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(10, 8, 6, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  z-index: 1000;
}
.hf-modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg, 16px);
  padding: 24px;
  box-shadow: var(--shadow);
  min-width: 320px;
  max-width: 90vw;
  max-height: 85vh;
  overflow: auto;
}
.hf-modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.hf-modal__title {
  font-family: var(--font-heading-zh);
  font-size: 21px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.hf-modal__close {
  background: transparent;
  border: none;
  color: var(--text-medium);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-md, 10px);
}
.hf-modal__close:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
}
.hf-modal__body {
  color: var(--text-medium);
}
.hf-modal__foot {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* 入场复用 animations.css 的 summon-fade-in 关键帧 */
.hf-modal-enter-active {
  animation: summon-fade-in 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.hf-modal-leave-active {
  animation: summon-fade-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) reverse;
}
</style>
