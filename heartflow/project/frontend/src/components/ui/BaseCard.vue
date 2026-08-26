<script setup lang="ts">
withDefaults(
  defineProps<{
    elevated?: boolean
    padded?: boolean
  }>(),
  { elevated: false, padded: true },
)
</script>

<template>
  <section
    class="hf-card"
    :class="{ 'hf-card--elevated': elevated, 'hf-card--flush': !padded }"
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
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.hf-card--elevated {
  background: var(--bg-elevated);
}
.hf-card--flush .hf-card__body {
  padding: 0;
}
.hf-card__header {
  padding: 16px 20px 0;
  font-family: var(--font-heading-zh);
  font-weight: 600;
  color: var(--text-primary);
}
.hf-card__body {
  padding: 20px;
}
.hf-card__footer {
  padding: 0 20px 16px;
  color: var(--text-dim);
  font-size: 13px;
}
</style>
