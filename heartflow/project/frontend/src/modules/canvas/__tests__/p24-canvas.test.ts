// ============================================================
// P24-4 引力场画布 · 高级引力引擎测试
// 覆盖：PRESET_CONSTELLATIONS / BEAD_COLORS /
//       useCanvasGravityEngine 五子系统（玉珠/呼吸/落点/星盘/粒子）
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { PRESET_CONSTELLATIONS, BEAD_COLORS } from '../canvas-gravity'
import type { CanvasCrystal } from '../types'

// ---- 共享可变状态 ----

const { getKvStore, resetKvStore } = vi.hoisted(() => {
  let _kvStore: Record<string, any> = {}
  return {
    getKvStore: () => _kvStore,
    resetKvStore: () => { _kvStore = {} },
  }
})

// ---- Mock engine/storage ----

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T,>(key: string, def: T): T => {
      const store = getKvStore()
      try {
        return store[key] !== undefined ? JSON.parse(store[key]) as T : def
      } catch {
        return store[key] !== undefined ? store[key] as T : def
      }
    },
    setKV: (key: string, val: any) => {
      const store = getKvStore()
      store[key] = typeof val === 'string' ? val : JSON.stringify(val)
    },
  },
}))

// ---- 动态导入 ----

async function importGravityEngine() {
  const mod = await import('../canvas-gravity')
  return mod.useCanvasGravityEngine()
}

// ---- 测试辅助 ----

function makeCrystal(id: string, x: number, y: number, tx: number, ty: number, intensity = 0.5, tags?: string[]): CanvasCrystal {
  return {
    x,
    y,
    targetX: tx,
    targetY: ty,
    scale: 1,
    opacity: 1,
    floatPhase: 0,
    crystal: {
      id,
      type: 'focus',
      intensity,
      createdAt: '2026-01-01',
      tags,
    } as any,
  }
}

// ============================================================
// P24-4 引力场画布测试
// ============================================================

