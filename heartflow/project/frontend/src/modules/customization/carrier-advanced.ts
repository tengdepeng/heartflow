// ============================================================
// 殿堂装修工坊 · 载体动画引擎 & 材质混合系统
// 蓝图定义：
//   载体形态切换动画引擎，材质混合与渐变效果
//   支持载体间的视觉过渡、材质叠加、光效混合
// ============================================================

// ---- 载体内观形态 ----

export type CarrierVisualMorph =
  | 'orb'
  | 'crystal'
  | 'flame'
  | 'seed'
  | 'spiral'
  | 'geode'
  | 'nebula'
  | 'lotus'

export const MORPH_LABELS: Record<CarrierVisualMorph, string> = {
  orb: '圆球',
  crystal: '结晶',
  flame: '火焰',
  seed: '种子',
  spiral: '螺旋',
  geode: '晶洞',
  nebula: '星云',
  lotus: '莲花',
}

export const MORPH_ICONS: Record<CarrierVisualMorph, string> = {
  orb: '🔮',
  crystal: '💎',
  flame: '🔥',
  seed: '🌱',
  spiral: '🌀',
  geode: '🪨',
  nebula: '🌌',
  lotus: '🪷',
}

// ---- 载体光效 ----

export type CarrierGlowEffect =
  | 'glow'
  | 'pulse'
  | 'particles'
  | 'sparkle'
  | 'ripple'
  | 'aurora'

export const GLOW_LABELS: Record<CarrierGlowEffect, string> = {
  glow: '辉光',
  pulse: '脉动',
  particles: '粒子',
  sparkle: '闪烁',
  ripple: '涟漪',
  aurora: '极光',
}

// ---- 材质类型 ----

export type CarrierMaterial =
  | 'glass'
  | 'crystal'
  | 'metal'
  | 'jade'
  | 'pearl'
  | 'obsidian'
  | 'amber'
  | 'opal'

export const MATERIAL_LABELS: Record<CarrierMaterial, string> = {
  glass: '玻璃',
  crystal: '水晶',
  metal: '金属',
  jade: '玉石',
  pearl: '珍珠',
  obsidian: '黑曜石',
  amber: '琥珀',
  opal: '蛋白石',
}

export const MATERIAL_CSS: Record<CarrierMaterial, { bg: string; border: string; shadow: string; overlay: string }> = {
  glass: {
    bg: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.2)',
    shadow: '0 0 20px rgba(255,255,255,0.15)',
    overlay: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
  },
  crystal: {
    bg: 'rgba(124,92,252,0.1)',
    border: 'rgba(124,92,252,0.3)',
    shadow: '0 0 20px rgba(124,92,252,0.2)',
    overlay: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(124,92,252,0.1) 50%, transparent 100%)',
  },
  metal: {
    bg: 'rgba(180,160,140,0.1)',
    border: 'rgba(180,160,140,0.3)',
    shadow: '0 0 15px rgba(180,160,140,0.15)',
    overlay: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(180,160,140,0.05) 50%, transparent 100%)',
  },
  jade: {
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.25)',
    shadow: '0 0 18px rgba(74,222,128,0.15)',
    overlay: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(74,222,128,0.08) 60%, transparent 100%)',
  },
  pearl: {
    bg: 'rgba(255,240,220,0.1)',
    border: 'rgba(255,240,220,0.3)',
    shadow: '0 0 22px rgba(255,240,220,0.2)',
    overlay: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 60%)',
  },
  obsidian: {
    bg: 'rgba(20,15,25,0.15)',
    border: 'rgba(100,80,120,0.3)',
    shadow: '0 0 12px rgba(100,80,200,0.1)',
    overlay: 'linear-gradient(180deg, rgba(100,80,200,0.05) 0%, transparent 50%, rgba(20,15,25,0.1) 100%)',
  },
  amber: {
    bg: 'rgba(240,180,40,0.1)',
    border: 'rgba(240,180,40,0.3)',
    shadow: '0 0 18px rgba(240,180,40,0.2)',
    overlay: 'linear-gradient(135deg, rgba(255,255,200,0.1) 0%, rgba(240,180,40,0.08) 50%, transparent 100%)',
  },
  opal: {
    bg: 'rgba(200,180,255,0.08)',
    border: 'rgba(200,180,255,0.25)',
    shadow: '0 0 25px rgba(200,180,255,0.2)',
    overlay: 'linear-gradient(45deg, rgba(255,200,200,0.06) 0%, rgba(200,220,255,0.06) 33%, rgba(200,255,200,0.06) 66%, rgba(255,255,200,0.06) 100%)',
  },
}

