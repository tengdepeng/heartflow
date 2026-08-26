// ============================================================
// 数据可视化基础框架 · 视觉隐喻系统
// 光/墨/木 三种视觉隐喻，每种定义调色板、默认视觉元素配置
// ============================================================

import type { MetaphorConfig, MetaphorType } from './types'

// ============================================================
// 光 · 隐喻
// ============================================================

/** 光隐喻 — 温暖、通透、以光晕和渐变为主 */
export const METAPHOR_LIGHT: MetaphorConfig = {
  type: 'light',
  name: '光',
  description: '温暖通透 · 光晕渐变 · 以光为视觉语言',
  palette: {
    primary: '#d4a574',
    secondary: '#e8c49a',
    accent: '#f0d6b0',
    muted: '#8a7a6a',
    bg: '#1a1612',
    surface: '#2a2420',
    border: '#3a3430',
    positive: '#7ec8a0',
    negative: '#c87a7a',
    neutral: '#8a8a8a',
    gradient: [[0, '#2a2420'], [0.5, '#d4a574'], [1, '#f0d6b0']],
  },
  defaults: {
    point: {
      radius: '4',
      color: 'var(--primary)',
      opacity: '0.8',
      glow: 'true',
    },
    line: {
      strokeWidth: '2',
      color: 'var(--primary)',
      opacity: '0.7',
      smooth: 'true',
    },
    surface: {
      color: 'var(--primary)',
      opacity: '0.15',
      gradient: 'true',
    },
    bar: {
      width: '24',
      color: 'var(--primary)',
      radius: '3',
      gap: '4',
    },
    ring: {
      radius: '80',
      thickness: '20',
      color: 'var(--primary)',
      gap: '2',
    },
    grid: {
      color: 'var(--border)',
      opacity: '0.3',
      dashArray: '4,4',
    },
  },
}

// ============================================================
// 墨 · 隐喻
// ============================================================

/** 墨隐喻 — 深邃、克制、以线条和留白为主 */
export const METAPHOR_INK: MetaphorConfig = {
  type: 'ink',
  name: '墨',
  description: '深邃克制 · 线条留白 · 以墨为视觉语言',
  palette: {
    primary: '#c8c0b0',
    secondary: '#a8a090',
    accent: '#e8e0d0',
    muted: '#6a665a',
    bg: '#0e0c0a',
    surface: '#1a1815',
    border: '#2a2825',
    positive: '#8ab88a',
    negative: '#b88a7a',
    neutral: '#7a7a7a',
    gradient: [[0, '#1a1815'], [0.5, '#c8c0b0'], [1, '#e8e0d0']],
  },
  defaults: {
    point: {
      radius: '3',
      color: 'var(--primary)',
      opacity: '0.7',
      glow: 'false',
    },
    line: {
      strokeWidth: '1.5',
      color: 'var(--primary)',
      opacity: '0.8',
      smooth: 'false',
    },
    surface: {
      color: 'var(--primary)',
      opacity: '0.08',
      gradient: 'false',
    },
    bar: {
      width: '20',
      color: 'var(--primary)',
      radius: '1',
      gap: '6',
    },
    ring: {
      radius: '80',
      thickness: '16',
      color: 'var(--primary)',
      gap: '3',
    },
    grid: {
      color: 'var(--border)',
      opacity: '0.2',
      dashArray: '2,4',
    },
  },
}

// ============================================================
// 木 · 隐喻
// ============================================================

