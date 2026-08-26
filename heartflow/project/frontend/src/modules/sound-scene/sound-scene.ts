// ============================================================
// 守护室 · 专注声场（潮汐 / Focus To-Do 白噪音启发）
// ------------------------------------------------------------
// 借鉴「潮汐白噪音 / Focus To-Do」：白噪音 / 自然声素材库与选择
// 引擎 —— 按专注 / 休息 / 睡眠场景推荐声场，搜索与筛选、音量与
// 淡入淡出配置。音频生成交给渲染层 WebAudio，此处管素材与逻辑，
// 全部本地，守宪法第1条本地私有。
// 纯函数核心（可单测）+ 轻量持久化，供 SoundScenePanel 渲染。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型
// ============================================================

/** 声场类别 */
export type SoundCategory =
  | 'white'     // 白/粉/棕噪
  | 'rain'      // 雨声
  | 'nature'    // 自然（山林海浪）
  | 'ambient'   // 环境氛围（篝火/咖啡厅）
  | 'tone'      // 音律（冥想音）

/** 场景 */
export type SoundScene = 'focus' | 'rest' | 'sleep'

/** 素材条目 */
export interface AmbientSound {
  id: string
  name: string
  icon: string
  category: SoundCategory
  /** 推荐场景 */
  scenes: SoundScene[]
  baseFrequency?: number
  color: string
  note: string
}

/** 播放配置 */
export interface SoundScenePref {
  /** 选中素材 id（空 = 未选） */
  soundId: string | null
  volume: number
  /** 淡入时长（秒） */
  fadeIn: number
  loop: boolean
}

export const SOUND_CATEGORY_META: Record<SoundCategory, { label: string; icon: string }> = {
  white: { label: '无调噪音', icon: '🎚️' },
  rain: { label: '雨声', icon: '🌧️' },
  nature: { label: '自然', icon: '🌲' },
  ambient: { label: '氛围', icon: '🎻' },
  tone: { label: '音律', icon: '🔔' },
}

export const SOURCE_LIBRARY: AmbientSound[] = [
  { id: 'white', name: '纯白噪音', icon: '🎚️', category: 'white', scenes: ['focus', 'rest'], baseFrequency: 24000, color: '#94a3b8', note: '平坦宽频，覆盖环境杂音' },
  { id: 'pink', name: '粉红噪音', icon: '🌸', category: 'white', scenes: ['focus', 'sleep'], baseFrequency: 12000, color: '#ec4899', note: '舒缓温和，助睡常客' },
  { id: 'brown', name: '棕噪低鸣', icon: '🐻', category: 'white', scenes: ['rest', 'sleep'], baseFrequency: 300, color: '#8b5cf6', note: '低沉的轰鸣，深沉放松' },
  { id: 'rain', name: '细雨', icon: '🌧️', category: 'rain', scenes: ['focus', 'rest', 'sleep'], baseFrequency: 2000, color: '#38bdf8', note: '均匀雨帘，白噪音之上更自然' },
  { id: 'storm', name: '山间雨声', icon: '⛈️', category: 'rain', scenes: ['sleep'], baseFrequency: 500, color: '#6366f1', note: '远处雷鸣，静谧入眠' },
  { id: 'ocean', name: '海浪', icon: '🌊', category: 'nature', scenes: ['focus', 'rest'], baseFrequency: 400, color: '#0ea5e9', note: '潮汐往复，节律呼吸' },
  { id: 'forest', name: '林间鸟鸣', icon: '🌳', category: 'nature', scenes: ['focus', 'rest'], baseFrequency: 3200, color: '#22c55e', note: '晨光鸟语，清新专注' },
  { id: 'creek', name: '溪流', icon: '🏞️', category: 'nature', scenes: ['focus', 'rest'], baseFrequency: 1500, color: '#14b8a6', note: '潺潺流水，澄澈心田' },
  { id: 'fire', name: '篝火', icon: '🔥', category: 'ambient', scenes: ['rest', 'sleep'], baseFrequency: 120, color: '#f59e0b', note: '噼啪木柴，温暖围炉' },
  { id: 'cafe', name: '咖啡厅', icon: '☕', category: 'ambient', scenes: ['focus'], baseFrequency: 800, color: '#a16207', note: '人声低语，工作氛围' },
  { id: 'chime', name: '冥想铃声', icon: '🔔', category: 'tone', scenes: ['focus', 'rest', 'sleep'], baseFrequency: 528, color: '#e879f9', note: '泛音钟声，静心观照' },
]

export const DEFAULT_SCENE_SOUNDS: Record<SoundScene, string> = {
  focus: 'cafe',
  rest: 'ocean',
  sleep: 'pink',
}

export const DEFAULT_SOUND_PREF: SoundScenePref = {
  soundId: 'rain',
  volume: 60,
  fadeIn: 2,
  loop: true,
}

const PREF_KEY = 'hf:sound_scene_pref'

// ============================================================
// 纯函数核心
// ============================================================

/** 按类别筛选 */
export function byCategory(list: AmbientSound[], category: SoundCategory | 'all'): AmbientSound[] {
  return category === 'all' ? list : list.filter((s) => s.category === category)
}

/** 关键词搜索（名称 / 备注） */
export function searchSounds(list: AmbientSound[], keyword: string): AmbientSound[] {
  const k = keyword.trim().toLowerCase()
  if (!k) return list
  return list.filter((s) => s.name.toLowerCase().includes(k) || s.note.toLowerCase().includes(k))
}

/** 为某场景推荐声场 */
export function pickForScene(list: AmbientSound[], scene: SoundScene): AmbientSound[] {
  return list.filter((s) => s.scenes.includes(scene))
}

/** 场景默认推荐素材 */
export function defaultSoundForScene(scene: SoundScene): AmbientSound | undefined {
  return SOURCE_LIBRARY.find((s) => s.id === DEFAULT_SCENE_SOUNDS[scene])
}

/** 根据音量换算 WebAudio 增益（0-100 → 0-1 对数分布） */
export function gainForVolume(volume: number): number {
  const v = Math.min(100, Math.max(0, volume))
  return Math.round(Math.pow(v / 100, 2) * 100) / 100
}

// ============================================================
// 组合 API（持久化）
// ============================================================

function loadPref(): SoundScenePref {
  try {
    return { ...DEFAULT_SOUND_PREF, ...storage.getKV<Partial<SoundScenePref>>(PREF_KEY, {}) }
  } catch {
    return { ...DEFAULT_SOUND_PREF }
  }
}

export function useSoundScene() {
  const pref = ref<SoundScenePref>(loadPref())
  const library = ref<AmbientSound[]>(SOURCE_LIBRARY)

  function save(): void {
    storage.setKV(PREF_KEY, pref.value)
  }
  function select(soundId: string | null): void {
    pref.value.soundId = soundId
    save()
  }
  function patch(p: Partial<Omit<SoundScenePref, 'soundId'>>): void {
    Object.assign(pref.value, p)
    save()
  }

  const active = computed<AmbientSound | undefined>(() =>
    pref.value.soundId ? library.value.find((s) => s.id === pref.value.soundId) : undefined)

  function activeGain(): number {
    return gainForVolume(pref.value.volume)
  }

  return {
    pref: computed(() => pref.value),
    library: computed(() => library.value),
    active,
    activeGain,
    select,
    patch,
    byCategory,
    searchSounds,
    pickForScene,
    defaultSoundForScene,
  }
}