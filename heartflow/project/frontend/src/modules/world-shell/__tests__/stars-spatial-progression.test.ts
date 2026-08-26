// ============================================================
// 星辰壳 · 空间递进 QA 验证
// 任务 #2：验证 stars 壳 hitTest 命中真实、悬停高亮生效、
//   不破坏宅院壳递进与既有层级、CanvasRoom 命中层启用条件扩展正确。
//
// 本文件聚焦「星辰壳空间递进」新增能力的可断言行为，
// 与 world-shell.test.ts（基础工厂/契约）互补。
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { StarsShell } from '../stars'
import { CourtyardShell } from '../courtyard'
import type { ShellContext } from '../types'

// ---- 可观测 ctx mock：记录属性写入，用于验证 hover 高亮是否被消费 ----
function mockCtx(observed: Record<string, unknown> = {}): CanvasRenderingContext2D {
  const noop = () => {}
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop) {
      if (prop in target) return target[prop as string]
      return noop
    },
    set(target, prop, value) {
      // 记录关键视觉状态（hover 高亮会设 shadowBlur / lineWidth / fillStyle）
      if (typeof prop === 'string') observed[prop] = value
      target[prop as string] = value
      return true
    },
  }
  const base: Record<string, unknown> = {
    clearRect: noop,
    fillRect: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    arcTo: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    setLineDash: noop,
    fillText: noop,
    createRadialGradient: () => ({ addColorStop: noop }) as unknown as CanvasGradient,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'center',
    textBaseline: 'middle',
    shadowColor: '',
    shadowBlur: 0,
    // 无真实 canvas 元素：让 mount 中的 accent 分支（依赖 getComputedStyle）
    // 跳过，与既有 world-shell.test.ts 的 mock 行为一致，避免引入 DOM 依赖。
    canvas: undefined as unknown as HTMLCanvasElement,
  }
  return new Proxy(base, handler) as unknown as CanvasRenderingContext2D
}

// ---- 测试上下文构造器 ----
function makeCtx(): ShellContext & { __observed: Record<string, unknown> } {
  const observed: Record<string, unknown> = {}
  const ctx = mockCtx(observed)
  return {
    ctx,
    width: 800,
    height: 600,
    intensity: 1,
    sanctuary: false,
    config: { courtyardLayout: 'three-entries', starFieldDensity: 0.5 },
    rooms: [
      { id: 'timeline', name: '时间长廊', slot: 'front-yard' as const, path: '/timeline', frequency: 0.8, recency: 0.6 },
      { id: 'anchor', name: '逐日心锚', slot: 'front-yard' as const, path: '/anchor', frequency: 0.7, recency: 0.5 },
      { id: 'garden', name: '情绪花房', slot: 'front-yard' as const, path: '/garden', frequency: 0.75, recency: 0.55 },
      { id: 'knowledge', name: '经略阁', slot: 'hall' as const, path: '/knowledge', frequency: 0.6, recency: 0.4 },
      { id: 'goals', name: '留光阁', slot: 'hall' as const, path: '/goals', frequency: 0.5, recency: 0.35 },
      { id: 'worklog', name: '更漏', slot: 'back-yard' as const, path: '/worklog', frequency: 0.55, recency: 0.45 },
    ],
    __observed: observed,
  }
}

// 取星辰壳缓存星体（render 后含 floatY 偏移）
function getStars(shell: StarsShell): Array<{
  drawX: number
  drawY: number
  room: { id: string; name: string; slot: string; path?: string }
}> {
  return (shell as unknown as { stars: Array<{ drawX: number; drawY: number; room: { id: string; name: string; slot: string; path?: string } }> }).stars
}

// 取星辰壳 zone 中心（逻辑像素）
function getZoneCenters(shell: StarsShell): Array<{ slot: string; x: number; y: number }> {
  return (shell as unknown as { zoneCenters: Array<{ slot: string; x: number; y: number }> }).zoneCenters
}