// ---- 载体动画配置 ----

export interface CarrierAnimationConfig {
  /** 目标形态 */
  morph: CarrierVisualMorph
  /** 光效 */
  glow: CarrierGlowEffect
  /** 材质 */
  material: CarrierMaterial
  /** 主色 */
  primaryColor: string
  /** 辅色 */
  secondaryColor: string
  /** 动画时长 (ms) */
  duration: number
  /** 缓动函数 */
  easing: AnimationEasing
  /** 动画循环 */
  loop: boolean
  /** 是否启用 */
  enabled: boolean
}

export type AnimationEasing =
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'linear'
  | 'spring'
  | 'bounce'

export const EASING_LABELS: Record<AnimationEasing, string> = {
  'ease': '平滑',
  'ease-in': '渐入',
  'ease-out': '渐出',
  'ease-in-out': '渐入渐出',
  'linear': '线性',
  'spring': '弹性',
  'bounce': '弹跳',
}

export const EASING_CSS: Record<AnimationEasing, string> = {
  'ease': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  'ease-in': 'cubic-bezier(0.42, 0, 1, 1)',
  'ease-out': 'cubic-bezier(0, 0, 0.58, 1)',
  'ease-in-out': 'cubic-bezier(0.42, 0, 0.58, 1)',
  'linear': 'linear',
  'spring': 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  'bounce': 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
}

// ---- 动画预设 ----

export interface AnimationPreset {
  id: string
  name: string
  description: string
  config: CarrierAnimationConfig
}

export const CARRIER_ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: 'anim_gentle_pulse',
    name: '轻柔脉动',
    description: '缓慢的呼吸式脉动，适合日常使用',
    config: {
      morph: 'orb',
      glow: 'pulse',
      material: 'pearl',
      primaryColor: '#f0d0a0',
      secondaryColor: '#e0c090',
      duration: 3000,
      easing: 'ease-in-out',
      loop: true,
      enabled: true,
    },
  },
  {
    id: 'anim_crystal_bloom',
    name: '水晶绽放',
    description: '结晶形态从中心绽放，适合庆祝时刻',
    config: {
      morph: 'crystal',
      glow: 'sparkle',
      material: 'crystal',
      primaryColor: '#7c5cfc',
      secondaryColor: '#a78bfa',
      duration: 2000,
      easing: 'spring',
      loop: false,
      enabled: true,
    },
  },
  {
    id: 'anim_flame_dance',
    name: '火焰之舞',
    description: '火焰形态的律动，适合高能量场景',
    config: {
      morph: 'flame',
      glow: 'glow',
      material: 'amber',
      primaryColor: '#f59e0b',
      secondaryColor: '#ef4444',
      duration: 1500,
      easing: 'ease',
      loop: true,
      enabled: true,
    },
  },
  {
    id: 'anim_seed_growth',
    name: '种子生长',
    description: '种子形态的缓慢生长动画',
    config: {
      morph: 'seed',
      glow: 'ripple',
      material: 'jade',
      primaryColor: '#4ade80',
      secondaryColor: '#22c55e',
      duration: 4000,
      easing: 'ease-out',
      loop: false,
      enabled: true,
    },
  },
  {
    id: 'anim_spiral_meditation',
    name: '螺旋冥想',
    description: '螺旋形态的无限旋转，适合冥想',
    config: {
      morph: 'spiral',
      glow: 'aurora',
      material: 'opal',
      primaryColor: '#a78bfa',
      secondaryColor: '#67e8f9',
      duration: 6000,
      easing: 'linear',
      loop: true,
      enabled: true,
    },
  },
  {
    id: 'anim_geode_reveal',
    name: '晶洞揭示',
    description: '晶洞形态从内部发光，适合里程碑',
    config: {
      morph: 'geode',
      glow: 'glow',
      material: 'obsidian',
      primaryColor: '#6c5ce7',
      secondaryColor: '#a78bfa',
      duration: 2500,
      easing: 'ease-out',
      loop: false,
      enabled: true,
    },
  },
  {
    id: 'anim_nebula_drift',
    name: '星云漂流',
    description: '星云形态的缓慢漂移，适合深夜',
    config: {
      morph: 'nebula',
      glow: 'aurora',
      material: 'glass',
      primaryColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      duration: 8000,
      easing: 'linear',
      loop: true,
      enabled: true,
    },
  },
  {
    id: 'anim_lotus_open',
    name: '莲花绽放',
    description: '莲花形态的层层展开，适合清晨',
    config: {
      morph: 'lotus',
      glow: 'pulse',
      material: 'pearl',
      primaryColor: '#fbbf24',
      secondaryColor: '#f472b6',
      duration: 3500,
      easing: 'ease-in-out',
      loop: false,
      enabled: true,
    },
  },
]

