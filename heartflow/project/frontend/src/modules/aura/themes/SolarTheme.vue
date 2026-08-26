<template>
  <div class="solar" aria-hidden="true">
    <!-- 暖色天光：随密度增减晕染范围 -->
    <div class="solar__sky" :style="skyStyle"></div>
    <!-- 节气铭牌：极淡，不抢戏 -->
    <div class="solar__term">
      <span class="solar__term-label">今日</span>
      <span class="solar__term-name">{{ term }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { currentSolarTerm } from '../content'

const props = withDefaults(defineProps<{
  accent?: string
  density?: number
}>(), {
  accent: '#cf9640',
  density: 50,
})

const term = currentSolarTerm()
const skyStyle = computed(() => ({
  background: `radial-gradient(ellipse 70% 50% at 50% 38%, ${props.accent}${opacityHex(props.density ?? 50)}, transparent 70%)`,
}))
</script>

<script lang="ts">
// 密度 0–100 → 十六进制透明度（约 0x10–0x3c）
function opacityHex(density: number): string {
  const v = Math.max(16, Math.min(60, Math.round((density / 100) * 60) + 16))
  return v.toString(16).padStart(2, '0')
}
</script>

<style scoped>
.solar {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.solar__sky {
  position: absolute;
  inset: 0;
  filter: blur(10px);
}
.solar__term {
  position: absolute;
  top: 9vh;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(232, 224, 216, 0.6);
}
.solar__term-label {
  font-size: 11px;
  letter-spacing: 4px;
  color: rgba(232, 224, 216, 0.3);
}
.solar__term-name {
  font-size: clamp(22px, 5vmin, 40px);
  font-weight: 200;
  letter-spacing: 8px;
  text-shadow: 0 0 30px rgba(0, 0, 0, 0.4);
}
</style>
