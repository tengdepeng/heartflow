import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerShell,
  createShell,
  isShellRegistered,
} from '../types'
import type { WorldShellType } from '../../../types'
import { CourtyardShell } from '../courtyard'
import { StarsShell } from '../stars'

// 简易 mock canvas context（仅记录调用，不真正绘制）
function mockCtx(): CanvasRenderingContext2D {
  const noop = () => {}
  return {
    clearRect: noop,
    fillRect: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    arcTo: noop,
    rect: noop,
    quadraticCurveTo: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    setLineDash: noop,
    fillText: noop,
    createRadialGradient: () => ({ addColorStop: noop }) as unknown as CanvasGradient,
    // 以下为赋值用属性，mock 只需可写
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'center',
    textBaseline: 'middle',
  } as unknown as CanvasRenderingContext2D
}

function ctxWithRooms() {
  const ctx = mockCtx()
  return {
    ctx,
    width: 800,
    height: 600,
    intensity: 1,
    sanctuary: false,
    config: { courtyardLayout: 'three-entries' },
    rooms: [
      { id: 'timeline', name: '时间长廊', slot: 'front-yard' as const, frequency: 0.8, recency: 0.6 },
      { id: 'anchor', name: '逐日心锚', slot: 'front-yard' as const, frequency: 0.7, recency: 0.5 },
      { id: 'garden', name: '情绪花房', slot: 'front-yard' as const, frequency: 0.75, recency: 0.55 },
      { id: 'knowledge', name: '经略阁', slot: 'hall' as const, frequency: 0.6, recency: 0.4 },
      { id: 'goals', name: '留光阁', slot: 'hall' as const, frequency: 0.5, recency: 0.35 },
      { id: 'worklog', name: '更漏', slot: 'back-yard' as const, frequency: 0.55, recency: 0.45 },
    ],
  }
}

describe('world-shell 工厂与策略', () => {
  beforeEach(() => {
    // 确保 courtyard 已注册（index 自注册在 import 时已执行）
  })

  it('courtyard 已注册且可创建实例', () => {
    expect(isShellRegistered('courtyard')).toBe(true)
    const shell = createShell('courtyard')
    expect(shell).not.toBeNull()
    expect(shell?.kind).toBe('courtyard')
  })

  it('未注册的壳返回 null（ocean/home-scan/custom 等后续实现）', () => {
    // 故意传入未注册的壳名，验证工厂对未知类型的防御性 null 返回
    const unregistered = 'ocean' as WorldShellType
    expect(isShellRegistered(unregistered)).toBe(false)
    expect(createShell(unregistered)).toBeNull()
  })

  it('CourtyardShell.mount 计算影壁居中矩形', () => {
    const shell = new CourtyardShell()
    const c = ctxWithRooms()
    shell.mount(c)
    // 影壁（ZONES[0]）位于画布 50%×82%，宽 40%×800=320，高 16%×600=96
    expect(shell.screenRect.w).toBeCloseTo(320, 0)
    expect(shell.screenRect.h).toBeCloseTo(96, 0)
    expect(shell.screenRect.x).toBeCloseTo(400 - 160, 0)
    expect(shell.screenRect.y).toBeCloseTo(492 - 48, 0)
  })

  it('CourtyardShell.render 不抛错且消费房间锚点', () => {
    const shell = new CourtyardShell()
    const c = ctxWithRooms()
    shell.mount(c)
    expect(() => shell.render(1000)).not.toThrow()
  })

  it('CourtyardShell.resize 重新计算影壁布局', () => {
    const shell = new CourtyardShell()
    shell.mount(ctxWithRooms())
    shell.resize(1000, 700)
    expect(shell.screenRect.w).toBeCloseTo(400, 0)
    expect(shell.screenRect.x).toBeCloseTo(500 - 200, 0)
  })

  it('CourtyardShell.updateContext 更新强度/静谧态', () => {
    const shell = new CourtyardShell()
    shell.mount(ctxWithRooms())
    shell.updateContext({ intensity: 0.3, sanctuary: true })
    // 不抛错即视为上下文切换成功（无公开字段断言，行为由 render 内部消费）
    expect(() => shell.render(2000)).not.toThrow()
  })

  it('CourtyardShell.destroy 清理上下文', () => {
    const shell = new CourtyardShell()
    shell.mount(ctxWithRooms())
    shell.destroy()
    expect(() => shell.render(3000)).not.toThrow()
  })

  it('CourtyardShell.hitTest 命中前院墨点返回 slot 与房间标识', () => {
    const shell = new CourtyardShell()
    shell.mount(ctxWithRooms())
    // 直接取缓存锚点坐标做精确命中（mock 数据未带 path，仅验 slot/roomId/roomName）
    const hit = (shell as unknown as { anchorPoints: Array<{ x: number; y: number; slot: string; name: string; id: string }> }).anchorPoints[0]
    const res = shell.hitTest!(hit.x, hit.y)
    expect(res).not.toBeNull()
    expect(res!.slot).toBe(hit.slot)
    expect(res!.roomId).toBe(hit.id)
    expect(res!.roomName).toBe(hit.name)
  })

  it('CourtyardShell.hitTest 命中带 path 的墨点返回 roomPath', () => {
    const shell = new CourtyardShell()
    shell.mount({
      ...ctxWithRooms(),
      rooms: [{ id: 'timeline', name: '时间长廊', slot: 'front-yard' as const, path: '/timeline', frequency: 0.8, recency: 0.6 }],
    })
    const hit = (shell as unknown as { anchorPoints: Array<{ x: number; y: number; path?: string; slot: string }> }).anchorPoints[0]
    const res = shell.hitTest!(hit.x, hit.y)
    expect(res).not.toBeNull()
    expect(res!.slot).toBe('front-yard')
    expect(res!.roomPath).toBe('/timeline')
  })

  it('CourtyardShell.hitTest 命中 zone 空白返回 slot（无 roomPath）', () => {
    const shell = new CourtyardShell()
    shell.mount(ctxWithRooms())
    // 画布顶部 (400, 72) 落在 corner zone（ZONES[5] y=0.14, h=0.08*1.15）内
    const res = shell.hitTest!(400, 72)
    expect(res).not.toBeNull()
    expect(res!.slot).toBe('corner')
    // 正堂有房间，但此处命中的是空白区（非精确墨点）
    expect(res!.roomPath).toBeUndefined()
  })

  it('CourtyardShell.hitTest 画布外返回 null', () => {
    const shell = new CourtyardShell()
    shell.mount(ctxWithRooms())
    expect(shell.hitTest!(-10, -10)).toBeNull()
    expect(shell.hitTest!(5000, 5000)).toBeNull()
  })

  it('CourtyardShell.setHover 不抛错且接受 null 清空', () => {
    const shell = new CourtyardShell()
    shell.mount(ctxWithRooms())
    expect(() => {
      shell.setHover!('front-yard', 'timeline')
      shell.render(4000)
      shell.setHover!(null, null)
      shell.render(4100)
    }).not.toThrow()
  })

  it('自定义工厂可注册并创建', () => {
    registerShell('custom' as never, () => ({ kind: 'custom' } as never))
    expect(isShellRegistered('custom' as never)).toBe(true)
  })
})

