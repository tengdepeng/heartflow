import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createProceduralHomeScene,
  type ProceduralScene,
} from '../useHomeReplicaProceduralScene'
import type { HomeReplicaManifest } from '../useHomeReplica'

function makeCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 400
  c.height = 300
  return c
}

// 静默 GLB/贴图在测试环境加载失败的 warn（fetch /home-replica/*.glb 不存在会回退程序化）
let warnSpy: ReturnType<typeof vi.spyOn> | null = null
beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  warnSpy?.mockRestore()
})

describe('createProceduralHomeScene · 房间渲染策略', () => {
  const scenes: ProceduralScene[] = []
  afterEach(() => {
    while (scenes.length) scenes.pop()?.dispose()
  })

  it('allBuiltin manifest（所有 id 属内置家）→ 渲染完整 11 房间，非 GLB 房间可聚焦', async () => {
    const manifest: HomeReplicaManifest = {
      version: 1,
      unit: 'm',
      rooms: [
        { id: 'entrance', name: '玄关' },
        { id: 'living-room', name: '客厅', kind: 'model', model: '/home-replica/living-room.glb' },
      ],
    }
    const s = await createProceduralHomeScene(makeCanvas(), manifest, { initialRoomId: 'entrance' })
    expect(s).not.toBeNull()
    scenes.push(s!)
    // allBuiltin 判定为 true → roomIds 取 getAllRoomIds()（11）；entrance 在列，可聚焦
    s!.focusRoom('entrance')
    expect(s!.getCurrentRoomId()).toBe('entrance')
    // 程序化兜底的房间（如 courtyard）也在列
    s!.focusRoom('courtyard')
    expect(s!.getCurrentRoomId()).toBe('courtyard')
  })

  it('自定义 manifest（含非内置 id）→ 仅渲染清单列出的房间，内置房间不可聚焦', async () => {
    const manifest: HomeReplicaManifest = {
      version: 1,
      unit: 'm',
      // 用 model 类型触发 GLTFLoader 的 fetch 快速 reject（happy-dom 下 Image 加载会挂起，
      // 但 allBuiltin 策略只判 id 是否在 HOME_ROOMS，与 kind 无关，故不影响验证）。
      rooms: [
        { id: 'home-plan', name: '户型', kind: 'model', model: '/home-replica/x.glb' },
        { id: 'living-art', name: '画', kind: 'model', model: '/home-replica/y.glb' },
      ],
    }
    const s = await createProceduralHomeScene(makeCanvas(), manifest, { initialRoomId: 'home-plan' })
    expect(s).not.toBeNull()
    scenes.push(s!)
    // 自定义分支：roomIds = manifest.rooms.map(id)；entrance 不在列，聚焦无效
    s!.focusRoom('entrance')
    expect(s!.getCurrentRoomId()).not.toBe('entrance')
    expect(s!.getCurrentRoomId()).toBe('home-plan')
  })

  it('null manifest → 渲染完整 11 房间（程序化默认）', async () => {
    const s = await createProceduralHomeScene(makeCanvas(), null, { initialRoomId: 'entrance' })
    expect(s).not.toBeNull()
    scenes.push(s!)
    s!.focusRoom('dining-room')
    expect(s!.getCurrentRoomId()).toBe('dining-room')
  })
})