describe('P24-4 引力场画布', () => {
  let engine: ReturnType<typeof import('../canvas-gravity').useCanvasGravityEngine>

  // ---- 常量 ----
  describe('常量', () => {
    describe('PRESET_CONSTELLATIONS', () => {
      it('包含 5 种预设星座', () => {
        expect(PRESET_CONSTELLATIONS.length).toBe(5)
      })

      it('每个星座有 name / lineColor / description', () => {
        for (const c of PRESET_CONSTELLATIONS) {
          expect(c.name).toBeTruthy()
          expect(c.lineColor).toMatch(/^#[0-9a-f]{6}$/)
          expect(c.description).toBeTruthy()
        }
      })

      it('星座名称不重复', () => {
        const names = PRESET_CONSTELLATIONS.map(c => c.name)
        expect(new Set(names).size).toBe(names.length)
      })
    })

    describe('BEAD_COLORS', () => {
      it('包含 8 种珠色映射', () => {
        expect(Object.keys(BEAD_COLORS).length).toBe(8)
      })

      it('包含 default 回退色', () => {
        expect(BEAD_COLORS.default).toBeDefined()
      })

      it('所有颜色都是有效 hex', () => {
        for (const color of Object.values(BEAD_COLORS)) {
          expect(color).toMatch(/^#[0-9a-f]{6}$/)
        }
      })
    })
  })

  // ---- 玉珠载体 ----
  describe('玉珠载体', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      engine = await importGravityEngine()
    })

    describe('generateBeads', () => {
      it('从结晶生成对应数量的玉珠', () => {
        const crystals = [
          makeCrystal('c1', 100, 200, 150, 250, 0.5),
          makeCrystal('c2', 300, 400, 350, 450, 0.8),
        ]
        engine.generateBeads(crystals)
        expect(engine.jadeBeads.value.length).toBe(2)
      })

      it('玉珠的 crystalId 与结晶对应', () => {
        const crystals = [makeCrystal('c1', 100, 200, 400, 300)]
        engine.generateBeads(crystals)
        expect(engine.jadeBeads.value[0].crystalId).toBe('c1')
      })

      it('玉珠 scale 与 intensity 正相关', async () => {
        const low = [makeCrystal('c1', 0, 0, 0, 0, 0.2)]
        engine.generateBeads(low)
        const lowScale = engine.jadeBeads.value[0].scale

        vi.clearAllMocks()
        resetKvStore()
        engine = await importGravityEngine()

        const high = [makeCrystal('c1', 0, 0, 0, 0, 0.9)]
        engine.generateBeads(high)
        expect(engine.jadeBeads.value[0].scale).toBeGreaterThan(lowScale)
      })

      it('重复生成时保留已有玉珠的状态', () => {
        const crystals = [makeCrystal('c1', 100, 200, 300, 400)]
        engine.generateBeads(crystals)
        const firstId = engine.jadeBeads.value[0].id

        const crystals2 = [makeCrystal('c1', 100, 200, 350, 450)]
        engine.generateBeads(crystals2)
        expect(engine.jadeBeads.value.length).toBe(1)
        expect(engine.jadeBeads.value[0].id).toBe(firstId)
      })

      it('新结晶追加新玉珠', () => {
        engine.generateBeads([makeCrystal('c1', 0, 0, 0, 0)])
        engine.generateBeads([
          makeCrystal('c1', 0, 0, 0, 0),
          makeCrystal('c2', 0, 0, 0, 0),
        ])
        expect(engine.jadeBeads.value.length).toBe(2)
      })
    })

    describe('selectBead', () => {
      it('选中玉珠设置 selected 为 true', () => {
        engine.generateBeads([makeCrystal('c1', 0, 0, 0, 0)])
        const beadId = engine.jadeBeads.value[0].id
        engine.selectBead(beadId)
        expect(engine.selectedBeadId.value).toBe(beadId)
        expect(engine.jadeBeads.value[0].selected).toBe(true)
      })

      it('null 取消选中', () => {
        engine.generateBeads([makeCrystal('c1', 0, 0, 0, 0)])
        const beadId = engine.jadeBeads.value[0].id
        engine.selectBead(beadId)
        engine.selectBead(null)
        expect(engine.selectedBeadId.value).toBeNull()
        expect(engine.selectedBead.value).toBeNull()
      })

      it('切换选中自动取消前一选中', () => {
        engine.generateBeads([
          makeCrystal('c1', 0, 0, 0, 0),
          makeCrystal('c2', 0, 0, 0, 0),
        ])
        const [b1, b2] = engine.jadeBeads.value
        engine.selectBead(b1.id)
        engine.selectBead(b2.id)
        expect(b1.selected).toBe(false)
        expect(b2.selected).toBe(true)
      })
    })

    describe('updateBeadPositions', () => {
      it('玉珠位置向目标位置移动', () => {
        engine.generateBeads([makeCrystal('c1', 0, 0, 100, 200)])
        const bead = engine.jadeBeads.value[0]
        const initialX = bead.x
        const initialY = bead.y
        engine.updateBeadPositions(16)
        // 位置应该向目标靠近
        expect(Math.abs(bead.x - 100)).toBeLessThan(Math.abs(initialX - 100))
        expect(Math.abs(bead.y - 200)).toBeLessThan(Math.abs(initialY - 200))
      })

      it('beadCount 计算属性正确', () => {
        engine.generateBeads([
          makeCrystal('c1', 0, 0, 0, 0),
          makeCrystal('c2', 0, 0, 0, 0),
          makeCrystal('c3', 0, 0, 0, 0),
        ])
        expect(engine.beadCount.value).toBe(3)
      })
    })
  })

  // ---- 介质呼吸 ----
  describe('介质呼吸', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      engine = await importGravityEngine()
    })

    describe('setBreathType', () => {
      it('calm 模式速度慢、深度浅', () => {
        engine.setBreathType('calm')
        expect(engine.mediumBreath.value.type).toBe('calm')
        expect(engine.mediumBreath.value.speed).toBe(0.01)
        expect(engine.mediumBreath.value.depth).toBe(0.15)
      })

      it('normal 模式速度中等', () => {
        engine.setBreathType('normal')
        expect(engine.mediumBreath.value.speed).toBe(0.02)
        expect(engine.mediumBreath.value.depth).toBe(0.3)
      })

      it('excited 模式速度最快、深度最深', () => {
        engine.setBreathType('excited')
        expect(engine.mediumBreath.value.speed).toBe(0.04)
        expect(engine.mediumBreath.value.depth).toBe(0.5)
      })
    })

    describe('updateBreath', () => {
      it('更新呼吸相位', () => {
        const initialPhase = engine.mediumBreath.value.phase
        engine.updateBreath(16)
        expect(engine.mediumBreath.value.phase).not.toBe(initialPhase)
      })

      it('不活跃时不更新', () => {
        engine.mediumBreath.value.active = false
        const initialPhase = engine.mediumBreath.value.phase
        engine.updateBreath(16)
        expect(engine.mediumBreath.value.phase).toBe(initialPhase)
      })
    })

    describe('breathValue', () => {
      it('正弦波形式输出', () => {
        engine.setBreathType('calm')
        engine.updateBreath(16)
        const v = engine.breathValue.value
        expect(v).toBeGreaterThanOrEqual(-0.15)
        expect(v).toBeLessThanOrEqual(0.15)
      })
    })

    describe('breathOpacity', () => {
      it('在 0.7-1.0 范围内波动', () => {
        const opacity = engine.breathOpacity.value
        expect(opacity).toBeGreaterThanOrEqual(0.7)
        expect(opacity).toBeLessThanOrEqual(1.0)
      })
    })
  })

  // ---- 结晶落点 ----
  describe('结晶落点', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      engine = await importGravityEngine()
    })

    describe('recordLanding', () => {
      it('记录落点返回有效 landing', () => {
        const landing = engine.recordLanding('c1', 100, 200, '#ff0000')
        expect(landing.id).toBeDefined()
        expect(landing.crystalId).toBe('c1')
        expect(landing.x).toBe(100)
        expect(landing.y).toBe(200)
        expect(landing.color).toBe('#ff0000')
        expect(landing.showRipple).toBe(true)
      })

      it('落点添加到 landings 列表', () => {
        engine.recordLanding('c1', 100, 200, '#ff0000')
        expect(engine.landings.value.length).toBe(1)
      })

      it('最大保留 50 条落点', () => {
        for (let i = 0; i < 60; i++) {
          engine.recordLanding(`c${i}`, i, i, '#ff0000')
        }
        expect(engine.landings.value.length).toBeLessThanOrEqual(50)
      })
    })

    describe('updateRipples', () => {
      it('涟漪半径随时间增大', () => {
        const landing = engine.recordLanding('c1', 100, 200, '#ff0000')
        const initialRadius = landing.radius
        engine.updateRipples(16)
        expect(landing.radius).toBeGreaterThan(initialRadius)
      })

      it('强度衰减到 0.01 以下时停止涟漪', () => {
        const landing = engine.recordLanding('c1', 100, 200, '#ff0000')
        // 持续更新直到涟漪消失
        for (let i = 0; i < 500; i++) {
          engine.updateRipples(16)
        }
        expect(landing.showRipple).toBe(false)
      })
    })

    describe('activeLandings', () => {
      it('仅返回活跃的落点', () => {
        engine.recordLanding('c1', 100, 200, '#ff0000')
        expect(engine.activeLandings.value.length).toBe(1)
      })
    })

    describe('recentLandings', () => {
      it('最多返回 10 条最近落点', () => {
        for (let i = 0; i < 15; i++) {
          engine.recordLanding(`c${i}`, i, i, '#ff0000')
        }
        expect(engine.recentLandings.value.length).toBeLessThanOrEqual(10)
      })
    })
  })

  // ---- 星盘导航 ----
  describe('星盘导航', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      engine = await importGravityEngine()
    })

    describe('createConstellation', () => {
      it('创建星座返回有效数据', () => {
        const c = engine.createConstellation('测试星座', ['c1', 'c2'], '#ff0000', '测试描述')
        expect(c.id.startsWith('const_')).toBe(true)
        expect(c.name).toBe('测试星座')
        expect(c.starIds).toEqual(['c1', 'c2'])
        expect(c.active).toBe(true)
      })

      it('创建后添加到列表', () => {
        engine.createConstellation('星座1', ['c1'], '#ff0000', '')
        expect(engine.constellations.value.length).toBe(1)
      })

      it('创建后持久化', () => {
        engine.createConstellation('星座1', ['c1'], '#ff0000', '')
        const store = getKvStore()
        const saved = JSON.parse(store['hf:canvas:constellations'])
        expect(saved.length).toBe(1)
      })
    })

    describe('toggleConstellation', () => {
      it('切换激活状态', () => {
        const c = engine.createConstellation('星座1', ['c1'], '#ff0000', '')
        engine.toggleConstellation(c.id)
        expect(engine.constellations.value[0].active).toBe(false)
        engine.toggleConstellation(c.id)
        expect(engine.constellations.value[0].active).toBe(true)
      })
    })

    describe('deleteConstellation', () => {
      it('删除指定星座', () => {
        const c = engine.createConstellation('星座1', ['c1'], '#ff0000', '')
        engine.deleteConstellation(c.id)
        expect(engine.constellations.value.length).toBe(0)
      })
    })

    describe('discoverConstellations', () => {
      it('3 颗以上近距离结晶自动发现星座', () => {
        const crystals = [
          makeCrystal('c1', 0, 0, 0, 0),
          makeCrystal('c2', 50, 0, 0, 0),
          makeCrystal('c3', 100, 0, 0, 0),
        ]
        const discovered = engine.discoverConstellations(crystals)
        expect(discovered.length).toBeGreaterThanOrEqual(1)
        expect(discovered[0].starIds.length).toBeGreaterThanOrEqual(3)
      })

      it('结晶间距超过 120 不组成星座', () => {
        const crystals = [
          makeCrystal('c1', 0, 0, 0, 0),
          makeCrystal('c2', 500, 500, 0, 0),
          makeCrystal('c3', 1000, 1000, 0, 0),
        ]
        const discovered = engine.discoverConstellations(crystals)
        expect(discovered.length).toBe(0)
      })

      it('少于 3 颗结晶不组成星座', () => {
        const crystals = [makeCrystal('c1', 0, 0, 0, 0), makeCrystal('c2', 50, 50, 0, 0)]
        const discovered = engine.discoverConstellations(crystals)
        expect(discovered.length).toBe(0)
      })
    })

    describe('getConstellationLines', () => {
      it('生成连线：N 颗星产生 N-1 条连线', () => {
        const c = engine.createConstellation('测试', ['c1', 'c2', 'c3'], '#ff0000', '')
        const crystals = [
          makeCrystal('c1', 0, 0, 0, 0),
          makeCrystal('c2', 100, 100, 0, 0),
          makeCrystal('c3', 200, 200, 0, 0),
        ]
        const lines = engine.getConstellationLines(c, crystals)
        expect(lines.length).toBe(2)
      })

      it('单颗星不产生连线', () => {
        const c = engine.createConstellation('测试', ['c1'], '#ff0000', '')
        const crystals = [makeCrystal('c1', 0, 0, 0, 0)]
        const lines = engine.getConstellationLines(c, crystals)
        expect(lines.length).toBe(0)
      })

      it('每条连线有 x1/y1/x2/y2', () => {
        const c = engine.createConstellation('测试', ['c1', 'c2'], '#ff0000', '')
        const crystals = [
          makeCrystal('c1', 0, 0, 0, 0),
          makeCrystal('c2', 100, 100, 0, 0),
        ]
        const lines = engine.getConstellationLines(c, crystals)
        expect(lines[0].x1).toBeDefined()
        expect(lines[0].y1).toBeDefined()
        expect(lines[0].x2).toBeDefined()
        expect(lines[0].y2).toBeDefined()
      })
    })

    describe('activeConstellations', () => {
      it('仅返回活跃星座', () => {
        const c1 = engine.createConstellation('活跃', ['c1'], '#ff0000', '')
        const c2 = engine.createConstellation('非活跃', ['c2'], '#00ff00', '')
        engine.toggleConstellation(c2.id)
        expect(engine.activeConstellations.value.length).toBe(1)
        expect(engine.activeConstellations.value[0].id).toBe(c1.id)
      })
    })
  })

  // ---- 粒子系统 ----
  describe('粒子系统', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      engine = await importGravityEngine()
    })

    describe('emitParticles', () => {
      it('生成指定数量的粒子', () => {
        engine.emitParticles(100, 200, 10, '#ff0000')
        expect(engine.particles.value.length).toBe(10)
      })

      it('粒子生成在指定位置', () => {
        engine.emitParticles(100, 200, 5, '#ff0000')
        for (const p of engine.particles.value) {
          expect(p.x).toBe(100)
          expect(p.y).toBe(200)
        }
      })

      it('粒子数不超过 200', () => {
        engine.emitParticles(0, 0, 250, '#ff0000')
        expect(engine.particles.value.length).toBeLessThanOrEqual(200)
      })
    })

    describe('updateParticles', () => {
      it('粒子随时间衰减生命值', () => {
        engine.emitParticles(0, 0, 5, '#ff0000')
        const initialLife = engine.particles.value[0].life
        engine.updateParticles(16)
        expect(engine.particles.value[0].life).toBeLessThan(initialLife)
      })

      it('生命周期结束的粒子被移除', () => {
        engine.emitParticles(0, 0, 5, '#ff0000')
        // 持续更新直到粒子消失
        for (let i = 0; i < 200; i++) {
          engine.updateParticles(16)
        }
        expect(engine.particles.value.length).toBe(0)
      })
    })

    describe('activeParticles', () => {
      it('仅返回生命值 > 0.01 的粒子', () => {
        engine.emitParticles(0, 0, 5, '#ff0000')
        const active = engine.activeParticles.value
        expect(active.length).toBe(5)
      })
    })
  })

  // ---- 引力配置 ----
  describe('引力配置', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      engine = await importGravityEngine()
    })

    describe('updateGravityConfig', () => {
      it('部分更新引力参数', () => {
        engine.updateGravityConfig({ centerX: 500, centerY: 400 })
        expect(engine.gravityConfig.value.centerX).toBe(500)
        expect(engine.gravityConfig.value.centerY).toBe(400)
      })
    })

    describe('resetGravityConfig', () => {
      it('重置为默认值', () => {
        engine.updateGravityConfig({ centerX: 999 })
        engine.resetGravityConfig()
        expect(engine.gravityConfig.value.centerX).not.toBe(999)
      })
    })
  })
})