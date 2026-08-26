<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance rm-room-manager">
    <!-- Ambient background -->
    <div data-enter class="rm-ambient" aria-hidden="true">
      <div class="rm-ambient-grid"></div>
      <div class="rm-ambient-glow"></div>
    </div>

    <!-- Header -->
    <header data-enter class="rm-header">
      <div class="rm-ornament">
        <span class="rm-ornament-line"></span>
        <span class="rm-ornament-diamond">✦</span>
        <span class="rm-ornament-line"></span>
      </div>
      <p class="rm-kicker">ROOM CONFIGURATION</p>
      <h1>房间管理器</h1>
      <p class="rm-subtitle">管理所有房间的可见性和自定义</p>
    </header>

    <!-- Overview Cards -->
    <div data-enter class="rm-overview">
      <div class="rm-overview-card">
        <span class="rm-overview-icon">🏠</span>
        <span class="rm-overview-label">总房间</span>
        <span class="rm-overview-value">{{ stats.total }}</span>
      </div>
      <div class="rm-overview-card rm-overview-card--visible">
        <span class="rm-overview-icon">👁</span>
        <span class="rm-overview-label">可见</span>
        <span class="rm-overview-value">{{ stats.visible }}</span>
      </div>
      <div class="rm-overview-card rm-overview-card--hidden">
        <span class="rm-overview-icon">🚫</span>
        <span class="rm-overview-label">隐藏</span>
        <span class="rm-overview-value">{{ stats.hidden }}</span>
      </div>
    </div>

    <!-- Search / Filter -->
    <div class="rm-search">
      <span class="rm-search-icon">🔍</span>
      <input
        v-model="searchQuery"
        class="rm-search-input"
        type="text"
        placeholder="搜索房间名称..."
        @input="onSearchInput"
      />
      <button v-if="searchQuery" class="rm-search-clear" @click="searchQuery = ''" type="button">
        ✕
      </button>
    </div>

    <!-- Room Groups -->
    <div v-if="hasRooms" class="rm-groups">
      <div
        v-for="group in groupKeys"
        :key="group"
        class="rm-group"
      >
        <h2 class="rm-group-title">
          <span class="rm-group-badge" :class="`rm-group-badge--${group}`">{{ groupLabels[group] }}</span>
          <span class="rm-group-count">{{ filteredByGroup(group).length }} 个房间</span>
        </h2>

        <div v-if="filteredByGroup(group).length === 0" class="rm-group-empty">
          该分类下没有匹配的房间
        </div>

        <div
          v-for="entry in filteredByGroup(group)"
          :key="entry.room.id"
          class="rm-room-card"
          :class="{ 'rm-room-card--expanded': expandedId === entry.room.id }"
        >
          <!-- Card header (always visible) -->
          <div class="rm-room-header" @click="toggleExpand(entry.room.id)">
            <span class="rm-room-icon" :style="{ color: displayColor(entry) }">
              {{ displayIcon(entry) }}
            </span>
            <div class="rm-room-info">
              <span class="rm-room-name">{{ displayName(entry) }}</span>
              <span class="rm-room-path">{{ entry.room.path }}</span>
            </div>
            <span class="rm-room-group-tag" :class="`rm-room-group-tag--${entry.room.group}`">
              {{ groupLabels[entry.room.group] || entry.room.group }}
            </span>
            <span class="rm-room-color-dot" :style="{ background: displayColor(entry) }"></span>
            <div class="rm-room-order" @click.stop>
              <button
                class="rm-order-btn"
                type="button"
                :title="`上移 ${displayName(entry)}`"
                @click="rm.moveOrder(entry.room.id, -1)"
              >↑</button>
              <button
                class="rm-order-btn"
                type="button"
                :title="`下移 ${displayName(entry)}`"
                @click="rm.moveOrder(entry.room.id, 1)"
              >↓</button>
            </div>
            <label class="rm-toggle" @click.stop>
              <input
                type="checkbox"
                :checked="entry.config.visible"
                title="在导航中显示 / 隐藏"
                @change="rm.toggleVisibility(entry.room.id)"
              />
              <span class="rm-toggle-slider"></span>
            </label>
          </div>

          <!-- Expanded detail panel -->
          <div v-if="expandedId === entry.room.id" class="rm-room-detail">
            <div class="rm-detail-field">
              <label class="rm-detail-label">自定义名称</label>
              <input
                class="rm-detail-input"
                type="text"
                :value="entry.config.customName ?? ''"
                :placeholder="entry.room.name"
                @input="onCustomNameChange(entry.room.id, ($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="rm-detail-field">
              <label class="rm-detail-label">自定义图标</label>
              <input
                class="rm-detail-input"
                type="text"
                :value="entry.config.customIcon ?? ''"
                :placeholder="entry.room.icon"
                @input="onCustomIconChange(entry.room.id, ($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="rm-detail-field">
              <label class="rm-detail-label">自定义颜色</label>
              <div class="rm-detail-color-row">
                <input
                  class="rm-detail-color-picker"
                  type="color"
                  :value="displayColor(entry)"
                  @input="onCustomColorChange(entry.room.id, ($event.target as HTMLInputElement).value)"
                />
                <span class="rm-detail-color-value">{{ displayColor(entry) }}</span>
              </div>
            </div>
            <button
              class="rm-reset-btn"
              type="button"
              @click="rm.resetRoomConfig(entry.room.id)"
            >
              重置为默认
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="rm-empty">
      <span class="rm-empty-icon">🗺</span>
      <p class="rm-empty-text">暂无可管理的房间</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoomManager } from '../modules/room-manager'
