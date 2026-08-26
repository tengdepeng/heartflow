<template>
  <div ref="rootRef" class="map-2d-surface" aria-label="2D 宅院俯瞰">
    <canvas ref="canvasRef" class="map-2d-canvas"></canvas>
    <div class="surface-hint">2D 宅院俯瞰 · 点院落进房间 · 长按空白唤出切换</div>
  </div>
</template>

<script setup lang="ts">
// ============================================================
// 中层交互面 · 2D 宅院俯瞰平面地图
// 复用 courtyard(2D) 世界壳，全屏交互表面（独立于底层氛围壳）。
// 点击进入 / 悬停高亮 走 SurfaceStage 提供的共享 .shell-hit-layer（与 3D 正厅同一交互面，
// 不再自建命中层——自建层曾被 SurfaceStage 的空命中层(z:5)压住而收不到点击）。
// ============================================================

import { onMounted, onUnmounted, ref } from 'vue'
import { createShell, buildShellRoomAnchors } from '../../modules/world-shell'
import { useConfigStore } from '../../stores/config'
import { useFloatingLayer } from '../../composables/useFloatingLayer'

const configStore = useConfigStore()
const floating = useFloatingLayer()
const rootRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let raf = 0
let shell: ReturnType<typeof createShell> | null = null
let sharedHit: HTMLElement | null = null
let resizeObs: ResizeObserver | null = null

function currentConfig() {
  return { ...configStore.config.worldShell.shellConfig }
}

function logicalSize() {
  const w = window.innerWidth
  const h = window.innerHeight
  return { w, h }
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const { w, h } = logicalSize()
  canvas.width = w * dpr
  canvas.height = h * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)

  shell = createShell('courtyard')
  if (!shell) return
  shell.mount({
    ctx,
    canvas,
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

  // 共享命中层：悬停高亮 + 点击激活浮层（SurfaceStage 提供，z:5 覆盖全屏）
  sharedHit = (rootRef.value?.closest('.surface-stage') as HTMLElement | null)
    ?.querySelector('.shell-hit-layer') as HTMLElement | null
  if (sharedHit) {
    sharedHit.addEventListener('pointermove', onPointerMove)
    sharedHit.addEventListener('click', onClick)
  }

  resizeObs = new ResizeObserver(() => {
    const s = logicalSize()
    canvas.width = s.w * dpr
    canvas.height = s.h * dpr
    const c = canvas.getContext('2d')
    if (c) c.scale(dpr, dpr)
    shell?.resize(s.w, s.h)
  })
  resizeObs.observe(document.documentElement)
})

function canvasCoords(e: PointerEvent | MouseEvent) {
  return { x: e.clientX, y: e.clientY }
}

function onPointerMove(e: PointerEvent) {
  if (!shell?.hitTest || !shell?.setHover) return
  const { x, y } = canvasCoords(e)
  const hit = shell.hitTest(x, y)
  if (hit) shell.setHover(hit.slot, hit.roomId ?? null)
  else shell.setHover(null, null)
}

function onClick(e: MouseEvent) {
  if (!shell?.hitTest) return
  const { x, y } = canvasCoords(e)
  const hit = shell.hitTest(x, y)
  // 上层浮层：点物件 / 点建筑任意处激活预览（可关闭）；「进入房间」由浮层宿主跳转
  if (hit?.roomPath) {
    floating.openObjectPreview({ id: hit.roomId ?? hit.roomPath, name: hit.roomName ?? '房间', path: hit.roomPath })
  }
}

onUnmounted(() => {
  cancelAnimationFrame(raf)
  if (sharedHit) {
    sharedHit.removeEventListener('pointermove', onPointerMove)
    sharedHit.removeEventListener('click', onClick)
  }
  resizeObs?.disconnect()
  shell?.destroy()
  shell = null
})
</script>

<style scoped>
.map-2d-surface {
  position: fixed;
  inset: 0;
  z-index: 2;
  width: 100vw;
  height: 100vh;
}
.map-2d-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  display: block;
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
