<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance home-space" :style="{ '--atmos-color': currentScene.atmosphereColor }">
    <!-- 氛围背景 -->
    <div data-enter class="home-atmos">
      <div class="atmos-warm-glow"></div>
      <div class="atmos-door-light"></div>
    </div>

    <header data-enter class="home-header">
      <div class="home-header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <h1 class="home-title">家</h1>
      <p class="home-subtitle">原点 · 从这里走向所有房间</p>
      <div class="home-header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
    </header>

    <!-- 场景切换栏 -->
    <section data-enter class="scene-tabs">
      <div class="scene-tabs-track">
        <div
          class="scene-tab-indicator"
          :style="{
            left: activeTabOffset + 'px',
            width: activeTabWidth + 'px',
          }"
        />
      </div>
      <button
        v-for="scene in ROOM_SCENES"
        :key="scene.id"
        ref="tabRefs"
        class="scene-tab hf-press"
        :class="{ active: currentSceneId === scene.id }"
        @click="switchScene(scene.id)"
      >
        <span class="scene-tab-icon">{{ scene.icon }}</span>
        <span class="scene-tab-name">{{ scene.name }}</span>
      </button>
    </section>

    <!-- 氛围签名（光维度 + 气味维度） -->
    <section data-enter class="ambiance-signature">
      <span class="amb-sig-item amb-sig-light">💡 <b>{{ currentScene.atmosphereLabel }}</b></span>
      <button
        v-if="currentScent"
        class="amb-sig-item amb-sig-scent"
        :style="{ '--scent-color': currentScent.color }"
        :title="currentScent.description"
        @click="cycleSceneScent"
      >
        <span class="amb-sig-emoji">{{ currentScent.emoji }}</span>
        <span class="amb-sig-name">{{ currentScent.name }}</span>
        <span class="amb-sig-mood">{{ currentScent.mood }}</span>
        <span class="amb-sig-hint">点按换一种</span>
      </button>
      <button v-if="!enabled" class="amb-sig-item amb-sig-off" @click="setEnabled(true)">
        🌫️ 气味维度已隐 · 点按开启
      </button>
    </section>

    <!-- 氛围预设（气候层 · 含气味维度第五维） -->
    <section data-enter class="spatial-section">
      <h3 class="section-label">氛围预设</h3>
      <div class="preset-track">
        <button
          v-for="preset in roomAtmospherePresets"
          :key="preset.id"
          class="preset-chip hf-press"
          :class="{ active: activePresetId === preset.id }"
          :title="preset.description"
          @click="activateAtmospherePreset(preset.id)"
        >
          {{ preset.name }}
        </button>
      </div>
      <Transition name="scent-fade">
        <div v-if="activeScentHints.length" class="preset-scent-row">
          <span class="preset-scent-tag">气味</span>
          <span
            v-for="s in activeScentHints"
            :key="s.symbolId"
            class="amb-sig-item amb-sig-scent preset-scent"
            :style="{ '--scent-color': s.color }"
            :title="`${s.label} · ${s.description}`"
          >
            <span class="amb-sig-name">{{ s.label }}</span>
            <span class="amb-sig-mood">{{ Math.round(s.intensity * 100) }}%</span>
          </span>
        </div>
      </Transition>
    </section>

    <!-- 当前房间组件（2D / 3D 可切换） -->
    <section
      data-enter
      class="room-viewport"
      :class="{ 'room-viewport--3d': viewMode === '3d' }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
    >
      <canvas v-show="viewMode === '3d'" ref="roomCanvas" class="room-3d-canvas"></canvas>
      <div class="room-content" :class="{ 'room-content--3d': viewMode === '3d' }">
        <Transition name="room-fade" mode="out-in">
          <component
            :is="currentRoomComponent"
            :key="currentSceneId"
            @navigate="handleNavigate"
          />
        </Transition>
      </div>
      <button class="view-mode-toggle" :class="{ active: viewMode === '3d' }" @click="toggleViewMode">
        {{ viewMode === '3d' ? '◈ 3D 房间' : '▢ 2D 房间' }}
      </button>
    </section>

    <!-- 走廊导航 -->
    <section data-enter class="hallway-section">
      <Hallway
        :current-room-id="currentSceneId"
        :rooms="hallwayRooms"
        @navigate="handleNavigate"
      />
    </section>

    <!-- 殿堂状况 -->
    <section data-enter class="spatial-section">
      <h3 class="section-label">殿堂状况</h3>
      <div class="status-grid">
        <div class="status-card">
          <span class="status-value">{{ stats.totalCrystals }}</span>
          <span class="status-label">结晶总数</span>
        </div>
        <div class="status-card">
          <span class="status-value">{{ stats.totalEmotions }}</span>
          <span class="status-label">情绪记录</span>
        </div>
        <div class="status-card">
          <span class="status-value">{{ stats.totalNotes }}</span>
          <span class="status-label">笔记总数</span>
        </div>
        <div class="status-card">
          <span class="status-value">{{ stats.todayFocus }}</span>
          <span class="status-label">今日专注</span>
        </div>
        <div class="status-card">
          <span class="status-value">{{ stats.totalAnchors }}</span>
          <span class="status-label">心锚留存</span>
        </div>
        <div class="status-card">
          <span class="status-value">{{ stats.totalPlugins }}</span>
          <span class="status-label">已装插件</span>
        </div>
      </div>
    </section>

    <!-- 家·桥接总览（INCR-385 补挂载孤儿桥接面板 HomeBridgePanel：useHomeBridge 聚合 homeHealth 家健康度/roomHeatmap 房间热力/activityTimeline 活动节律/decorationUsageRanking 装饰排行/roomRecommendations 归家指引, HomeSpace.vue 原只直引 useRoomAtmosphere/useHomeAtmosphereEngine/aggregateTodayRoomStats, 桥接层驾驶舱概览面零呈现, 真缺口） -->
    <HomeBridgePanel />

    <!-- 今日 · 跨房间聚合 -->
    <section data-enter class="spatial-section">
      <h3 class="section-label">今日</h3>
      <div class="status-grid">
        <div class="status-card">
          <span class="status-value">{{ todayRoomStats.anchorToday }}</span>
          <span class="status-label">今日心锚</span>
          <span class="status-sub">{{ todayRoomStats.anchorDone }} 已安放 · {{ todayRoomStats.anchorPending }} 待启</span>
        </div>
        <div class="status-card">
          <span class="status-value">{{ todayRoomStats.meditationToday }}</span>
          <span class="status-label">今日冥想</span>
          <span class="status-sub">留光阁</span>
        </div>
        <div class="status-card">
          <span class="status-value">{{ todayRoomStats.releaseToday }}</span>
          <span class="status-label">今日释怀</span>
          <span class="status-sub">留光阁</span>
        </div>
        <div class="status-card">
          <span class="status-value">{{ todayRoomStats.movementToday }}</span>
          <span class="status-label">今日律动</span>
          <span class="status-sub">动律之间</span>
        </div>
      </div>
    </section>

    <!-- 访客模式 -->
    <section data-enter class="spatial-section">
      <h3 class="section-label">访客模式</h3>
      <div class="guest-toggle">
        <button
          class="guest-btn"
          :class="{ active: visitorMode }"
          @click="toggleVisitorMode"
        >
          {{ visitorMode ? '访客模式已开启' : '开启访客模式' }}
        </button>
        <p class="guest-hint">
          {{ visitorMode
            ? '访客只能看到客厅与餐厅，个人空间已被遮蔽。'
            : '开启后，客人将只能看到你指定的公共区域。'
          }}
        </p>
      </div>
    </section>

    <!-- 宪法箴言 -->
    <footer
      data-enter
      class="home-mantra"
      role="button"
      tabindex="0"
      aria-label="替换宪法箴言"
      @click="refreshMantra"
      @keydown.enter="refreshMantra"
    >
      <span class="mantra-icon">⚜</span>
      <blockquote class="mantra-text">{{ mantra.text }}</blockquote>
      <cite class="mantra-source">{{ mantra.source }}</cite>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onUnmounted, type Component } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useConstitution } from '../resonance/bridges/constitution'
