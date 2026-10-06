<template>
  <Teleport to="body">
    <Transition name="panel-slide">
      <div
        v-if="visible"
        ref="rootRef"
        class="edge-panel"
        role="dialog"
        aria-modal="true"
        aria-label="侧边入口"
        tabindex="-1"
        @click.self="emit('close')"
      >
        <div class="panel-card">
          <div class="panel-header">
            <span class="panel-title">侧边入口</span>
            <button class="panel-close" @click="$emit('close')">✕</button>
          </div>

          <!-- 相邻房间（基于 room-graph 动态数据） -->
          <div class="panel-section" v-if="adjacentRooms.length > 0">
            <span class="section-label">相邻房间</span>
            <div class="adjacent-list">
              <button
                v-for="room in adjacentRooms"
                :key="room.id"
                class="adjacent-room-btn"
                @click="goToRoom(room.id)"
              >
                <span class="adjacent-icon">{{ room.icon }}</span>
                <div class="adjacent-info">
                  <span class="adjacent-name">{{ room.name }}</span>
                  <span class="adjacent-desc">{{ room.description }}</span>
                </div>
              </button>
              <div v-if="hiddenAdjacentCount > 0" class="adjacent-more">
                还有 {{ hiddenAdjacentCount }} 个相邻房间
              </div>
            </div>
          </div>

          <div class="panel-section">
            <span class="section-label">快捷操作</span>
            <div class="panel-actions">
              <button
                v-for="action in actions"
                :key="action.id"
                class="panel-action hf-press hf-lift"
                @click="action.handler"
              >
                <span class="action-icon">{{ action.icon }}</span>
                <div class="action-info">
                  <span class="action-label">{{ action.label }}</span>
                  <span class="action-desc">{{ action.desc }}</span>
                </div>
              </button>
            </div>
          </div>

          <div class="panel-section">
            <span class="section-label">风格</span>
            <div class="style-list">
              <button
                v-for="p in styleStore.installedPacks"
                :key="p.id"
                :class="['style-chip', 'hf-press', { active: styleStore.activeId === p.id }]"
                @click="styleStore.activate(p.id)"
              >
                {{ p.name }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoomNavigation, navigateToRoom } from '../composables/useRoomNavigation'
import { useTimer } from '../resonance/bridges/timer'
import { useStyle } from '../resonance/bridges/style'
import { showToast } from '../modules/toast'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const timer = useTimer()
const styleStore = useStyle()
const nav = useRoomNavigation()

// 从 room-graph 获取当前房间的相邻房间（最多展示6个，其余给数量提示）
const MAX_ADJACENT = 6
const adjacentRooms = computed(() => {
  return nav.adjacentRooms.value.slice(0, MAX_ADJACENT)
})
const hiddenAdjacentCount = computed(() => {
  return Math.max(0, nav.adjacentRooms.value.length - adjacentRooms.value.length)
})

function goToRoom(roomId: string) {
  nav.enterRoom(roomId)
}

// ---- 焦点陷阱与 Escape 关闭（面板为模态对话框，键盘焦点应收敛在内） ----
const rootRef = ref<HTMLElement | null>(null)
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

let lastFocused: HTMLElement | null = null

// ---- 全局 body 滚动锁（模块级计数保护） ----
// 同一时刻可能有多个面板实例（或多个模态组件）同时锁定滚动：
// 用计数方式共享一把锁，只在第一个实例加锁时保存原始值、
// 最后一个实例解锁时还原，避免实例之间互相覆盖导致解锁后滚动状态错乱。
let scrollLockCount = 0
let lockedOverflow: string | null = null

function lockBodyScroll() {
  scrollLockCount += 1
  if (scrollLockCount === 1) {
    lockedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0 && lockedOverflow !== null) {
    document.body.style.overflow = lockedOverflow
    lockedOverflow = null
  }
}

// 本实例是否持有滚动锁（卸载时兜底释放）
let ownsScrollLock = false

function getFocusable(): HTMLElement[] {
  if (!rootRef.value) return []
  return Array.from(rootRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((el) => el.getClientRects().length > 0)
}

/** 打开时把焦点移入面板（优先第一个可聚焦项，兜底聚焦遮罩层自身） */
function trapFocus() {
  nextTick(() => {
    const first = getFocusable()[0] ?? rootRef.value
    first?.focus()
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.visible) return

  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }
  if (e.key !== 'Tab') return

  const focusable = getFocusable()
  if (focusable.length === 0) {
    e.preventDefault()
    rootRef.value?.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  const inside = rootRef.value?.contains(active) ?? false
  if (e.shiftKey) {
    if (!inside || active === first) {
      e.preventDefault()
      last.focus()
    }
  } else if (!inside || active === last) {
    e.preventDefault()
    first.focus()
  }
}

// 打开：锁定背景滚动、注册键盘监听（Escape/焦点陷阱）、收拢焦点；
// 关闭：还原滚动、移除监听、归还焦点。
// 监听仅在面板可见期间挂载，避免关闭后仍拦截全局键盘事件（如 Tab）。
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      lastFocused = document.activeElement as HTMLElement | null
      lockBodyScroll()
      ownsScrollLock = true
      window.addEventListener('keydown', handleKeydown, true)
      trapFocus()
    } else {
      window.removeEventListener('keydown', handleKeydown, true)
      if (ownsScrollLock) {
        unlockBodyScroll()
        ownsScrollLock = false
      }
      lastFocused?.focus?.()
      lastFocused = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown, true)
  // 卸载兜底：若面板在可见状态下被销毁，确保释放滚动锁
  if (ownsScrollLock) {
    unlockBodyScroll()
    ownsScrollLock = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown, true)
  // 卸载兜底：若面板在可见状态下被销毁，确保释放滚动锁
  if (ownsScrollLock) {
    unlockBodyScroll()
    ownsScrollLock = false
  }
})