// ---- 动画引擎 ----

/** 创建动画配置 */
export function createAnimationConfig(
  morph: CarrierVisualMorph = 'orb',
  glow: CarrierGlowEffect = 'pulse',
  material: CarrierMaterial = 'pearl',
  primaryColor: string = '#f0c040',
  options: Partial<Pick<CarrierAnimationConfig, 'secondaryColor' | 'duration' | 'easing' | 'loop'>> = {},
): CarrierAnimationConfig {
  return {
    morph,
    glow,
    material,
    primaryColor,
    secondaryColor: options.secondaryColor || primaryColor,
    duration: options.duration || 2000,
    easing: options.easing || 'ease-in-out',
    loop: options.loop ?? true,
    enabled: true,
  }
}

/** 生成 CSS 动画关键帧 */
export function generateAnimationKeyframes(config: CarrierAnimationConfig): string {
  const { glow } = config

  const keyframesMap: Record<string, string> = {
    pulse: `@keyframes carrier-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.85; }
    }`,
    glow: `@keyframes carrier-glow {
      0%, 100% { filter: brightness(1) drop-shadow(0 0 8px var(--glow-color)); }
      50% { filter: brightness(1.2) drop-shadow(0 0 16px var(--glow-color)); }
    }`,
    sparkle: `@keyframes carrier-sparkle {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.9; }
      25% { transform: scale(1.08) rotate(2deg); opacity: 1; }
      75% { transform: scale(0.95) rotate(-2deg); opacity: 0.85; }
    }`,
    ripple: `@keyframes carrier-ripple {
      0% { transform: scale(1); box-shadow: 0 0 0 0 var(--glow-color); }
      50% { transform: scale(1.02); box-shadow: 0 0 0 10px transparent; }
      100% { transform: scale(1); box-shadow: 0 0 0 0 transparent; }
    }`,
    aurora: `@keyframes carrier-aurora {
      0% { filter: hue-rotate(0deg) brightness(1); }
      33% { filter: hue-rotate(15deg) brightness(1.1); }
      66% { filter: hue-rotate(-10deg) brightness(0.95); }
      100% { filter: hue-rotate(0deg) brightness(1); }
    }`,
    particles: `@keyframes carrier-particles {
      0% { transform: translateY(0) scale(1); opacity: 0.6; }
      50% { transform: translateY(-4px) scale(1.1); opacity: 1; }
      100% { transform: translateY(0) scale(1); opacity: 0.6; }
    }`,
  }

  return keyframesMap[glow] || keyframesMap.pulse
}