import type { RoomNode, RoomConfig } from '../modules/room-manager'
import { useViewEntrance } from '../composables/useViewEntrance'

const { entranceRef, entranceClass } = useViewEntrance()
const rm = useRoomManager()
const { stats } = rm

const searchQuery = ref('')
const expandedId = ref<string | null>(null)

const groupKeys = ['gravity', 'main-path', 'world', 'work', 'system'] as const

const groupLabels: Record<string, string> = {
  gravity: '引力中心',
  'main-path': '主链路',
  world: '世界房间',
  work: '工作类',
  system: '系统',
}

const hasRooms = computed(() => rm.roomEntries.value.length > 0)

function filteredByGroup(group: string) {
  const entries = (rm.roomsByGroup.value as Record<string, Array<{ room: RoomNode; config: RoomConfig }>>)[group]
  if (!entries) return []
  if (!searchQuery.value) return entries
  const q = searchQuery.value.toLowerCase()
  return entries.filter(e =>
    displayName(e).toLowerCase().includes(q) ||
    e.room.path.toLowerCase().includes(q)
  )
}

function displayName(entry: { room: RoomNode; config: RoomConfig }): string {
  return entry.config.customName ?? entry.room.name
}

function displayIcon(entry: { room: RoomNode; config: RoomConfig }): string {
  return entry.config.customIcon ?? entry.room.icon
}

function displayColor(entry: { room: RoomNode; config: RoomConfig }): string {
  return entry.config.customColor ?? entry.room.color
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function onSearchInput() {
  // Reactive filtering is handled by computed
}

function onCustomNameChange(roomId: string, value: string) {
  rm.updateRoomConfig(roomId, { customName: value || null })
}

function onCustomIconChange(roomId: string, value: string) {
  rm.updateRoomConfig(roomId, { customIcon: value || null })
}

function onCustomColorChange(roomId: string, value: string) {
  rm.updateRoomConfig(roomId, { customColor: value || null })
}
</script>

<style scoped>
/* =============================================
   CSS Variables — Room Manager Theme
   Accent color: var(--accent) (warm)
   ============================================= */
.rm-room-manager {
  --rm-accent: var(--accent);
  --rm-accent-rgb: 212, 165, 116;
  --rm-bg: #0a0a0a;

  position: relative;
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  background: transparent;
  min-height: 100vh;
  overflow: hidden;
}

/* =============================================
   Ambient Background Layer
   ============================================= */
.rm-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.rm-ambient-grid {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M30 0v60M0 30h60' stroke='%23d4a574' stroke-width='0.5' fill='none'/%3E%3Ccircle cx='30' cy='30' r='2' fill='%23d4a574' opacity='0.4'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%23d4a574' opacity='0.25'/%3E%3Ccircle cx='60' cy='0' r='1.5' fill='%23d4a574' opacity='0.25'/%3E%3Ccircle cx='0' cy='60' r='1.5' fill='%23d4a574' opacity='0.25'/%3E%3Ccircle cx='60' cy='60' r='1.5' fill='%23d4a574' opacity='0.25'/%3E%3C/svg%3E");
  background-size: 60px 60px;
}

.rm-ambient-glow {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse at center, rgba(var(--rm-accent-rgb), 0.06) 0%, transparent 70%);
  animation: rm-ambient-pulse 6s ease-in-out infinite alternate;
}

