<template>
  <Teleport to="body">
    <Transition name="astrolabe-fade">
      <div v-if="visible" class="astrolabe-overlay" @click.self="close">
        <!-- 星辰背景 -->
        <div class="star-field" aria-hidden="true">
          <div v-for="n in 80" :key="'star-' + n" class="star" :style="starStyle(n)" />
        </div>

        <!-- 星盘罗盘环 -->
        <div class="astrolabe-bg" aria-hidden="true">
          <!-- 外环刻度 -->
          <div class="ring ring-degrees">
            <div v-for="n in 72" :key="'deg-' + n" class="deg-tick" :style="degStyle(n, 72)" />
          </div>
          <!-- 主环 -->
          <div class="ring ring-outer" />
          <div class="ring ring-mid" />
          <div class="ring ring-inner" />
          <!-- 方位十字线 -->
          <div class="compass-axis axis-h" />
          <div class="compass-axis axis-v" />
          <!-- 象限标记 -->
          <span class="compass-mark mark-n">N</span>
          <span class="compass-mark mark-s">S</span>
          <span class="compass-mark mark-e">E</span>
          <span class="compass-mark mark-w">W</span>
        </div>

        <!-- 搜索过滤 -->
        <div class="astrolabe-search">
          <input
            ref="searchInput"
            v-model="searchQuery"
            class="search-input"
            type="text"
            placeholder="搜索房间... (↑↓ 选择, Enter 跳转)"
            @click.stop
            @keydown="onSearchKeydown"
          />
          <!-- 搜索结果下拉 -->
          <div class="search-results" v-if="searchQuery.trim().length > 0">
            <div
              v-for="(room, i) in searchResults"
              :key="room.id"
              :class="['search-result-item', { active: i === selectedIndex }]"
              @click="goTo(room.id)"
              @mouseenter="selectedIndex = i"
            >
              <span class="search-result-icon">{{ room.icon }}</span>
              <span class="search-result-name" v-html="highlightMatch(room.name)"></span>
              <span class="search-result-badge">{{ room.group === 'main-path' ? '核心' : '分支' }}</span>
            </div>
            <div v-if="searchResults.length === 0" class="search-no-results">
              <span class="search-no-icon">◇</span>
              <span>未找到匹配的房间</span>
            </div>
          </div>
          <!-- 最近访问 -->
          <div class="recent-section" v-else-if="recentRooms.length > 0">
            <div class="recent-title">最近访问</div>
            <div class="recent-list">
              <div
                v-for="room in recentRooms"
                :key="room.id"
                class="recent-item"
                @click="goTo(room.id)"
              >
                <span class="recent-icon">{{ room.icon }}</span>
                <span class="recent-name">{{ room.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 关闭按钮 -->
        <button class="astrolabe-close" @click="close" aria-label="关闭星盘">
          <span class="close-cross">✕</span>
        </button>

        <!-- 中心：心流（核心） -->
        <div class="astrolabe-center" @click="goTo('home')">
          <div class="center-core">
            <span class="center-icon">⊙</span>
          </div>
          <div class="center-ring-pulse" />
          <div class="center-ring-pulse ring-2" />
          <span class="center-label">心流</span>
        </div>

        <!-- 主链路房间：内环（星座链） -->
        <div
          v-for="(room, i) in mainPathRooms"
          :key="room.id"
          class="astrolabe-node node-main"
          :class="{ 'node-active': activeRoomId === room.id }"
          :style="mainPathStyle(i)"
          @click="goTo(room.id)"
        >
          <span class="node-glow" />
          <span class="node-icon">{{ room.icon }}</span>
          <span class="node-label">{{ room.name }}</span>
        </div>

        <!-- 连接线：主链路到中心 -->
        <svg class="connection-lines" viewBox="0 0 500 500" aria-hidden="true">
          <circle cx="250" cy="250" r="3" fill="#d4a574" opacity="0.6" />
          <line
            v-for="(_, i) in mainPathRooms"
            :key="'line-main-' + i"
            :x1="250"
            :y1="250"
            :x2="mainPathCoord(i).x"
            :y2="mainPathCoord(i).y"
            stroke="rgba(var(--accent-rgb), 0.08)"
            stroke-width="0.5"
            stroke-dasharray="4 4"
          />
        </svg>

        <!-- 世界房间：外环星座 -->
        <div
          v-for="(room, i) in worldRooms"
          :key="room.id"
          class="astrolabe-node node-world"
          :class="{ 'node-active': activeRoomId === room.id }"
          :style="worldStyle(i)"
          @click="goTo(room.id)"
        >
          <span class="node-glow" />
          <span class="node-icon">{{ room.icon }}</span>
          <span class="node-label">{{ room.name }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { safePush } from '@/utils/router-safe'
import { useRoomNavigation } from '../composables/useRoomNavigation'
import { getMainPath, getAllRooms, getRoom, type RoomNode } from '../engine/room-graph'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const nav = useRoomNavigation()

const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const selectedIndex = ref(0)

const activeRoomId = computed(() => nav.currentRoomId.value)

const mainPathRooms = computed(() => {
  return getMainPath().filter(r => r.id !== 'home')
})

// ---- 搜索逻辑 ----
const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  const all = getAllRooms()
  return all.filter(r => {
    return r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
  })
})

/** 高亮匹配文本 */
function highlightMatch(text: string): string {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q)
  if (idx === -1) return text
  return text.slice(0, idx) + '<mark>' + text.slice(idx, idx + q.length) + '</mark>' + text.slice(idx + q.length)
}

