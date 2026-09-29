<template>
  <div class="widget-box">
    <header class="wb-head">
      <span class="wb-title">🧩 桌面小组件</span>
      <span class="wb-sub">轻量信息盒子 · 拖动标题可移动 · 本地记忆</span>
      <div class="wb-head-actions">
        <button v-if="isTauri" class="wb-btn" :class="{ 'wb-btn-active': pinned }"
          :title="pinned ? '取消固定系统桌面小组件' : '把小组件固定到系统桌面（置顶浮窗）'"
          @click="togglePin">{{ pinned ? '📌 已固定' : '📌 固定到桌面' }}</button>
        <button class="wb-btn" @click="resetLayout" title="重置默认布局">重置</button>
      </div>
    </header>

    <!-- 添加栏 -->
    <div class="wb-add">
      <span class="wb-add-label">添加小组件</span>
      <button v-for="w in widgetTypes" :key="w"
        class="wb-add-chip" :title="`添加${WIDGET_META[w].label}`"
        @click="manager.addWidget(w, manager.suggestLayout())">
        <span class="wb-add-chip-icon">{{ WIDGET_META[w].icon }}</span>
        {{ WIDGET_META[w].label }}
      </button>
    </div>

    <!-- 画布 -->
    <div ref="canvasRef" class="wb-canvas" :class="{ 'wb-canvas-empty': !enabledWidgets.length }" @click.self="deselectAll">
      <p v-if="!enabledWidgets.length" class="wb-empty">桌面还没有小组件，从上方添加一个吧。</p>

      <article v-for="w in enabledWidgets" :key="w.id"
        class="wb-item"
        :class="['wb-size-' + w.size, { 'wb-selected': selectedId === w.id }]"
        :style="{ left: w.x + '%', top: w.y + '%' }"
        @pointerdown.stop="dragStart($event, w)"
        @pointerup="maybeSelect(w.id)">
        <header class="wb-item-head">
          <span class="wb-item-icon">{{ WIDGET_META[w.type].icon }}</span>
          <span class="wb-item-title">{{ WIDGET_META[w.type].label }}</span>
          <span class="wb-item-drag">⠿</span>
        </header>

        <!-- 卡片内容：与系统桌面小窗 / Android 小组件同源（WidgetCard） -->
        <div class="wb-item-body">
          <WidgetCard :instance="w" />
        </div>

        <footer class="wb-item-foot" @click.stop>
          <div class="wb-size-pick">
            <button v-for="s in SIZES" :key="s.value"
              :class="['wb-size-btn', { active: w.size === s.value }]"
              @click="setSize(w, s.value)">{{ s.label }}</button>
          </div>
          <div class="wb-item-actions">
            <button class="wb-icon-btn" :disabled="!selectedId" title="上移到画布更上方"
              @click="bringTop(w)">⬆︎</button>
            <button class="wb-icon-btn" :title="w.enabled ? '隐藏' : '显示'"
              @click="manager.setWidgetEnabled(w.id, !w.enabled)">{{ w.enabled ? '👁' : '🚫' }}</button>
            <button class="wb-icon-btn wb-icon-danger" title="移除" @click="manager.removeWidget(w.id)">✕</button>
          </div>
        </footer>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useWidgetManager, WIDGET_META } from '../modules/touchpoints'
import type { WidgetType, WidgetSize, WidgetInstance } from '../modules/touchpoints'
import WidgetCard from './WidgetCard.vue'
import { useDesktopWidget } from '../modules/desktop-widget'
import { startWidgetSnapshotSync } from '../modules/desktop-widget/sync'

const manager = useWidgetManager()

// ---- 系统桌面小组件（Tauri 置顶透明浮窗） ----
const { pinned, togglePinned } = useDesktopWidget()
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
function togglePin() { togglePinned() }

const widgetTypes: WidgetType[] = ['pomodoro', 'daily-anchor', 'emotion-check', 'quick-note', 'weather', 'quote', 'quadrant']
const SIZES: { value: WidgetSize; label: string }[] = [
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
]

const enabledWidgets = computed(() => manager.enabledWidgets.value)
const selectedId = ref<string | null>(null)

function deselectAll() { selectedId.value = null }
function maybeSelect(id: string) { selectedId.value = id }
function bringTop(w: WidgetInstance) {
  manager.updatePosition(w.id, w.x, Math.max(0, w.y - 15))
  selectedId.value = w.id
}
function setSize(w: WidgetInstance, size: WidgetSize) { manager.updateSize(w.id, size) }
function resetLayout() { manager.resetToDefault() }

// ---- 拖拽移动 ----
const canvasRef = ref<HTMLElement | null>(null)
let dragging: { id: string; dx: number; dy: number } | null = null

