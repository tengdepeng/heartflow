// ============================================================
// 家 · 房间交互增强
// 场景编辑器、房间自定义、交互状态管理、氛围调节
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { HOME_ROOMS } from './rooms'

// ============================================================
// 类型定义
// ============================================================

/** 房间装饰物 */
export interface RoomDecoration {
  id: string
  name: string
  icon: string
  /** 装饰物类型 */
  type: 'furniture' | 'plant' | 'lighting' | 'artwork' | 'textile' | 'collectible'
  /** 放置位置 */
  position: 'center' | 'left' | 'right' | 'corner' | 'wall' | 'floor'
  /** 是否已放置 */
  placed: boolean
  /** 解锁条件 */
  unlockCondition?: string
}

/** 房间自定义状态 */
export interface RoomCustomState {
  roomId: string
  /** 当前氛围强度 0-100 */
  atmosphereIntensity: number
  /** 已放置的装饰物 */
  decorations: RoomDecoration[]
  /** 房间主题色覆盖 */
  customColor?: string
  /** 房间名称覆盖 */
  customName?: string
  /** 是否启用环境音效 */
  ambientSoundEnabled: boolean
  /** 环境音效音量 0-1 */
  ambientVolume: number
  /** 最后访问时间 */
  lastVisitedAt?: string
  /** 访问次数 */
  visitCount: number
}

/** 场景编辑器配置 */
export interface SceneEditorConfig {
  /** 是否启用场景编辑器 */
  enabled: boolean
  /** 当前编辑的房间 ID */
  editingRoomId: string | null
  /** 网格吸附 */
  snapToGrid: boolean
  /** 网格大小 */
  gridSize: number
  /** 是否显示辅助线 */
  showGuides: boolean
}

/** 房间交互事件 */
export interface RoomInteractionEvent {
  id: string
  roomId: string
  type: 'enter' | 'leave' | 'click' | 'decorate' | 'customize'
  detail: string
  timestamp: string
}

/** 装饰物类型元数据 */
export const DECORATION_TYPE_META: Record<RoomDecoration['type'], { label: string; icon: string }> = {
  furniture: { label: '家具', icon: '🪑' },
  plant: { label: '植物', icon: '🪴' },
  lighting: { label: '灯光', icon: '💡' },
  artwork: { label: '装饰画', icon: '🖼️' },
  textile: { label: '布艺', icon: '🧶' },
  collectible: { label: '收藏品', icon: '🏺' },
}

/** 预设装饰物库 */
export const DECORATION_LIBRARY: RoomDecoration[] = [
  // 家具
  { id: 'dec-sofa', name: '沙发', icon: '🛋️', type: 'furniture', position: 'center', placed: false },
  { id: 'dec-bookshelf', name: '书架', icon: '📚', type: 'furniture', position: 'wall', placed: false },
  { id: 'dec-desk', name: '书桌', icon: '🪑', type: 'furniture', position: 'center', placed: false },
  { id: 'dec-bed', name: '床榻', icon: '🛏️', type: 'furniture', position: 'center', placed: false },
  { id: 'dec-table', name: '餐桌', icon: '🍽️', type: 'furniture', position: 'center', placed: false },
  { id: 'dec-wardrobe', name: '衣柜', icon: '👔', type: 'furniture', position: 'wall', placed: false },
  { id: 'dec-bathtub', name: '浴缸', icon: '🛁', type: 'furniture', position: 'corner', placed: false },
  { id: 'dec-cabinet', name: '收纳柜', icon: '🗄️', type: 'furniture', position: 'wall', placed: false },
  // 植物
  { id: 'dec-bonsai', name: '盆栽', icon: '🪴', type: 'plant', position: 'corner', placed: false },
  { id: 'dec-flower-vase', name: '花瓶', icon: '💐', type: 'plant', position: 'center', placed: false },
  { id: 'dec-terrarium', name: '微景观', icon: '🌿', type: 'plant', position: 'corner', placed: false },
  // 灯光
  { id: 'dec-floor-lamp', name: '落地灯', icon: '💡', type: 'lighting', position: 'corner', placed: false },
  { id: 'dec-candle', name: '蜡烛', icon: '🕯️', type: 'lighting', position: 'center', placed: false },
  { id: 'dec-lantern', name: '灯笼', icon: '🏮', type: 'lighting', position: 'wall', placed: false },
  { id: 'dec-string-lights', name: '串灯', icon: '✨', type: 'lighting', position: 'wall', placed: false },
  // 装饰画
  { id: 'dec-painting', name: '挂画', icon: '🖼️', type: 'artwork', position: 'wall', placed: false },
  { id: 'dec-scroll', name: '卷轴', icon: '📜', type: 'artwork', position: 'wall', placed: false },
  { id: 'dec-photo-frame', name: '相框', icon: '🖼️', type: 'artwork', position: 'wall', placed: false },
  // 布艺
  { id: 'dec-rug', name: '地毯', icon: '🧶', type: 'textile', position: 'floor', placed: false },
  { id: 'dec-cushion', name: '靠垫', icon: '🛋️', type: 'textile', position: 'center', placed: false },
  { id: 'dec-curtain', name: '窗帘', icon: '🪟', type: 'textile', position: 'wall', placed: false },
  // 收藏品
  { id: 'dec-hourglass', name: '沙漏', icon: '⏳', type: 'collectible', position: 'center', placed: false },
  { id: 'dec-music-box', name: '八音盒', icon: '🎵', type: 'collectible', position: 'center', placed: false, unlockCondition: '完成10次专注' },
  { id: 'dec-snow-globe', name: '水晶球', icon: '🔮', type: 'collectible', position: 'center', placed: false, unlockCondition: '累计专注100小时' },
  { id: 'dec-compass', name: '指南针', icon: '🧭', type: 'collectible', position: 'center', placed: false, unlockCondition: '探索所有房间' },
]