// ---- 最近访问 ----
const recentRooms = computed(() => {
  const seen = new Set<string>()
  // 从 nav.history 反向遍历获取最近访问的房间（去重，排除 home）
  const recent: RoomNode[] = []
  for (const roomId of [...nav.history.value].reverse()) {
    if (!seen.has(roomId) && roomId !== 'home' && roomId !== 'home-space') {
      seen.add(roomId)
      const room = getRoom(roomId)
      if (room) {
        recent.push(room)
        if (recent.length >= 5) break
      }
    }
  }
  return recent
})

// ---- 自动聚焦搜索框 ----
watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => {
      searchInput.value?.focus()
    })
    searchQuery.value = ''
    selectedIndex.value = 0
  }
})

// ---- 键盘导航 ----
function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (searchResults.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % searchResults.value.length
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (searchResults.value.length > 0) {
      selectedIndex.value = (selectedIndex.value - 1 + searchResults.value.length) % searchResults.value.length
    }
  } else if (e.key === 'Enter') {
    if (searchResults.value.length > 0) {
      e.preventDefault()
      goTo(searchResults.value[selectedIndex.value].id)
    }
  }
}

function onKeydown(e: KeyboardEvent) {
  if (!props.visible) return
  if (e.key === 'Escape') {
    if (searchQuery.value.trim()) {
      // 有搜索内容时先清空搜索
      searchQuery.value = ''
      selectedIndex.value = 0
    } else {
      close()
    }
    return
  }
  // 输入 / 时聚焦搜索框
  if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
    const active = document.activeElement
    if (active !== searchInput.value) {
      e.preventDefault()
      searchInput.value?.focus()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})

// ---- 世界房间（含搜索过滤） ----
const worldRooms = computed(() => {
  const all = getAllRooms()
    .filter(r => r.group === 'world' || r.group === 'system')
    .filter(r => r.id !== 'sanctuary')

  // 搜索过滤
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    return all.filter(r => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
  }

  // 按 branchFrom 分组：先按组排列，组内按名称排序
  const branchOrder = ['home', 'anchor', 'timeline', 'garden', 'worklog', 'reading', 'relations', 'body', 'wisdom', 'plugins', '']
  const roomMap = new Map<string, RoomNode[]>()
  for (const room of all) {
    const key = room.branchFrom ?? ''
    if (!roomMap.has(key)) roomMap.set(key, [])
    roomMap.get(key)!.push(room)
  }
  // 每组内按名称排序
  for (const [, rooms] of roomMap) {
    rooms.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  }
  // 按 branchOrder 顺序排列
  const result: RoomNode[] = []
  const added = new Set<string>()
  for (const key of branchOrder) {
    const rooms = roomMap.get(key)
    if (rooms) {
      for (const room of rooms) {
        if (!added.has(room.id)) {
          result.push(room)
          added.add(room.id)
        }
      }
    }
  }
  // 添加剩余未知组
  for (const [key, rooms] of roomMap) {
    if (!branchOrder.includes(key)) {
      for (const room of rooms) {
        if (!added.has(room.id)) {
          result.push(room)
          added.add(room.id)
        }
      }
    }
  }
  return result
})

function starStyle(_n: number) {
  const size = 1 + Math.random() * 2
  const x = Math.random() * 100
  const y = Math.random() * 100
  const delay = Math.random() * 5
  const duration = 2 + Math.random() * 4
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${x}%`,
    top: `${y}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    opacity: 0.2 + Math.random() * 0.5,
  }
}

