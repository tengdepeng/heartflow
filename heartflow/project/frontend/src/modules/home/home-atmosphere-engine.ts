// ============================================================
// 家空间 · 高级氛围引擎
// 房间转场动画、高级氛围渲染、家庭活动仪表盘
// ------------------------------------------------------------
// 蓝图概念映射（D4 · 五维视觉材质工坊）
// 蓝图单一概念「五维视觉材质工坊」在本实现中拆分为两个协作层：
//   · 视觉材质层 —— views/MaterialWorkshop.vue
//     （风格包 / 视觉隐喻 / 自定义调色板 / 单房间风格覆盖 / 导入导出）
//   · 五维环境层（本模块）—— 蓝图第一层「环境系统」五维：
//     光(layer)、声音(soundscape)、动态(转场/粒子)、
//     触觉暗示(texture)、气味暗示(scentHints)，全部维度已落地。
// 二者共同构成蓝图的统一概念；此处仅为命名拆分，无功能缺漏。
// ============================================================

import { ref, computed, watch } from 'vue'
import { storage } from '../../engine/storage'
import { usePerceptionStore } from '../../stores/perception'
import type { HomeRoom } from './rooms'

// ============================================================
// 类型定义
// ============================================================

/** 房间转场动画 */
export type RoomTransitionType = 'fade' | 'slide-left' | 'slide-right' | 'zoom' | 'dissolve' | 'portal'

/** 转场配置 */
export interface RoomTransition {
  id: string
  /** 起始房间 */
  fromRoomId: string
  /** 目标房间 */
  toRoomId: string
  /** 转场类型 */
  type: RoomTransitionType
  /** 持续时间（毫秒） */
  duration: number
  /** 缓动函数 */
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier'
  /** 是否启用 */
  enabled: boolean
}

/** 氛围层 */
export interface AtmosphereLayer {
  id: string
  /** 层类型 */
  type: 'gradient' | 'particle' | 'light' | 'shadow' | 'texture' | 'vignette'
  /** 配置 */
  config: Record<string, unknown>
  /** 透明度 */
  opacity: number
  /** 混合模式 */
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light'
  /** 是否启用 */
  enabled: boolean
}

/** 氛围预设 */
export interface AtmospherePreset {
  id: string
  name: string
  description: string
  /** 适合的房间类型 */
  roomTypes: string[]
  /** 声景配置 */
  soundscape: AtmosphereSoundscape
  /** 视觉层 */
  layers: AtmosphereLayer[]
  /** 气味暗示（气候层第五维） */
  scentHints: AtmosphereScent[]
  /** 创建时间 */
  createdAt: string
}

/** 声景 */
export interface AtmosphereSoundscape {
  /** 主环境音 */
  mainAmbient: string
  /** 音量 0-1 */
  volume: number
  /** 是否有白噪音 */
  whiteNoise: boolean
  /** 白噪音类型 */
  whiteNoiseType?: 'rain' | 'fire' | 'wind' | 'stream' | 'cafe' | 'silence'
  /** 背景音乐 */
  bgm?: string
  /** BGM音量 */
  bgmVolume?: number
}

/**
 * 气味暗示（蓝图环境气候层第五维度）
 * 蓝图第一层「环境系统」明确定义环境含 光/声音/动态/触觉暗示/气味暗示 五维。
 * 此前代码只建模了光（layers）、声音（soundscape），气味维度全程缺失。
 * 这是「暗示」而非真实播放——用户记忆中的气味意象（如溯源树的泥土旧书纸、匠庐木屑金属），
 * 由预设引用语义气味符号来表达，供房间氛围落色与 UI 提示使用。
 */
export interface AtmosphereScent {
  /** 气味符号ID，引用 SCENT_PROFILES */
  symbolId: string
  /** 强度 0-1 */
  intensity: number
}

/**
 * 气味语义符号（与 /customization SymbolSystem 同款模式：
 * 语义目录 + 预设引用，避免把整段中文写进每个预设）。
 * color 为「气味落色」提示（暖/草本/木质等色系），不真实喷香，仅作氛围辅助。
 */
