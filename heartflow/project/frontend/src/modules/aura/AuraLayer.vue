<template>
  <div class="aura-layer" :class="{ 'aura-layer--active': enabled }">
    <!-- 氛围视觉：仅启用时渲染（pointer-events 由 .aura-layer 透传为 none）。
         主题选择已迁至「设置页 / 幕僚阁」的 AuraThemePicker，不再有右下角控制浮层。 -->
    <Transition name="aura-fade">
      <component
        :is="themeComponent"
        v-if="enabled"
        :accent="resolved.accent"
        :density="resolved.density"
        :speed="resolved.speed"
        :show-clock="resolved.showClock"
        :show-quote="resolved.showQuote"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAura } from './auraLayer'
import { THEME_COMPONENTS } from './themes'

const { enabled, themeId, resolvedTheme, detectAuraWindow, syncExitToAura } = useAura()

const resolved = resolvedTheme
const themeComponent = computed(() => THEME_COMPONENTS[themeId.value])

onMounted(() => {
  detectAuraWindow()
  syncExitToAura()
})
</script>

<style scoped>
.aura-layer {
  position: fixed;
  inset: 0;
  z-index: var(--z-aura, 1500);
  pointer-events: none;       /* 视觉层穿透：不挡任何操作 */
  overflow: hidden;
}

.aura-fade-enter-active,
.aura-fade-leave-active {
  transition: opacity 0.6s ease;
}
.aura-fade-enter-from,
.aura-fade-leave-to {
  opacity: 0;
}
</style>
