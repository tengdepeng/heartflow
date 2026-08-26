// ============================================================
// 情绪花房 · 类型定义
// ============================================================

/** 情绪类型 */
export type EmotionType = 'happy' | 'calm' | 'sad' | 'anxious' | 'angry'

export type EmotionAmbientMood = 'normal' | 'warm' | 'dim' | 'bright'

/** 天气第二轴（双轴记录：情绪 / 天气），可选 */
export type EmotionWeather = 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'snowy'

/** 情绪记录 */
export interface EmotionRecord {
  id: string
  /** 情绪类型 */
  type: EmotionType
  /** 可选文字描述 */
  note: string
  /** 记录时间 */
  createdAt: string
  /** 可选天气第二轴（情绪前置、文字可选之外的附加维度） */
  weather?: EmotionWeather
}

/** 情绪 → 花朵配置映射 */
export interface FlowerConfig {
  label: string
  color: string
  petalColor: string
  coreColor: string
  /** SVG 花瓣数 */
  petals: number
  /** 花瓣形状: rounded | pointed | wavy */
  petalShape: 'rounded' | 'pointed' | 'wavy'
}

export const EMOTION_FLOWERS: Record<EmotionType, FlowerConfig> = {
  happy: {
    label: '轻快',
    color: '#f0c040',
    petalColor: '#f5d060',
    coreColor: '#e8a820',
    petals: 6,
    petalShape: 'rounded',
  },
  calm: {
    label: '平静',
    color: '#80b8d0',
    petalColor: '#a0d0e0',
    coreColor: '#6090b0',
    petals: 5,
    petalShape: 'pointed',
  },
  sad: {
    label: '低落',
    color: '#9080b8',
    petalColor: '#b0a0d0',
    coreColor: '#7060a0',
    petals: 5,
    petalShape: 'wavy',
  },
  anxious: {
    label: '紧绷',
    color: '#c05050',
    petalColor: '#d07070',
    coreColor: '#a03030',
    petals: 7,
    petalShape: 'pointed',
  },
  angry: {
    label: '烦躁',
    color: '#e87030',
    petalColor: '#f09050',
    coreColor: '#c05020',
    petals: 8,
    petalShape: 'pointed',
  },
}

export const EMOTION_OPTIONS: { type: EmotionType; label: string; icon: string }[] = [
  { type: 'happy', label: '轻快', icon: '☀️' },
  { type: 'calm', label: '平静', icon: '🌙' },
  { type: 'sad', label: '低落', icon: '🌧' },
  { type: 'anxious', label: '紧绷', icon: '🌪' },
  { type: 'angry', label: '烦躁', icon: '⚡' },
]

/** 天气第二轴选项（可选叠加在情绪之上） */
export const WEATHER_OPTIONS: { type: EmotionWeather; label: string; icon: string }[] = [
  { type: 'sunny', label: '晴', icon: '🌞' },
  { type: 'cloudy', label: '多云', icon: '⛅' },
  { type: 'rainy', label: '雨', icon: '🌧' },
  { type: 'windy', label: '风', icon: '🌬' },
  { type: 'snowy', label: '雪', icon: '❄️' },
]