/** 木隐喻 — 温润、自然、以纹理和层次为主 */
export const METAPHOR_WOOD: MetaphorConfig = {
  type: 'wood',
  name: '木',
  description: '温润自然 · 纹理层次 · 以木为视觉语言',
  palette: {
    primary: '#b8a080',
    secondary: '#d0c0a0',
    accent: '#e0d4c0',
    muted: '#7a6a5a',
    bg: '#141010',
    surface: '#201c18',
    border: '#302c28',
    positive: '#7ab87a',
    negative: '#b87a6a',
    neutral: '#7a7a7a',
    gradient: [[0, '#201c18'], [0.5, '#b8a080'], [1, '#e0d4c0']],
  },
  defaults: {
    point: {
      radius: '5',
      color: 'var(--primary)',
      opacity: '0.7',
      glow: 'false',
    },
    line: {
      strokeWidth: '2.5',
      color: 'var(--primary)',
      opacity: '0.6',
      smooth: 'true',
    },
    surface: {
      color: 'var(--primary)',
      opacity: '0.12',
      gradient: 'true',
    },
    bar: {
      width: '28',
      color: 'var(--primary)',
      radius: '2',
      gap: '3',
    },
    ring: {
      radius: '80',
      thickness: '24',
      color: 'var(--primary)',
      gap: '1',
    },
    grid: {
      color: 'var(--border)',
      opacity: '0.25',
      dashArray: '3,6',
    },
  },
}

// ============================================================
// 火 · 隐喻
// ============================================================

/** 火隐喻 — 热烈、能量、以红橙渐变和动态光晕为主 */
export const METAPHOR_FIRE: MetaphorConfig = {
  type: 'fire',
  name: '火',
  description: '热烈能量 · 红橙渐变 · 以火焰为视觉语言',
  palette: {
    primary: '#e8533a',
    secondary: '#f07a3a',
    accent: '#f5b03a',
    muted: '#8a5a3a',
    bg: '#1a0e0a',
    surface: '#2a1a12',
    border: '#3a2a1a',
    positive: '#7ec8a0',
    negative: '#c83a3a',
    neutral: '#8a6a5a',
    gradient: [[0, '#2a1a12'], [0.5, '#e8533a'], [1, '#f5b03a']],
  },
  defaults: {
    point: { radius: '5', color: 'var(--primary)', opacity: '0.9', glow: 'true' },
    line: { strokeWidth: '2', color: 'var(--primary)', opacity: '0.8', smooth: 'true' },
    surface: { color: 'var(--primary)', opacity: '0.18', gradient: 'true' },
    bar: { width: '24', color: 'var(--primary)', radius: '3', gap: '4' },
    ring: { radius: '80', thickness: '20', color: 'var(--primary)', gap: '2' },
    grid: { color: 'var(--border)', opacity: '0.3', dashArray: '4,4' },
  },
}

// ============================================================
// 水 · 隐喻
// ============================================================

/** 水隐喻 — 流动、冷静、以蓝青渐变和柔和曲线为主 */
export const METAPHOR_WATER: MetaphorConfig = {
  type: 'water',
  name: '水',
  description: '流动冷静 · 蓝青渐变 · 以水为视觉语言',
  palette: {
    primary: '#3a8ac8',
    secondary: '#5ab0d8',
    accent: '#80d0e0',
    muted: '#4a6a8a',
    bg: '#0a121a',
    surface: '#12202a',
    border: '#1a2a3a',
    positive: '#5ac8a0',
    negative: '#c85a5a',
    neutral: '#6a7a8a',
    gradient: [[0, '#12202a'], [0.5, '#3a8ac8'], [1, '#80d0e0']],
  },
  defaults: {
    point: { radius: '4', color: 'var(--primary)', opacity: '0.7', glow: 'true' },
    line: { strokeWidth: '1.5', color: 'var(--primary)', opacity: '0.6', smooth: 'true' },
    surface: { color: 'var(--primary)', opacity: '0.12', gradient: 'true' },
    bar: { width: '22', color: 'var(--primary)', radius: '4', gap: '5' },
    ring: { radius: '80', thickness: '18', color: 'var(--primary)', gap: '2' },
    grid: { color: 'var(--border)', opacity: '0.2', dashArray: '6,4' },
  },
}

// ============================================================
// 土 · 隐喻
// ============================================================

