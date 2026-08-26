// ============================================================
// 留光阁 · 类型定义
// 冥想、反思、释怀、澄明
// ============================================================

/** 冥想类型 */
export type MeditationType = 'breath' | 'body_scan' | 'loving_kindness' | 'walking' | 'guided' | 'silent' | 'visualization' | 'mantra'

/** 冥想记录 */
export interface MeditationRecord {
  id: string
  type: MeditationType
  /** 时长（分钟） */
  duration: number
  /** 冥想前状态 */
  stateBefore: string
  /** 冥想后状态 */
  stateAfter: string
  /** 洞见/感悟 */
  insight?: string
  /** 日期 */
  date: string
  /** 时间戳 */
  timestamp: string
  /** 是否已归档（兼容第34条：允许遗忘，归档而非删除） */
  archived?: boolean
}

/** 释怀条目 */
export interface ReleaseEntry {
  id: string
  /** 需要释怀的内容 */
  content: string
  /** 释怀方式 */
  method: 'write' | 'burn' | 'float' | 'bury' | 'transform'
  /** 释怀后的感受 */
  feelingAfter?: string
  /** 是否完全释怀 */
  released: boolean
  date: string
  /** 是否已归档（兼容第34条：允许遗忘，归档而非删除） */
  archived?: boolean
}

/** 澄明状态 */
export type ClarityLevel = 'clouded' | 'unclear' | 'neutral' | 'clear' | 'crystal'

/** 留光阁状态 */
export interface LightState {
  /** 当前澄明度 */
  clarity: ClarityLevel
  /** 冥想总时长（分钟） */
  totalMeditationMinutes: number
  /** 释怀条目数 */
  releaseCount: number
  /** 连续冥想天数 */
  meditationStreak: number
  /** 阁内光点亮度 */
  lightIntensity: number
}

/** 冥想类型元数据 */
export const MEDITATION_TYPE_META: Record<MeditationType, { label: string; icon: string; description: string }> = {
  breath: { label: '呼吸冥想', icon: '🌬️', description: '专注于呼吸的节奏，让思绪随气息流动' },
  body_scan: { label: '身体扫描', icon: '🧘', description: '从头顶到脚尖，逐一感知身体各部位' },
  loving_kindness: { label: '慈心冥想', icon: '💗', description: '向自己与他人发送善意与祝福' },
  walking: { label: '行走冥想', icon: '🚶', description: '在行走中觉察每一步的触感与节奏' },
  guided: { label: '引导冥想', icon: '🎧', description: '跟随引导语，进入深度放松状态' },
  silent: { label: '静坐冥想', icon: '🧎', description: '在完全的静默中与自己相处' },
  visualization: { label: '观想冥想', icon: '🌅', description: '在心中构建画面，引导内在体验' },
  mantra: { label: '持咒冥想', icon: '🔔', description: '重复一个词或短句，让心念归于一处' },
}

/** 释怀方式元数据 */
export const RELEASE_METHOD_META: Record<string, { label: string; icon: string; ritual: string }> = {
  write: { label: '书写', icon: '✍️', ritual: '将心事写在纸上，然后轻轻折叠收起' },
  burn: { label: '焚化', icon: '🔥', ritual: '将写下的文字放入光中，看着它化为灰烬' },
  float: { label: '漂流', icon: '🍃', ritual: '将心事写在叶子上，放入溪流任其漂远' },
  bury: { label: '掩埋', icon: '🌱', ritual: '将心事埋入土中，让它化为养分' },
  transform: { label: '转化', icon: '🦋', ritual: '将负面情绪重新诠释，转化为成长的力量' },
}

/** 澄明等级元数据 */
export const CLARITY_LEVEL_META: Record<ClarityLevel, { label: string; icon: string; color: string }> = {
  clouded: { label: '阴翳', icon: '🌫️', color: '#95a5a6' },
  unclear: { label: '微朦', icon: '🌥️', color: '#bdc3c7' },
  neutral: { label: '平和', icon: '🌤️', color: '#3498db' },
  clear: { label: '晴朗', icon: '☀️', color: '#f1c40f' },
  crystal: { label: '澄澈', icon: '💎', color: '#e8f4fd' },
}

export const LIGHT_STORAGE_KEYS = {
  meditations: 'hf:light:meditations',
  releases: 'hf:light:releases',
  state: 'hf:light:state',
} as const