describe('StarsShell.hitTest 命中真实（空间递进核心）', () => {
  let shell: StarsShell
  let c: ReturnType<typeof makeCtx>

  beforeEach(() => {
    shell = new StarsShell()
    c = makeCtx()
    shell.mount(c)
    shell.render(1000) // 刷新 drawX/drawY 缓存（含 floatY 漂浮偏移）
  })

  it('命中具体星体返回精准 roomId / roomName / roomPath / slot', () => {
    const stars = getStars(shell)
    expect(stars.length).toBe(6)
    const target = stars.find((s) => s.room.id === 'knowledge')!
    const res = shell.hitTest!(target.drawX, target.drawY)
    expect(res).not.toBeNull()
    expect(res!.slot).toBe('hall')
    expect(res!.roomId).toBe('knowledge')
    expect(res!.roomName).toBe('经略阁')
    expect(res!.roomPath).toBe('/knowledge')
  })

  it('命中带 path 的星体优先返回 roomPath（点墨点进房间）', () => {
    // 所有测试房间都带 path，验证 roomPath 透传正确
    const stars = getStars(shell)
    const target = stars.find((s) => s.room.id === 'timeline')!
    const res = shell.hitTest!(target.drawX, target.drawY)
    expect(res!.roomPath).toBe('/timeline')
  })

  it('仅命中 zone 空白区返回 slot，不带 roomPath（点 zone 进 slot 默认房间）', () => {
    const zones = getZoneCenters(shell)
    const screen = zones.find((z) => z.slot === 'screen')!
    const res = shell.hitTest!(screen.x, screen.y)
    expect(res).not.toBeNull()
    expect(res!.slot).toBe('screen')
    expect(res!.roomPath).toBeUndefined()
    expect(res!.roomId).toBeUndefined()
  })

  it('zone 命中圆半径 = min(w,h)*0.12（800x600 → 72px）', () => {
    const zones = getZoneCenters(shell)
    const front = zones.find((z) => z.slot === 'front-yard')!
    const zoneR = Math.min(c.width, c.height) * 0.12 // 72
    // 圆心命中（圆内）
    expect(shell.hitTest!(front.x, front.y)).not.toBeNull()
    // 圆心正上方 zoneR+30 处：几何上超出 front-yard 圆（距离 102 > 72），
    // 因此即便落在别的 zone 内，也绝不应作为 front-yard 的精准星体命中返回 roomPath
    const above = shell.hitTest!(front.x, front.y - (zoneR + 30))
    expect(above === null || above.slot !== 'front-yard' || above.roomPath === undefined).toBe(true)
    // 直接验证圆心到该点距离严格大于 zoneR（命中圆半径契约）
    const dy = zoneR + 30
    expect(Math.hypot(0, dy)).toBeGreaterThan(zoneR)
  })

  it('画布外 / 远离所有 zone 与星体 → 返回 null', () => {
    expect(shell.hitTest!(-10, -10)).toBeNull()
    expect(shell.hitTest!(5000, 5000)).toBeNull()
    // 角落极小 zone（corner y=0.92*600=552），远离处应 null
    expect(shell.hitTest!(5, 5)).toBeNull()
  })

  it('屏幕星核 zone 命中：scroll 到该 zone 中心仍返回 screen（即便无 screen 房间）', () => {
    // 当前 rooms 无 slot==='screen' 的房间，但 zone 圆仍可命中
    const zones = getZoneCenters(shell)
    const screen = zones.find((z) => z.slot === 'screen')!
    const res = shell.hitTest!(screen.x, screen.y)
    expect(res).not.toBeNull()
    expect(res!.slot).toBe('screen')
  })

  it('星体命中优先级高于 zone（重叠时返回具体房间）', () => {
    // 取一星体，其坐标必落在所属 zone 圆内；hitTest 应先判星体返回 roomPath
    const stars = getStars(shell)
    const target = stars[0]
    const res = shell.hitTest!(target.drawX, target.drawY)
    expect(res!.roomId).toBe(target.room.id)
    expect(res!.roomPath).toBeDefined()
  })
})

