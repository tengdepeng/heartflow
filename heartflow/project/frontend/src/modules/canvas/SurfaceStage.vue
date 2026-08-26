<template>
  <!-- 中层交互面：仅在非「屏风功能面」态整屏接管屏幕；屏风态交由路由 Home（底层氛围壳透出） -->
  <transition name="surface-fade" mode="out-in">
    <div v-if="surfaceState !== 'screen'" class="surface-stage" :class="`state-${surfaceState}`">
      <!-- 共享空间递进命中层：3D 壳 OrbitControls 绑此收拖拽/滚轮；2D 壳点触进房间 -->
      <div class="shell-hit-layer"></div>
      <Hall3DSurface v-if="surfaceState === 'hall-3d'" />
      <Map2DSurface v-else-if="surfaceState === 'map-2d'" />
    </div>
  </transition>
</template>

<script setup lang="ts">
// ============================================================
// 中层交互面容器（三层架构之中层）
// 三态整屏互斥：屏风功能面(screen) / 3D 正厅(hall-3d) / 2D 宅院俯瞰(map-2d)。
// screen 态不渲染此处（交给路由 Home，底层氛围壳透出）；其余态整屏覆盖、互不干扰。
// 自供 .shell-hit-layer 作为 3D/2D 表面的统一交互面（底层已按 screen 态隐藏其命中层）。
// ============================================================

import { computed } from 'vue'
import { useConfigStore } from '../../stores/config'
import Hall3DSurface from './Hall3DSurface.vue'
import Map2DSurface from './Map2DSurface.vue'

const configStore = useConfigStore()
const surfaceState = computed(() => configStore.config.worldShell.surfaceState ?? 'screen')
</script>

<style scoped>
.surface-stage {
  position: fixed;
  inset: 0;
  z-index: 5; /* 与命中层同层基座；表面组件/画布在其内各自抬升，顶层浮层(z:90)与导航(z:40)仍在其上 */
  width: 100vw;
  height: 100vh;
}
/* 共享命中层：透明、全屏、可接收指针（3D 拖拽/滚轮 + 2D 点触均经此） */
.shell-hit-layer {
  position: fixed;
  inset: 0;
  z-index: 5;
  pointer-events: auto;
  background: transparent;
}
.surface-fade-enter-active,
.surface-fade-leave-active {
  transition: opacity 0.32s ease;
}
.surface-fade-enter-from,
.surface-fade-leave-to {
  opacity: 0;
}
</style>
