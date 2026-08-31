<template>
  <div class="room-settings-panel">
    <!-- Overview Cards -->
    <div class="rm-overview">
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

        <!-- 自适应网格：容器够宽自动多列（减少滚屏），窄容器自动降为单列避免拥挤 -->
        <div v-if="filteredByGroup(group).length > 0" class="hf-room-grid--wide">
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
              <IconPicker
                :model-value="entry.config.customIcon"
                :label="entry.room.name"
                @change="(v: string | null) => onCustomIconChange(entry.room.id, v)"
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

            <!-- 钉入归属：覆盖房间图默认的领域 / 宅院（与侧栏长按拖动同源，集中在此一处管理） -->
            <div class="rm-detail-field">
              <label class="rm-detail-label">归入领域</label>
              <select
                class="rm-detail-select"
                :value="entry.config.pinnedDomain ?? ''"
                @change="onPinDomainChange(entry.room.id, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">默认（沿用房间图）</option>
                <option v-for="d in DOMAIN_ORDER" :key="d" :value="d">{{ DOMAIN_LABELS[d] }}</option>
              </select>
            </div>
            <div class="rm-detail-field">
              <label class="rm-detail-label">钉入院中</label>
              <select
                class="rm-detail-select"
                :value="entry.config.pinnedSlot ?? ''"
                @change="onPinSlotChange(entry.room.id, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">默认（沿用房间图）</option>
                <option v-for="s in SLOT_ORDER" :key="s" :value="s">{{ SLOT_LABELS[s] }}</option>
              </select>
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
import IconPicker from './IconPicker.vue'
import { DOMAIN_LABELS, SLOT_LABELS } from '../modules/room-taxonomy'
import type { RoomDomain, RoomSlot } from '../engine/room-graph'

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

const DOMAIN_ORDER: RoomDomain[] = ['inward', 'outward', 'body', 'knowledge', 'work', 'time', 'system']
const SLOT_ORDER: RoomSlot[] = ['screen', 'front-yard', 'hall', 'back-yard', 'side-wing', 'corner']

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

function onCustomIconChange(roomId: string, value: string | null) {
  rm.updateRoomConfig(roomId, { customIcon: value || null })
}

function onCustomColorChange(roomId: string, value: string) {
  rm.updateRoomConfig(roomId, { customColor: value || null })
}

/** 领域钉入：null=沿用默认；与侧栏拖动 tax-domain-* 落点同源 */
function onPinDomainChange(roomId: string, value: string) {
  const domain = (value || null) as RoomDomain | null
  const slot = rm.getRoomConfig(roomId)?.pinnedSlot ?? null
  rm.setRoomPin(roomId, slot, domain)
}

/** 宅院钉入：null=沿用默认；与侧栏拖动 tax-slot-* 落点同源 */
function onPinSlotChange(roomId: string, value: string) {
  const slot = (value || null) as RoomSlot | null
  const domain = rm.getRoomConfig(roomId)?.pinnedDomain ?? null
  rm.setRoomPin(roomId, slot, domain)
}
</script>

<style scoped>
.room-settings-panel {
  width: 100%;
}

/* =============================================
   Overview Cards
   ============================================= */
.rm-overview {
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
  border: 1px solid rgba(138, 138, 138, 0.1);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(2px);
  transition: border-color 0.3s, box-shadow 0.3s;
}

.rm-overview-card:hover {
  border-color: rgba(138, 138, 138, 0.18);
  box-shadow: 0 0 24px rgba(138, 138, 138, 0.03);
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
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  padding: 10px 16px;
  border-radius: 14px;
  border: 1px solid rgba(138, 138, 138, 0.1);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(2px);
  transition: border-color 0.3s;
}

.rm-search:focus-within {
  border-color: rgba(138, 138, 138, 0.3);
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
  border: 1px solid rgba(138, 138, 138, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(2px);
  margin-bottom: 8px;
  overflow: hidden;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.rm-room-card:hover {
  border-color: rgba(138, 138, 138, 0.16);
  box-shadow: 0 0 20px rgba(138, 138, 138, 0.02);
}

.rm-room-card--expanded {
  border-color: rgba(138, 138, 138, 0.2);
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
  border: 1px solid rgba(138, 138, 138, 0.12);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
}

.rm-order-btn:hover {
  color: var(--accent);
  border-color: rgba(138, 138, 138, 0.3);
  background: rgba(138, 138, 138, 0.06);
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
  background: var(--accent);
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
  border-top: 1px solid rgba(138, 138, 138, 0.08);
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

.rm-detail-input,
.rm-detail-select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(138, 138, 138, 0.1);
  background: rgba(0, 0, 0, 0.3);
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary, #e8e0d8);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.rm-detail-input:focus,
.rm-detail-select:focus {
  border-color: rgba(138, 138, 138, 0.35);
}

.rm-detail-input::placeholder {
  color: var(--text-faint);
}

.rm-detail-select {
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%238a8a8a' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
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
  border: 1px solid rgba(138, 138, 138, 0.15);
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
.rm-group {
  animation: rm-section-fade-in 0.5s ease-out both;
}

.rm-group:nth-child(2) { animation-delay: 0.05s; }
.rm-group:nth-child(3) { animation-delay: 0.1s; }
.rm-group:nth-child(4) { animation-delay: 0.15s; }
.rm-group:nth-child(5) { animation-delay: 0.2s; }

@keyframes rm-section-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* =============================================
   Responsive
   ============================================= */
@media (max-width: 480px) {
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
}
</style>