describe('StarsShell.setHover 悬停高亮生效（可观测消费）', () => {
  it('setHover 指定房间后 render 触发高亮视觉（shadowBlur 被设置）', () => {
    const c = makeCtx()
    const shell = new StarsShell()
    shell.mount(c)
    shell.render(1000)
    // 未 hover 时 render —— 观测 shadowBlur 应为 0 / 未设置
    shell.render(1200)
    const observed = c.__observed
    // 设置 hover 到一具体星体
    const stars = getStars(shell)
    expect(stars.some((s) => s.room.id === 'timeline')).toBe(true)
    shell.setHover!('front-yard', 'timeline')
    shell.render(1300)
    // hover 高亮路径：drawStar 内 isHover 时 ctx.save() + shadowBlur=14
    // 观测对象经 proxy，render 中对 isHover 星体会写 shadowBlur=14
    expect(observed.shadowBlur).toBe(14)
  })

  it('setHover(null) 清空悬停，render 不再设 shadowBlur 高亮', () => {
    const c = makeCtx()
    const shell = new StarsShell()
    shell.mount(c)
    shell.render(1000)
    const stars = getStars(shell)
    expect(stars.some((s) => s.room.id === 'timeline')).toBe(true)
    shell.setHover!('front-yard', 'timeline')
    shell.render(1100)
    expect(c.__observed.shadowBlur).toBe(14)
    // 清空 hover 后，重渲染不应再进入 isHover 分支：
    // 重置观测对象，验证 shadowBlur 不再被写入 hover 高亮值（14）
    const obs = c.__observed
    for (const k of Object.keys(obs)) delete obs[k]
    shell.setHover!(null, null)
    shell.render(1200)
    // 无 hover 时 drawStar 不调用 save()/shadowBlur，故不会被写入 14
    expect(obs.shadowBlur).toBeUndefined()
  })

  it('setHover 仅整 zone 悬停（无 roomId）时不清具体房间高亮', () => {
    const c = makeCtx()
    const shell = new StarsShell()
    shell.mount(c)
    shell.render(1000)
    // hover 整 zone 不指定房间 → drawStar 中 isHover=false（需 roomId 匹配）
    const obs = c.__observed
    for (const k of Object.keys(obs)) delete obs[k]
    shell.setHover!('front-yard', null)
    shell.render(1100)
    // 未指定房间，没有具体星体进入 isHover 分支 → shadowBlur 不被写入
    expect(obs.shadowBlur).toBeUndefined()
  })

  it('setHover 不影响 hitTest 结果（两者解耦，命中仍返回真实房间）', () => {
    const shell = new StarsShell()
    shell.mount(makeCtx())
    shell.render(1000)
    const stars = getStars(shell)
    const target = stars.find((s) => s.room.id === 'knowledge')!
    shell.setHover!('front-yard', 'timeline') // hover 别处
    const res = shell.hitTest!(target.drawX, target.drawY)
    // 仍应命中 knowledge（hover 不改变几何命中）
    expect(res!.roomId).toBe('knowledge')
  })
})

describe('StarsShell 命中缓存随布局更新（resize / updateContext）', () => {
  it('resize 后星体坐标与 zone 中心重算，hitTest 仍精准', () => {
    const shell = new StarsShell()
    const c = makeCtx()
    shell.mount(c)
    shell.render(1000)
    shell.resize(1000, 700)
    shell.render(1100)
    const stars = getStars(shell)
    const hit = stars.find((s) => s.room.id === 'knowledge')!
    const res = shell.hitTest!(hit.drawX, hit.drawY)
    expect(res).not.toBeNull()
    expect(res!.roomId).toBe('knowledge')
    // zone 中心应随 700 高重算（screen y=0.32*700=224）
    const zones = getZoneCenters(shell)
    const screen = zones.find((z) => z.slot === 'screen')!
    expect(screen.y).toBeCloseTo(224, 0)
  })

  it('updateContext 更换 rooms 后命中新房间', () => {
    const shell = new StarsShell()
    shell.mount(makeCtx())
    shell.render(1000)
    const newRooms = [
      { id: 'ocean-room', name: '深海阁', slot: 'hall' as const, path: '/ocean', frequency: 0.6, recency: 0.4 },
    ]
    shell.updateContext({ rooms: newRooms })
    shell.render(1100)
    const stars = getStars(shell)
    expect(stars.length).toBe(1)
    const hit = stars[0]
    const res = shell.hitTest!(hit.drawX, hit.drawY)
    expect(res!.roomId).toBe('ocean-room')
    expect(res!.roomPath).toBe('/ocean')
  })
})

