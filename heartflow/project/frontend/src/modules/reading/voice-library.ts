// ============================================================
// 阅览殿 · 朗读音色库（Voice Library，INCR-504）
// ------------------------------------------------------------
// 借鉴 96 APK「时光序」raw 音色包 female_voice1~8 八女声
// + me / melodious / mysterious / quiet / dexterous。
// 本地 TTS 无法携带云端音色包，故以「音高 pitch + 语速系数 rateScale
// + 系统音色匹配关键词」三元组刻画音色，纯本地、零网络。
// 状态存 hf:reading_voice，仅记所选音色 id。
// 落点：阅览殿「听书」区（VoiceLibraryPanel.vue）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:reading_voice'

export type VoiceGender = 'female' | 'male' | 'neutral'

export interface VoicePreset {
  id: string
  label: string
  labelEn: string
  gender: VoiceGender
  /** 音高 0.5 ~ 1.5 */
  pitch: number
  /** 语速系数，叠加在用户倍速之上 0.7 ~ 1.2 */
  rateScale: number
  /** 音色描述 */
  desc: string
  /** 语气标签 */
  tags: string[]
  /** 匹配系统音色名称的关键词（命中优先） */
  match: string[]
}

/** 音高可调范围 */
export const MIN_PITCH = 0.5
export const MAX_PITCH = 1.5
/** 语速系数可调范围 */
export const MIN_RATE_SCALE = 0.7
export const MAX_RATE_SCALE = 1.2

/** 默认音色：时光序 `me`（本人声线，中性） */
export const DEFAULT_VOICE_ID = 'me'

export const VOICE_PRESETS: VoicePreset[] = [
  { id: 'female-1', label: '温柔', labelEn: 'Gentle', gender: 'female', pitch: 1.1, rateScale: 0.95, desc: '轻柔绵长，适合睡前听书', tags: ['轻柔', '助眠'], match: ['Huihui', 'Xiaoxiao', 'female'] },
  { id: 'female-2', label: '清亮', labelEn: 'Bright', gender: 'female', pitch: 1.2, rateScale: 1, desc: '明亮清晰，适合散文随笔', tags: ['明亮', '清晰'], match: ['Xiaoyi', 'Yaoyao', 'female'] },
  { id: 'female-3', label: '沉稳', labelEn: 'Steady', gender: 'female', pitch: 0.95, rateScale: 0.95, desc: '低回平稳，适合经史典籍', tags: ['低回', '沉稳'], match: ['Xiaomo', 'female'] },
  { id: 'female-4', label: '甜雅', labelEn: 'Sweet', gender: 'female', pitch: 1.15, rateScale: 0.9, desc: '甜润雅致，适合诗词歌赋', tags: ['甜润', '雅致'], match: ['Xiaoxuan', 'female'] },
  { id: 'female-5', label: '知性', labelEn: 'Intellectual', gender: 'female', pitch: 1, rateScale: 0.95, desc: '从容知性，适合通识读物', tags: ['从容', '知性'], match: ['Xiaorui', 'female'] },
  { id: 'female-6', label: '元气', labelEn: 'Energetic', gender: 'female', pitch: 1.25, rateScale: 1.05, desc: '轻快元气，适合励志成长', tags: ['轻快', '元气'], match: ['Xiaoshuang', 'female'] },
  { id: 'female-7', label: '空灵', labelEn: 'Ethereal', gender: 'female', pitch: 1.05, rateScale: 0.9, desc: '空灵悠远，适合哲思冥想', tags: ['悠远', '空灵'], match: ['Xiaoling', 'female'] },
  { id: 'female-8', label: '御姐', labelEn: 'Mature', gender: 'female', pitch: 0.9, rateScale: 0.95, desc: '成熟磁性，适合悬疑叙事', tags: ['磁性', '成熟'], match: ['Xiaomei', 'female'] },
  { id: 'me', label: '我', labelEn: 'Me', gender: 'neutral', pitch: 1, rateScale: 1, desc: '系统默认声线，中性自然', tags: ['默认', '自然'], match: [] },
  { id: 'melodious', label: '婉转', labelEn: 'Melodious', gender: 'female', pitch: 1.1, rateScale: 0.9, desc: '婉转起伏，适合散文小说', tags: ['婉转', '起伏'], match: ['female'] },
  { id: 'mysterious', label: '神秘', labelEn: 'Mysterious', gender: 'male', pitch: 0.85, rateScale: 0.85, desc: '低沉神秘，适合探秘志怪', tags: ['低沉', '神秘'], match: ['Yunxi', 'Kangkang', 'male'] },
  { id: 'quiet', label: '静谧', labelEn: 'Quiet', gender: 'neutral', pitch: 0.95, rateScale: 0.85, desc: '平缓静谧，适合静心慢读', tags: ['平缓', '静谧'], match: [] },
  { id: 'dexterous', label: '灵动', labelEn: 'Dexterous', gender: 'female', pitch: 1.2, rateScale: 1.05, desc: '俏皮灵动，适合童话故事', tags: ['俏皮', '灵动'], match: ['female'] },
]

