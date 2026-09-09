<script setup lang="ts">
interface Props {
  /** 图标（emoji 或字符），默认一朵花 */
  icon?: string
  /** 主文案 */
  title?: string
  /** 辅助引导语（沉默条款激活时自动隐藏） */
  hint?: string
  /** 主行动按钮文案，默认「新建」 */
  ctaLabel?: string
  /** 是否显示氛围光晕，默认 true */
  glow?: boolean
}
withDefaults(defineProps<Props>(), {
  icon: '✿',
  title: '',
  hint: '',
  ctaLabel: '新建',
  glow: true,
})
const emit = defineEmits<{ (e: 'cta'): void }>()
</script>

<template>
  <div class="hf-empty" :class="{ 'hf-empty--flat': !glow }" data-enter>
    <div v-if="icon" class="hf-empty__icon-wrap">
      <span class="hf-empty__icon">{{ icon }}</span>
      <span v-if="glow" class="hf-empty__glow" aria-hidden="true" />
    </div>
    <p v-if="title" class="hf-empty__title">{{ title }}</p>
    <p v-if="hint" class="hf-empty__hint">{{ hint }}</p>
    <button
      v-if="$slots.cta || ctaLabel"
      type="button"
      class="hf-empty__cta"
      @click="emit('cta')"
    >
      <slot name="cta">{{ ctaLabel }}</slot>
    </button>
  </div>
</template>

<style scoped>
.hf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  /* 留白条款（--hf-empty-space=1）激活时加大纵向留白，呼应「克制」宪法 */
  padding: calc(var(--spacing-xl) * (1 + var(--hf-empty-space, 0) * 0.6)) var(--spacing-md);
  border: 1px dashed var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}
.hf-empty__icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-md);
}
.hf-empty__icon {
  font-size: 40px;
  line-height: 1;
  opacity: 0.55;
}
.hf-empty__glow {
  position: absolute;
  inset: -18px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
  /* 呼吸光晕周期由宪法 --hf-breathing-speed 调速 */
  animation: hf-empty-breathe calc(4.5s / var(--hf-breathing-speed, 1)) ease-in-out infinite;
  pointer-events: none;
}
.hf-empty__title {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-xs);
}
.hf-empty__hint {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  /* 沉默条款（--hf-silence=1）激活时隐藏引导文案，仅留主文案 */
  opacity: calc(1 - var(--hf-silence, 0));
}
.hf-empty__cta {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--accent-dim);
  border-radius: var(--radius-md);
  background: var(--accent-glow);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition:
    background calc(0.3s / var(--hf-animate-speed, 1)) ease,
    transform calc(0.3s / var(--hf-animate-speed, 1)) ease;
}
.hf-empty__cta:hover {
  background: var(--accent-dim);
  transform: translateY(-1px);
}
@keyframes hf-empty-breathe {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.65; transform: scale(1.08); }
}
</style>