export interface ScentProfile {
  id: string
  /** 显示名 */
  label: string
  /** 语义描述 */
  description: string
  /** 气味落色（CSS 颜色，作氛围辅助） */
  color: string
  /** 气味调性 */
  tone: 'earthy' | 'woody' | 'leather' | 'herbal' | 'warm' | 'floral' | 'fresh' | 'mineral'
}

export const SCENT_PROFILES: ScentProfile[] = [
  { id: 'earth-oldpaper', label: '泥土与旧书纸', description: '溯源树下的潮湿泥土与陈年纸张气息', color: '#9c7a4d', tone: 'earthy' },
  { id: 'wood-metal', label: '木屑与金属', description: '匠庐手作时刨花与工具的清冽金属味', color: '#8a6f4a', tone: 'woody' },
  { id: 'leather-canvas', label: '皮质与帆布', description: '行囊里妥善安放旧物的温润皮革帆布味', color: '#a9744f', tone: 'leather' },
  { id: 'herb', label: '草药', description: '藏象阁中式静室里的草本静气', color: '#7fae6b', tone: 'herbal' },
  { id: 'warm-food', label: '暖食与烟火', description: '厨房炖煮与柴火的热乎食物香', color: '#d98a4a', tone: 'warm' },
  { id: 'clean-fabric', label: '洁净布料', description: '衣帽间织物与皂感的清爽气息', color: '#cdbfae', tone: 'fresh' },
  { id: 'floral', label: '淡花', description: '庭院与卧室里若有若无的花香', color: '#e3a6c4', tone: 'floral' },
  { id: 'rain-stone', label: '雨与石', description: '浴室水雾与庭院雨后青石的矿物清气', color: '#9fc4cf', tone: 'mineral' },
]

/** 气味符号查表 */
export const SCENT_PROFILE_MAP: Record<string, ScentProfile> =
  SCENT_PROFILES.reduce<Record<string, ScentProfile>>((acc, p) => {
    acc[p.id] = p
    return acc
  }, {})

/** 解析后的气味展示项（供 UI 落色与提示） */
export interface ParsedScent {
  symbolId: string
  label: string
  description: string
  tone: ScentProfile['tone']
  /** 落色（CSS 颜色） */
  color: string
  /** 强度 0-1 */
  intensity: number
}

/**
 * 将预设的 scentHints 解析为展示用结构。
 * 未知 symbolId 会被跳过（防御脏数据）；空输入返回 []。
 */
export function parseScentLayer(hints: AtmosphereScent[] | undefined): ParsedScent[] {
  if (!hints || hints.length === 0) return []
  const out: ParsedScent[] = []
  for (const h of hints) {
    const profile = SCENT_PROFILE_MAP[h.symbolId]
    if (!profile) continue
    const intensity = Math.min(1, Math.max(0, h.intensity))
    out.push({
      symbolId: profile.id,
      label: profile.label,
      description: profile.description,
      tone: profile.tone,
      color: profile.color,
      intensity,
    })
  }
  return out
}

/** 房间活动摘要 */
export interface RoomActivitySummary {
  roomId: string
  roomName: string
  /** 今日访问次数 */
  todayVisits: number
  /** 本周访问次数 */
  weeklyVisits: number
  /** 平均停留时间（分钟） */
  avgDuration: number
  /** 最近访问时间 */
  lastVisitedAt: string | null
  /** 活跃度评分 0-100 */
  activityScore: number
  /** 情绪趋势 */
  moodTrend: 'improving' | 'stable' | 'declining'
}

/** 家庭仪表盘 */
export interface HomeDashboard {
  /** 总访问次数 */
  totalVisits: number
  /** 今日活跃房间数 */
  todayActiveRooms: number
  /** 最常访问房间 */
  mostVisitedRoom: string | null
  /** 房间活动摘要 */
  roomSummaries: RoomActivitySummary[]
  /** 最近活动 */
  recentActivities: HomeActivity[]
  /** 生成时间 */
  generatedAt: string
}

/** 家庭活动 */
export interface HomeActivity {
  id: string
  roomId: string
  type: 'visit' | 'decorate' | 'interact' | 'rest' | 'ritual' | 'insight'
  label: string
  timestamp: string
  duration?: number
}

