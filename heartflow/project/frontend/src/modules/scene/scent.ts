// ============================================================
// 息壤 · 房间气味维度（第四感官氛围）
// 蓝图差距报告确认：光 / 声 / 动 三维已齐，「气味暗示」确凿缺失。
// 本模块补齐第四维 —— 每个房间一个气味签名（纯前端氛围暗示，
// 无真实气味输出），以文字 + emoji + 淡色视觉暗示呈现。
//
// 设计原则（严守宪法）：
//   - 本地私有：偏好仅存本地 storage（hf:scene:scent_prefs），不出端
//   - 沉默默认：气味为「内联展示」而非「主动推送/弹窗」，不违背第52条；
//     用户进入房间时自然看到，可手动关闭/切换
//   - 允许未定义：某房间若无默认气味映射，currentScent 返回 null，
//     展示层不渲染，绝不报错
//
// 与既有光维度（useRoomAtmosphere 的 atmosphereColor/atmosphereLabel）
// 共享同一模块级 currentSceneId，零重复状态、零波及 ROOM_SCENES。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import { useRoomAtmosphere } from '@/composables/useRoomAtmosphere'

/** 单一气味预设 */
export interface RoomScent {
  /** 气味 id */
  id: string
  /** 气味名称（中文） */
  name: string
  /** 视觉暗示 emoji */
  emoji: string
  /** 一句氛围描述 */
  description: string
  /** 关联情绪/场景标签 */
  mood: string
  /** 淡色视觉暗示（CSS 颜色，用于 --scent-color） */
  color: string
}

/** 气味库（14 种，温暖/自然/私人调性） */
export const SCENT_LIBRARY: RoomScent[] = [
  { id: 'fresh-grass', name: '雨后青草', emoji: '🌿', description: '刚下过雨的草叶气息，清亮而舒展', mood: '清新·复苏', color: '#cfe8c2' },
  { id: 'warm-wood', name: '温热木质', emoji: '🪵', description: '被日照焐热的原木，沉静而包裹', mood: '安定·温润', color: '#e3c9a8' },
  { id: 'citrus', name: '柑橘清晨', emoji: '🍊', description: '剥开柑橘那一瞬的明亮，唤醒一天', mood: '明亮·开启', color: '#f7d9a0' },
  { id: 'sea-breeze', name: '海盐微风', emoji: '🌊', description: '咸湿的风掠过礁石，开阔而松快', mood: '开阔·松弛', color: '#c3dce8' },
  { id: 'cedar', name: '雪松静谧', emoji: '🌲', description: '雪松林的冷冽木质，清神而专注', mood: '专注·空旷', color: '#bcd0c2' },
  { id: 'lavender', name: '薰衣草安眠', emoji: '💜', description: '枕畔一缕薰衣草，把灯调暗', mood: '安眠·柔和', color: '#d8c8e8' },
  { id: 'old-book', name: '旧书纸香', emoji: '📚', description: '泛黄书页与油墨，时间沉淀的气味', mood: '沉静·怀旧', color: '#e0d2b8' },
  { id: 'bakery', name: '烘焙暖香', emoji: '🥐', description: '烤箱里面包膨胀的甜暖，让人想停留', mood: '暖意·归属感', color: '#f0d2ab' },
  { id: 'mint', name: '薄荷清凉', emoji: '🍃', description: '一记薄荷的凉，把燥热按下去', mood: '清醒·降温', color: '#c8e8d2' },
  { id: 'earth', name: '湿润泥土', emoji: '🟤', description: '翻土时升起的潮土味，踏实而原始', mood: '踏实·扎根', color: '#d6c2a8' },
  { id: 'nectar', name: '花蜜甜香', emoji: '🌸', description: '花瓣深处的甜，聚会的余温', mood: '欢聚·甜暖', color: '#f2cfd8' },
  { id: 'bonfire', name: '篝火暖意', emoji: '🔥', description: '木柴噼啪的暖烟，夜里最安心', mood: '守护·暖意', color: '#e8b894' },
  { id: 'tea', name: '淡茶清香', emoji: '🍵', description: '一盏清茶的水汽，留白与回甘', mood: '留白·回甘', color: '#d8e0c2' },
  { id: 'leather', name: '皮革沉稳', emoji: '🟫', description: '旧皮具的沉稳气味，可靠而克制', mood: '沉稳·可靠', color: '#cdb89a' },
]