function degStyle(index: number, total: number) {
  const angle = (index / total) * 360 - 90
  return {
    transform: `rotate(${angle}deg) translateY(calc(-1 * var(--tick-radius)))`,
    opacity: index % 6 === 0 ? 0.6 : index % 3 === 0 ? 0.3 : 0.12,
    height: index % 6 === 0 ? '10px' : index % 3 === 0 ? '6px' : '3px',
  }
}

function mainPathCoord(index: number) {
  const total = mainPathRooms.value.length
  const angle = (index / total) * 360 + 180
  const rad = (angle * Math.PI) / 180
  const r = 140
  return {
    x: Math.round(250 + r * Math.cos(rad)),
    y: Math.round(250 + r * Math.sin(rad)),
  }
}

function mainPathStyle(index: number): Record<string, string> {
  const coord = mainPathCoord(index)
  const total = mainPathRooms.value.length
  const angle = (index / total) * 360
  return {
    left: `${(coord.x / 500) * 100}%`,
    top: `${(coord.y / 500) * 100}%`,
    '--node-angle': `${angle}deg`,
    '--node-delay': `${0.2 + index * 0.08}s`,
  }
}

function worldStyle(index: number): Record<string, string> {
  const total = worldRooms.value.length
  const angle = (index / total) * 360 + 270
  const rad = (angle * Math.PI) / 180
  // 自适应半径：房间较多时扩大外环，较少时缩小
  const r = total > 25 ? 310 : total > 15 ? 280 : 250
  return {
    left: `${50 + (r / 500) * 50 * Math.cos(rad)}%`,
    top: `${50 + (r / 500) * 50 * Math.sin(rad)}%`,
    '--node-angle': `${angle}deg`,
    '--node-delay': `${0.5 + index * 0.008}s`,
  }
}

function goTo(roomId: string) {
  const room = getAllRooms().find(r => r.id === roomId)
  if (room) {
    close()
    safePush(router, room.path)
  }
}

function close() {
  emit('close')
}
</script>

<style scoped>
/* ============================================================
   天星盘 — 古代星图导航仪
   ============================================================ */

.astrolabe-overlay {
  /* 流体基准：桌面封顶 560px（与原尺寸一致），小屏按 92vmin 平滑收缩，不再溢出 */
  --astro-size: min(560px, 92vmin);
  --tick-radius: calc(var(--astro-size) * 0.461);
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: radial-gradient(ellipse at center, rgba(8, 6, 4, 0.92) 0%, rgba(4, 3, 2, 0.96) 100%);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}

/* ---- 星辰背景 ---- */
.star-field {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.star {
  position: absolute;
  border-radius: 50%;
  background: var(--accent);
  animation: star-twinkle ease-in-out infinite alternate;
}

@keyframes star-twinkle {
  0% { opacity: 0.15; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1.2); }
}

/* ---- 星盘罗盘环 ---- */
.astrolabe-bg {
  position: absolute;
  width: var(--astro-size);
  height: var(--astro-size);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1;
}