/** 土隐喻 — 稳重、扎根、以棕土色调和纹理感为主 */
export const METAPHOR_EARTH: MetaphorConfig = {
  type: 'earth',
  name: '土',
  description: '稳重扎根 · 棕土色调 · 以大地为视觉语言',
  palette: {
    primary: '#a08050',
    secondary: '#c0a070',
    accent: '#d8c090',
    muted: '#6a5a3a',
    bg: '#120e0a',
    surface: '#1e1812',
    border: '#2e2818',
    positive: '#6aa86a',
    negative: '#b86a4a',
    neutral: '#7a6a5a',
    gradient: [[0, '#1e1812'], [0.5, '#a08050'], [1, '#d8c090']],
  },
  defaults: {
    point: { radius: '5', color: 'var(--primary)', opacity: '0.8', glow: 'false' },
    line: { strokeWidth: '2.5', color: 'var(--primary)', opacity: '0.7', smooth: 'false' },
    surface: { color: 'var(--primary)', opacity: '0.15', gradient: 'true' },
    bar: { width: '26', color: 'var(--primary)', radius: '2', gap: '3' },
    ring: { radius: '80', thickness: '22', color: 'var(--primary)', gap: '1' },
    grid: { color: 'var(--border)', opacity: '0.25', dashArray: '3,6' },
  },
}

// ============================================================
// 金 · 隐喻
// ============================================================

/** 金属隐喻 — 锐利、精准、以冷灰金属和高对比度为主 */
export const METAPHOR_METAL: MetaphorConfig = {
  type: 'metal',
  name: '金',
  description: '锐利精准 · 冷灰金属 · 以金属为视觉语言',
  palette: {
    primary: '#a0a8b0',
    secondary: '#c8d0d8',
    accent: '#e0e4e8',
    muted: '#6a7078',
    bg: '#0e0f10',
    surface: '#181a1c',
    border: '#282a2c',
    positive: '#6ab89a',
    negative: '#b86a6a',
    neutral: '#7a7a7a',
    gradient: [[0, '#181a1c'], [0.5, '#a0a8b0'], [1, '#e0e4e8']],
  },
  defaults: {
    point: { radius: '3', color: 'var(--primary)', opacity: '0.9', glow: 'false' },
    line: { strokeWidth: '1.5', color: 'var(--primary)', opacity: '0.8', smooth: 'false' },
    surface: { color: 'var(--primary)', opacity: '0.1', gradient: 'false' },
    bar: { width: '20', color: 'var(--primary)', radius: '1', gap: '6' },
    ring: { radius: '80', thickness: '16', color: 'var(--primary)', gap: '3' },
    grid: { color: 'var(--border)', opacity: '0.3', dashArray: '2,4' },
  },
}

// ============================================================
// 雾 · 隐喻
// ============================================================

/** 雾隐喻 — 朦胧、梦幻、以低饱和度和渐变叠加为主 */
export const METAPHOR_MIST: MetaphorConfig = {
  type: 'mist',
  name: '雾',
  description: '朦胧梦幻 · 低饱和度 · 以雾为视觉语言',
  palette: {
    primary: '#a09890',
    secondary: '#c8c0b8',
    accent: '#e0d8d0',
    muted: '#7a726a',
    bg: '#121010',
    surface: '#1e1a18',
    border: '#2a2826',
    positive: '#7ab89a',
    negative: '#b88a7a',
    neutral: '#8a8a8a',
    gradient: [[0, '#1e1a18'], [0.5, '#a09890'], [1, '#e0d8d0']],
  },
  defaults: {
    point: { radius: '6', color: 'var(--primary)', opacity: '0.5', glow: 'true' },
    line: { strokeWidth: '1', color: 'var(--primary)', opacity: '0.5', smooth: 'true' },
    surface: { color: 'var(--primary)', opacity: '0.08', gradient: 'true' },
    bar: { width: '28', color: 'var(--primary)', radius: '6', gap: '8' },
    ring: { radius: '80', thickness: '14', color: 'var(--primary)', gap: '4' },
    grid: { color: 'var(--border)', opacity: '0.15', dashArray: '8,4' },
  },
}

// ============================================================
// 星 · 隐喻
// ============================================================

