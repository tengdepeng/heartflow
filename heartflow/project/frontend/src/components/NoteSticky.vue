<template>
  <div
    v-if="visible"
    :class="['note-sticky', { minimized: note.displayMode === 'minimized' }]"
    :style="stickyStyle"
    @mousedown.prevent="startDrag"
  >
    <!-- 便签头部 -->
    <div class="sticky-header" @dblclick="toggleMinimize">
      <div class="sticky-drag" title="拖动">
        <span class="drag-dots"></span>
      </div>
      <span class="sticky-title" :title="note.title">{{ note.title || '无标题' }}</span>
      <div class="sticky-actions">
        <button
          class="sticky-btn pin-btn"
          :class="{ pinned: note.pinned }"
          :title="note.pinned ? '取消置顶' : '置顶'"
          @click.stop="togglePin"
        >📌</button>
        <button
          class="sticky-btn"
          :title="note.displayMode === 'minimized' ? '展开' : '最小化'"
          @click.stop="toggleMinimize"
        >{{ note.displayMode === 'minimized' ? '🔽' : '🔼' }}</button>
        <button class="sticky-btn close-btn" title="关闭便签" @click.stop="close">✕</button>
      </div>
    </div>

    <!-- 便签内容（展开时显示） -->
    <div v-if="note.displayMode !== 'minimized'" class="sticky-body" @click.stop="openEditor">
      <div class="sticky-text" v-html="renderedContent || '点击编辑内容…'" />
      <div class="sticky-footer">
        <span class="sticky-tags" v-if="note.tags.length">
          <span v-for="t in note.tags" :key="t" class="sticky-tag">{{ t }}</span>
        </span>
        <span class="sticky-time">{{ timeAgo }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StickyNote } from '../modules/note'
import { renderMarkdown } from '../utils/markdown'

const props = defineProps<{
  note: StickyNote
  visible: boolean
}>()

const emit = defineEmits<{
  'update:position': [id: string, x: number, y: number]
  'update:mode': [id: string, mode: 'sticky' | 'minimized']
  'edit': [note: StickyNote]
  'delete': [id: string]
  'pin': [id: string]
}>()

// ---- 拖动逻辑 ----
const dragging = ref(false)
const dragOffset = { x: 0, y: 0 }

const posX = ref(props.note.stickyX)
const posY = ref(props.note.stickyY)

function startDrag(e: MouseEvent) {
  // 只有点击头部区域才启动拖动
  const target = e.target as HTMLElement
  if (target.closest('.sticky-btn') || target.closest('.sticky-body')) return

  dragging.value = true
  dragOffset.x = e.clientX
  dragOffset.y = e.clientY

  const onMove = (ev: MouseEvent) => {
    if (!dragging.value) return
    const dx = ev.clientX - dragOffset.x
    const dy = ev.clientY - dragOffset.y
    // 转换为百分比
    const vw = window.innerWidth
    const vh = window.innerHeight
    const newX = posX.value + (dx / vw) * 100
    const newY = posY.value + (dy / vh) * 100
    posX.value = Math.max(0, Math.min(90, newX))
    posY.value = Math.max(0, Math.min(80, newY))
    dragOffset.x = ev.clientX
    dragOffset.y = ev.clientY
  }

  const onUp = () => {
    dragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    emit('update:position', props.note.id, posX.value, posY.value)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// ---- 样式 ----
const stickyStyle = computed(() => {
  const color = props.note.color || 'f4d03f'
  return {
    left: posX.value + '%',
    top: posY.value + '%',
    '--sticky-color': '#' + color,
    '--sticky-color-rgb': hexToRgb(color),
    zIndex: props.note.pinned ? 100 : 10,
    display: props.visible ? undefined : 'none',
  }
})

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

// ---- 操作 ----
function toggleMinimize() {
  const newMode = props.note.displayMode === 'minimized' ? 'sticky' : 'minimized'
  emit('update:mode', props.note.id, newMode)
}

function togglePin() {
  emit('pin', props.note.id)
}

function openEditor() {
  emit('edit', props.note)
}

function close() {
  emit('delete', props.note.id)
}

// ---- Markdown 渲染 ----
const renderedContent = computed(() => {
  if (!props.note.content) return ''
  return renderMarkdown(props.note.content)
})

// ---- 时间格式化 ----
const timeAgo = computed(() => {
  const now = Date.now()
  const updated = new Date(props.note.updatedAt).getTime()
  const diff = now - updated
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / 86400000)} 天前`
})
</script>

<style scoped>
.note-sticky {
  position: fixed;
  width: 220px;
  min-height: 60px;
  background: var(--sticky-color);
  border-radius: 4px 4px 8px 8px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.35),
    0 1px 3px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  cursor: default;
  user-select: none;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
  transform: rotate(var(--rot, -0.5deg));
  --rot: -0.5deg;
}

.note-sticky:nth-child(odd) {
  --rot: 0.5deg;
}

.note-sticky:hover {
  box-shadow:
    0 6px 24px rgba(0, 0, 0, 0.4),
    0 2px 6px rgba(0, 0, 0, 0.25);
  transform: rotate(0deg) scale(1.02);
}

.note-sticky.minimized {
  width: 180px;
  min-height: auto;
}

/* 头部 */
.sticky-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  cursor: grab;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.04);
}

.sticky-header:active {
  cursor: grabbing;
}

.drag-dots {
  display: inline-block;
  width: 12px;
  height: 2px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 1px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.15), 0 8px 0 rgba(0, 0, 0, 0.15);
}

.sticky-title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.sticky-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.sticky-header:hover .sticky-actions {
  opacity: 1;
}

.sticky-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: rgba(0, 0, 0, 0.4);
  transition: background 0.15s, color 0.15s;
  line-height: 1;
  padding: 0;
}

.sticky-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.pin-btn.pinned {
  opacity: 1;
  color: #e74c3c;
}

.close-btn:hover {
  background: rgba(224, 49, 49, 0.15);
  color: #e03131;
}

/* 内容 */
.sticky-body {
  padding: 8px 10px;
  cursor: pointer;
  min-height: 40px;
}

.sticky-text {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.7);
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sticky-text :deep(strong) {
  color: rgba(0, 0, 0, 0.85);
  font-weight: 600;
}

.sticky-text :deep(code) {
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.sticky-text :deep(a) {
  color: rgba(0, 0, 0, 0.7);
  text-decoration: underline;
}

.sticky-text :deep(.wikilink) {
  color: rgba(0, 0, 0, 0.85);
  text-decoration: none;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.4);
  cursor: pointer;
}

.sticky-text :deep(p) {
  margin: 0.2em 0;
}

.sticky-text :deep(ul),
.sticky-text :deep(ol) {
  padding-left: 16px;
  margin: 0.2em 0;
}

.sticky-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.sticky-tags {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.sticky-tag {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.08);
  color: rgba(0, 0, 0, 0.5);
}

.sticky-time {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.35);
  margin-left: auto;
}
</style>