@keyframes rm-ambient-pulse {
  0% { opacity: 0.5; transform: translateX(-50%) scale(1); }
  100% { opacity: 1; transform: translateX(-50%) scale(1.08); }
}

/* =============================================
   Header
   ============================================= */
.rm-header {
  position: relative;
  z-index: 1;
  margin-bottom: 36px;
  text-align: center;
}

.rm-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.rm-ornament-line {
  display: block;
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--rm-accent-rgb), 0.4), transparent);
}

.rm-ornament-diamond {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--rm-accent);
  opacity: 0.7;
  animation: rm-ornament-spin 8s linear infinite;
}

@keyframes rm-ornament-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.rm-kicker {
  font-size: 10px;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: rgba(var(--rm-accent-rgb), 0.5);
  margin: 0 0 10px;
  font-weight: 400;
}

.rm-header h1 {
  font-size: 22px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  margin: 0;
}

.rm-subtitle {
  font-size: 13px;
  color: var(--text-muted, var(--text-muted));
  margin-top: 6px;
}

/* =============================================
   Overview Cards
   ============================================= */
.rm-overview {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.rm-overview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 12px;
  border-radius: 16px;
  border: 1px solid rgba(var(--rm-accent-rgb), 0.1);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(2px);
  transition: border-color 0.3s, box-shadow 0.3s;
}

.rm-overview-card:hover {
  border-color: rgba(var(--rm-accent-rgb), 0.18);
  box-shadow: 0 0 24px rgba(var(--rm-accent-rgb), 0.03);
}

.rm-overview-card--visible {
  border-color: rgba(138, 184, 122, 0.2);
}

.rm-overview-card--hidden {
  border-color: rgba(196, 122, 106, 0.2);
}

.rm-overview-icon {
  font-size: 18px;
  opacity: 0.7;
}

.rm-overview-label {
  font-size: 11px;
  color: var(--text-secondary, var(--text-secondary));
  letter-spacing: 0.05em;
}

.rm-overview-value {
  font-size: 28px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  font-variant-numeric: tabular-nums;
}

/* =============================================
   Search
   ============================================= */
.rm-search {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  padding: 10px 16px;
  border-radius: 14px;
  border: 1px solid rgba(var(--rm-accent-rgb), 0.1);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(2px);
  transition: border-color 0.3s;
}

.rm-search:focus-within {
  border-color: rgba(var(--rm-accent-rgb), 0.3);
}

.rm-search-icon {
  font-size: 14px;
  opacity: 0.5;
}

.rm-search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 14px;
  font-family: inherit;
  color: var(--text-primary, #e8e0d8);
}

.rm-search-input::placeholder {
  color: var(--text-secondary);
}

.rm-search-clear {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;
}

.rm-search-clear:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.06);
}

/* =============================================
   Room Groups
   ============================================= */
.rm-groups {
  position: relative;
  z-index: 1;
}

.rm-group {
  margin-bottom: 32px;
}

.rm-group-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 400;
}

.rm-group-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.rm-group-badge--gravity {
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
}

.rm-group-badge--main-path {
  background: rgba(196, 160, 96, 0.15);
  color: #c4a060;
}

.rm-group-badge--world {
  background: rgba(138, 154, 122, 0.15);
  color: #8a9a7a;
}

.rm-group-badge--work {
  background: rgba(184, 160, 128, 0.15);
  color: #b8a080;
}

.rm-group-badge--system {
  background: rgba(138, 138, 138, 0.15);
  color: var(--text-muted-alt);
}

.rm-group-count {
  font-size: 11px;
  color: var(--text-secondary);
}

.rm-group-empty {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 16px 0;
  text-align: center;
}

/* =============================================
   Room Card
   ============================================= */