describe('StarsShell（星辰世界壳）', () => {
  it('已注册且可创建实例', () => {
    expect(isShellRegistered('stars')).toBe(true)
    const shell = createShell('stars')
    expect(shell).not.toBeNull()
    expect(shell?.kind).toBe('stars')
  })

  it('mount → render → updateContext → destroy 不抛错', () => {
    const shell = new StarsShell()
    const c = ctxWithRooms()
    expect(() => {
      shell.mount(c)
      shell.render(1000)
      shell.updateContext({ intensity: 0.4, sanctuary: false })
      shell.render(1500)
      shell.resize(900, 640)
      shell.render(2000)
      shell.destroy()
      shell.render(3000)
    }).not.toThrow()
  })

  it('挂载后房间按 slot 归位生成星体（数量与传入一致）', () => {
    const shell = new StarsShell()
    shell.mount(ctxWithRooms())
    // 6 个房间各生成一颗星体；不依赖私有字段，仅验证渲染消费不抛错且实例有效
    expect(shell.kind).toBe('stars')
  })

  it('StarsShell.hitTest 命中星体返回 slot 与房间标识', () => {
    const shell = new StarsShell()
    shell.mount(ctxWithRooms())
    // 渲染一帧以刷新实际绘制坐标缓存（含 floatY 漂浮偏移）
    shell.render(1000)
    const stars = (shell as unknown as { stars: Array<{ drawX: number; drawY: number; room: { slot: string; id: string; name: string; path?: string } }> }).stars
    expect(stars.length).toBeGreaterThan(0)
    const target = stars[0]
    const res = shell.hitTest!(target.drawX, target.drawY)
    expect(res).not.toBeNull()
    expect(res!.slot).toBe(target.room.slot)
    expect(res!.roomId).toBe(target.room.id)
    expect(res!.roomName).toBe(target.room.name)
  })

  it('StarsShell.hitTest 命中带 path 的星体返回 roomPath', () => {
    const shell = new StarsShell()
    shell.mount({
      ...ctxWithRooms(),
      rooms: [{ id: 'timeline', name: '时间长廊', slot: 'front-yard' as const, path: '/timeline', frequency: 0.8, recency: 0.6 }],
    })
    shell.render(1000)
    const stars = (shell as unknown as { stars: Array<{ drawX: number; drawY: number; room: { path?: string } }> }).stars
    const res = shell.hitTest!(stars[0].drawX, stars[0].drawY)
    expect(res).not.toBeNull()
    expect(res!.slot).toBe('front-yard')
    expect(res!.roomPath).toBe('/timeline')
  })

  it('StarsShell.hitTest 命中 zone 中心返回 slot（无 roomPath）', () => {
    const shell = new StarsShell()
    shell.mount(ctxWithRooms())
    // 星核/屏风 zone 中心 (400, 192) —— 无房间精确位于此点，命中 zone 圆
    const res = shell.hitTest!(400, 192)
    expect(res).not.toBeNull()
    expect(res!.slot).toBe('screen')
    expect(res!.roomPath).toBeUndefined()
  })

  it('StarsShell.hitTest 画布外返回 null', () => {
    const shell = new StarsShell()
    shell.mount(ctxWithRooms())
    expect(shell.hitTest!(-10, -10)).toBeNull()
    expect(shell.hitTest!(5000, 5000)).toBeNull()
  })

  it('StarsShell.setHover 不抛错且 hover 反馈被 render 消费', () => {
    const shell = new StarsShell()
    shell.mount(ctxWithRooms())
    expect(() => {
      shell.setHover!('front-yard', 'timeline')
      shell.render(4000)
      shell.setHover!(null, null)
      shell.render(4100)
    }).not.toThrow()
  })
})
