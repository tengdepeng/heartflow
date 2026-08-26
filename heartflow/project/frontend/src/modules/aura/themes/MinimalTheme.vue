<template>
  <div class="minimal" aria-hidden="true">
    <!-- 仅一缕微光：缓慢横向漂移的柔光丝带 -->
    <div class="minimal__wisp" :style="wispStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  accent?: string
  speed?: number
}>(), {
  accent: '#d4a574',
  speed: 1,
})

const wispStyle = computed(() => ({
  background: `linear-gradient(90deg, transparent 0%, ${props.accent}33 50%, transparent 100%)`,
  animationDuration: `${(22 / (props.speed ?? 1)).toFixed(2)}s`,
}))
</script>

<style scoped>
.minimal {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 60%, transparent 60%, rgba(0, 0, 0, 0.25) 100%);
}
.minimal__wisp {
  position: absolute;
  top: 46%;
  left: -20%;
  width: 60%;
  height: 1px;
  filter: blur(0.5px);
  box-shadow: 0 0 18px 2px v-bind(accent);
  animation: wisp-drift 22s ease-in-out infinite;
  will-change: transform, opacity;
}
@keyframes wisp-drift {
  0%, 100% { transform: translateX(0) scaleX(0.8); opacity: 0.25; }
  50% { transform: translateX(180%) scaleX(1.2); opacity: 0.7; }
}
</style>