.rm-room-card {
  border: 1px solid rgba(var(--rm-accent-rgb), 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(2px);
  margin-bottom: 8px;
  overflow: hidden;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.rm-room-card:hover {
  border-color: rgba(var(--rm-accent-rgb), 0.16);
  box-shadow: 0 0 20px rgba(var(--rm-accent-rgb), 0.02);
}

.rm-room-card--expanded {
  border-color: rgba(var(--rm-accent-rgb), 0.2);
}

.rm-room-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.rm-room-header:hover {
  background: rgba(255, 255, 255, 0.02);
}

.rm-room-icon {
  font-size: 20px;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.rm-room-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rm-room-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rm-room-path {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
}

.rm-room-group-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.rm-room-group-tag--gravity {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.rm-room-group-tag--main-path {
  background: rgba(196, 160, 96, 0.12);
  color: #c4a060;
}

.rm-room-group-tag--world {
  background: rgba(138, 154, 122, 0.12);
  color: #8a9a7a;
}

.rm-room-group-tag--system {
  background: rgba(138, 138, 138, 0.12);
  color: var(--text-muted-alt);
}

.rm-room-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.3);
}

/* ---- 排序按钮 ---- */
.rm-room-order {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.rm-order-btn {
  width: 22px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(var(--rm-accent-rgb), 0.12);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
}

.rm-order-btn:hover {
  color: var(--rm-accent);
  border-color: rgba(var(--rm-accent-rgb), 0.3);
  background: rgba(var(--rm-accent-rgb), 0.06);
}

.rm-order-btn:active {
  transform: scale(0.92);
}

/* ---- Toggle Switch ---- */
.rm-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
  cursor: pointer;
}

.rm-toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.rm-toggle-slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  transition: background 0.25s;
}

.rm-toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--text-primary);
  transition: transform 0.25s, background 0.25s;
}

.rm-toggle input:checked + .rm-toggle-slider {
  background: var(--rm-accent);
}

.rm-toggle input:checked + .rm-toggle-slider::before {
  transform: translateX(18px);
  background: #ffffff;
}

/* =============================================
   Room Detail (Expanded)
   ============================================= */
.rm-room-detail {
  padding: 0 16px 16px;
  border-top: 1px solid rgba(var(--rm-accent-rgb), 0.08);
  animation: rm-detail-fade-in 0.2s ease-out;
}

@keyframes rm-detail-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.rm-detail-field {
  margin-top: 12px;
}

.rm-detail-label {
  display: block;
  font-size: 11px;
  color: var(--text-medium);
  margin-bottom: 6px;
  letter-spacing: 0.03em;
}

.rm-detail-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--rm-accent-rgb), 0.1);
  background: rgba(0, 0, 0, 0.3);
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary, #e8e0d8);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.rm-detail-input:focus {
  border-color: rgba(var(--rm-accent-rgb), 0.35);
}

.rm-detail-input::placeholder {
  color: var(--text-faint);
}

.rm-detail-color-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rm-detail-color-picker {
  -webkit-appearance: none;
  appearance: none;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(var(--rm-accent-rgb), 0.15);
  border-radius: 10px;
  cursor: pointer;
  background: none;
  padding: 2px;
}

.rm-detail-color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.rm-detail-color-picker::-webkit-color-swatch {
  border: none;
  border-radius: 8px;
}

.rm-detail-color-picker::-moz-color-swatch {
  border: none;
  border-radius: 8px;
}

.rm-detail-color-value {
  font-size: 12px;
  font-family: monospace;
  color: var(--text-medium);
}

.rm-reset-btn {
  margin-top: 14px;
  padding: 7px 16px;
  border-radius: 10px;
  border: 1px solid rgba(196, 122, 106, 0.2);
  background: rgba(196, 122, 106, 0.08);
  color: #c47a6a;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.25s, border-color 0.25s, transform 0.2s;
}

.rm-reset-btn:hover {
  background: rgba(196, 122, 106, 0.15);
  border-color: rgba(196, 122, 106, 0.35);
  transform: translateY(-1px);
}

/* =============================================
   Empty State
   ============================================= */
.rm-empty {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 24px;
  text-align: center;
}

.rm-empty-icon {
  font-size: 40px;
  opacity: 0.3;
}

.rm-empty-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

/* =============================================
   Animations
   ============================================= */
@keyframes rm-section-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.rm-group {
  animation: rm-section-fade-in 0.5s ease-out both;
}

.rm-group:nth-child(2) { animation-delay: 0.05s; }
.rm-group:nth-child(3) { animation-delay: 0.1s; }
.rm-group:nth-child(4) { animation-delay: 0.15s; }
.rm-group:nth-child(5) { animation-delay: 0.2s; }

/* =============================================
   Responsive
   ============================================= */
@media (max-width: 480px) {
  .rm-room-manager {
    padding: 24px 16px 64px;
  }

  .rm-header {
    margin-bottom: 28px;
  }

  .rm-header h1 {
    font-size: 20px;
  }

  .rm-overview {
    gap: 8px;
  }

  .rm-overview-card {
    padding: 14px 8px;
  }

  .rm-overview-value {
    font-size: 24px;
  }

  .rm-room-header {
    padding: 12px 12px;
    gap: 8px;
  }

  .rm-room-detail {
    padding: 0 12px 12px;
  }

  .rm-ornament-line {
    width: 28px;
  }
}
</style>