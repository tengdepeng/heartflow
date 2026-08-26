// ============================================================
// 数据可视化基础框架 · 预设风格包
// 10 个内置风格包，分别对应 10 种 MetaphorType
// ============================================================

import type { VisualizationStylePack } from '../types'
import { registerBuiltInPack } from './index'

// ============================================================
// 预设风格包定义
// ============================================================

/**
 * 暖金黄昏（metaphor: light）
 * 暖金色调，营造黄昏般温暖、舒缓的视觉氛围。
 * 基于光隐喻，调色板偏向金黄琥珀色。
 */
export const PACK_GOLDEN_HOUR: VisualizationStylePack = {
  id: 'golden-hour',
  name: '暖金黄昏',
  description: '暖金色调，黄昏般温暖舒缓的视觉氛围',
  metaphor: 'light',
  isBuiltIn: true,
  overrides: {
    palette: {
      primary: '#e8b84a',
      secondary: '#f0d080',
      accent: '#f8e0a0',
      muted: '#a08050',
      bg: '#1a1410',
      surface: '#2a2018',
      border: '#3a3020',
      positive: '#7ec8a0',
      negative: '#c87a5a',
      neutral: '#8a7a5a',
      gradient: [[0, '#2a2018'], [0.5, '#e8b84a'], [1, '#f8e0a0']],
    },
  },
}

/**
 * 深海蓝调（metaphor: water）
 * 深海蓝色系，冷静沉稳，富有层次感。
 * 基于水隐喻，调色板偏向深蓝海洋色调。
 */
export const PACK_OCEAN_DEEP: VisualizationStylePack = {
  id: 'ocean-deep',
  name: '深海蓝调',
  description: '深海蓝色系，冷静沉稳富有层次感的视觉语言',
  metaphor: 'water',
  isBuiltIn: true,
  overrides: {
    palette: {
      primary: '#1a6a9a',
      secondary: '#2a8aba',
      accent: '#4aaada',
      muted: '#3a5a7a',
      bg: '#080e14',
      surface: '#0e1820',
      border: '#1a2a36',
      positive: '#5ac8a0',
      negative: '#c85a5a',
      neutral: '#5a7a8a',
      gradient: [[0, '#0e1820'], [0.5, '#1a6a9a'], [1, '#4aaada']],
    },
  },
}

/**
 * 森林绿意（metaphor: wood）
 * 森林绿色系，自然清新，生机盎然。
 * 基于木隐喻，调色板偏向深绿与翠绿。
 */
export const PACK_FOREST_CANOPY: VisualizationStylePack = {
  id: 'forest-canopy',
  name: '森林绿意',
  description: '森林绿色系，自然清新生机盎然的视觉语言',
  metaphor: 'wood',
  isBuiltIn: true,
  overrides: {
    palette: {
      primary: '#3a8a4a',
      secondary: '#5aaa6a',
      accent: '#7aca8a',
      muted: '#4a6a4a',
      bg: '#0a120a',
      surface: '#121e12',
      border: '#1e2e1a',
      positive: '#6ad08a',
      negative: '#c87a5a',
      neutral: '#5a7a5a',
      gradient: [[0, '#121e12'], [0.5, '#3a8a4a'], [1, '#7aca8a']],
    },
  },
}

/**
 * 沙漠暮色（metaphor: earth）
 * 沙漠暖色调，苍茫辽阔，暮色沉静。
 * 基于土隐喻，调色板偏向沙黄与赭石。
 */
export const PACK_DESERT_DUSK: VisualizationStylePack = {
  id: 'desert-dusk',
  name: '沙漠暮色',
  description: '沙漠暖色调，苍茫辽阔暮色沉静的视觉语言',
  metaphor: 'earth',
  isBuiltIn: true,
  overrides: {
    palette: {
      primary: '#c08a50',
      secondary: '#d8a870',
      accent: '#e8c090',
      muted: '#8a6a4a',
      bg: '#14100a',
      surface: '#201a12',
      border: '#302818',
      positive: '#6ab86a',
      negative: '#c86a4a',
      neutral: '#7a6a4a',
      gradient: [[0, '#201a12'], [0.5, '#c08a50'], [1, '#e8c090']],
    },
  },
}

/**
 * 极光天空（metaphor: mist）
 * 极光幻彩色系，梦幻缥缈，色彩丰富。
 * 基于雾隐喻，调色板偏向绿紫渐变极光色。
 */
export const PACK_AURORA_SKY: VisualizationStylePack = {
  id: 'aurora-sky',
  name: '极光天空',
  description: '极光幻彩色系，梦幻缥缈色彩丰富的视觉语言',
  metaphor: 'mist',
  isBuiltIn: true,
  overrides: {
    palette: {
      primary: '#4ac89a',
      secondary: '#7ad0c0',
      accent: '#b8d8e0',
      muted: '#5a8a7a',
      bg: '#0a1012',
      surface: '#101a1c',
      border: '#1a2a2a',
      positive: '#6ae0a0',
      negative: '#c87a8a',
      neutral: '#6a8a7a',
      gradient: [[0, '#101a1c'], [0.5, '#4ac89a'], [1, '#b8d8e0']],
    },
  },
}

/**
 * 樱花雾（metaphor: mist）
 * 樱花粉色系，柔美浪漫，轻盈朦胧。
 * 基于雾隐喻，调色板偏向粉红与浅紫。
 */
