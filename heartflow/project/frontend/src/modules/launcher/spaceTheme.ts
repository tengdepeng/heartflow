// ============================================================
// Launcher · 3D 空间风格配置（持久化，本地私有）
// 宪法第 2 条「超级自定义」：外观由用户本地保存，不由 AI 定死。
// 预设只是起点，用户随时可改；所有写入走明文 JSON 引擎 KV。
// ============================================================

import { ref, watch } from 'vue'
import { storage } from '../../engine/storage'
import type { SpaceLayout } from './spaceLayout'

/** 背景层素材类型 */
export type SpaceBackgroundKind = 'none' | 'image' | 'video'

/** 空间风格配置 */
export interface LauncherSpaceConfig {
  /** 空间形态 */
  layout: SpaceLayout
  /** 背景层类型 */
  backgroundKind: SpaceBackgroundKind
  /** 背景素材源：data URI 或本地文件路径（image / video 时有值） */
  backgroundSource: string | null
  /** 特效强度 0..1（星尘密度 + 光环亮度 + 呼吸幅度） */
  fxIntensity: number
  /** 自动巡览：环阵/弧墙缓慢摆动 */
  autoRotate: boolean
  /** 主色（描边 / 光环 / 星尘取色） */
  accent: string
  /** 名称标签显示时机 */
  labelMode: 'always' | 'hover'
}

export const DEFAULT_SPACE_CONFIG: LauncherSpaceConfig = {
  layout: 'arc',
  backgroundKind: 'none',
  backgroundSource: null,
  fxIntensity: 0.6,
  autoRotate: true,
  accent: '#d4a574',
  labelMode: 'hover',
}

export interface SpacePreset {
  id: string
  name: string
  config: LauncherSpaceConfig
}

/** 内置风格预设：只是起点，改完即存本地，不写死用户外观 */
export const SPACE_PRESETS: ReadonlyArray<SpacePreset> = [
  {
    id: 'amber',
    name: '琥珀庭院',
    config: {
      layout: 'arc',
      backgroundKind: 'none',
      backgroundSource: null,
      fxIntensity: 0.6,
      autoRotate: true,
      accent: '#d4a574',
      labelMode: 'hover',
    },
  },
  {
    id: 'starfield',
    name: '星海巡游',
    config: {
      layout: 'ring',
      backgroundKind: 'none',
      backgroundSource: null,
      fxIntensity: 0.85,
      autoRotate: true,
      accent: '#85b7eb',
      labelMode: 'hover',
    },
  },
  {
    id: 'ink',
    name: '水墨静室',
    config: {
      layout: 'grid',
      backgroundKind: 'none',
      backgroundSource: null,
      fxIntensity: 0.3,
      autoRotate: false,
      accent: '#b4b2a9',
      labelMode: 'always',
    },
  },
  {
    id: 'grove',
    name: '深林微光',
    config: {
      layout: 'arc',
      backgroundKind: 'none',
      backgroundSource: null,
      fxIntensity: 0.5,
      autoRotate: true,
      accent: '#5dcaa5',
      labelMode: 'hover',
    },
  },
]

const STORAGE_KEY = 'launcher:space'

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function normalize(input: Partial<LauncherSpaceConfig> | null | undefined): LauncherSpaceConfig {
  const raw = input ?? {}
  const layout: SpaceLayout =
    raw.layout === 'ring' || raw.layout === 'grid' ? raw.layout : 'arc'
  const kind: SpaceBackgroundKind =
    raw.backgroundKind === 'image' || raw.backgroundKind === 'video' ? raw.backgroundKind : 'none'
  return {
    layout,
    backgroundKind: kind,
    backgroundSource: kind === 'none' ? null : raw.backgroundSource ?? null,
    fxIntensity: clamp01(raw.fxIntensity ?? DEFAULT_SPACE_CONFIG.fxIntensity),
    autoRotate: raw.autoRotate ?? DEFAULT_SPACE_CONFIG.autoRotate,
    accent: typeof raw.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.accent)
      ? raw.accent
      : DEFAULT_SPACE_CONFIG.accent,
    labelMode: raw.labelMode === 'always' ? 'always' : 'hover',
  }
}

const config = ref<LauncherSpaceConfig>(
  normalize(storage.getKV<Partial<LauncherSpaceConfig>>(STORAGE_KEY, {})),
)

watch(config, (v) => storage.setKV(STORAGE_KEY, v), { deep: true })

function applyPreset(id: string): void {
  const preset = SPACE_PRESETS.find((p) => p.id === id)
  if (!preset) return
  config.value = { ...preset.config }
}

function setLayout(layout: SpaceLayout): void {
  config.value = { ...config.value, layout }
}

function setBackground(kind: SpaceBackgroundKind, source: string | null): void {
  config.value = {
    ...config.value,
    backgroundKind: kind,
    backgroundSource: kind === 'none' ? null : source,
  }
}

function setFxIntensity(v: number): void {
  config.value = { ...config.value, fxIntensity: clamp01(v) }
}

function setAutoRotate(v: boolean): void {
  config.value = { ...config.value, autoRotate: v }
}

function setAccent(hex: string): void {
  config.value = {
    ...config.value,
    accent: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : config.value.accent,
  }
}

function setLabelMode(mode: 'always' | 'hover'): void {
  config.value = { ...config.value, labelMode: mode }
}

function resetSpace(): void {
  config.value = { ...DEFAULT_SPACE_CONFIG }
}

/** 测试钩子：重置到默认并清持久化，避免用例间污染 */
export function __resetSpaceForTest(): void {
  config.value = { ...DEFAULT_SPACE_CONFIG }
  storage.setKV(STORAGE_KEY, config.value)
}

export function useLauncherSpace() {
  return {
    config,
    applyPreset,
    setLayout,
    setBackground,
    setFxIntensity,
    setAutoRotate,
    setAccent,
    setLabelMode,
    resetSpace,
  }
}
