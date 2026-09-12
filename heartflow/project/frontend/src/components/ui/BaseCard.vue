<script setup lang="ts">
withDefaults(
  defineProps<{
    elevated?: boolean
    padded?: boolean
    /**
     * 交互态卡片：补 hover 抬升 + 内部聚焦环（focus-within）。
     * 纯表现层开关，不接管点击语义 —— 点击仍由内部元素/插槽自行处理，
     * 默认 false，对既有调用零行为变更。
     */
    interactive?: boolean
  }>(),
  { elevated: false, padded: true, interactive: false },
)
</script>

<template>
  <section
    class="hf-card"
    :class="{
      'hf-card--elevated': elevated,
      'hf-card--flush': !padded,
      'hf-card--interactive': interactive,
    }"
  >
    <header v-if="$slots.header" class="hf-card__header">
      <slot name="header" />
    </header>
    <div class="hf-card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="hf-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.hf-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow);
  overflow: hidden;
  /* 具名过渡 + 宪法调速：抬升/边框/阴影同步，避免属性各自为政的撕裂感 */
  transition:
    transform calc(0.2s / var(--hf-animate-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1),
    border-color calc(0.2s / var(--hf-animate-speed, 1)) ease,
    box-shadow calc(0.2s / var(--hf-animate-speed, 1)) ease,
    background-color calc(0.2s / var(--hf-animate-speed, 1)) ease;
}
.hf-card--elevated {
  background: var(--bg-elevated);
}
.hf-card--flush .hf-card__body {
  padding: 0;
}

/* 交互态：仅给「确实可交互」的卡片加抬升，避免静态卡片无端浮动误导可点性。
   用 transform（合成层）而非改 margin/height，避免触发重排。 */
.hf-card--interactive {
  cursor: default;
}
.hf-card--interactive:focus-within {
  border-color: var(--accent-dim);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.18);
}

/* 悬停收进 (hover:hover)，触屏不粘滞 */
@media (hover: hover) {
  .hf-card--interactive:hover {
    transform: translateY(-2px);
    border-color: var(--accent-dim);
    background: var(--bg-card-hover);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.34);
  }
}

/* 内边距回归 8px 间距基准（原 20px 为离网值，与 --spacing-md/lg 不成体系） */
.hf-card__header {
  padding: var(--spacing-md) var(--spacing-lg) 0;
  font-family: var(--font-heading-zh);
  font-weight: 600;
  color: var(--text-primary);
}
.hf-card__body {
  padding: var(--spacing-lg);
}
.hf-card__footer {
  padding: 0 var(--spacing-lg) var(--spacing-md);
  color: var(--text-dim);
  font-size: 13px;
}

/* 窄屏收一档内边距，给内容让出横向空间 */
@media (max-width: 640px) {
  .hf-card__header {
    padding: var(--spacing-sm) var(--spacing-md) 0;
  }
  .hf-card__body {
    padding: var(--spacing-md);
  }
  .hf-card__footer {
    padding: 0 var(--spacing-md) var(--spacing-sm);
  }
}
</style>