import { useRoomAtmosphere, ROOM_SCENES } from '../composables/useRoomAtmosphere'
import { useRoomScent } from '../modules/scene'
import { useHomeAtmosphereEngine, type AtmospherePreset } from '../modules/home'
import { useStatsStore } from '../stores'
import { useAdaptiveQuality } from '../modules/adaptive'
import type { HomeRoomScene } from '../modules/home/useHomeRoomScene3D'

// ---- 房间组件导入 ----
import EntranceHall from '../components/home/EntranceHall.vue'
import ClosetRoom from '../components/home/ClosetRoom.vue'
import KitchenDining from '../components/home/KitchenDining.vue'
import DiningRoom from '../components/home/DiningRoom.vue'
import Bedroom from '../components/home/Bedroom.vue'
import Bathroom from '../components/home/Bathroom.vue'
import LivingRoom from '../components/home/LivingRoom.vue'
import StudyRoom from '../components/home/StudyRoom.vue'
import Courtyard from '../components/home/Courtyard.vue'
import Balcony from '../components/home/Balcony.vue'
import StorageRoom from '../components/home/StorageRoom.vue'
import Hallway from '../components/home/Hallway.vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useAnchor } from '../modules/anchor'
import { useLightPavilion } from '../modules/light/pavilion'
import { useMovementRhythm } from '../modules/movement/rhythm'
import { aggregateTodayRoomStats } from '../modules/home/today-room-stats'
import type { TodayRoomStats } from '../modules/home/today-room-stats'
import HomeBridgePanel from '../components/HomeBridgePanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const router = useRouter()
const constitution = useConstitution()
const statsStore = useStatsStore()

