<script setup lang="ts">
// ============================================================
// 殿堂触角 · 锁屏光痕（应用内渲染层）
// 消费 useGlowEngine 的配置/状态，在应用内渲染氛围光痕，
// 替代 Rust 原生第二窗口（移动端 Tauri 不支持多窗口）。
// 纯 Vue 实现，天然移动端安全：全屏 fixed、响应式 vmax 单位、
// pointer-events:none 不拦截交互、尊重安全区（inset:0 全屏铺展）。
// ============================================================
import { computed } from 'vue'
import { useGlowEngine } from '../modules/touchpoints'

const { config, gradientCSS, animationDuration, currentPalette, shouldActivate } = useGlowEngine()

/** 是否应激活光痕（enabled + 调度窗口内） */
const active = computed(() => shouldActivate())

/** 氛围层样式：渐变背景 + 呼吸动画时长 + 依据强度的基础不透明度 */
const layerStyle = computed<Record<string, string>>(() => ({
  background: gradientCSS.value,
  '--glow-duration': `${animationDuration.value}ms`,
  opacity: String(0.3 + config.value.intensity * 0.45),
}))

/** 主光晕取色（调色板首色，缺省回退为冷蓝） */
const orbColor = computed(() => currentPalette.value[0] ?? 'rgba(120,170,255,0.85)')
</script>

<template>
  <Transition name="glow-fade">
    <div
      v-if="active"
      class="glow-overlay"
      :style="layerStyle"
      aria-hidden="true"
    >
      <div
        class="glow-orb"
        :style="{ background: `radial-gradient(circle, ${orbColor} 0%, transparent 70%)` }"
      />
      <div
        class="glow-orb glow-orb--alt"
        :style="{ background: `radial-gradient(circle, ${currentPalette[1] ?? orbColor} 0%, transparent 70%)` }"
      />
    </div>
  </Transition>
</template>

<style scoped>
/* 置于 ambient-layer 同层（z:1），DOM 顺序早于 main-content → 渲染于内容之下，
   房间根背景透明，光痕作为氛围底光透出，不侵蚀文字可读性。 */
.glow-overlay {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  mix-blend-mode: screen;
  filter: blur(48px) saturate(125%);
  animation: glow-breathe var(--glow-duration, 8000ms) ease-in-out infinite alternate;
  will-change: opacity, transform;
}

.glow-orb {
  position: absolute;
  width: 70vmax;
  height: 70vmax;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  filter: blur(36px);
  opacity: 0.55;
  animation: glow-drift calc(var(--glow-duration, 8000ms) * 1.6) ease-in-out infinite alternate;
}

.glow-orb--alt {
  left: 65%;
  top: 60%;
  width: 55vmax;
  height: 55vmax;
  opacity: 0.4;
  animation-duration: calc(var(--glow-duration, 8000ms) * 2.1);
}

@keyframes glow-breathe {
  from { opacity: 0.45; transform: scale(1); }
  to   { opacity: 0.9; transform: scale(1.06); }
}

@keyframes glow-drift {
  from { transform: translate(-55%, -55%) rotate(0deg); }
  to   { transform: translate(-45%, -45%) rotate(20deg); }
}

.glow-fade-enter-active,
.glow-fade-leave-active {
  transition: opacity 1.2s ease;
}

.glow-fade-enter-from,
.glow-fade-leave-to {
  opacity: 0;
}

/* 移动端：氛围层全屏铺展以贴合「光痕」连续感；安全区由房间内容自身避让 */
@media (max-width: 639px) {
  .glow-overlay {
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  }
}
</style>