const actions = [
  {
    id: 'focus',
    icon: '⏱️',
    label: '专注计时',
    desc: '让这一段慢慢开始',
    handler: () => {
      if (timer.isFocusing) {
        showToast('专注计时正在进行中，这一段结束后再开始新的吧', 'info')
        return
      }
      if (timer.isPaused) {
        showToast('计时已暂停，去计时面板恢复后继续', 'info')
        return
      }
      timer.start()
      showToast('计时已开始，让这一段慢慢来', 'success')
    },
  },
  {
    id: 'note',
    icon: '📝',
    label: '思绪书房',
    desc: '把此刻的想法放在这里',
    handler: () => navigateToRoom('study'),
  },
  {
    id: 'sanctuary',
    icon: '○',
    label: '安全岛',
    desc: '去一个更安静的角落',
    handler: () => navigateToRoom('sanctuary'),
  },
  {
    id: 'garden',
    icon: '🌷',
    label: '情绪花房',
    desc: '看看此刻的情绪',
    handler: () => navigateToRoom('garden'),
  },
  {
    id: 'timeline',
    icon: '◈',
    label: '时间长廊',
    desc: '回看留下的痕迹',
    handler: () => navigateToRoom('timeline'),
  },
]
</script>

<style scoped>
.edge-panel {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(8, 7, 6, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: flex-end;
  /* 遮罩层作为焦点兜底时不应显示焦点的框线 */
  outline: none;
}

.panel-card {
  width: 280px;
  height: 100%;
  background: linear-gradient(180deg, rgba(20, 17, 14, 0.98), rgba(13, 11, 9, 0.98));
  border-left: 1px solid rgba(var(--accent-rgb), 0.1);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.4);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.panel-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: var(--card-bg);
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition, 0.25s cubic-bezier(0.4, 0, 0.2, 1));
}

.panel-close:hover {
  background: rgba(55, 48, 40, 0.6);
  color: var(--text-primary, #e8e0d8);
}

/* ---- 相邻房间列表 ---- */
.adjacent-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.adjacent-room-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.3);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: all var(--transition, 0.25s cubic-bezier(0.4, 0, 0.2, 1));
}

.adjacent-room-btn:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.15);
  color: var(--text-primary, #e8e0d8);
}

.adjacent-icon {
  font-size: 20px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
  flex-shrink: 0;
}

.adjacent-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.adjacent-name {
  font-size: 13px;
  font-weight: 500;
}

.adjacent-desc {
  font-size: 11px;
  opacity: 0.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.adjacent-more {
  padding: 8px 12px 4px;
  font-size: 11px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  text-align: center;
}

.panel-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.3);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: all var(--transition, 0.25s cubic-bezier(0.4, 0, 0.2, 1));
}

.panel-action:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.1);
  color: var(--text-primary, #e8e0d8);
}

.action-icon {
  font-size: 22px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
  flex-shrink: 0;
}

.action-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-label {
  font-size: 14px;
  font-weight: 500;
}

.action-desc {
  font-size: 11px;
  opacity: 0.5;
}

.panel-section {
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
  padding-top: 16px;
}

.section-label {
  font-size: 12px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  display: block;
  margin-bottom: 10px;
}

.style-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.style-chip {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  background: transparent;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: all var(--transition, 0.25s cubic-bezier(0.4, 0, 0.2, 1));
}

.style-chip:hover {
  background: var(--card-bg);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.style-chip.active {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent, #d4a574);
}

.panel-slide-enter-active { transition: all 0.3s ease-out; }
.panel-slide-leave-active { transition: all 0.25s ease-in; }
.panel-slide-enter-from { opacity: 0; }
.panel-slide-enter-from .panel-card { transform: translateX(100%); }
.panel-slide-leave-to { opacity: 0; }
.panel-slide-leave-to .panel-card { transform: translateX(100%); }

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 860px) {
  .edge-panel { padding: 32px 20px 64px; }
}

@media (max-width: 640px) {
  .edge-panel { padding: 24px 14px 56px; }
}
</style>