/** 存储键 */
const HOME_CUSTOM_STORAGE_KEY = 'hf:home:custom_states'
const HOME_INTERACTION_STORAGE_KEY = 'hf:home:interactions'
const HOME_SCENE_EDITOR_KEY = 'hf:home:scene_editor'

// ============================================================
// 房间交互组合式函数
// ============================================================

export function useHomeRoomInteraction() {
  const customStates = ref<RoomCustomState[]>(loadCustomStates())
  const interactions = ref<RoomInteractionEvent[]>(loadInteractions())
  const sceneEditor = ref<SceneEditorConfig>(loadSceneEditor())
  const isEditing = ref(false)

  // ---- 持久化 ----

  function loadCustomStates(): RoomCustomState[] {
    try {
      const raw = storage.getKV<string>(HOME_CUSTOM_STORAGE_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveCustomStates() {
    storage.setKV(HOME_CUSTOM_STORAGE_KEY, JSON.stringify(customStates.value))
  }

  function loadInteractions(): RoomInteractionEvent[] {
    try {
      const raw = storage.getKV<string>(HOME_INTERACTION_STORAGE_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveInteractions() {
    storage.setKV(HOME_INTERACTION_STORAGE_KEY, JSON.stringify(interactions.value))
  }

  function loadSceneEditor(): SceneEditorConfig {
    try {
      const raw = storage.getKV<string>(HOME_SCENE_EDITOR_KEY, '')
      if (!raw) return { enabled: false, editingRoomId: null, snapToGrid: true, gridSize: 20, showGuides: true }
      return JSON.parse(raw)
    } catch { return { enabled: false, editingRoomId: null, snapToGrid: true, gridSize: 20, showGuides: true } }
  }

  function saveSceneEditor() {
    storage.setKV(HOME_SCENE_EDITOR_KEY, JSON.stringify(sceneEditor.value))
  }

  // ---- 房间自定义状态 ----

  /** 获取房间自定义状态（不存在则创建） */
  function getRoomState(roomId: string): RoomCustomState {
    let state = customStates.value.find(s => s.roomId === roomId)
    if (!state) {
      state = {
        roomId,
        atmosphereIntensity: 70,
        decorations: [],
        ambientSoundEnabled: true,
        ambientVolume: 0.5,
        visitCount: 0,
      }
      customStates.value.push(state)
      saveCustomStates()
    }
    return state
  }

  /** 记录房间访问 */
  function recordVisit(roomId: string) {
    const state = getRoomState(roomId)
    state.lastVisitedAt = new Date().toISOString()
    state.visitCount++
    saveCustomStates()
    recordInteraction(roomId, 'enter', `进入房间`)
  }

  /** 更新房间氛围强度 */
  function setAtmosphereIntensity(roomId: string, intensity: number) {
    const state = getRoomState(roomId)
    state.atmosphereIntensity = Math.max(0, Math.min(100, intensity))
    saveCustomStates()
  }

  /** 设置房间自定义名称 */
  function setRoomCustomName(roomId: string, name: string) {
    const state = getRoomState(roomId)
    state.customName = name || undefined
    saveCustomStates()
  }

  /** 设置房间自定义颜色 */
  function setRoomCustomColor(roomId: string, color: string) {
    const state = getRoomState(roomId)
    state.customColor = color || undefined
    saveCustomStates()
  }

  /** 切换环境音效 */
  function toggleAmbientSound(roomId: string) {
    const state = getRoomState(roomId)
    state.ambientSoundEnabled = !state.ambientSoundEnabled
    saveCustomStates()
  }

  /** 设置环境音效音量 */
  function setAmbientVolume(roomId: string, volume: number) {
    const state = getRoomState(roomId)
    state.ambientVolume = Math.max(0, Math.min(1, volume))
    saveCustomStates()
  }

  // ---- 装饰物管理 ----

  /** 放置装饰物 */
  function placeDecoration(roomId: string, decorationId: string): boolean {
    const state = getRoomState(roomId)
    const decoration = DECORATION_LIBRARY.find(d => d.id === decorationId)
    if (!decoration) return false
    if (state.decorations.some(d => d.id === decorationId)) return false
    state.decorations.push({ ...decoration, placed: true })
    saveCustomStates()
    recordInteraction(roomId, 'decorate', `放置了${decoration.name}`)
    return true
  }

  /** 移除装饰物 */
  function removeDecoration(roomId: string, decorationId: string): boolean {
    const state = getRoomState(roomId)
    const idx = state.decorations.findIndex(d => d.id === decorationId)
    if (idx === -1) return false
    state.decorations.splice(idx, 1)
    saveCustomStates()
    return true
  }

  /** 获取已放置装饰物 */
  function getPlacedDecorations(roomId: string): RoomDecoration[] {
    return getRoomState(roomId).decorations
  }

  /** 获取可用装饰物（未放置的 + 已解锁的） */
  const availableDecorations = computed(() => {
    return DECORATION_LIBRARY.filter(d => !d.unlockCondition)
  })

  // ---- 场景编辑器 ----

  /** 进入场景编辑模式 */
  function enterEditMode(roomId: string) {
    sceneEditor.value.enabled = true
    sceneEditor.value.editingRoomId = roomId
    isEditing.value = true
    saveSceneEditor()
  }

  /** 退出场景编辑模式 */
  function exitEditMode() {
    sceneEditor.value.enabled = false
    sceneEditor.value.editingRoomId = null
    isEditing.value = false
    saveSceneEditor()
  }

  /** 切换网格吸附 */
  function toggleSnapToGrid() {
    sceneEditor.value.snapToGrid = !sceneEditor.value.snapToGrid
    saveSceneEditor()
  }

  /** 切换辅助线 */
  function toggleGuides() {
    sceneEditor.value.showGuides = !sceneEditor.value.showGuides
    saveSceneEditor()
  }

  /** 设置网格大小 */
  function setGridSize(size: number) {
    sceneEditor.value.gridSize = Math.max(10, Math.min(100, size))
    saveSceneEditor()
  }

  /** 重置房间到默认状态 */
  function resetRoom(roomId: string) {
    const idx = customStates.value.findIndex(s => s.roomId === roomId)
    if (idx !== -1) {
      customStates.value.splice(idx, 1)
    }
    saveCustomStates()
  }

  // ---- 交互记录 ----

  function recordInteraction(roomId: string, type: RoomInteractionEvent['type'], detail: string) {
    const event: RoomInteractionEvent = {
      id: `interact_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      roomId,
      type,
      detail,
      timestamp: new Date().toISOString(),
    }
    interactions.value.push(event)
    // 只保留最近 500 条
    if (interactions.value.length > 500) {
      interactions.value = interactions.value.slice(-500)
    }
    saveInteractions()
  }

  /** 获取房间交互历史 */
  function getRoomInteractions(roomId: string, limit?: number): RoomInteractionEvent[] {
    const filtered = interactions.value
      .filter(e => e.roomId === roomId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return limit ? filtered.slice(0, limit) : filtered
  }

  /** 获取房间访问统计 */
  function getRoomVisitStats(): { roomId: string; name: string; visitCount: number; lastVisitedAt?: string }[] {
    return HOME_ROOMS.map(room => {
      const state = customStates.value.find(s => s.roomId === room.id)
      return {
        roomId: room.id,
        name: state?.customName || room.name,
        visitCount: state?.visitCount ?? 0,
        lastVisitedAt: state?.lastVisitedAt,
      }
    }).sort((a, b) => b.visitCount - a.visitCount)
  }

  /** 获取最常访问的房间 */
  const mostVisitedRoom = computed(() => {
    const stats = getRoomVisitStats()
    return stats[0] || null
  })

  /** 获取最近访问的房间 */
  const recentlyVisitedRoom = computed(() => {
    const stats = getRoomVisitStats()
    const visited = stats.filter(s => s.lastVisitedAt)
    if (visited.length === 0) return null
    return visited.sort((a, b) =>
      new Date(b.lastVisitedAt!).getTime() - new Date(a.lastVisitedAt!).getTime()
    )[0]
  })

  return {
    // 状态
    customStates,
    interactions,
    sceneEditor,
    isEditing,
    availableDecorations,

    // 房间状态
    getRoomState,
    recordVisit,
    setAtmosphereIntensity,
    setRoomCustomName,
    setRoomCustomColor,
    toggleAmbientSound,
    setAmbientVolume,

    // 装饰物
    placeDecoration,
    removeDecoration,
    getPlacedDecorations,

    // 场景编辑器
    enterEditMode,
    exitEditMode,
    toggleSnapToGrid,
    toggleGuides,
    setGridSize,
    resetRoom,

    // 交互记录
    getRoomInteractions,
    getRoomVisitStats,
    mostVisitedRoom,
    recentlyVisitedRoom,
  }
}