/** 生成动画 CSS 类 */
export function generateAnimationCSS(config: CarrierAnimationConfig): string {
  const { glow, duration, easing } = config
  const cssEasing = EASING_CSS[easing]
  const iteration = config.loop ? 'infinite' : '1'

  return `animation: carrier-${glow} ${duration}ms ${cssEasing} ${iteration};`
}

// ---- 材质混合系统 ----

export interface MaterialBlend {
  /** 源材质 */
  source: CarrierMaterial
  /** 目标材质 */
  target: CarrierMaterial
  /** 混合比例 (0-1) */
  ratio: number
  /** 混合方向 */
  direction: 'forward' | 'backward' | 'crossfade'
}

/** 计算材质混合结果 */
export function blendMaterials(source: CarrierMaterial, target: CarrierMaterial, ratio: number): CarrierMaterial {
  if (ratio <= 0) return source
  if (ratio >= 1) return target

  // 材质混合矩阵：定义中间过渡材质
  const blendMatrix: Record<string, Record<string, CarrierMaterial>> = {
    glass: { crystal: 'crystal', metal: 'glass', jade: 'jade', pearl: 'pearl', obsidian: 'obsidian', amber: 'amber', opal: 'opal' },
    crystal: { glass: 'crystal', metal: 'crystal', jade: 'jade', pearl: 'opal', obsidian: 'crystal', amber: 'amber', opal: 'opal' },
    metal: { glass: 'glass', crystal: 'crystal', jade: 'jade', pearl: 'pearl', obsidian: 'obsidian', amber: 'amber', opal: 'opal' },
    jade: { glass: 'jade', crystal: 'jade', metal: 'jade', pearl: 'pearl', obsidian: 'obsidian', amber: 'amber', opal: 'opal' },
    pearl: { glass: 'pearl', crystal: 'opal', metal: 'pearl', jade: 'pearl', obsidian: 'obsidian', amber: 'amber', opal: 'opal' },
    obsidian: { glass: 'obsidian', crystal: 'crystal', metal: 'obsidian', jade: 'obsidian', pearl: 'obsidian', amber: 'amber', opal: 'opal' },
    amber: { glass: 'amber', crystal: 'amber', metal: 'amber', jade: 'amber', pearl: 'amber', obsidian: 'amber', opal: 'opal' },
    opal: { glass: 'opal', crystal: 'opal', metal: 'opal', jade: 'opal', pearl: 'opal', obsidian: 'opal', amber: 'opal' },
  }

  return blendMatrix[source]?.[target] || source
}

/** 生成材质混合 CSS */
export function generateBlendCSS(
  source: CarrierMaterial,
  target: CarrierMaterial,
  ratio: number,
): { background: string; border: string; boxShadow: string; mixBlendMode: string } {
  const sourceMat = MATERIAL_CSS[source]
  const targetMat = MATERIAL_CSS[target]

  // 插值计算混合结果
  const interpolate = (a: string, b: string, r: number): string => {
    // 简单的 CSS 值混合（对于复杂渐变，使用 opacity 叠加）
    return r >= 0.5 ? b : a
  }

  return {
    background: interpolate(sourceMat.bg, targetMat.bg, ratio),
    border: interpolate(sourceMat.border, targetMat.border, ratio),
    boxShadow: interpolate(sourceMat.shadow, targetMat.shadow, ratio),
    mixBlendMode: ratio > 0.5 ? 'screen' : 'normal',
  }
}

// ---- 形态过渡动画 ----

export interface MorphTransition {
  /** 过渡ID */
  id: string
  /** 源形态 */
  from: CarrierVisualMorph
  /** 目标形态 */
  to: CarrierVisualMorph
  /** 过渡时长 (ms) */
  duration: number
  /** 中间状态列表 */
  intermediateStates: string[]
  /** 过渡描述 */
  description: string
}