/** 转场预设 */
export const TRANSITION_PRESETS: Omit<RoomTransition, 'id' | 'fromRoomId' | 'toRoomId'>[] = [
  { type: 'fade', duration: 800, easing: 'ease-in-out', enabled: true },
  { type: 'slide-left', duration: 600, easing: 'ease-out', enabled: true },
  { type: 'slide-right', duration: 600, easing: 'ease-out', enabled: true },
  { type: 'zoom', duration: 700, easing: 'ease-in-out', enabled: true },
  { type: 'dissolve', duration: 1000, easing: 'ease', enabled: true },
  { type: 'portal', duration: 900, easing: 'cubic-bezier', enabled: true },
]

/** 氛围预设 */
export const ATMOSPHERE_PRESETS: Omit<AtmospherePreset, 'id' | 'createdAt'>[] = [
  {
    name: '晨光熹微',
    description: '清晨的柔和光线，适合玄关和书房',
    roomTypes: ['entrance', 'study'],
    soundscape: {
      mainAmbient: 'morning-birds',
      volume: 0.3,
      whiteNoise: false,
    },
    scentHints: [
      { symbolId: 'earth-oldpaper', intensity: 0.3 },
      { symbolId: 'floral', intensity: 0.25 },
    ],
    layers: [
      {
        id: 'morning-grad',
        type: 'gradient',
        config: { startColor: '#f5e6d3', endColor: '#c49a6a', angle: 135 },
        opacity: 0.4,
        blendMode: 'overlay',
        enabled: true,
      },
      {
        id: 'morning-light',
        type: 'light',
        config: { color: '#fff8e7', intensity: 0.3, position: 'top-right' },
        opacity: 0.5,
        blendMode: 'screen',
        enabled: true,
      },
    ],
  },
  {
    name: '午后暖阳',
    description: '温暖慵懒的午后光线，适合客厅和阳台',
    roomTypes: ['living-room', 'balcony'],
    soundscape: {
      mainAmbient: 'afternoon-breeze',
      volume: 0.25,
      whiteNoise: false,
    },
    scentHints: [
      { symbolId: 'floral', intensity: 0.3 },
      { symbolId: 'clean-fabric', intensity: 0.2 },
    ],
    layers: [
      {
        id: 'afternoon-grad',
        type: 'gradient',
        config: { startColor: '#ffe4b5', endColor: '#b8987a', angle: 180 },
        opacity: 0.35,
        blendMode: 'overlay',
        enabled: true,
      },
      {
        id: 'afternoon-particle',
        type: 'particle',
        config: { color: '#f0c040', count: 20, speed: 0.3, size: 3 },
        opacity: 0.3,
        blendMode: 'screen',
        enabled: true,
      },
    ],
  },
  {
    name: '暮色沉静',
    description: '黄昏时分的宁静氛围，适合卧室和浴室',
    roomTypes: ['bedroom', 'bathroom'],
    soundscape: {
      mainAmbient: 'evening-calm',
      volume: 0.2,
      whiteNoise: true,
      whiteNoiseType: 'stream',
    },
    scentHints: [
      { symbolId: 'rain-stone', intensity: 0.35 },
      { symbolId: 'floral', intensity: 0.15 },
    ],
    layers: [
      {
        id: 'evening-grad',
        type: 'gradient',
        config: { startColor: '#4a5568', endColor: '#2d3748', angle: 180 },
        opacity: 0.5,
        blendMode: 'multiply',
        enabled: true,
      },
      {
        id: 'evening-vignette',
        type: 'vignette',
        config: { color: '#000000', intensity: 0.6, feather: 0.5 },
        opacity: 0.7,
        blendMode: 'multiply',
        enabled: true,
      },
    ],
  },
  {
    name: '深夜星空',
    description: '深夜的静谧星空，适合书房和庭院',
    roomTypes: ['study', 'courtyard', 'balcony'],
    soundscape: {
      mainAmbient: 'night-silence',
      volume: 0.15,
      whiteNoise: true,
      whiteNoiseType: 'wind',
    },
    scentHints: [
      { symbolId: 'earth-oldpaper', intensity: 0.25 },
      { symbolId: 'rain-stone', intensity: 0.2 },
    ],
    layers: [
      {
        id: 'night-grad',
        type: 'gradient',
        config: { startColor: '#0f172a', endColor: '#1e293b', angle: 180 },
        opacity: 0.6,
        blendMode: 'multiply',
        enabled: true,
      },
      {
        id: 'night-particle',
        type: 'particle',
        config: { color: '#ffffff', count: 30, speed: 0.1, size: 1.5 },
        opacity: 0.4,
        blendMode: 'screen',
        enabled: true,
      },
      {
        id: 'night-shadow',
        type: 'shadow',
        config: { color: '#000000', blur: 40, offsetX: 0, offsetY: 0 },
        opacity: 0.3,
        blendMode: 'multiply',
        enabled: true,
      },
    ],
  },
  {
    name: '烟火厨房',
    description: '温暖热闹的厨房氛围',
    roomTypes: ['kitchen', 'dining-room'],
    soundscape: {
      mainAmbient: 'kitchen-simmer',
      volume: 0.35,
      whiteNoise: false,
    },
    scentHints: [
      { symbolId: 'warm-food', intensity: 0.6 },
    ],
    layers: [
      {
        id: 'kitchen-grad',
        type: 'gradient',
        config: { startColor: '#ffd180', endColor: '#c4a060', angle: 90 },
        opacity: 0.3,
        blendMode: 'overlay',
        enabled: true,
      },
      {
        id: 'kitchen-light',
        type: 'light',
        config: { color: '#ffcc80', intensity: 0.5, position: 'center' },
        opacity: 0.4,
        blendMode: 'screen',
        enabled: true,
      },
    ],
  },
  {
    name: '衣香鬓影',
    description: '优雅精致的衣帽间氛围',
    roomTypes: ['wardrobe'],
    soundscape: {
      mainAmbient: 'rustle',
      volume: 0.2,
      whiteNoise: false,
    },
    scentHints: [
      { symbolId: 'clean-fabric', intensity: 0.4 },
      { symbolId: 'leather-canvas', intensity: 0.3 },
    ],
    layers: [
      {
        id: 'wardrobe-grad',
        type: 'gradient',
        config: { startColor: '#f0dce8', endColor: '#c4a0b8', angle: 45 },
        opacity: 0.3,
        blendMode: 'overlay',
        enabled: true,
      },
      {
        id: 'wardrobe-texture',
        type: 'texture',
        config: { pattern: 'fabric', scale: 1, rotation: 0 },
        opacity: 0.15,
        blendMode: 'soft-light',
        enabled: true,
      },
    ],
  },
]

