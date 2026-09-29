<script setup lang="ts">
// ============================================================
// Launcher · 3D 空间视图
// 渲染器由外部 requestAnimationFrame 驱动（对齐 Hall3DSurface 范式）。
// WebGL 不可用时降级为平面网格，保证功能不丢（启动照旧可用）。
// ============================================================
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useLauncher } from './useLauncher'
import { createLauncherSpace, isWebGLAvailable, type LauncherSpaceHandle } from './space3d'
import type { ExternalAppEntry } from './types'
import { isImageIcon } from '../../utils/icon'

const props = defineProps<{ entries: ExternalAppEntry[] }>()
const emit = defineEmits<{ launch: [entry: ExternalAppEntry] }>()

const { space } = useLauncher()

const hostRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const degraded = ref(false)
const hoverId = ref<string | null>(null)

const hovered = computed(() => props.entries.find((e) => e.id === hoverId.value) ?? null)

let handle: LauncherSpaceHandle | null = null
let raf = 0
let ro: ResizeObserver | null = null

function resize(): void {
  const el = hostRef.value
  if (!el || !handle) return
  handle.resize(el.clientWidth, el.clientHeight)
}

function loop(ts: number): void {
  handle?.render(ts)
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  if (!canvasRef.value || !isWebGLAvailable()) {
    degraded.value = true
    return
  }
  handle = createLauncherSpace(canvasRef.value, {
    onLaunch: (entry) => emit('launch', entry),
    onHoverChange: (id) => (hoverId.value = id),
  })
  if (!handle) {
    degraded.value = true
    return
  }
  handle.setEntries(props.entries)
  handle.setConfig(space.config.value)
  resize()
  raf = requestAnimationFrame(loop)
  window.addEventListener('resize', resize)
  if (hostRef.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(resize)
    ro.observe(hostRef.value)
  }
})

watch(
  () => props.entries,
  (v) => handle?.setEntries(v),
  { deep: true },
)
watch(
  () => space.config.value,
  (v) => handle?.setConfig({ ...v }),
  { deep: true },
)

onUnmounted(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  ro = null
  window.removeEventListener('resize', resize)
  handle?.dispose()
  handle = null
})
</script>

<template>
  <div ref="hostRef" class="launcher-space">
    <canvas v-show="!degraded" ref="canvasRef" class="space-canvas"></canvas>

    <div v-if="degraded" class="space-fallback">
      <p class="space-fallback-note">当前环境不支持 WebGL，已降级为平面网格（启动功能不受影响）</p>
      <div class="space-fallback-grid">
        <button
          v-for="e in entries"
          :key="e.id"
          class="fb-item"
          :title="e.launch"
          @click="emit('launch', e)"
        >
          <img
            v-if="isImageIcon(e.iconImage)"
            :src="e.iconImage ?? ''"
            :alt="e.name"
            class="fb-icon fb-icon--img"
          />
          <span v-else class="fb-icon">{{ e.icon }}</span>
          <span class="fb-name">{{ e.name }}</span>
        </button>
      </div>
      <p v-if="entries.length === 0" class="space-fallback-empty">还没有应用，先添加几个再看空间</p>
    </div>

    <p v-if="!degraded" class="space-hint">拖拽环视 · 点击图标启动</p>

    <div v-if="hovered" class="space-tip">
      <span class="space-tip-name">{{ hovered.name }}</span>
      <span class="space-tip-meta">{{ hovered.category }} · 启动 {{ hovered.launchCount }} 次</span>
    </div>
  </div>
</template>

<style scoped>
.launcher-space {
  position: relative;
  width: 100%;
  height: clamp(420px, 62vh, 760px);
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(212, 165, 116, 0.16);
  background:
    radial-gradient(circle at 50% 42%, rgba(212, 165, 116, 0.07), transparent 62%),
    rgba(10, 8, 6, 0.35);
}

.space-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}
.space-canvas:active {
  cursor: grabbing;
}

.space-hint {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.5px;
  color: rgba(233, 224, 208, 0.5);
  background: rgba(8, 11, 20, 0.45);
  padding: 5px 14px;
  border-radius: 999px;
  pointer-events: none;
}

.space-tip {
  position: absolute;
  left: 16px;
  top: 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 14px;
  border-radius: 12px;
  background: rgba(10, 8, 6, 0.55);
  border: 1px solid rgba(212, 165, 116, 0.22);
  pointer-events: none;
}
.space-tip-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
}
.space-tip-meta {
  font-size: 11px;
  opacity: 0.72;
  color: var(--text-primary, #e8e0d8);
}

.space-fallback {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}
.space-fallback-note {
  margin: 0 0 12px;
  font-size: 12px;
  opacity: 0.5;
  color: var(--text-primary, #e8e0d8);
}
.space-fallback-empty {
  font-size: 13px;
  opacity: 0.5;
  text-align: center;
  margin-top: 24px;
  color: var(--text-primary, #e8e0d8);
}
.space-fallback-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 12px;
}
.fb-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  cursor: pointer;
  color: var(--text-primary, #e8e0d8);
  transition: border-color 0.2s ease, background 0.2s ease;
}
.fb-item:hover {
  border-color: rgba(212, 165, 116, 0.35);
  background: rgba(212, 165, 116, 0.07);
}
.fb-icon {
  font-size: 26px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}
.fb-icon--img {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 12px;
}
.fb-name {
  font-size: 11px;
  opacity: 0.7;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