/** 形态过渡映射表 */
export const MORPH_TRANSITIONS: Record<string, MorphTransition> = {
  'orb_crystal': {
    id: 'orb_crystal',
    from: 'orb',
    to: 'crystal',
    duration: 800,
    intermediateStates: ['orb-scale-down', 'crystal-form', 'crystal-scale-up'],
    description: '圆球收缩为结晶核心，再展开为结晶形态',
  },
  'orb_flame': {
    id: 'orb_flame',
    from: 'orb',
    to: 'flame',
    duration: 600,
    intermediateStates: ['orb-heat', 'flame-ignite', 'flame-shape'],
    description: '圆球升温发光，火焰从内部点燃',
  },
  'crystal_flame': {
    id: 'crystal_flame',
    from: 'crystal',
    to: 'flame',
    duration: 700,
    intermediateStates: ['crystal-melt', 'liquid-form', 'flame-emerge'],
    description: '结晶融化，液态变形为火焰',
  },
  'seed_spiral': {
    id: 'seed_spiral',
    from: 'seed',
    to: 'spiral',
    duration: 1000,
    intermediateStates: ['seed-crack', 'sprout-emerge', 'spiral-grow'],
    description: '种子裂开，螺旋生长',
  },
  'spiral_lotus': {
    id: 'spiral_lotus',
    from: 'spiral',
    to: 'lotus',
    duration: 1200,
    intermediateStates: ['spiral-unwind', 'petal-form', 'lotus-bloom'],
    description: '螺旋展开，花瓣成形，莲花绽放',
  },
}

/** 获取形态过渡配置 */
export function getMorphTransition(from: CarrierVisualMorph, to: CarrierVisualMorph): MorphTransition | null {
  const key = `${from}_${to}`
  return MORPH_TRANSITIONS[key] || null
}

// ---- 动画序列编排 ----

export interface AnimationSequence {
  id: string
  name: string
  steps: AnimationStep[]
  loop: boolean
  currentIndex: number
  playing: boolean
}

export interface AnimationStep {
  id: string
  config: CarrierAnimationConfig
  duration: number
  delay: number
}

/** 创建动画序列 */
export function createAnimationSequence(
  name: string,
  steps: AnimationStep[],
  loop: boolean = false,
): AnimationSequence {
  return {
    id: `aseq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    steps,
    loop,
    currentIndex: -1,
    playing: false,
  }
}

/** 预设动画序列 */
export const BUILTIN_ANIMATION_SEQUENCES: AnimationSequence[] = [
  {
    id: 'aseq_wake_up',
    name: '唤醒仪式',
    steps: [
      {
        id: 'wake_1',
        config: CARRIER_ANIMATION_PRESETS.find(p => p.id === 'anim_seed_growth')!.config,
        duration: 4000,
        delay: 0,
      },
      {
        id: 'wake_2',
        config: CARRIER_ANIMATION_PRESETS.find(p => p.id === 'anim_lotus_open')!.config,
        duration: 3500,
        delay: 500,
      },
      {
        id: 'wake_3',
        config: CARRIER_ANIMATION_PRESETS.find(p => p.id === 'anim_gentle_pulse')!.config,
        duration: 3000,
        delay: 0,
      },
    ],
    loop: false,
    currentIndex: -1,
    playing: false,
  },
  {
    id: 'aseq_meditation',
    name: '冥想之旅',
    steps: [
      {
        id: 'med_1',
        config: CARRIER_ANIMATION_PRESETS.find(p => p.id === 'anim_spiral_meditation')!.config,
        duration: 6000,
        delay: 0,
      },
      {
        id: 'med_2',
        config: CARRIER_ANIMATION_PRESETS.find(p => p.id === 'anim_nebula_drift')!.config,
        duration: 8000,
        delay: 1000,
      },
    ],
    loop: true,
    currentIndex: -1,
    playing: false,
  },
]