export interface VoiceLibraryState {
  /** 当前所选音色 id */
  presetId: string
}

export const DEFAULT_VOICE_LIBRARY: VoiceLibraryState = { presetId: DEFAULT_VOICE_ID }

/** 纯函数：按 id 取音色（未知 id 回落默认） */
export function voicePreset(id: string): VoicePreset {
  return VOICE_PRESETS.find((p) => p.id === id) ?? VOICE_PRESETS.find((p) => p.id === DEFAULT_VOICE_ID)!
}

/** 纯函数：夹取音高 */
export function clampPitch(n: number, fallback = 1): number {
  if (!Number.isFinite(n)) return fallback
  return Math.max(MIN_PITCH, Math.min(MAX_PITCH, n))
}

/** 纯函数：夹取语速系数 */
export function clampRateScale(n: number, fallback = 1): number {
  if (!Number.isFinite(n)) return fallback
  return Math.max(MIN_RATE_SCALE, Math.min(MAX_RATE_SCALE, n))
}

/** 纯函数：从系统音色列表里挑最匹配 preset 的一个（无匹配返回 null） */
export function matchSystemVoice<T extends { name: string; lang: string; voiceURI?: string }>(
  voices: T[],
  preset: VoicePreset,
): T | null {
  if (!voices.length) return null
  const zh = voices.filter((v) => /^zh/i.test(v.lang))
  const pool = zh.length ? zh : voices
  for (const kw of preset.match) {
    const hit = pool.find((v) => v.name.toLowerCase().includes(kw.toLowerCase()))
    if (hit) return hit
  }
  return pool[0] ?? null
}

/** 取当前环境里与 preset 最匹配的系统音色 URI（环境不支持时返回空串） */
export function resolvePresetVoiceURI(preset: VoicePreset): string {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return ''
  const synth = window.speechSynthesis as SpeechSynthesis | undefined
  if (!synth || typeof synth.getVoices !== 'function') return ''
  const matched = matchSystemVoice(synth.getVoices(), preset)
  return matched?.voiceURI ?? ''
}

/** 纯函数：按音色算出实际朗读参数（叠加用户倍速） */
export function applyVoicePreset(preset: VoicePreset, baseRate: number): { pitch: number; rate: number } {
  return {
    pitch: clampPitch(preset.pitch),
    rate: Math.max(0.1, Math.min(10, baseRate * clampRateScale(preset.rateScale))),
  }
}

const state = ref<VoiceLibraryState>({ ...DEFAULT_VOICE_LIBRARY })

function load(): void {
  try {
    const saved = storage.getKV<VoiceLibraryState | null>(STORAGE_KEY, null)
    state.value = saved && voicePreset(saved.presetId)
      ? { presetId: voicePreset(saved.presetId).id }
      : { ...DEFAULT_VOICE_LIBRARY }
  } catch {
    state.value = { ...DEFAULT_VOICE_LIBRARY }
  }
}

function persist(): void {
  storage.setKV(STORAGE_KEY, state.value)
}

load()

export function reloadVoiceLibrary(): void {
  load()
}

export function useVoiceLibrary() {
  const presets = computed(() => VOICE_PRESETS)
  const currentId = computed(() => state.value.presetId)
  const current = computed(() => voicePreset(state.value.presetId))
  const pitch = computed(() => current.value.pitch)
  const rateScale = computed(() => current.value.rateScale)

  function setPreset(id: string): string {
    state.value = { presetId: voicePreset(id).id }
    persist()
    return state.value.presetId
  }

  function reset(): string {
    state.value = { ...DEFAULT_VOICE_LIBRARY }
    persist()
    return state.value.presetId
  }

  return { presets, currentId, current, pitch, rateScale, setPreset, reset }
}
