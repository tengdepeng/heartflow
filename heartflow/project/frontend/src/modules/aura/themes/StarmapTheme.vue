<template>
  <div class="starmap" aria-hidden="true">
    <!-- 星海：密度决定星数，约 70% 为暖白、30% 染主色 -->
    <span
      v-for="s in stars"
      :key="s.id"
      class="star"
      :class="{ 'star--tinted': s.tinted }"
      :style="{
        left: s.x + '%',
        top: s.y + '%',
        width: s.r + 'px',
        height: s.r + 'px',
        animationDelay: s.delay + 's',
        animationDuration: s.dur + 's',
        background: s.tinted ? accent : undefined,
        boxShadow: s.tinted ? `0 0 ${s.r * 2}px ${accent}` : undefined,
      }"
    />
    <!-- 银河微带 -->
    <div class="galaxy-band" :style="{ background: `radial-gradient(ellipse 60% 30% at 50% 50%, ${accent}22, transparent 70%)` }"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  accent?: string
  density?: number
  speed?: number
}>(), {
  accent: '#d4a574',
  density: 60,
  speed: 1,
})

const stars = computed(() => {
  const n = Math.max(20, Math.round((props.density ?? 60) * 1.6))
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    r: Math.random() * 1.6 + 0.4,
    delay: Math.random() * 4,
    dur: (Math.random() * 3 + 2) / (props.speed ?? 1),
    tinted: Math.random() > 0.7,
  }))
})
</script>

<style scoped>
.starmap {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.star {
  position: absolute;
  border-radius: 50%;
  background: rgba(232, 224, 216, 0.75);
  animation-name: twinkle;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
.star--tinted {
  background: v-bind(accent);
}
.galaxy-band {
  position: absolute;
  inset: 10% 0;
  filter: blur(8px);
  opacity: 0.7;
}
@keyframes twinkle {
  0%, 100% { opacity: 0.25; transform: scale(0.85); }
  50% { opacity: 0.95; transform: scale(1.15); }
}
</style>
