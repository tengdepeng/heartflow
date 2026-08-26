// ============================================================
// 引力场画布 · 高级引力引擎
// 玉珠载体交互、介质呼吸、结晶落点、星盘导航
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { CanvasCrystal, GravityConfig } from './types'
import { DEFAULT_GRAVITY_CONFIG } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 玉珠载体 */
export interface JadeBead {
  id: string
  /** 关联的结晶ID */
  crystalId: string
  /** 当前位置 x */
  x: number
  /** 当前位置 y */
  y: number
  /** 目标位置 x */
  targetX: number
  /** 目标位置 y */
  targetY: number
  /** 尺寸缩放 */
  scale: number
  /** 透明度 */
  opacity: number
  /** 光泽度 0-1 */
  luster: number
  /** 旋转角度 */
  rotation: number
  /** 浮动相位 */
  floatPhase: number
  /** 是否被选中 */
  selected: boolean
  /** 珠色 */
  color: string
  /** 脉动强度 */
  pulseIntensity: number
}

/** 介质呼吸状态 */
export interface MediumBreath {
  /** 当前呼吸相位 0-1 */
  phase: number
  /** 呼吸速度 */
  speed: number
  /** 呼吸深度 */
  depth: number
  /** 是否激活 */
  active: boolean
  /** 呼吸类型 */
  type: 'calm' | 'normal' | 'excited'
  /** 上次更新时间 */
  lastUpdate: number
}

/** 结晶落点 */
export interface CrystalLanding {
  id: string
  /** 结晶ID */
  crystalId: string
  /** 落点位置 */
  x: number
  y: number
  /** 落点半径 */
  radius: number
  /** 涟漪强度 */
  rippleIntensity: number
  /** 落点颜色 */
  color: string
  /** 落点时间 */
  landedAt: string
  /** 是否显示涟漪 */
  showRipple: boolean
}

/** 星盘星座 */
export interface StarConstellation {
  id: string
  name: string
  /** 包含的星星（结晶ID列表） */
  starIds: string[]
  /** 连线颜色 */
  lineColor: string
  /** 连线宽度 */
  lineWidth: number
  /** 是否激活 */
  active: boolean
  /** 星座描述 */
  description: string
  /** 创建时间 */
  createdAt: string
}

/** 星盘导航节点 */
export interface StarNavNode {
  id: string
  /** 关联结晶ID */
  crystalId: string
  /** 标签 */
  label: string
  /** 是否已访问 */
  visited: boolean
  /** 导航路径 */
  path: { x: number; y: number }[]
  /** 距离中心的距离 */
  distance: number
}

/** 引力场粒子 */
export interface GravityParticle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
}

// ============================================================
// 常量
// ============================================================

/** 预设星座 */
export const PRESET_CONSTELLATIONS: Omit<StarConstellation, 'id' | 'starIds' | 'createdAt'>[] = [
  {
    name: '专注之星',
    lineColor: '#6b9fc4',
    lineWidth: 2,
    active: false,
    description: '由高专注度的结晶自然形成',
  },
  {
    name: '灵感星云',
    lineColor: '#f59e6c',
    lineWidth: 2,
    active: false,
    description: '创意灵感迸发的结晶汇聚',
  },
  {
    name: '成长链',
    lineColor: '#5ab8a0',
    lineWidth: 2,
    active: false,
    description: '技能成长轨迹串联的结晶',
  },
  {
    name: '记忆环',
    lineColor: '#d98c7a',
    lineWidth: 1.5,
    active: false,
    description: '珍贵记忆时刻的结晶环绕',
  },
  {
    name: '守护阵',
    lineColor: '#a07c8c',
    lineWidth: 2,
    active: false,
    description: '安全守护相关的结晶阵列',
  },
]

/** 珠色映射 */
export const BEAD_COLORS: Record<string, string> = {
  focus: '#6b9fc4',
  creative: '#f59e6c',
  growth: '#5ab8a0',
  memory: '#d98c7a',
  safety: '#a07c8c',
  health: '#5ab8a0',
  relation: '#f0c040',
  default: '#e4e6ed',
}

/** 存储键 */
const CONSTELLATIONS_KEY = 'hf:canvas:constellations'
const LANDINGS_KEY = 'hf:canvas:landings'