const { currentScene, currentSceneId, switchScene } = useRoomAtmosphere()

// ---- 房间气味维度（第四感官氛围，纯前端暗示）----
const { currentScent, enabled, cycleSceneScent, setEnabled, load: loadScent } = useRoomScent()
loadScent()

// ---- 气候层氛围预设（含气味维度第五维）接线 ----
// ROOM_SCENES 与 HOME_ROOMS 已统一为同一套房间词表（living-room / dining-room / bathroom / balcony），
// 场景 id 可直接作为氛围引擎的 roomType 命中「适合房间的预设」；无命中时回退全量预设。
const atmosphere = useHomeAtmosphereEngine()
const roomAtmospherePresets = computed<AtmospherePreset[]>(() => {
  const matched = atmosphere.getPresetsForRoom(currentSceneId.value)
  return matched.length > 0 ? matched : atmosphere.presets.value
})
const activePresetId = atmosphere.activePresetId
const activeScentHints = atmosphere.activeScentHints
function activateAtmospherePreset(id: string) {
  atmosphere.activatePreset(id)
}

// ---- 场景标签指示器 ----
const tabRefs = ref<HTMLElement[]>([])
const activeTabOffset = ref(0)
const activeTabWidth = ref(0)

function updateTabIndicator() {
  nextTick(() => {
    const idx = ROOM_SCENES.findIndex(s => s.id === currentSceneId.value)
    const el = tabRefs.value[idx]
    if (el) {
      activeTabOffset.value = el.offsetLeft
      activeTabWidth.value = el.offsetWidth
    }
  })
}

watch(currentSceneId, updateTabIndicator)

// ---- 房间 ID → 组件映射 ----
const ROOM_COMPONENTS: Record<string, Component> = {
  entrance: EntranceHall,
  wardrobe: ClosetRoom,
  kitchen: KitchenDining,
  'dining-room': DiningRoom,
  bedroom: Bedroom,
  bathroom: Bathroom,
  'living-room': LivingRoom,
  study: StudyRoom,
  courtyard: Courtyard,
  balcony: Balcony,
  storage: StorageRoom,
}

/** 房间 ID 别名映射（仅保留非恒等的遗留别名；HOME_ROOMS 与场景词表已统一为同一套 id） */
const ROOM_ID_ALIAS: Record<string, string> = {
  'yard': 'courtyard',
}

// ---- 深链：从「家 · 3D」等距场景点击房间进入时，切换到对应 2D 场景 ----
// 接收 ?room=<HOME_ROOMS id>（含 living-room / bathroom / dining-room），
// 经 ROOM_ID_ALIAS 映射到 2D 场景词表（living / bath / dining）。
const route = useRoute()
watch(
  () => route.query.room,
  (roomId) => {
    if (typeof roomId !== 'string' || roomId.length === 0) return
    const normalized = ROOM_ID_ALIAS[roomId] ?? roomId
    switchScene(normalized)
  },
  { immediate: true },
)

