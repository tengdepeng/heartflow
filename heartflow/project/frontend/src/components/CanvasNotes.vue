<template>
  <div class="canvas-notes" :class="{ 'canvas-notes--ambient': ambient }">
    <!-- 浮动笔记层 -->
    <div
      v-for="note in floatingNotes"
      :key="note.id"
      class="canvas-note"
      :class="{
        'canvas-note--minimized': note.displayMode === 'minimized',
        'canvas-note--pinned': note.pinned,
      }"
      :style="noteStyle(note)"
      @dblclick="openEditor(note)"
    >
      <!-- 头部 -->
      <div class="cn-header" @mousedown.prevent="startDrag($event, note)">
        <span class="cn-title">{{ note.title || '无标题' }}</span>
        <div class="cn-actions">
          <button
            class="cn-btn"
            :class="{ pinned: note.pinned }"
            :title="note.pinned ? '取消置顶' : '置顶'"
            @click.stop="togglePin(note.id)"
          >📌</button>
          <button
            class="cn-btn"
            :title="note.displayMode === 'minimized' ? '展开' : '最小化'"
            @click.stop="toggleMinimize(note)"
          >{{ note.displayMode === 'minimized' ? '🔽' : '🔼' }}</button>
          <button class="cn-btn cn-btn-close" title="关闭" @click.stop="closeNote(note.id)">✕</button>
        </div>
      </div>

      <!-- 内容（展开时） -->
      <div v-if="note.displayMode !== 'minimized'" class="cn-body" @click.stop="openEditor(note)">
        <div class="cn-text" v-html="rendered(note)" />
        <div class="cn-footer" v-if="note.tags.length">
          <span v-for="t in note.tags" :key="t" class="cn-tag">{{ t }}</span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="floatingNotes.length === 0" class="cn-empty">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.15">
        <rect x="4" y="6" width="24" height="22" rx="2" />
        <line x1="8" y1="12" x2="24" y2="12" />
        <line x1="8" y1="17" x2="20" y2="17" />
        <line x1="8" y1="22" x2="16" y2="22" />
      </svg>
      <p>暂无浮动画布笔记</p>
      <p class="cn-empty-hint">打开右下角笔记板，新建与管理所有笔记</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getNoteStore } from '../modules/note'
import type { StickyNote } from '../modules/note'
import { renderMarkdown } from '../utils/markdown'

const props = withDefaults(defineProps<{
  ambient?: boolean
  containerWidth?: number
  containerHeight?: number
  /** 首屏（Home）边缘安全模式：显示坐标约束到左右边缘安全带，避免遮挡中央玉盘；
   *  不改 stored stickyX/stickyY，且禁用拖拽以免改动坐标。 */
  edgeSafe?: boolean
}>(), {
  ambient: false,
  containerWidth: 0,
  containerHeight: 0,
  edgeSafe: false,
})

const emit = defineEmits<{
  'edit': [note: StickyNote]
}>()

const noteStore = getNoteStore()

/** 过滤出浮动便签（排除 board 模式） */
const floatingNotes = computed(() =>
  noteStore.allStickyNotes.value
    .filter(s => s.displayMode !== 'board')
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return 1  // 置顶在最上层
      if (!a.pinned && b.pinned) return -1
      return 0
    })
)

/** 计算便签样式（画布坐标 → 像素） */
function noteStyle(note: StickyNote) {
  const w = props.containerWidth || window.innerWidth
  const h = props.containerHeight || window.innerHeight
  const color = note.color || 'f4d03f'
  // 首屏边缘安全模式：仅约束显示 left 到左右安全带，不改 stored 坐标
  let leftPx = (note.stickyX / 100) * w
  const topPx = (note.stickyY / 100) * h
  if (props.edgeSafe) {
    const noteW = note.displayMode === 'minimized' ? 160 : 200
    leftPx = clampEdgeLeft(leftPx, w, edgeBand(note.stickyX), noteW)
  }
  return {
    left: `${leftPx}px`,
    top: `${topPx}px`,
    background: '#' + color,
    '--cn-color': '#' + color,
    zIndex: note.pinned ? 100 : 10,
  }
}

/** 边缘安全：依据 stored x 决定落在左侧带还是右侧带 */
function edgeBand(stickyX: number): 'left' | 'right' {
  return stickyX < 50 ? 'left' : 'right'
}

/** 将显示 left 夹到对应边缘安全带内：左侧 [margin, 30%−noteW]，右侧 [70%, 右边界] */
function clampEdgeLeft(rawPx: number, w: number, band: 'left' | 'right', noteW: number): number {
  const margin = 16
  const minLeft = margin
  const maxLeft = Math.max(minLeft, w - margin - noteW)
  if (band === 'left') {
    return Math.min(rawPx, Math.max(minLeft, w * 0.3 - noteW))
  }
  return Math.max(rawPx, Math.min(maxLeft, w * 0.7))
}

/** 渲染 Markdown */
function rendered(note: StickyNote) {
  if (!note.content) return '<span style="opacity:0.4">点击编辑内容…</span>'
  return renderMarkdown(note.content)
}