export const PACK_SAKURA_MIST: VisualizationStylePack = {
  id: 'sakura-mist',
  name: '樱花雾',
  description: '樱花粉色系，柔美浪漫轻盈朦胧的视觉语言',
  metaphor: 'mist',
  isBuiltIn: true,
  overrides: {
    palette: {
      primary: '#d47a8a',
      secondary: '#e09aaa',
      accent: '#e8baca',
      muted: '#8a6a72',
      bg: '#120e10',
      surface: '#1e1618',
      border: '#2a2022',
      positive: '#7ac89a',
      negative: '#c86a6a',
      neutral: '#8a6a7a',
      gradient: [[0, '#1e1618'], [0.5, '#d47a8a'], [1, '#e8baca']],
    },
  },
}

/**
 * 午夜星辰（metaphor: star）
 * 深蓝紫色系，深邃神秘，星光闪烁。
 * 基于星隐喻，调色板偏向深紫与靛蓝。
 */
export const PACK_MIDNIGHT_STAR: VisualizationStylePack = {
  id: 'midnight-star',
  name: '午夜星辰',
  description: '深蓝紫色系，深邃神秘星光闪烁的视觉语言',
  metaphor: 'star',
  isBuiltIn: true,
  overrides: {
    palette: {
      primary: '#5a4ab8',
      secondary: '#7a6ad0',
      accent: '#a090e0',
      muted: '#4a3a7a',
      bg: '#06040e',
      surface: '#0e0a18',
      border: '#1a1424',
      positive: '#5ac0a0',
      negative: '#c86a8a',
      neutral: '#6a5a8a',
      gradient: [[0, '#0e0a18'], [0.5, '#5a4ab8'], [1, '#a090e0']],
    },
  },
}

/**
 * 水晶洞穴（metaphor: crystal）
 * 冰蓝透明系，清冷通透，结构分明。
 * 基于晶隐喻，调色板偏向冰蓝与冷白。
 */
export const PACK_CRYSTAL_CAVE: VisualizationStylePack = {
  id: 'crystal-cave',
  name: '水晶洞穴',
  description: '冰蓝透明系，清冷通透结构分明的视觉语言',
  metaphor: 'crystal',
  isBuiltIn: true,
  overrides: {
    palette: {
      primary: '#60b8d0',
      secondary: '#80d0e0',
      accent: '#a0e0e8',
      muted: '#4a7a8a',
      bg: '#060e10',
      surface: '#0c161a',
      border: '#162228',
      positive: '#5ad0b0',
      negative: '#c87a8a',
      neutral: '#6a8a8a',
      gradient: [[0, '#0c161a'], [0.5, '#60b8d0'], [1, '#a0e0e8']],
    },
  },
}

/**
 * 余烬微光（metaphor: fire）
 * 暗橙红色系，余烬将熄，微光不灭。
 * 基于火隐喻，调色板偏向暗红与焦橙。
 */
export const PACK_EMBER_GLOW: VisualizationStylePack = {
  id: 'ember-glow',
  name: '余烬微光',
  description: '暗橙红色系，余烬将熄微光不灭的视觉语言',
  metaphor: 'fire',
  isBuiltIn: true,
  overrides: {
    palette: {
      primary: '#c84a2a',
      secondary: '#d86a3a',
      accent: '#e0904a',
      muted: '#7a4a3a',
      bg: '#140a08',
      surface: '#20120e',
      border: '#2e1c14',
      positive: '#6ab88a',
      negative: '#c83a3a',
      neutral: '#8a5a4a',
      gradient: [[0, '#20120e'], [0.5, '#c84a2a'], [1, '#e0904a']],
    },
  },
}

/**
 * 水墨单色（metaphor: ink）
 * 黑白灰色系，极简克制，以墨韵为美。
 * 基于墨隐喻，调色板偏向纯灰与墨黑。
 */
export const PACK_MONO_INK: VisualizationStylePack = {
  id: 'mono-ink',
  name: '水墨单色',
  description: '黑白灰色系，极简克制以墨韵为美的视觉语言',
  metaphor: 'ink',
  isBuiltIn: true,
  overrides: {
    palette: {
      primary: '#b0a898',
      secondary: '#c8c0b0',
      accent: '#e0d8c8',
      muted: '#5a5650',
      bg: '#0a0a08',
      surface: '#141412',
      border: '#222220',
      positive: '#8ab88a',
      negative: '#b88a7a',
      neutral: '#6a6a6a',
      gradient: [[0, '#141412'], [0.5, '#b0a898'], [1, '#e0d8c8']],
    },
  },
}

// ============================================================
// 预设集合
// ============================================================

/** 所有预设风格包数组 */
export const PRESET_STYLE_PACKS: VisualizationStylePack[] = [
  PACK_GOLDEN_HOUR,
  PACK_OCEAN_DEEP,
  PACK_FOREST_CANOPY,
  PACK_DESERT_DUSK,
  PACK_AURORA_SKY,
  PACK_SAKURA_MIST,
  PACK_MIDNIGHT_STAR,
  PACK_CRYSTAL_CAVE,
  PACK_EMBER_GLOW,
  PACK_MONO_INK,
]

/**
 * 根据 ID 获取预设风格包
 *
 * @param id - 预设风格包 ID
 * @returns 匹配的预设风格包，未找到时返回 undefined
 *
 * @example
 * ```ts
 * const pack = getPresetPack('golden-hour')
 * if (pack) applyStylePack(pack)
 * ```
 */
export function getPresetPack(id: string): VisualizationStylePack | undefined {
  return PRESET_STYLE_PACKS.find((p) => p.id === id)
}

// ============================================================
// 自动注册所有预设风格包到内置注册表
// ============================================================

PRESET_STYLE_PACKS.forEach(registerBuiltInPack)