.ring {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

/* 刻度环 */
.ring-degrees {
  width: calc(var(--astro-size) * 0.946);
  height: calc(var(--astro-size) * 0.946);
  z-index: 0;
}

.deg-tick {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1px;
  background: linear-gradient(180deg, var(--accent), transparent);
  transform-origin: center top;
  margin-left: -0.5px;
}

.ring-outer {
  width: calc(var(--astro-size) * 0.929);
  height: calc(var(--astro-size) * 0.929);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  animation: ring-rotate 60s linear infinite;
}

.ring-mid {
  width: calc(var(--astro-size) * 0.607);
  height: calc(var(--astro-size) * 0.607);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  animation: ring-rotate 45s linear infinite reverse;
}

.ring-inner {
  width: calc(var(--astro-size) * 0.357);
  height: calc(var(--astro-size) * 0.357);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  animation: ring-rotate 30s linear infinite;
}

@keyframes ring-rotate {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

/* ---- 搜索框 ---- */
.astrolabe-search {
  position: absolute;
  top: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: auto;
}

.search-input {
  width: 200px;
  padding: 8px 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 999px;
  background: rgba(13, 11, 9, 0.8);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  transition: all 0.3s ease;
  text-align: center;
  letter-spacing: 0.5px;
  backdrop-filter: blur(8px);
}

.search-input::placeholder {
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.search-input:focus {
  border-color: rgba(var(--accent-rgb), 0.3);
  background: rgba(20, 17, 14, 0.9);
  box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.06);
  width: 240px;
}

/* ---- 搜索结果下拉 ---- */
.search-results {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  width: 260px;
  max-height: 320px;
  overflow-y: auto;
  background: rgba(10, 8, 6, 0.95);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.04);
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover,
.search-result-item.active {
  background: rgba(var(--accent-rgb), 0.08);
}

.search-result-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  opacity: 0.7;
}

.search-result-item.active .search-result-icon {
  opacity: 1;
  filter: drop-shadow(0 0 4px rgba(var(--accent-rgb), 0.2));
}

.search-result-name {
  flex: 1;
  font-size: 12px;
  color: var(--text-primary, #e8e0d8);
  letter-spacing: 0.3px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-result-name :deep(mark) {
  background: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
  padding: 0 2px;
  border-radius: 2px;
}

.search-result-badge {
  font-size: 8px;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.search-result-item.active .search-result-badge {
  border-color: rgba(var(--accent-rgb), 0.15);
  color: rgba(var(--accent-rgb), 0.6);
}

.search-no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.search-no-icon {
  font-size: 14px;
  opacity: 0.4;
}

/* ---- 最近访问 ---- */
.recent-section {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  background: rgba(10, 8, 6, 0.95);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-radius: 10px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  overflow: hidden;
}

.recent-title {
  padding: 8px 14px 4px;
  font-size: 8px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(var(--text-primary-rgb), 0.25);
  opacity: 0.6;
}

.recent-list {
  display: flex;
  flex-direction: column;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.recent-item:hover {
  background: rgba(var(--accent-rgb), 0.06);
}

.recent-icon {
  font-size: 12px;
  width: 18px;
  text-align: center;
  opacity: 0.6;
  flex-shrink: 0;
}

.recent-name {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.6);
  letter-spacing: 0.3px;
}

/* 方位十字线 */
.compass-axis {
  position: absolute;
  top: 50%;
  left: 50%;
  background: rgba(var(--accent-rgb), 0.04);
  transform-origin: center;
  z-index: 0;
}

.axis-h {
  width: calc(var(--astro-size) * 0.929);
  height: 1px;
  transform: translate(-50%, -50%);
}

.axis-v {
  width: 1px;
  height: calc(var(--astro-size) * 0.929);
  transform: translate(-50%, -50%);
}

/* 象限标记 */
.compass-mark {
  position: absolute;
  font-size: clamp(7px, calc(var(--astro-size) * 0.016), 9px);
  font-family: var(--font-heading-en);
  color: rgba(var(--accent-rgb), 0.15);
  letter-spacing: 1px;
  z-index: 1;
}

.mark-n { top: 12px; left: 50%; transform: translateX(-50%); }
.mark-s { bottom: 12px; left: 50%; transform: translateX(-50%); }
.mark-e { right: 16px; top: 50%; transform: translateY(-50%); }
.mark-w { left: 16px; top: 50%; transform: translateY(-50%); }

/* ---- 关闭按钮 ---- */
.astrolabe-close {
  position: absolute;
  top: 32px;
  right: 32px;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.04);
  color: var(--accent);
  font-size: 14px;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s ease;
  font-family: var(--font-heading-en);
}

.astrolabe-close:hover {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.3);
  transform: rotate(90deg) scale(1.1);
}

.close-cross {
  display: block;
  line-height: 1;
}

/* ---- 中心：心流核心 ---- */
.astrolabe-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(var(--astro-size) * 0.171);
  height: calc(var(--astro-size) * 0.171);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  transition: transform 0.4s ease;
  animation: center-appear 0.6s ease-out;
}

.astrolabe-center:hover {
  transform: translate(-50%, -50%) scale(1.1);
}

.center-core {
  width: calc(var(--astro-size) * 0.086);
  height: calc(var(--astro-size) * 0.086);
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, rgba(var(--accent-rgb), 0.3), rgba(var(--accent-rgb), 0.08) 50%, transparent 70%);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.center-icon {
  font-size: clamp(12px, calc(var(--astro-size) * 0.036), 20px);
  color: var(--accent);
  filter: drop-shadow(0 0 8px rgba(var(--accent-rgb), 0.4));
}

.center-ring-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--astro-size) * 0.114);
  height: calc(var(--astro-size) * 0.114);
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  transform: translate(-50%, -50%);
  animation: center-pulse 3s ease-in-out infinite;
  z-index: 1;
}

.center-ring-pulse.ring-2 {
  width: calc(var(--astro-size) * 0.143);
  height: calc(var(--astro-size) * 0.143);
  animation-delay: 1s;
  border-color: rgba(var(--accent-rgb), 0.05);
}

@keyframes center-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.4; }
  50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.8; }
}