// ---- 拖拽 ----
const dragging = ref(false)
let dragNoteId = ''
let dragOffsetX = 0
let dragOffsetY = 0
let startLeft = 0
let startTop = 0

function startDrag(e: MouseEvent, note: StickyNote) {
  // 首屏边缘安全模式：便签固定在边缘，禁止拖拽以免改动 stored 坐标
  if (props.edgeSafe) return
  const target = e.target as HTMLElement
  if (target.closest('.cn-btn') || target.closest('.cn-body')) return

  dragging.value = true
  dragNoteId = note.id
  dragOffsetX = e.clientX
  dragOffsetY = e.clientY

  const w = props.containerWidth || window.innerWidth
  const h = props.containerHeight || window.innerHeight
  startLeft = (note.stickyX / 100) * w
  startTop = (note.stickyY / 100) * h
}

function onMouseMove(e: MouseEvent) {
  if (!dragging.value) return
  const w = props.containerWidth || window.innerWidth
  const h = props.containerHeight || window.innerHeight
  const dx = e.clientX - dragOffsetX
  const dy = e.clientY - dragOffsetY
  const newLeft = Math.max(0, Math.min(w - 100, startLeft + dx))
  const newTop = Math.max(0, Math.min(h - 60, startTop + dy))
  // 实时更新位置
  const pctX = (newLeft / w) * 100
  const pctY = (newTop / h) * 100
  noteStore.updateStickyPosition(dragNoteId, pctX, pctY)
}

function onMouseUp() {
  if (!dragging.value) return
  dragging.value = false
  dragNoteId = ''
}

// ---- 操作 ----
function togglePin(id: string) {
  noteStore.togglePin(id)
}

function toggleMinimize(note: StickyNote) {
  const newMode = note.displayMode === 'minimized' ? 'sticky' : 'minimized'
  noteStore.updateStickyMode(note.id, newMode)
}

function openEditor(note: StickyNote) {
  emit('edit', note)
}

function closeNote(id: string) {
  noteStore.moveToBoard(id)
}

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<style scoped>
.canvas-notes {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.canvas-notes--ambient {
  opacity: 0.5;
  pointer-events: none;
}

.canvas-notes > * {
  pointer-events: auto;
}

/* 单个便签 */
.canvas-note {
  position: absolute;
  width: 200px;
  min-height: 50px;
  background: var(--cn-color, #f4d03f);
  border-radius: 4px 4px 8px 8px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.3),
    0 1px 3px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  cursor: default;
  user-select: none;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
  transform: rotate(var(--cn-rot, -0.3deg));
}

.canvas-note:nth-child(odd) {
  --cn-rot: 0.3deg;
}

.canvas-note:hover {
  box-shadow:
    0 6px 24px rgba(0, 0, 0, 0.35),
    0 2px 6px rgba(0, 0, 0, 0.2);
  transform: rotate(0deg) scale(1.02);
}

.canvas-note--minimized {
  width: 160px;
  min-height: auto;
}

.canvas-note--pinned {
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.08);
}

/* 头部 */
.cn-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 6px;
  cursor: grab;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.04);
}

.cn-header:active {
  cursor: grabbing;
}

.cn-title {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.cn-actions {
  display: flex;
  gap: 1px;
  opacity: 0;
  transition: opacity 0.2s;
}

.cn-header:hover .cn-actions {
  opacity: 1;
}

.cn-btn {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  color: rgba(0, 0, 0, 0.4);
  transition: background 0.15s, color 0.15s;
  line-height: 1;
  padding: 0;
}

.cn-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.cn-btn.pinned {
  opacity: 1;
  color: #e74c3c;
}

.cn-btn-close:hover {
  background: rgba(224, 49, 49, 0.15);
  color: #e03131;
}

/* 内容 */
.cn-body {
  padding: 6px 8px;
  cursor: pointer;
  min-height: 30px;
}

.cn-text {
  font-size: 11px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.7);
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cn-text :deep(strong) {
  color: rgba(0, 0, 0, 0.85);
  font-weight: 600;
}

.cn-text :deep(code) {
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 3px;
  border-radius: 2px;
  font-size: 0.9em;
}

.cn-text :deep(a) {
  color: rgba(0, 0, 0, 0.7);
  text-decoration: underline;
}

.cn-text :deep(.wikilink) {
  color: rgba(0, 0, 0, 0.85);
  text-decoration: none;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.4);
  cursor: pointer;
}

.cn-text :deep(p) {
  margin: 0.15em 0;
}

.cn-text :deep(ul),
.cn-text :deep(ol) {
  padding-left: 14px;
  margin: 0.15em 0;
}

.cn-footer {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.cn-tag {
  font-size: 8px;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.08);
  color: rgba(0, 0, 0, 0.5);
}

/* 空状态 */
.cn-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: none;
  color: rgba(255, 255, 255, 0.5);
}

.cn-empty p {
  margin: 0;
  font-size: 13px;
  opacity: 0.5;
}

.cn-empty-hint {
  font-size: 11px !important;
  opacity: 0.3 !important;
}
</style>