// ============================================================
// 引力场高级引擎
// ============================================================

export function useCanvasGravityEngine() {
  // ---- 状态 ----
  const jadeBeads = ref<JadeBead[]>([])
  const mediumBreath = ref<MediumBreath>({
    phase: 0,
    speed: 0.02,
    depth: 0.3,
    active: true,
    type: 'normal',
    lastUpdate: Date.now(),
  })
  const landings = ref<CrystalLanding[]>(loadLandings())
  const constellations = ref<StarConstellation[]>(loadConstellations())
  const particles = ref<GravityParticle[]>([])
  const selectedBeadId = ref<string | null>(null)
  const gravityConfig = ref<GravityConfig>({ ...DEFAULT_GRAVITY_CONFIG })

  // ---- 持久化 ----

  function loadConstellations(): StarConstellation[] {
    try {
      const raw = storage.getKV<string>(CONSTELLATIONS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveConstellations() {
    storage.setKV(CONSTELLATIONS_KEY, JSON.stringify(constellations.value))
  }

  function loadLandings(): CrystalLanding[] {
    try {
      const raw = storage.getKV<string>(LANDINGS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveLandings() {
    storage.setKV(LANDINGS_KEY, JSON.stringify(landings.value))
  }

  // ---- 玉珠载体 ----

  /** 从结晶生成玉珠 */
  function generateBeads(crystals: CanvasCrystal[]) {
    jadeBeads.value = crystals.map((cc) => {
      const existing = jadeBeads.value.find(b => b.crystalId === cc.crystal.id)
      const intensity = cc.crystal.intensity ?? 0.5
      return {
        id: existing?.id ?? `bead_${cc.crystal.id}`,
        crystalId: cc.crystal.id,
        x: existing?.x ?? cc.x,
        y: existing?.y ?? cc.y,
        targetX: cc.targetX,
        targetY: cc.targetY,
        scale: existing?.scale ?? 0.6 + intensity * 0.4,
        opacity: existing?.opacity ?? 0.7 + intensity * 0.3,
        luster: existing?.luster ?? 0.5 + intensity * 0.5,
        rotation: existing?.rotation ?? Math.random() * Math.PI * 2,
        floatPhase: existing?.floatPhase ?? Math.random() * Math.PI * 2,
        selected: existing?.selected ?? false,
        color: getBeadColor(cc),
        pulseIntensity: existing?.pulseIntensity ?? intensity * 0.5,
      }
    })
  }

  /** 选择玉珠 */
  function selectBead(beadId: string | null) {
    if (selectedBeadId.value) {
      const prev = jadeBeads.value.find(b => b.id === selectedBeadId.value)
      if (prev) prev.selected = false
    }
    selectedBeadId.value = beadId
    if (beadId) {
      const bead = jadeBeads.value.find(b => b.id === beadId)
      if (bead) bead.selected = true
    }
  }

  /** 更新玉珠位置（动画帧） */
  function updateBeadPositions(dt: number) {
    const easing = 0.08
    for (const bead of jadeBeads.value) {
      bead.x += (bead.targetX - bead.x) * easing
      bead.y += (bead.targetY - bead.y) * easing
      // 浮动动画
      bead.floatPhase += dt * 0.001
      // 光泽脉冲
      bead.luster = 0.5 + Math.sin(Date.now() * 0.003 + bead.floatPhase) * 0.3
    }
  }

  /** 选中的玉珠 */
  const selectedBead = computed(() => {
    if (!selectedBeadId.value) return null
    return jadeBeads.value.find(b => b.id === selectedBeadId.value) ?? null
  })

  /** 可见玉珠数 */
  const beadCount = computed(() => jadeBeads.value.length)

  // ---- 介质呼吸 ----

  /** 设置呼吸类型 */
  function setBreathType(type: MediumBreath['type']) {
    mediumBreath.value.type = type
    switch (type) {
      case 'calm':
        mediumBreath.value.speed = 0.01
        mediumBreath.value.depth = 0.15
        break
      case 'normal':
        mediumBreath.value.speed = 0.02
        mediumBreath.value.depth = 0.3
        break
      case 'excited':
        mediumBreath.value.speed = 0.04
        mediumBreath.value.depth = 0.5
        break
    }
  }

  /** 更新呼吸（动画帧） */
  function updateBreath(dt: number) {
    if (!mediumBreath.value.active) return
    const breath = mediumBreath.value
    breath.phase += breath.speed * (dt * 0.06)
    if (breath.phase > 1) breath.phase -= 1
    breath.lastUpdate = Date.now()
  }

  /** 当前呼吸值（用于渲染） */
  const breathValue = computed(() => {
    const phase = mediumBreath.value.phase
    const depth = mediumBreath.value.depth
    // 正弦波模拟呼吸
    return Math.sin(phase * Math.PI * 2) * depth
  })

  /** 呼吸透明度波动 */
  const breathOpacity = computed(() => {
    return 0.85 + breathValue.value * 0.15
  })

  // ---- 结晶落点 ----

  /** 记录结晶落点 */
  function recordLanding(crystalId: string, x: number, y: number, color: string) {
    const landing: CrystalLanding = {
      id: `landing_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      crystalId,
      x,
      y,
      radius: 0,
      rippleIntensity: 0.8,
      color,
      landedAt: new Date().toISOString(),
      showRipple: true,
    }
    landings.value.push(landing)
    // 限制落点数量
    if (landings.value.length > 50) {
      landings.value = landings.value.slice(-50)
    }
    saveLandings()
    return landing
  }

  /** 更新涟漪（动画帧） */
  function updateRipples(dt: number) {
    for (const landing of landings.value) {
      if (landing.showRipple) {
        landing.radius += dt * 0.15
        landing.rippleIntensity *= 0.98
        if (landing.rippleIntensity < 0.01) {
          landing.showRipple = false
        }
      }
    }
  }

  /** 活跃的落点 */
  const activeLandings = computed(() =>
    landings.value.filter(l => l.showRipple)
  )

  /** 最近落点 */
  const recentLandings = computed(() =>
    [...landings.value].sort((a, b) =>
      new Date(b.landedAt).getTime() - new Date(a.landedAt).getTime()
    ).slice(0, 10)
  )

  // ---- 星盘导航 ----

  /** 创建星座 */
  function createConstellation(
    name: string,
    starIds: string[],
    lineColor: string,
    description: string,
  ): StarConstellation {
    const constellation: StarConstellation = {
      id: `const_${Date.now()}`,
      name,
      starIds,
      lineColor,
      lineWidth: 2,
      active: true,
      description,
      createdAt: new Date().toISOString(),
    }
    constellations.value.push(constellation)
    saveConstellations()
    return constellation
  }

  /** 自动发现星座（基于结晶聚集） */
  function discoverConstellations(crystals: CanvasCrystal[]) {
    const discovered: StarConstellation[] = []
    const used = new Set<string>()

    for (const cc of crystals) {
      if (used.has(cc.crystal.id)) continue
      const cluster: string[] = [cc.crystal.id]
      used.add(cc.crystal.id)

      // 寻找附近结晶
      for (const other of crystals) {
        if (used.has(other.crystal.id)) continue
        const dx = cc.x - other.x
        const dy = cc.y - other.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) {
          cluster.push(other.crystal.id)
          used.add(other.crystal.id)
        }
      }

      if (cluster.length >= 3) {
        const preset = PRESET_CONSTELLATIONS[discovered.length % PRESET_CONSTELLATIONS.length]
        discovered.push({
          id: `const_auto_${Date.now()}_${discovered.length}`,
          name: `${preset.name} #${discovered.length + 1}`,
          starIds: cluster,
          lineColor: preset.lineColor,
          lineWidth: preset.lineWidth,
          active: true,
          description: `自动发现的${cluster.length}颗结晶组成的星座`,
          createdAt: new Date().toISOString(),
        })
      }
    }

    if (discovered.length > 0) {
      constellations.value = [...constellations.value, ...discovered]
      saveConstellations()
    }
    return discovered
  }

  /** 激活/停用星座 */
  function toggleConstellation(id: string) {
    const c = constellations.value.find(c => c.id === id)
    if (c) {
      c.active = !c.active
      saveConstellations()
    }
  }

  /** 删除星座 */
  function deleteConstellation(id: string) {
    constellations.value = constellations.value.filter(c => c.id !== id)
    saveConstellations()
  }

  /** 获取星座连线 */
  function getConstellationLines(constellation: StarConstellation, crystals: CanvasCrystal[]): { x1: number; y1: number; x2: number; y2: number }[] {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
    const stars = constellation.starIds
      .map(id => crystals.find(c => c.crystal.id === id))
      .filter(Boolean) as CanvasCrystal[]

    // 按距离排序，连接最近邻
    const sorted = [...stars].sort((a, b) => {
      const cx = crystals.length > 0 ? crystals.reduce((s, c) => s + c.x, 0) / crystals.length : 400
      const cy = crystals.length > 0 ? crystals.reduce((s, c) => s + c.y, 0) / crystals.length : 300
      const da = Math.sqrt((a.x - cx) ** 2 + (a.y - cy) ** 2)
      const db = Math.sqrt((b.x - cx) ** 2 + (b.y - cy) ** 2)
      return da - db
    })

    for (let i = 1; i < sorted.length; i++) {
      lines.push({
        x1: sorted[i - 1].x,
        y1: sorted[i - 1].y,
        x2: sorted[i].x,
        y2: sorted[i].y,
      })
    }
    return lines
  }

  /** 活跃星座 */
  const activeConstellations = computed(() =>
    constellations.value.filter(c => c.active)
  )

  // ---- 粒子系统 ----

  /** 生成粒子 */
  function emitParticles(x: number, y: number, count: number, color: string) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.5 + Math.random() * 2
      particles.value.push({
        id: `particle_${Date.now()}_${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 30 + Math.random() * 40,
        size: 2 + Math.random() * 4,
        color,
        alpha: 1,
      })
    }
    // 限制粒子数
    if (particles.value.length > 200) {
      particles.value = particles.value.slice(-200)
    }
  }

  /** 更新粒子（动画帧） */
  function updateParticles(dt: number) {
    for (const p of particles.value) {
      p.x += p.vx * (dt * 0.06)
      p.y += p.vy * (dt * 0.06)
      p.life -= 1 / p.maxLife
      p.alpha = Math.max(0, p.life)
      p.vx *= 0.99
      p.vy *= 0.99
    }
    particles.value = particles.value.filter(p => p.life > 0)
  }

  /** 活跃粒子 */
  const activeParticles = computed(() =>
    particles.value.filter(p => p.life > 0.01)
  )

  // ---- 引力配置 ----

  /** 更新引力配置 */
  function updateGravityConfig(partial: Partial<GravityConfig>) {
    Object.assign(gravityConfig.value, partial)
  }

  /** 重置引力配置 */
  function resetGravityConfig() {
    gravityConfig.value = { ...DEFAULT_GRAVITY_CONFIG }
  }

  return {
    // 状态
    jadeBeads,
    mediumBreath,
    landings,
    constellations,
    particles,
    selectedBeadId,
    gravityConfig,

    // 计算属性
    selectedBead,
    beadCount,
    breathValue,
    breathOpacity,
    activeLandings,
    recentLandings,
    activeConstellations,
    activeParticles,

    // 玉珠
    generateBeads,
    selectBead,
    updateBeadPositions,

    // 呼吸
    setBreathType,
    updateBreath,

    // 落点
    recordLanding,
    updateRipples,

    // 星座
    createConstellation,
    discoverConstellations,
    toggleConstellation,
    deleteConstellation,
    getConstellationLines,

    // 粒子
    emitParticles,
    updateParticles,

    // 引力
    updateGravityConfig,
    resetGravityConfig,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function getBeadColor(cc: CanvasCrystal): string {
  const tags = (cc.crystal as unknown as Record<string, unknown>).tags as string[] | undefined
  if (tags?.includes('focus')) return BEAD_COLORS.focus
  if (tags?.includes('creative')) return BEAD_COLORS.creative
  if (tags?.includes('growth')) return BEAD_COLORS.growth
  if (tags?.includes('memory')) return BEAD_COLORS.memory
  if (tags?.includes('safety')) return BEAD_COLORS.safety
  if (tags?.includes('health')) return BEAD_COLORS.health
  if (tags?.includes('relation')) return BEAD_COLORS.relation
  return BEAD_COLORS.default
}