/** 转场类型元数据 */
export const TRANSITION_TYPE_META: Record<RoomTransitionType, { label: string; icon: string; description: string }> = {
  'fade': { label: '淡入淡出', icon: '🌫️', description: '当前房间渐隐，新房间渐显' },
  'slide-left': { label: '左滑', icon: '⬅️', description: '新房间从右侧滑入' },
  'slide-right': { label: '右滑', icon: '➡️', description: '新房间从左侧滑入' },
  'zoom': { label: '缩放', icon: '🔍', description: '从当前房间放大进入新房间' },
  'dissolve': { label: '溶解', icon: '✨', description: '粒子溶解过渡效果' },
  'portal': { label: '传送门', icon: '🌀', description: '传送门漩涡转场' },
}

/** 存储键 */
const HOME_ATMOSPHERE_KEY = 'hf:home:atmosphere'
const HOME_TRANSITIONS_KEY = 'hf:home:transitions'
const HOME_DASHBOARD_KEY = 'hf:home:dashboard'
const HOME_ACTIVITIES_KEY = 'hf:home:activities'

// ============================================================
// 家空间高级氛围引擎
// ============================================================

export function useHomeAtmosphereEngine() {
  // ---- 状态 ----
  const transitions = ref<RoomTransition[]>(loadTransitions())
  const presets = ref<AtmospherePreset[]>(loadPresets())
  const activePresetId = ref<string | null>(null)
  const activities = ref<HomeActivity[]>(loadActivities())
  const isTransitioning = ref(false)
  const currentTransition = ref<RoomTransition | null>(null)

  // ---- 持久化 ----

  function loadTransitions(): RoomTransition[] {
    try {
      const raw = storage.getKV<string>(HOME_TRANSITIONS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveTransitions() {
    storage.setKV(HOME_TRANSITIONS_KEY, JSON.stringify(transitions.value))
  }

  function loadPresets(): AtmospherePreset[] {
    try {
      const raw = storage.getKV<string>(HOME_ATMOSPHERE_KEY, '')
      if (!raw) return ATMOSPHERE_PRESETS.map((p, i) => ({
        ...p,
        id: `preset_${i}`,
        createdAt: new Date().toISOString(),
      }))
      return JSON.parse(raw)
    } catch {
      return ATMOSPHERE_PRESETS.map((p, i) => ({
        ...p,
        id: `preset_${i}`,
        createdAt: new Date().toISOString(),
      }))
    }
  }

  function savePresets() {
    storage.setKV(HOME_ATMOSPHERE_KEY, JSON.stringify(presets.value))
  }

  function loadActivities(): HomeActivity[] {
    try {
      const raw = storage.getKV<string>(HOME_ACTIVITIES_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveActivities() {
    storage.setKV(HOME_ACTIVITIES_KEY, JSON.stringify(activities.value))
  }

  // ---- 转场动画 ----

  /** 设置房间转场 */
  function setTransition(fromRoomId: string, toRoomId: string, type: RoomTransitionType): RoomTransition {
    const existing = transitions.value.find(
      t => t.fromRoomId === fromRoomId && t.toRoomId === toRoomId
    )
    const preset = TRANSITION_PRESETS.find(p => p.type === type) ?? TRANSITION_PRESETS[0]
    if (existing) {
      existing.type = type
      existing.duration = preset.duration
      existing.easing = preset.easing
      saveTransitions()
      return existing
    }
    const transition: RoomTransition = {
      id: `trans_${Date.now()}`,
      fromRoomId,
      toRoomId,
      ...preset,
    }
    transitions.value.push(transition)
    saveTransitions()
    return transition
  }

  /** 执行转场 */
  function executeTransition(fromRoomId: string, toRoomId: string): RoomTransition | null {
    const transition = transitions.value.find(
      t => t.fromRoomId === fromRoomId && t.toRoomId === toRoomId && t.enabled
    )
    if (!transition) {
      // 使用默认淡入淡出
      return {
        id: `trans_default`,
        fromRoomId,
        toRoomId,
        type: 'fade',
        duration: 500,
        easing: 'ease-in-out',
        enabled: true,
      }
    }
    isTransitioning.value = true
    currentTransition.value = transition
    return transition
  }

  /** 完成转场 */
  function completeTransition() {
    isTransitioning.value = false
    currentTransition.value = null
  }

  /** 获取两个房间之间的转场配置 */
  function getTransition(fromRoomId: string, toRoomId: string): RoomTransition | null {
    return transitions.value.find(
      t => t.fromRoomId === fromRoomId && t.toRoomId === toRoomId && t.enabled
    ) ?? null
  }

  // ---- 氛围管理 ----

  /** 激活氛围预设 */
  function activatePreset(presetId: string) {
    activePresetId.value = presetId
  }

  /** 获取适合房间的氛围预设 */
  function getPresetsForRoom(roomType: string): AtmospherePreset[] {
    return presets.value.filter(p => p.roomTypes.includes(roomType))
  }

  /**
   * P2 感知层 · 按当前环境状态从房间预设集中挑选一个最合适的。
   * 加权规则：时段优先（晨/午/暮/夜），暗色在夜/暮更贴合，低电量降级亮度（缩短候选到「星空/静谧」类）。
   * 不修改现有 getPresetsForRoom，仅并列新增选择逻辑；无匹配时回退第一个或 null。
   */
  function selectAtmospherePreset(
    roomType: string,
    perception?: { timeOfDay?: string; isDark?: boolean; isLowPower?: boolean },
  ): AtmospherePreset | null {
    const candidates = getPresetsForRoom(roomType)
    if (candidates.length === 0) return null
    if (candidates.length === 1) return candidates[0]

    const timeOfDay = perception?.timeOfDay
    const isDark = perception?.isDark
    const isLowPower = perception?.isLowPower

    // 1) 时段强匹配：预设名含时段关键词
    const timeKeyword: Record<string, string[]> = {
      morning: ['晨', 'morning', '朝'],
      afternoon: ['午', 'afternoon', '暖阳'],
      evening: ['暮', 'evening', '黄昏', '夕'],
      night: ['夜', 'night', '星', '深'],
    }
    const kw = timeOfDay ? timeKeyword[timeOfDay] : undefined
    if (kw) {
      const matched = candidates.find(p => kw.some(k => p.name.includes(k) || p.id.includes(k)))
      if (matched) return matched
    }

    // 2) 暗色偏好：夜/暮且暗色 → 优先含「星/夜/深」的预设
    if ((timeOfDay === 'night' || timeOfDay === 'evening') && isDark) {
      const darkPick = candidates.find(p => /星|夜|深|静/.test(p.name) || /star|night|dark/.test(p.id))
      if (darkPick) return darkPick
    }

    // 3) 低电量降级：优先「静谧/星空/简」类（通常图层更轻）
    if (isLowPower) {
      const calm = candidates.find(p => /星|静|简|夜/.test(p.name) || /star|calm|night/.test(p.id))
      if (calm) return calm
    }

    // 4) 兜底：返回第一个
    return candidates[0]
  }

  /** 创建自定义氛围预设 */
  function createPreset(
    name: string,
    description: string,
    roomTypes: string[],
    soundscape: AtmosphereSoundscape,
    layers: AtmosphereLayer[],
    scentHints: AtmosphereScent[] = [],
  ): AtmospherePreset {
    const preset: AtmospherePreset = {
      id: `preset_${Date.now()}`,
      name,
      description,
      roomTypes,
      soundscape,
      layers,
      scentHints,
      createdAt: new Date().toISOString(),
    }
    presets.value.push(preset)
    savePresets()
    return preset
  }

  /** 删除氛围预设 */
  function deletePreset(presetId: string) {
    presets.value = presets.value.filter(p => p.id !== presetId)
    if (activePresetId.value === presetId) {
      activePresetId.value = null
    }
    savePresets()
  }

  /** 当前激活的氛围预设 */
  const activePreset = computed(() => {
    if (!activePresetId.value) return null
    return presets.value.find(p => p.id === activePresetId.value) ?? null
  })

  /** 当前激活预设的气味暗示（气候层第五维），未激活返回空 */
  const activeScentHints = computed<ParsedScent[]>(() =>
    activePreset.value ? parseScentLayer(activePreset.value.scentHints) : []
  )

  // ---- 感知层联动：自动根据环境状态切换氛围预设 ----

  /** 当前活跃房间类型（由 home-bridge 注入） */
  const currentRoomType = ref<string | null>(null)

  /** 设置当前房间类型，触发感知联动 */
  function setCurrentRoomType(roomType: string | null) {
    currentRoomType.value = roomType
    // 立即尝试匹配一次
    autoSelectFromPerception()
  }

  /** 根据感知状态自动选择氛围预设（防御：Pinia 未激活时静默跳过） */
  function autoSelectFromPerception() {
    const rt = currentRoomType.value
    if (!rt) return
    try {
      const perceptionStore = usePerceptionStore()
      const env = perceptionStore.environment
      const preset = selectAtmospherePreset(rt, {
        timeOfDay: env.timeOfDay,
        isDark: env.isDark,
        isLowPower: env.isLowPower,
      })
      if (preset && preset.id !== activePresetId.value) {
        activatePreset(preset.id)
      }
    } catch {
      // Pinia 未激活（如测试环境），静默跳过
    }
  }

  // 监听感知状态变化，自动切换氛围（仅在 Pinia 可用时注册）
  try {
    const perceptionStore = usePerceptionStore()
    watch(
      () => {
        const env = perceptionStore.environment
        return { timeOfDay: env.timeOfDay, isDark: env.isDark, isLowPower: env.isLowPower }
      },
      () => {
        autoSelectFromPerception()
      },
    )
  } catch {
    // Pinia 未激活（如测试环境），跳过 watcher 注册
  }

  // ---- 活动记录 ----

  /** 记录家庭活动 */
  function recordActivity(
    roomId: string,
    type: HomeActivity['type'],
    label: string,
    duration?: number,
  ): HomeActivity {
    const activity: HomeActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      roomId,
      type,
      label,
      timestamp: new Date().toISOString(),
      duration,
    }
    activities.value.push(activity)
    // 限制数量
    if (activities.value.length > 500) {
      activities.value = activities.value.slice(-500)
    }
    saveActivities()
    return activity
  }

  /** 今日活动 */
  const todayActivities = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    return activities.value.filter(a => a.timestamp.slice(0, 10) === today)
  })

  /** 最近活动 */
  const recentActivities = computed(() =>
    [...activities.value].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 20)
  )

  // ---- 仪表盘 ----

  /** 生成家庭仪表盘 */
  function generateDashboard(rooms: HomeRoom[]): HomeDashboard {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    const weekStartStr = weekStart.toISOString().slice(0, 10)

    const roomSummaries: RoomActivitySummary[] = rooms.map(room => {
      const roomActivities = activities.value.filter(a => a.roomId === room.id)
      const todayActs = roomActivities.filter(a => a.timestamp.slice(0, 10) === today)
      const weekActs = roomActivities.filter(a => a.timestamp.slice(0, 10) >= weekStartStr)
      const durations = roomActivities.filter(a => a.duration).map(a => a.duration!)

      // 计算活跃度
      const activityScore = Math.min(100,
        (todayActs.length * 20) +
        (weekActs.length * 5) +
        (durations.length > 0 ? Math.min(durations.reduce((s, d) => s + d, 0) / 60, 30) : 0)
      )

      return {
        roomId: room.id,
        roomName: room.name,
        todayVisits: todayActs.length,
        weeklyVisits: weekActs.length,
        avgDuration: durations.length > 0
          ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
          : 0,
        lastVisitedAt: roomActivities.length > 0
          ? roomActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp
          : null,
        activityScore,
        moodTrend: calculateMoodTrend(roomActivities),
      }
    })

    const dashboard: HomeDashboard = {
      totalVisits: activities.value.length,
      todayActiveRooms: roomSummaries.filter(r => r.todayVisits > 0).length,
      mostVisitedRoom: roomSummaries.sort((a, b) => b.weeklyVisits - a.weeklyVisits)[0]?.roomId ?? null,
      roomSummaries: roomSummaries.sort((a, b) => b.activityScore - a.activityScore),
      recentActivities: [...activities.value]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20),
      generatedAt: new Date().toISOString(),
    }

    storage.setKV(HOME_DASHBOARD_KEY, JSON.stringify(dashboard))
    return dashboard
  }

  /** 加载仪表盘 */
  function loadDashboard(): HomeDashboard | null {
    try {
      const raw = storage.getKV<string>(HOME_DASHBOARD_KEY, '')
      if (!raw) return null
      return JSON.parse(raw)
    } catch { return null }
  }

  return {
    // 状态
    transitions,
    presets,
    activePresetId,
    activities,
    isTransitioning,
    currentTransition,

    // 计算属性
    activePreset,
    activeScentHints,
    todayActivities,
    recentActivities,

    // 转场
    setTransition,
    executeTransition,
    completeTransition,
    getTransition,

    // 氛围
    activatePreset,
    getPresetsForRoom,
    selectAtmospherePreset,
    createPreset,
    deletePreset,
    setCurrentRoomType,
    autoSelectFromPerception,

    // 活动
    recordActivity,

    // 仪表盘
    generateDashboard,
    loadDashboard,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function calculateMoodTrend(activities: HomeActivity[]): RoomActivitySummary['moodTrend'] {
  if (activities.length < 2) return 'stable'
  const recent = activities.slice(-10)
  const older = activities.slice(-20, -10)
  if (older.length === 0) return 'stable'

  const recentScore = recent.length
  const olderScore = older.length
  const diff = recentScore - olderScore

  if (diff > 2) return 'improving'
  if (diff < -2) return 'declining'
  return 'stable'
}