function dragStart(e: PointerEvent, w: WidgetInstance) {
  dragging = { id: w.id, dx: e.clientX, dy: e.clientY }
  selectedId.value = w.id
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
}
function onDragMove(e: PointerEvent) {
  if (!dragging || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const widget = manager.getWidget(dragging.id)
  if (!widget) return
  const nx = ((e.clientX - rect.left + (e.clientX - dragging.dx)) / rect.width) * 100
  const ny = ((e.clientY - rect.top + (e.clientY - dragging.dy)) / rect.height) * 100
  manager.updatePosition(dragging.id, clamp(nx, -5, 95), clamp(ny, -5, 90))
}
function onDragEnd() {
  dragging = null
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
}
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }
onUnmounted(() => {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
})

// ---- 系统小组件快照同步（共享出口：首页画布 / 系统小窗 / Android 七卡同源） ----
startWidgetSnapshotSync()
</script>

<style scoped>
.widget-box { display: flex; flex-direction: column; gap: 12px; }
.wb-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.wb-title { font-size: 17px; font-weight: 700; color: #e8ecf6; letter-spacing: 1px; }
.wb-sub { font-size: 12px; color: #8a94ad; }
.wb-head-actions { margin-left: auto; }
.wb-btn { padding: 5px 12px; border-radius: 999px; border: 1px solid rgba(140, 160, 200, 0.2); background: transparent; color: #b6c0d8; font-size: 12px; cursor: pointer; }
.wb-btn:hover { background: rgba(120, 140, 200, 0.12); }
.wb-btn-active { background: rgba(90, 120, 220, 0.22); border-color: #6b86d8; color: #fff; }

.wb-add { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 12px; background: rgba(20, 26, 40, 0.5); border: 1px dashed rgba(140, 160, 200, 0.2); border-radius: 12px; }
.wb-add-label { font-size: 12px; color: #7c86a0; margin-right: 4px; }
.wb-add-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 999px; border: 1px solid rgba(140, 160, 200, 0.2); background: rgba(120, 140, 200, 0.08); color: #c6d0e8; font-size: 12px; cursor: pointer; transition: all .15s; }
.wb-add-chip:hover { background: rgba(90, 120, 220, 0.22); border-color: #6b86d8; color: #fff; }
.wb-add-chip-icon { font-size: 13px; }

.wb-canvas { position: relative; min-height: 420px; background: rgba(16, 22, 36, 0.35); border: 1px solid rgba(140, 160, 200, 0.12); border-radius: 16px; padding: 0; }
.wb-canvas-empty { display: flex; align-items: center; justify-content: center; }
.wb-empty { color: #7c86a0; font-size: 13px; text-align: center; }

.wb-item { position: absolute; width: 240px; min-height: 120px; background: rgba(30, 38, 58, 0.92); border: 1px solid rgba(150, 170, 210, 0.16); border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32); cursor: grab; transition: box-shadow .15s, border-color .15s; display: flex; flex-direction: column; touch-action: none; }
.wb-item:hover { border-color: rgba(130, 160, 235, 0.45); }
.wb-item.wb-selected { border-color: #6b86d8; box-shadow: 0 0 0 2px rgba(107, 134, 216, 0.35), 0 10px 28px rgba(0, 0, 0, 0.4); }
.wb-size-large { width: min(300px, 78vw); min-height: 200px; }
.wb-size-medium { width: 260px; min-height: 150px; }

.wb-item-head { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-bottom: 1px solid rgba(150, 170, 210, 0.1); user-select: none; }
.wb-item-icon { font-size: 15px; }
.wb-item-title { font-size: 13px; font-weight: 600; color: #dbe3f7; }
.wb-item-drag { margin-left: auto; color: #5f6b85; font-size: 14px; }

.wb-item-body { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
.wb-item-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 10px; border-top: 1px solid rgba(150, 170, 210, 0.1); }
.wb-size-pick { display: flex; gap: 4px; }
.wb-size-btn { padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(140, 160, 200, 0.18); background: transparent; color: #8a94ad; font-size: 11px; cursor: pointer; }
.wb-size-btn.active { background: #5b7bd8; border-color: #5b7bd8; color: #fff; }
.wb-item-actions { display: flex; gap: 6px; }
.wb-icon-btn { width: 24px; height: 24px; border-radius: 6px; border: 1px solid rgba(140, 160, 200, 0.18); background: transparent; color: #9fb0d4; font-size: 12px; cursor: pointer; line-height: 1; }
.wb-icon-btn:hover { background: rgba(120, 140, 200, 0.14); }
.wb-icon-danger:hover { background: rgba(220, 90, 90, 0.2); color: #ff9f9f; border-color: rgba(220, 90, 90, 0.4); }

/* 卡片内容样式统一由 WidgetCard 承担（首页画布 / 系统小窗同源），此处只留画布外壳样式 */
.wb-note-empty { margin: 0; font-size: 12px; color: #7c86a0; }
</style>