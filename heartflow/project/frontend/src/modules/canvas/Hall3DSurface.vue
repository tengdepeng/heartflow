<template>
  <div class="hall-3d-surface" aria-label="3D 正厅 · 行走触碰">
    <!-- 提示：进入交互，长按空白/快捷键可再唤出切换面板 -->
    <div class="surface-hint">3D 正厅 · 拖拽环视 / 滚轮远近 · 长按空白唤出切换</div>
  </div>
</template>

<script setup lang="ts">
// ============================================================
// 中层交互面 · 3D 正厅（行走触碰物件）
// 复用 courtyard-3d 世界壳，作为整屏交互表面（独立于底层氛围壳）。
// 第二/三阶段再落地：第一人称行走碰撞 + 物件点触开浮层。
// 3D 壳自建 body-fixed canvas，OrbitControls 绑到 SurfaceStage 提供的 .shell-hit-layer。
// ============================================================

import { onMounted, onUnmounted } from 'vue'
import { createShell, buildShellRoomAnchors } from '../../modules/world-shell'
import { useConfigStore } from '../../stores/config'

const configStore = useConfigStore()
let raf = 0
let shell: ReturnType<typeof createShell> | null = null

function currentConfig() {
  return { ...configStore.config.worldShell.shellConfig }
}

onMounted(() => {
  const w = window.innerWidth
  const h = window.innerHeight
  // courtyard-3d 不使用 ctx（自带 WebGL canvas），但 WorldShellRenderer 接口要求 ctx；用占位 2D canvas 满足类型
  const dummy = document.createElement('canvas')
  const ctx = dummy.getContext('2d')
  shell = createShell('courtyard-3d')
  if (!shell || !ctx) return
  shell.mount({
    ctx,
    canvas: undefined,
    width: w,
    height: h,
    intensity: 1,
    sanctuary: false,
    config: currentConfig(),
    rooms: buildShellRoomAnchors(),
  })

  const loop = (ts: number) => {
    shell?.render(ts)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  window.addEventListener('resize', onResize)
})

function onResize() {
  shell?.resize(window.innerWidth, window.innerHeight)
}

onUnmounted(() => {
  cancelAnimationFrame(raf)
  shell?.destroy()
  shell = null
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.hall-3d-surface {
  position: fixed;
  inset: 0;
  z-index: 2; /* 高于底层氛围壳(z:0/底层容器)，低于浮层/导航；3D 壳自身 canvas z:3 */
  width: 100vw;
  height: 100vh;
  pointer-events: none; /* 交互交给 .shell-hit-layer（SurfaceStage 提供） */
}
.surface-hint {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  font-size: 12px;
  letter-spacing: 0.5px;
  color: color-mix(in srgb, var(--accent, #d4a574) 80%, transparent);
  background: rgba(8, 11, 20, 0.5);
  padding: 6px 14px;
  border-radius: 999px;
  backdrop-filter: blur(4px);
  pointer-events: none;
  opacity: 0.7;
}
</style>
