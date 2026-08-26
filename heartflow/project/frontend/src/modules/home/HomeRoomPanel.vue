<template>
  <div class="home-room-panel" :class="{ 'room-panel--open': isOpen, 'room-panel--embedded': embedded }">
    <!-- 切换开关（内嵌模式下由幕僚坞标签接管，隐藏） -->
    <button
      v-if="!embedded"
      class="room-toggle"
      @click="isOpen = !isOpen"
      :title="isOpen ? '收起房间面板' : '探索房间'"
      aria-label="切换房间面板"
    >
      <span class="toggle-icon">{{ currentRoom.icon }}</span>
      <span class="toggle-label">{{ currentRoom.name }}</span>
    </button>

    <!-- 房间面板（内嵌模式常驻展开） -->
    <Transition name="panel-slide">
      <div v-if="isOpen || embedded" class="room-selector">
        <div class="selector-header">
          <span class="selector-title">家 · 空间</span>
          <span class="selector-subtitle">选择一处角落</span>
        </div>

        <!-- 房间网格 -->
        <div class="room-grid">
          <button
            v-for="room in rooms"
            :key="room.id"
            :class="['room-card', { 'room-card--active': room.id === activeRoomId }]"
            :style="{
              '--room-color': room.color,
              '--room-atmosphere': room.atmosphereColor,
            }"
            @click="selectRoom(room.id)"
            :title="room.description"
          >
            <span class="room-icon">{{ room.icon }}</span>
            <span class="room-name">{{ room.name }}</span>
            <span class="room-dot"></span>
            <span
              v-if="roomNotesToday(room.id) > 0"
              class="room-activity-badge"
              :title="`今日记录 ${roomNotesToday(room.id)} 条`"
            >{{ roomNotesToday(room.id) }}</span>
          </button>
        </div>

        <!-- 当前房间大图预览（R5） -->
        <div class="room-info">
          <div class="room-preview">
            <span class="preview-icon">{{ currentRoom.icon }}</span>
            <div class="preview-text">
              <span class="preview-name">{{ currentRoom.name }}</span>
              <p class="room-description">{{ currentRoom.description }}</p>
            </div>
          </div>
          <div class="room-today" aria-label="今日在此做了什么">
            <span class="today-stat">今日记录 <b>{{ roomNotesToday(currentRoom.id) }}</b> 条</span>
            <span class="today-stat">今日专注 <b>{{ todayFocusCount }}</b> 次</span>
          </div>
          <div class="room-meta">
            <span class="meta-tag">{{ currentRoom.texture }}</span>
            <span class="meta-tag">{{ currentRoom.ambientSound }}</span>
            <span v-if="currentRoom.hasInteractive" class="meta-tag meta-tag--interactive">可交互</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { HOME_ROOMS, DEFAULT_HOME_ROOM, getHomeRoom } from './rooms'
import type { HomeRoom } from './rooms'
import { useRoomActivity } from './useRoomActivity'

const props = withDefaults(defineProps<{
  activeRoomId?: string
  embedded?: boolean
}>(), {
  activeRoomId: DEFAULT_HOME_ROOM.id,
  embedded: false,
})

const emit = defineEmits<{
  (e: 'update:active-room-id', id: string): void
}>()

const isOpen = ref(false)
const rooms = HOME_ROOMS

const { roomNotesToday, todayFocusCount } = useRoomActivity()

const activeRoomId = ref(props.activeRoomId)
const currentRoom = computed<HomeRoom>(() => {
  return getHomeRoom(activeRoomId.value) ?? DEFAULT_HOME_ROOM
})

function selectRoom(id: string) {
  activeRoomId.value = id
  emit('update:active-room-id', id)
}
</script>

<style scoped>
/* ============================================================
   家 · 房间面板 — 浮动在 Home 右下角
   ============================================================ */

.home-room-panel {
  position: fixed;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  right: calc(24px + env(safe-area-inset-right, 0px));
  z-index: 50;
}

/* ---- 切换开关 ---- */
.room-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 999px;
  background: rgba(13, 11, 9, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--text-secondary, var(--text-secondary));
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  font-family: inherit;
  font-size: 13px;
}

.room-toggle:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--text-primary, #e8e0d8);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35), 0 0 20px rgba(var(--accent-rgb), 0.04);
}

.room-panel--open .room-toggle {
  border-color: rgba(var(--accent-rgb), 0.25);
  background: rgba(20, 16, 12, 0.95);
}

