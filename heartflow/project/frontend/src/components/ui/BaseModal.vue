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
  /* 遮罩色 token 化：原 rgba(10,8,6,.6) 是离网手写值，改由 --bg-primary-rgb 派生，
     全局调色（含浅底模式）时遮罩随之统一 */
  background: rgba(var(--bg-primary-rgb), 0.62);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  /* NOTE: 裸 z-index 待收敛（宪法要求消费 --z-*）。此处维持 1000 不变，
     因为改用 --z-modal(9999) 会抬到 Aura(1500)/安全岛(1999) 之上、并与
     Toast 同层，属于堆叠行为变更，需另行确认后再动。 */
  z-index: 1000;
}
.hf-modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg, 16px);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow);
  /* 窄屏不溢出：360px 屏上 min(320px,92vw) 自动收窄 */
  min-width: min(320px, 92vw);
  max-width: 90vw;
  max-height: 85vh;
  overflow: auto;
  overscroll-behavior: contain;
}
.hf-modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
.hf-modal__title {
  font-family: var(--font-heading-zh);
  font-size: 21px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
/* 关闭键：命中区 ≥30×30（满足 WCAG 2.2 SC 2.5.8 的 24×24），
   补 hover / active / focus-visible 三态 */
.hf-modal__close {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  min-height: 30px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--text-medium);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  border-radius: var(--radius-md, 10px);
  transition:
    background-color calc(0.18s / var(--hf-animate-speed, 1)) ease,
    color calc(0.18s / var(--hf-animate-speed, 1)) ease,
    transform calc(0.18s / var(--hf-animate-speed, 1)) ease;
}
@media (hover: hover) {
  .hf-modal__close:hover {
    background: var(--bg-surface);
    color: var(--text-primary);
  }
}
.hf-modal__close:active {
  transform: scale(0.94);
}
.hf-modal__close:focus-visible {
  outline: none;
  background: var(--bg-surface);
  color: var(--text-primary);
  box-shadow:
    0 0 0 2px var(--bg-primary),
    0 0 0 4px rgba(var(--accent-rgb), 0.6);
}
.hf-modal__body {
  /* 正文对比度：原 --text-medium（α0.5）偏弱，提到 --text-bright（α0.7） */
  color: var(--text-bright);
}
.hf-modal__foot {
  margin-top: var(--spacing-lg);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* 入场复用 animations.css 的 summon-fade-in 关键帧；时长挂 --hf-animate-speed */
.hf-modal-enter-active {
  animation: summon-fade-in calc(0.32s / var(--hf-animate-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1);
}
.hf-modal-leave-active {
  animation: summon-fade-in calc(0.2s / var(--hf-animate-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) reverse;
}

/* 窄屏：内边距与标题收敛一档 */
@media (max-width: 640px) {
  .hf-modal {
    padding: var(--spacing-md);
  }
  .hf-modal__title {
    font-size: 18px;
  }
}
</style>