@keyframes center-appear {
  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

.center-label {
  font-size: clamp(7px, calc(var(--astro-size) * 0.016), 9px);
  font-family: var(--font-heading-en);
  color: var(--accent);
  opacity: 0.5;
  margin-top: 8px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* ---- 连接线（SVG） ---- */
.connection-lines {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--astro-size) * 0.893);
  height: calc(var(--astro-size) * 0.893);
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 2;
}

/* ---- 星盘节点 ---- */
.astrolabe-node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 5;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease;
  opacity: 0;
  animation: node-appear 0.5s ease-out var(--node-delay, 0.2s) forwards;
}

.astrolabe-node:hover {
  transform: translate(-50%, -50%) scale(1.18);
  z-index: 6;
}

.astrolabe-node:active {
  transform: translate(-50%, -50%) scale(0.95);
}

@keyframes node-appear {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(var(--node-angle, 0deg)); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
}

/* 节点光晕 */
.node-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--astro-size) * 0.057);
  height: calc(var(--astro-size) * 0.057);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.1), transparent 70%);
  opacity: 0;
  transition: opacity 0.4s ease, transform 0.4s ease;
  pointer-events: none;
}

.astrolabe-node:hover .node-glow {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1.5);
}

.node-active .node-glow {
  opacity: 0.8;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.2), transparent 70%);
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.8); opacity: 0.9; }
}

.node-icon {
  font-size: clamp(11px, calc(var(--astro-size) * 0.029), 16px);
  line-height: 1;
  margin-bottom: 3px;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 0 4px rgba(var(--accent-rgb), 0.15));
  transition: filter 0.3s ease;
}

.astrolabe-node:hover .node-icon {
  filter: drop-shadow(0 0 8px rgba(var(--accent-rgb), 0.3));
}

.node-label {
  font-size: clamp(6px, calc(var(--astro-size) * 0.014), 8px);
  font-family: var(--font-heading-en);
  color: #c8b8a8;
  white-space: nowrap;
  letter-spacing: 0.8px;
  opacity: 0.7;
  position: relative;
  z-index: 1;
  transition: color 0.3s ease;
}

.astrolabe-node:hover .node-label {
  color: var(--accent);
  opacity: 1;
}

/* 主链路节点 */
.node-main .node-icon {
  font-size: clamp(13px, calc(var(--astro-size) * 0.036), 20px);
}

.node-main .node-label {
  font-size: clamp(7px, calc(var(--astro-size) * 0.016), 9px);
  color: var(--accent);
  opacity: 0.8;
  letter-spacing: 1px;
}

.node-main.node-active .node-icon {
  filter: drop-shadow(0 0 12px rgba(var(--accent-rgb), 0.5));
}

.node-main.node-active::after {
  content: '';
  position: absolute;
  width: calc(var(--astro-size) * 0.05);
  height: calc(var(--astro-size) * 0.05);
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: active-ring 2.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes active-ring {
  0%, 100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.6; }
  50% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
}

/* 世界房间节点 */
.node-world .node-icon {
  font-size: clamp(10px, calc(var(--astro-size) * 0.023), 13px);
  opacity: 0.7;
}

.node-world .node-label {
  font-size: clamp(5px, calc(var(--astro-size) * 0.013), 7px);
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.node-world:hover .node-icon {
  opacity: 1;
}

.node-world:hover .node-label {
  opacity: 0.9;
}

.node-world.node-active .node-label {
  opacity: 0.8;
}

/* ---- 入场/出场动画 ---- */
.astrolabe-fade-enter-active {
  transition: opacity 0.4s ease;
}

.astrolabe-fade-enter-active .astrolabe-bg {
  animation: bg-enter 0.6s ease-out;
}

.astrolabe-fade-enter-active .star-field {
  animation: stars-enter 0.8s ease-out;
}

.astrolabe-fade-leave-active {
  transition: opacity 0.25s ease;
}

.astrolabe-fade-enter-from,
.astrolabe-fade-leave-to {
  opacity: 0;
}

@keyframes bg-enter {
  0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

@keyframes stars-enter {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

/* ---- 响应式（流体尺寸已接管缩放，此处仅做极小屏定位微调，避免与流体计算冲突） ---- */
@media (max-width: 480px) {
  .astrolabe-search {
    top: 16px;
  }

  .search-input {
    width: 160px;
    font-size: 11px;
    padding: 6px 12px;
  }

  .search-input:focus {
    width: 180px;
  }

  .astrolabe-close {
    top: 16px;
    right: 16px;
    width: 36px;
    height: 36px;
    font-size: 12px;
  }

  .mark-n { top: 8px; }
  .mark-s { bottom: 8px; }
  .mark-e { right: 10px; }
  .mark-w { left: 10px; }
}
</style>