/** 星隐喻 — 深邃、广阔、以深蓝紫和辉光散布为主 */
export const METAPHOR_STAR: MetaphorConfig = {
  type: 'star',
  name: '星',
  description: '深邃广阔 · 深蓝紫辉光 · 以星空为视觉语言',
  palette: {
    primary: '#7a6ad0',
    secondary: '#a090e0',
    accent: '#c8b8f0',
    muted: '#5a4a8a',
    bg: '#0a0812',
    surface: '#14101e',
    border: '#1e1a2a',
    positive: '#6ac8a0',
    negative: '#c86a8a',
    neutral: '#7a6a8a',
    gradient: [[0, '#14101e'], [0.5, '#7a6ad0'], [1, '#c8b8f0']],
  },
  defaults: {
    point: { radius: '4', color: 'var(--primary)', opacity: '0.9', glow: 'true' },
    line: { strokeWidth: '1.5', color: 'var(--primary)', opacity: '0.6', smooth: 'true' },
    surface: { color: 'var(--primary)', opacity: '0.12', gradient: 'true' },
    bar: { width: '22', color: 'var(--primary)', radius: '3', gap: '5' },
    ring: { radius: '80', thickness: '18', color: 'var(--primary)', gap: '2' },
    grid: { color: 'var(--border)', opacity: '0.2', dashArray: '4,4' },
  },
}

// ============================================================
// 晶 · 隐喻
// ============================================================

/** 晶隐喻 — 透明、结构、以多面体折射和高亮度为主 */
export const METAPHOR_CRYSTAL: MetaphorConfig = {
  type: 'crystal',
  name: '晶',
  description: '透明结构 · 多面折射 · 以水晶为视觉语言',
  palette: {
    primary: '#80c8d8',
    secondary: '#a0dce8',
    accent: '#c8e8f0',
    muted: '#5a7a82',
    bg: '#0a1214',
    surface: '#121e20',
    border: '#1a2a2e',
    positive: '#6ac8b0',
    negative: '#c87a8a',
    neutral: '#7a8a8a',
    gradient: [[0, '#121e20'], [0.5, '#80c8d8'], [1, '#c8e8f0']],
  },
  defaults: {
    point: { radius: '4', color: 'var(--primary)', opacity: '0.8', glow: 'true' },
    line: { strokeWidth: '1', color: 'var(--primary)', opacity: '0.7', smooth: 'false' },
    surface: { color: 'var(--primary)', opacity: '0.1', gradient: 'true' },
    bar: { width: '20', color: 'var(--primary)', radius: '2', gap: '6' },
    ring: { radius: '80', thickness: '16', color: 'var(--primary)', gap: '2' },
    grid: { color: 'var(--border)', opacity: '0.2', dashArray: '2,6' },
  },
}

// ============================================================
// 隐喻查找
// ============================================================

/** 所有隐喻映射表 */
export const METAPHOR_MAP: Record<MetaphorType, MetaphorConfig> = {
  light: METAPHOR_LIGHT,
  ink: METAPHOR_INK,
  wood: METAPHOR_WOOD,
  fire: METAPHOR_FIRE,
  water: METAPHOR_WATER,
  earth: METAPHOR_EARTH,
  metal: METAPHOR_METAL,
  mist: METAPHOR_MIST,
  star: METAPHOR_STAR,
  crystal: METAPHOR_CRYSTAL,
}

/** 根据类型获取隐喻配置 */
export function getMetaphor(type: MetaphorType): MetaphorConfig {
  return METAPHOR_MAP[type] ?? METAPHOR_LIGHT
}

/** 获取所有隐喻类型列表 */
export function getAllMetaphorTypes(): MetaphorType[] {
  return ['light', 'ink', 'wood', 'fire', 'water', 'earth', 'metal', 'mist', 'star', 'crystal']
}

/** 获取所有隐喻配置 */
export function getAllMetaphors(): MetaphorConfig[] {
  return [METAPHOR_LIGHT, METAPHOR_INK, METAPHOR_WOOD, METAPHOR_FIRE, METAPHOR_WATER, METAPHOR_EARTH, METAPHOR_METAL, METAPHOR_MIST, METAPHOR_STAR, METAPHOR_CRYSTAL]
}