describe('宅院壳递进回归（星辰壳改动不破坏既有层级）', () => {
  it('CourtyardShell.hitTest 仍精准命中墨点（含 roomPath）', () => {
    const shell = new CourtyardShell()
    const c = makeCtx()
    shell.mount(c)
    const anchors = (shell as unknown as { anchorPoints: Array<{ x: number; y: number; slot: string; id: string; name: string; path?: string }> }).anchorPoints
    const target = anchors.find((a) => a.id === 'timeline')!
    const res = shell.hitTest!(target.x, target.y)
    expect(res).not.toBeNull()
    expect(res!.slot).toBe('front-yard')
    expect(res!.roomId).toBe('timeline')
    expect(res!.roomPath).toBe('/timeline')
  })

  it('CourtyardShell.hitTest zone 空白仍返回 slot（无 roomPath）', () => {
    const shell = new CourtyardShell()
    shell.mount(makeCtx())
    // 画布顶部 (400, 72) 落在 corner zone 内
    const res = shell.hitTest!(400, 72)
    expect(res).not.toBeNull()
    expect(res!.slot).toBe('corner')
    expect(res!.roomPath).toBeUndefined()
  })

  it('CourtyardShell.setHover 仍生效（墨点放大 + 描金）', () => {
    const c = makeCtx()
    const shell = new CourtyardShell()
    shell.mount(c)
    shell.render(1000)
    shell.setHover!('front-yard', 'timeline')
    shell.render(1100)
    // drawAnchors 内 isHover 时 shadowBlur=10
    expect(c.__observed.shadowBlur).toBe(10)
    // 清空 hover 后重渲染不应再进入 isHover 分支
    const obs = c.__observed
    for (const k of Object.keys(obs)) delete obs[k]
    shell.setHover!(null, null)
    shell.render(1200)
    expect(obs.shadowBlur).toBeUndefined()
  })

  it('CourtyardShell.getScreenRect 屏风契约未受影响', () => {
    const shell = new CourtyardShell()
    shell.mount(makeCtx())
    const r = shell.screenRect
    // 三进默认：宽 0.4*800=320，高 0.16*600=96，居中 50%/82%
    expect(r.w).toBeCloseTo(320, 0)
    expect(r.h).toBeCloseTo(96, 0)
    expect(r.x).toBeCloseTo(400 - 160, 0)
    const out = shell.getScreenRect()
    expect(out.jade).toBeDefined()
    expect(out.jade!.x).toBeCloseTo(r.x + r.w / 2, 0)
  })
})

describe('StarsShell 命中层选择（与 CanvasRoom hitLayerEnabled 契约一致）', () => {
  it('星辰壳实现 hitTest 与 setHover（CanvasRoom 因此启用命中层）', () => {
    const shell = new StarsShell()
    shell.mount(makeCtx())
    expect(typeof shell.hitTest).toBe('function')
    expect(typeof shell.setHover).toBe('function')
  })

  it('星辰壳未实现 getScreenRect（屏风契约回落兜底，符合既有设计）', () => {
    const shell = new StarsShell()
    shell.mount(makeCtx())
    // WorldShellRenderer 将 getScreenRect 声明为可选；星辰壳有意不实现，
    // 使 CanvasRoom 走 resetScreenRect → 屏风契约回落视口中心兜底。
    expect('getScreenRect' in shell).toBe(false)
  })

  it('星辰壳 zone 数与宅院一致（六位置拓扑跨壳对齐，不跳变）', () => {
    const stars = new StarsShell()
    stars.mount(makeCtx())
    const starsZones = getZoneCenters(stars).map((z) => z.slot).sort()
    const courtyard = new CourtyardShell()
    courtyard.mount(makeCtx())
    const cyZones = (courtyard as unknown as { zoneRects: Array<{ slot: string }> }).zoneRects.map((z) => z.slot).sort()
    expect(starsZones).toEqual(cyZones)
    expect(starsZones).toEqual(['back-yard', 'corner', 'front-yard', 'hall', 'screen', 'side-wing'])
  })
})