/* 内嵌于幕僚坞：取消固定/绝对定位，随容器正常流布局 */
.home-room-panel.room-panel--embedded {
  position: static;
  bottom: auto;
  right: auto;
}

.room-panel--embedded .room-selector {
  position: static;
  bottom: auto;
  right: auto;
  width: 100%;
  max-height: none;
}

.toggle-icon {
  font-size: 16px;
  line-height: 1;
}

.toggle-label {
  letter-spacing: 1px;
}

/* ---- 房间选择器 ---- */
.room-selector {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  width: 340px;
  max-width: calc(100vw - 32px);
  max-height: 70vh;
  overflow-y: auto;
  background: rgba(16, 13, 10, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4), 0 0 24px rgba(var(--accent-rgb), 0.03);
}

.selector-header {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selector-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  letter-spacing: 2px;
}

.selector-subtitle {
  font-size: 11px;
  color: var(--text-muted, var(--text-muted));
  letter-spacing: 1px;
}

/* ---- 房间网格 ---- */
.room-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.room-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
  position: relative;
  overflow: hidden;
}

/* 房间卡片顶部渐变光 */
.room-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--room-color, rgba(var(--accent-rgb), 0.15)),
    transparent
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.room-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.room-card:hover::before {
  opacity: 1;
}

.room-card--active {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--room-color, rgba(var(--accent-rgb), 0.2));
  box-shadow: inset 0 0 20px color-mix(in srgb, var(--room-color, #d4a574) 4%, transparent);
}

.room-card--active::before {
  opacity: 1;
}

.room-icon {
  font-size: 22px;
  line-height: 1;
  transition: transform 0.3s ease;
}

.room-card:hover .room-icon {
  transform: scale(1.1);
}

.room-name {
  font-size: 11px;
  color: var(--text-secondary, var(--text-secondary));
  letter-spacing: 1px;
  transition: color 0.3s ease;
}

.room-card--active .room-name {
  color: var(--room-color, var(--accent, #d4a574));
}

.room-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--room-color, rgba(var(--accent-rgb), 0.2));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.room-card--active .room-dot {
  opacity: 1;
  box-shadow: 0 0 6px var(--room-color, rgba(var(--accent-rgb), 0.3));
}

/* ---- 房间信息 ---- */
.room-info {
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--bg-surface);
}

.room-description {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary, var(--text-secondary));
  margin: 0 0 10px;
}

.room-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.meta-tag {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 9px;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(255, 255, 255, 0.02);
}

.meta-tag--interactive {
  color: rgba(90, 184, 160, 0.4);
  border-color: rgba(90, 184, 160, 0.1);
}

/* ---- R5：内嵌模式 2 列紧凑 ---- */
.room-panel--embedded .room-grid {
  grid-template-columns: repeat(2, 1fr);
}
.room-panel--embedded .room-card {
  padding: 10px 6px;
  gap: 4px;
}
.room-panel--embedded .room-icon {
  font-size: 18px;
}

/* ---- R5：当前房间大图预览 ---- */
.room-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.preview-icon {
  font-size: 34px;
  line-height: 1;
  filter: drop-shadow(0 0 10px var(--room-color, rgba(var(--accent-rgb), 0.25)));
}
.preview-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.preview-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  letter-spacing: 1px;
}
.room-preview .room-description {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary, var(--text-medium));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.room-today {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.today-stat {
  font-size: 11px;
  color: var(--text-secondary, var(--text-secondary));
}
.today-stat b {
  color: var(--room-color, var(--accent, #d4a574));
  font-weight: 600;
}

/* ---- R6：房间卡今日活跃度徽标 ---- */
.room-activity-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--room-color, rgba(var(--accent-rgb), 0.6));
  color: #1a120a;
  font-size: 9px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  box-shadow: 0 0 8px color-mix(in srgb, var(--room-color, #d4a574) 40%, transparent);
}
.room-card:focus-visible {
  outline: 2px solid rgba(124, 108, 240, 0.6);
  outline-offset: 2px;
}

/* ---- 面板滑入动画 ---- */
.panel-slide-enter-active {
  transition: all 0.3s ease-out;
}
.panel-slide-leave-active {
  transition: all 0.2s ease-in;
}
.panel-slide-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}
.panel-slide-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .home-room-panel {
    bottom: 72px;
    right: 12px;
  }

  .room-selector {
    width: 280px;
    right: 0;
    padding: 16px;
  }

  .room-grid {
    gap: 6px;
  }

  .room-card {
    padding: 10px 6px;
  }

  .room-icon {
    font-size: 18px;
  }

  .room-name {
    font-size: 10px;
  }
}
</style>