<script setup lang="ts">
// ============================================================
// 三层空间 · 切换面板（键盘/长按空白触发）
// 重建件：原文件被循环删除进程清除且从未进 git，按 App.vue 接口契约
// 忠实重建。开合状态来自 useLayerSwitch()（与 useLayerSwitchTrigger 共享单例）；
// 切换目标 = config.worldShell.activeShell(底层氛围壳) / surfaceState(中层交互面)。
// 设计语言对齐《空间容器布局契约》：消费 --z-modal / --accent，禁裸 z-index。
// 根元素 class="switch-panel" 已被 useLayerSwitchTrigger 的 INTERACTIVE_SELECTOR 排除，
// 长按空白不会在面板内误触发自身。
// ============================================================
import { computed } from 'vue'
import { useLayerSwitch } from '../composables/useLayerSwitch'
import { useConfigStore } from '../stores/config'
import type { WorldShellType, SurfaceState } from '../types'

const { isOpen, close } = useLayerSwitch()
const configStore = useConfigStore()

const shells: { value: WorldShellType; label: string }[] = [
  { value: 'solid', label: '纯色' },
  { value: 'stars', label: '星辰 2D' },
  { value: 'stars-3d', label: '星辰 3D' },
  { value: 'courtyard', label: '宅院 2D' },
  { value: 'courtyard-3d', label: '宅院 3D' },
  { value: 'video', label: '视频' },
  { value: 'custom', label: '自定义' },
]

const surfaces: { value: SurfaceState; label: string }[] = [
  { value: 'screen', label: '屏风' },
  { value: 'hall-3d', label: '正堂 3D' },
  { value: 'map-2d', label: '地图 2D' },
]

const activeShell = computed<WorldShellType>(
  () => configStore.config.worldShell.activeShell,
)
const activeSurface = computed<SurfaceState>(
  () => configStore.config.worldShell.surfaceState,
)

function pickShell(v: WorldShellType) {
  configStore.setActiveShell(v)
}
function pickSurface(v: SurfaceState) {
  configStore.setSurfaceState(v)
}
</script>

<template>
  <transition name="sp-fade">
    <div v-if="isOpen" class="sp-backdrop" @click.self="close">
      <div class="switch-panel" role="dialog" aria-label="三层空间切换面板">
        <header class="sp-head">
          <span class="sp-title">空间切换</span>
          <button class="sp-close" type="button" aria-label="关闭" @click="close">✕</button>
        </header>

        <section class="sp-group">
          <h3 class="sp-group-title">底层氛围壳</h3>
          <div class="sp-grid">
            <button
              v-for="s in shells"
              :key="s.value"
              type="button"
              class="sp-chip"
              :class="{ active: activeShell === s.value }"
              @click="pickShell(s.value)"
            >
              {{ s.label }}
            </button>
          </div>
        </section>

        <section class="sp-group">
          <h3 class="sp-group-title">中层交互面</h3>
          <div class="sp-grid">
            <button
              v-for="s in surfaces"
              :key="s.value"
              type="button"
              class="sp-chip"
              :class="{ active: activeSurface === s.value }"
              @click="pickSurface(s.value)"
            >
              {{ s.label }}
            </button>
          </div>
        </section>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.sp-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.switch-panel {
  width: min(440px, calc(100vw - 32px));
  padding: var(--glass-pad-sm) 20px calc(var(--glass-pad-sm) + 8px);
  background:
    var(--glass-clear-sheen),
    rgba(26, 24, 30, var(--glass-clear-a-surface));
  backdrop-filter: blur(var(--glass-blur)) saturate(1.5) brightness(1.06);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.5) brightness(1.06);
  border: 1px solid var(--glass-clear-rim);
  border-radius: var(--glass-radius);
  box-shadow: var(--glass-shadow);
  color: var(--text-primary);
}

.sp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.sp-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--accent, #d4af74);
}

.sp-close {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;
}
.sp-close:hover {
  background: rgba(var(--accent-rgb), 0.18);
  color: var(--accent, #d4af74);
}

.sp-group + .sp-group {
  margin-top: 16px;
}

.sp-group-title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: #9b9079;
  text-transform: none;
}

.sp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 8px;
}

.sp-chip {
  padding: 10px 8px;
  border: 1px solid rgba(212, 175, 116, 0.22);
  border-radius: 12px;
  background: rgba(212, 175, 116, 0.06);
  color: #d8cdb6;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease,
    transform 0.12s ease;
}
.sp-chip:hover {
  background: rgba(212, 175, 116, 0.16);
  transform: translateY(-1px);
}
.sp-chip.active {
  background: rgba(212, 175, 116, 0.28);
  border-color: var(--accent, #d4af74);
  color: #fff4e0;
  box-shadow: 0 0 0 1px rgba(212, 175, 116, 0.4) inset;
}

.sp-fade-enter-active,
.sp-fade-leave-active {
  transition: opacity 0.18s ease;
}
.sp-fade-enter-from,
.sp-fade-leave-to {
  opacity: 0;
}
</style>