/** 房间 id → 默认气味 id（与 useRoomAtmosphere 的 ROOM_SCENES 对应） */
export const DEFAULT_SCENE_SCENTS: Record<string, string> = {
  entrance: 'citrus',     // 玄关 · 迎接
  wardrobe: 'leather',    // 衣帽间 · 沉稳
  kitchen: 'bakery',      // 厨房 · 暖香
  dining: 'nectar',       // 餐厅 · 甜暖
  bedroom: 'lavender',    // 卧室 · 安眠
  bath: 'mint',           // 浴室 · 清凉
  living: 'warm-wood',    // 客厅 · 温润
  study: 'old-book',      // 书房 · 怀旧
  courtyard: 'fresh-grass', // 庭院 · 复苏
}

const SCENT_KEY = 'hf:scene:scent_prefs'

interface ScentPrefs {
  /** 是否启用气味维度展示 */
  enabled: boolean
  /** 用户自定义覆盖：sceneId → scentId */
  customScents: Record<string, string>
}

// ---- 模块级单例（与 useRoomAtmosphere 共享 currentSceneId）----
const { currentSceneId } = useRoomAtmosphere()
const enabled = ref<boolean>(true)
const customScents = ref<Record<string, string>>({})

function defaultPrefs(): ScentPrefs {
  return { enabled: true, customScents: {} }
}

/** 按 id 取气味预设 */
export function getScent(id: string): RoomScent | undefined {
  return SCENT_LIBRARY.find(s => s.id === id)
}

/**
 * 房间气味维度组合式。
 * 提供当前房间生效气味、启用开关、自定义覆盖与循环切换。
 */
export function useRoomScent() {
  /** 从存储载入偏好 */
  function load(): void {
    const prefs = storage.getKV<ScentPrefs>(SCENT_KEY, defaultPrefs())
    enabled.value = prefs.enabled !== false
    customScents.value = prefs.customScents ?? {}
  }

  /** 持久化偏好 */
  function persist(): void {
    const prefs: ScentPrefs = {
      enabled: enabled.value,
      customScents: customScents.value,
    }
    storage.setKV(SCENT_KEY, prefs)
  }

  /** 当前场景生效的气味（custom 优先，否则 default；未启用或无映射返回 null） */
  const currentScent = computed<RoomScent | null>(() => {
    if (!enabled.value) return null
    const sceneId = currentSceneId.value
    const scentId = customScents.value[sceneId] ?? DEFAULT_SCENE_SCENTS[sceneId]
    if (!scentId) return null
    return getScent(scentId) ?? null
  })

  /** 设置是否启用 */
  function setEnabled(value: boolean): void {
    enabled.value = value
    persist()
  }

  /** 为某房间自定义气味（传 null 清除自定义，回落默认） */
  function setSceneScent(sceneId: string, scentId: string | null): void {
    if (scentId === null) {
      delete customScents.value[sceneId]
    } else {
      customScents.value[sceneId] = scentId
    }
    persist()
  }

  /** 重置某房间的自定义（回落默认映射） */
  function resetSceneScent(sceneId: string): void {
    setSceneScent(sceneId, null)
  }

  /** 在当前房间循环切换到下一种气味（展示层点击用） */
  function cycleSceneScent(): void {
    const sceneId = currentSceneId.value
    if (!sceneId) return
    const active = customScents.value[sceneId] ?? DEFAULT_SCENE_SCENTS[sceneId] ?? SCENT_LIBRARY[0].id
    const idx = SCENT_LIBRARY.findIndex(s => s.id === active)
    const next = SCENT_LIBRARY[(idx + 1) % SCENT_LIBRARY.length]
    setSceneScent(sceneId, next.id)
  }

  return {
    enabled,
    customScents,
    currentScent,
    load,
    persist,
    setEnabled,
    setSceneScent,
    resetSceneScent,
    cycleSceneScent,
    SCENT_LIBRARY,
    DEFAULT_SCENE_SCENTS,
    getScent,
  }
}