/** 外部路由（非家内部房间，走 vue-router） */
const EXTERNAL_ROUTES = new Set(['habit-tree', 'garden', 'life-compass', 'abyss'])

/** 当前房间组件 */
const currentRoomComponent = computed<Component>(() => {
  return ROOM_COMPONENTS[currentSceneId.value] ?? EntranceHall
})

/** 走廊导航用的房间列表 */
const hallwayRooms = computed(() =>
  ROOM_SCENES.map(s => ({ id: s.id, name: s.name, icon: s.icon }))
)

/** 处理房间组件发出的导航事件 */
function handleNavigate(roomId: string) {
  // 1. 检查是否外部路由
  if (EXTERNAL_ROUTES.has(roomId)) {
    router.push({ name: roomId })
    return
  }

  // 2. 检查是否别名映射
  const normalizedId = ROOM_ID_ALIAS[roomId] ?? roomId

  // 3. 尝试切到家内部房间
  const switched = switchScene(normalizedId)
  if (!switched) {
    // 4. 不是家内部房间，尝试当作路由名导航
    router.push({ name: normalizedId })
  }
}

const visitorMode = ref(false)

function toggleVisitorMode() {
  visitorMode.value = !visitorMode.value
}

const stats = statsStore.homeStats

// ---- 跨房间「今日」聚合（纯本地汇聚，无日历云同步） ----
const anchorModule = useAnchor()
const lightModule = useLightPavilion()
const movementModule = useMovementRhythm()

const todayRoomStats = computed<TodayRoomStats>(() =>
  aggregateTodayRoomStats({
    anchors: anchorModule.allAnchors.value,
    meditations: lightModule.meditations.value,
    releases: lightModule.releases.value,
    movements: movementModule.records.value,
  })
)

const mantra = ref(constitution.getRandomMantra())
function refreshMantra() {
  mantra.value = constitution.getRandomMantra()
}

// ---- 家 3D 房间壳（M3-一期 · Three.js 动态导入，懒加载不进主包） ----
const { profile: qualityProfile } = useAdaptiveQuality()
const viewMode = ref<'2d' | '3d'>('2d')
const roomCanvas = ref<HTMLCanvasElement | null>(null)
let scene3d: HomeRoomScene | null = null

async function enable3D(): Promise<void> {
  if (!scene3d) {
    // 动态导入：three 仅在此刻进入运行时，2D 首屏零包体增量
    const mod = await import('../modules/home/useHomeRoomScene3D')
    scene3d = mod.createHomeRoomScene({ dprCap: qualityProfile.value.dprCap })
  }
  await nextTick()
  if (roomCanvas.value) {
    scene3d.mount(roomCanvas.value)
    scene3d.setRoom({ glow: currentScene.value.atmosphereColor })
  }
}

function disable3D(): void {
  scene3d?.dispose()
  scene3d = null
}

function toggleViewMode(): void {
  if (viewMode.value === '3d') {
    viewMode.value = '2d'
    disable3D()
  } else {
    viewMode.value = '3d'
    void enable3D()
  }
}

// 房间切换时同步 3D 壳颜色（仅 3D 态，不重建几何）
watch(currentSceneId, () => {
  if (viewMode.value === '3d' && scene3d) {
    scene3d.setRoom({ glow: currentScene.value.atmosphereColor })
  }
})

// 拖拽环绕相机（指针事件绑在 room-viewport 容器）
let dragging = false
let lastX = 0
let lastY = 0
function onPointerDown(e: PointerEvent): void {
  dragging = true
  lastX = e.clientX
  lastY = e.clientY
}
function onPointerMove(e: PointerEvent): void {
  if (!dragging || !scene3d) return
  scene3d.rotateBy(e.clientX - lastX, e.clientY - lastY)
  lastX = e.clientX
  lastY = e.clientY
}
function onPointerUp(): void {
  dragging = false
}

onUnmounted(() => disable3D())
</script>

