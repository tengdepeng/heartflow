// ============================================================
// 幕僚体系 · 6 类固定幕僚身份预设
// 蓝图第四部分"幕僚统一体系（城市的居民）"：镜我 / 追风 / 灵犀 / 默渊 / 时痕 / 守钟人。
//
// 设计：
// - 复用现有 4 个 AdvisorRole + 5 个 AdvisorPersonality（避免扩张调度矩阵），
//   以中文 name + responsibilities + customColorScheme 区分 6 类身份。
// - 稳定 id（preset-* 前缀）保证幂等注入，绝不覆盖用户已自定义幕僚。
// - responsibilities 字段为新增可选字段，向后兼容旧数据。
// ============================================================

import type { AdvisorProfile } from '../../types/advisor'

/** 6 类固定幕僚预设（id 稳定，用于幂等 seed） */
export const DEFAULT_ADVISOR_PRESETS: AdvisorProfile[] = [
  {
    id: 'preset-jingwo',
    name: '镜我',
    role: 'hermit',
    personality: 'intuitive',
    state: 'awake',
    affinity: 0,
    level: 0,
    totalInteractions: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastActiveAt: null,
    unlocked: true,
    carrier: { kind: 'official-geometry', geometry: 'orb', formLabel: '玉珠' },
    responsibilities: '映照内心，引导自我觉察与情绪梳理',
    customColorScheme: {
      primary: '#8b6aaa',
      secondary: '#6d4f8a',
      aura: 'rgba(139, 106, 170, 0.15)',
      text: '#dfcef0',
    },
  },
  {
    id: 'preset-zhuifeng',
    name: '追风',
    role: 'craftsman',
    personality: 'lively',
    state: 'awake',
    affinity: 0,
    level: 0,
    totalInteractions: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastActiveAt: null,
    unlocked: true,
    carrier: { kind: 'official-geometry', geometry: 'flame', formLabel: '萤火虫光点' },
    responsibilities: '助力专注与行动提速，守护心流时刻',
    customColorScheme: {
      primary: '#e8956a',
      secondary: '#d47a4a',
      aura: 'rgba(232, 149, 106, 0.15)',
      text: '#fce4d6',
    },
  },
  {
    id: 'preset-lingxi',
    name: '灵犀',
    role: 'scholar',
    personality: 'intuitive',
    state: 'awake',
    affinity: 0,
    level: 0,
    totalInteractions: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastActiveAt: null,
    unlocked: true,
    carrier: { kind: 'official-geometry', geometry: 'crystal', formLabel: '暖光灯笼' },
    responsibilities: '串联知识与灵感直觉，点亮智慧之灯',
    customColorScheme: {
      primary: '#6b9fc4',
      secondary: '#3a6fd0',
      aura: 'rgba(107, 159, 196, 0.15)',
      text: '#cfe0ff',
    },
  },
  {
    id: 'preset-moyuan',
    name: '默渊',
    role: 'hermit',
    personality: 'steady',
    state: 'awake',
    affinity: 0,
    level: 0,
    totalInteractions: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastActiveAt: null,
    unlocked: true,
    carrier: { kind: 'official-geometry', geometry: 'seed', formLabel: '深色墨砚' },
    responsibilities: '沉淀思绪，守护独处与内省空间',
    customColorScheme: {
      primary: '#4a7c9b',
      secondary: '#2d5a7a',
      aura: 'rgba(74, 124, 155, 0.15)',
      text: '#b8d4e8',
    },
  },
  {
    id: 'preset-shichen',
    name: '时痕',
    role: 'craftsman',
    personality: 'rigorous',
    state: 'awake',
    affinity: 0,
    level: 0,
    totalInteractions: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastActiveAt: null,
    unlocked: true,
    carrier: { kind: 'official-geometry', geometry: 'orb', formLabel: '沙漏' },
    responsibilities: '记录时间痕迹与节律，梳理成长脉络',
    customColorScheme: {
      primary: '#7a8a9a',
      secondary: '#5a6a7a',
      aura: 'rgba(122, 138, 154, 0.15)',
      text: '#d0d8e0',
    },
  },
  {
    id: 'preset-shouzhongren',
    name: '守钟人',
    role: 'guardian',
    personality: 'caring',
    state: 'awake',
    affinity: 0,
    level: 0,
    totalInteractions: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastActiveAt: null,
    unlocked: true,
    carrier: { kind: 'official-geometry', geometry: 'seed', formLabel: '古铜钟' },
    responsibilities: '守护日常节律与健康习惯，守望生活的钟摆',
    customColorScheme: {
      primary: '#7aab8a',
      secondary: '#5a8a6a',
      aura: 'rgba(122, 171, 138, 0.15)',
      text: '#d0e8d8',
    },
  },
]

/** preset id 前缀（用于计数时排除固定幕僚，不占用户自定义上限） */
export const PRESET_ADVISOR_ID_PREFIX = 'preset-'

/** 判断是否为固定幕僚预设 id */
export function isPresetAdvisorId(id: string): boolean {
  return id.startsWith(PRESET_ADVISOR_ID_PREFIX)
}