<style scoped>
.home-space {
  position: relative;
  max-width: 860px;
  margin: 0 auto;
  padding: calc(48px * (0.7 + 0.3 * var(--hf-empty-space, 1))) 32px calc(100px * (0.7 + 0.3 * var(--hf-empty-space, 1)));
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* ---- 氛围签名（光 + 气味维度）---- */
.ambiance-signature {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.amb-sig-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 13px;
  border: 1px solid rgba(180, 160, 130, 0.22);
  background: rgba(255, 252, 245, 0.55);
  color: #6b5d49;
  backdrop-filter: blur(4px);
}

.amb-sig-light b {
  font-weight: 600;
  color: #5a4a36;
}

.amb-sig-scent {
  cursor: pointer;
  border-color: color-mix(in srgb, var(--scent-color, #c8e8d2) 55%, transparent);
  background: color-mix(in srgb, var(--scent-color, #c8e8d2) 22%, rgba(255, 252, 245, 0.55));
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.amb-sig-scent:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--scent-color, #c8e8d2) 30%, transparent);
}

.amb-sig-emoji {
  font-size: 15px;
}

.amb-sig-name {
  font-weight: 600;
}

.amb-sig-mood {
  opacity: 0.7;
  font-size: 12px;
}

.amb-sig-hint {
  margin-left: 2px;
  font-size: 11px;
  opacity: 0.45;
}

.amb-sig-off {
  cursor: pointer;
  opacity: 0.6;
  border-style: dashed;
}

.amb-sig-off:hover {
  opacity: 0.9;
}

/* ---- 气候层氛围预设（含气味维度第五维）---- */
.atmosphere-presets .preset-track {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.preset-chip {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--accent-rgb), 0.04);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.preset-chip:hover {
  border-color: rgba(var(--accent-rgb), 0.32);
  color: var(--text-primary, #e8e0d8);
  transform: translateY(-1px);
}

.preset-chip.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: var(--atmos-color, #d4a574);
  color: var(--accent, #d4a574);
}

.preset-scent-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.preset-scent-tag {
  font-size: 11px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  letter-spacing: 1px;
}

.preset-scent {
  cursor: default;
}

.scent-fade-enter-active,
.scent-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.scent-fade-enter-from,
.scent-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ---- 氛围背景 ---- */
.home-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.atmos-warm-glow {
  position: absolute;
  top: -10%;
  left: 10%;
  width: 80%;
  height: 50%;
  background: radial-gradient(
    ellipse at 30% 40%,
    color-mix(in srgb, var(--atmos-color, #d4a574) 8%, transparent) 0%,
    transparent 60%
  );
  animation: home-breathe calc(7s / var(--hf-breathing-speed, 1)) ease-in-out infinite;
}

.atmos-door-light {
  position: absolute;
  bottom: -10%;
  right: 10%;
  width: 50%;
  height: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(90, 184, 160, 0.03) 0%,
    transparent 60%
  );
  animation: home-breathe calc(9s / var(--hf-breathing-speed, 1)) ease-in-out infinite 2s;
}

@keyframes home-breathe {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ---- 头部入场动画 ---- */
.home-header {
  text-align: center;
  position: relative;
  z-index: 1;
  animation: home-header-enter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes home-header-enter {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 场景标签栏入场动画（延迟） */
.scene-tabs {
  animation: home-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
}

/* 房间视口入场动画 */
.room-viewport {
  animation: home-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
}

/* 殿堂状况入场动画 */
.spatial-section {
  animation: home-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
}

/* 访客模式入场动画 */
.spatial-section:last-of-type {
  animation: home-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both;
}

@keyframes home-fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---- 头部 ---- */

.home-header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 12px 0;
}

.orn-line {
  display: block;
  width: 60px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--accent-rgb), 0.25),
    transparent
  );
}

.orn-diamond {
  font-size: 9px;
  color: var(--accent, #d4a574);
  opacity: 0.4;
}

.home-title {
  font-size: 28px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 3px;
  color: var(--text-primary, #e8e0d8);
  margin: 0;
}

.home-subtitle {
  font-size: 13px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  margin: 8px 0 0;
  letter-spacing: 1px;
}

/* ---- 通用 section ---- */
.section-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin: 0 0 16px;
  letter-spacing: 0.5px;
}

.spatial-section {
  position: relative;
  z-index: 1;
}

/* ---- 场景切换栏 ---- */
.scene-tabs {
  position: relative;
  z-index: 1;
}

.scene-tabs-track {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
}

.scene-tab-indicator {
  position: absolute;
  bottom: 0;
  height: 100%;
  border-radius: 999px;
  background: var(--bg-card);
  border: 1px solid var(--atmos-color, #d4a574);
  transition: left 0.35s cubic-bezier(0.22, 1, 0.36, 1),
              width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  z-index: 0;
}

.scene-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.scene-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.25s ease, transform 0.2s ease;
  position: relative;
  z-index: 1;
}

.scene-tab:hover {
  color: var(--text-primary, #e8e0d8);
  transform: translateY(-1px);
}

.scene-tab:active {
  transform: translateY(0) scale(0.97);
}

.scene-tab.active {
  color: var(--atmos-color, #d4a574);
}

.scene-tab-icon {
  font-size: 16px;
  line-height: 1;
  transition: transform 0.3s ease;
}

.scene-tab.active .scene-tab-icon {
  transform: scale(1.15);
}

.scene-tab-name {
  font-size: 12px;
  font-weight: 500;
}

/* ---- 房间视口 ---- */
.room-viewport {
  position: relative;
  z-index: 1;
  min-height: 40vh;
}

/* 房间过渡动画 — 光门扩散效果 */
.room-fade-enter-active {
  position: relative;
  transition: opacity calc(0.45s * var(--hf-scene-transition, 1)) cubic-bezier(0.22, 1, 0.36, 1),
              transform calc(0.45s * var(--hf-scene-transition, 1)) cubic-bezier(0.22, 1, 0.36, 1);
}

.room-fade-leave-active {
  transition: opacity calc(0.25s * var(--hf-scene-transition, 1)) ease, transform calc(0.25s * var(--hf-scene-transition, 1)) ease;
}

.room-fade-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.room-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ---- 家 3D 房间壳（M3-一期） ---- */
.room-3d-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  display: block;
  border-radius: 16px;
}
.room-content {
  position: relative;
  z-index: 1;
}
.room-viewport--3d {
  min-height: 52vh;
  overflow: hidden;
  border-radius: 16px;
  background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.04), transparent 70%);
}
.room-content--3d {
  margin: 16px auto;
  max-width: 720px;
  padding: 20px;
  border-radius: 16px;
  background: rgba(16, 13, 10, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
}
.view-mode-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(180, 160, 130, 0.3);
  background: rgba(13, 11, 9, 0.85);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  letter-spacing: 1px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: all 0.25s ease;
}
.view-mode-toggle:hover {
  color: var(--text-primary, #e8e0d8);
  border-color: rgba(180, 160, 130, 0.5);
}
.view-mode-toggle.active {
  color: #fce4b3;
  border-color: rgba(252, 228, 179, 0.5);
}

/* ---- 走廊导航 ---- */
.hallway-section {
  position: relative;
  z-index: 1;
  margin-top: 8px;
}

/* ---- 殿堂状况 ---- */
.status-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.status-card {
  min-height: 100px;
  padding: 18px;
  border-radius: 16px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
              background 0.3s ease,
              border-color 0.3s ease,
              box-shadow 0.3s ease;
  cursor: default;
}

.status-card:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.18);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
              0 0 24px rgba(var(--accent-rgb), 0.04);
}

.status-card:active {
  transform: translateY(0) scale(0.98);
}

.status-value {
  font-size: 28px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  font-variant-numeric: tabular-nums;
  transition: color 0.3s ease;
}

.status-card:hover .status-value {
  color: var(--atmos-color, #d4a574);
}

.status-label {
  font-size: 12px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  transition: color 0.3s ease;
}

.status-card:hover .status-label {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.status-sub {
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  transition: color 0.3s ease;
}

.status-card:hover .status-sub {
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
}

/* ---- 访客模式 ---- */
.guest-toggle {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.guest-btn {
  align-self: flex-start;
  padding: 10px 24px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  overflow: hidden;
}

.guest-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at var(--ripple-x, 50%) var(--ripple-y, 50%),
    rgba(var(--accent-rgb), 0.15) 0%,
    transparent 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.guest-btn:hover {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--text-primary, #e8e0d8);
  transform: translateY(-1px);
}

.guest-btn:hover::after {
  opacity: 1;
}

.guest-btn:active {
  transform: translateY(0) scale(0.97);
}

.guest-btn.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent, #d4a574);
}

.guest-hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  margin: 0;
}

/* ---- 宪法箴言 ---- */
.home-mantra {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  border-radius: 40px;
  background: rgba(26, 22, 18, 0.6);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  cursor: pointer;
  transition: all 0.4s ease;
  max-width: 600px;
  backdrop-filter: blur(8px);
  user-select: none;
}

.home-mantra:hover {
  background: var(--bg-card);
  border-color: rgba(var(--accent-rgb), 0.2);
}
.home-mantra:focus-visible {
  outline: 2px solid rgba(var(--accent-rgb), 0.5);
  outline-offset: -2px;
}

.mantra-icon {
  font-size: 14px;
  opacity: 0.3;
  flex-shrink: 0;
}

.home-mantra:hover .mantra-icon {
  opacity: 0.6;
}

/* 移动端避让底部导航（沿用壳层 .astrolabe-summon-btn 的 edge-bar 契约） */
@media (max-width: 639px) {
  .home-mantra {
    bottom: calc(var(--edge-bar-h, 56px) + 16px);
    max-width: calc(100vw - 32px);
  }
}

.mantra-text {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
}

.mantra-source {
  font-size: 11px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  font-style: normal;
  opacity: 0.5;
  flex-shrink: 0;
}

/* ---- 响应式 ---- */
@media (max-width: 860px) {
  /* 平板端：重排 + 密度变化 */
  .home-space {
    padding: 28px 20px 100px;
    gap: 32px;
  }

  /* 场景切换栏：紧凑排列 */
  .scene-tabs {
    gap: 6px;
  }

  .scene-tab {
    padding: 6px 12px;
    font-size: 11px;
  }

  .scene-tab-icon {
    font-size: 14px;
  }

  .scene-tab-name {
    font-size: 11px;
  }

  /* 殿堂状况：2列 */
  .status-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .status-card {
    min-height: 80px;
    padding: 14px;
  }

  .status-value {
    font-size: 22px;
  }

  .home-title {
    font-size: 24px;
  }

  .home-header-ornament {
    gap: 8px;
  }

  .orn-line {
    width: 40px;
  }
}

@media (max-width: 640px) {
  /* 移动端：完全重排 + 分层变化 */
  .home-space {
    padding: 20px 14px 90px;
    gap: 24px;
  }

  .home-header {
    padding-top: 40px;
  }

  .home-title {
    font-size: 20px;
    letter-spacing: 2px;
  }

  .home-subtitle {
    font-size: 11px;
  }

  .home-header-ornament {
    gap: 6px;
  }

  .orn-line {
    width: 28px;
  }

  .orn-diamond {
    font-size: 7px;
  }

  /* 场景切换栏：水平滚动 */
  .scene-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    gap: 6px;
    padding-bottom: 4px;
  }
  .scene-tabs::-webkit-scrollbar { display: none; }

  .scene-tab {
    flex-shrink: 0;
    padding: 6px 10px;
    font-size: 10px;
  }

  .scene-tab-icon {
    font-size: 12px;
  }

  .scene-tab-name {
    font-size: 10px;
  }

  /* 殿堂状况：2列紧凑 */
  .status-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .status-card {
    min-height: 64px;
    padding: 10px 12px;
    border-radius: 12px;
    gap: 4px;
  }

  .status-value {
    font-size: 18px;
  }

  .status-label {
    font-size: 10px;
  }

  /* 访客模式：紧凑 */
  .guest-toggle {
    gap: 8px;
  }

  .guest-btn {
    width: 100%;
    text-align: center;
    padding: 8px 16px;
    font-size: 12px;
  }

  .guest-hint {
    font-size: 11px;
  }

  /* 宪法箴言：底部紧凑 */
  .home-mantra {
    bottom: 12px;
    padding: 8px 14px;
    max-width: calc(100vw - 28px);
    gap: 8px;
  }

  .mantra-icon {
    font-size: 12px;
  }

  .mantra-text {
    font-size: 11px;
  }

  .mantra-source {
    display: none;
  }
}
</style>