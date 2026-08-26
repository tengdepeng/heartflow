// ============================================================
// 模块层 → 存储层集成测试
// 测试 goal / emotion / anchor / carrier 模块的完整 CRUD 流程
//
// 模式：vi.resetModules() + createMockStorage + invalidateCache + freshModule
// ============================================================
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

// -----------------------------------------------------------
// 通用 mock localStorage 工厂
// -----------------------------------------------------------
function createMockStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
}

let mockLocalStorage: ReturnType<typeof createMockStorage>

afterEach(() => {
  delete (globalThis as any).localStorage
})

// ============================================================
// goal 模块集成测试
// ============================================================
describe('goal 模块集成测试', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockLocalStorage = createMockStorage()
    ;(globalThis as any).localStorage = mockLocalStorage
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
  })

  it('create → getAll 返回包含新创建的目标', async () => {
    const { useGoal } = await import('../goal')
    const goal = useGoal()

    const created = goal.create('学习Vue', 'target', 'growth')

    expect(created.title).toBe('学习Vue')
    expect(created.tier).toBe('target')
    expect(created.domain).toBe('growth')
    expect(created.id).toBeTruthy()
    expect(goal.goals.value).toHaveLength(1)
    expect(goal.goals.value[0].id).toBe(created.id)
  })

  it('create → update 验证字段已更新', async () => {
    const { useGoal } = await import('../goal')
    const goal = useGoal()

    const created = goal.create('学习Vue', 'target', 'growth')
    goal.update(created.id, { title: '学习React', description: '深入学习React' })

    const updated = goal.goals.value.find(g => g.id === created.id)
    expect(updated).toBeDefined()
    expect(updated!.title).toBe('学习React')
    expect(updated!.description).toBe('深入学习React')
  })

  it('create → remove 后列表为空', async () => {
    const { useGoal } = await import('../goal')
    const goal = useGoal()

    goal.create('学习Vue', 'target', 'growth')
    expect(goal.goals.value).toHaveLength(1)

    goal.remove(goal.goals.value[0].id)
    expect(goal.goals.value).toEqual([])
  })

  it('remove 应同时删除子目标', async () => {
    const { useGoal } = await import('../goal')
    const goal = useGoal()

    const parent = goal.create('健康计划', 'target', 'health')
    goal.create('晨跑', 'plan', 'health', parent.id)
    expect(goal.goals.value).toHaveLength(2)

    goal.remove(parent.id)
    expect(goal.goals.value).toEqual([])
  })
})

// ============================================================
// emotion 模块集成测试
// ============================================================
describe('emotion 模块集成测试', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockLocalStorage = createMockStorage()
    ;(globalThis as any).localStorage = mockLocalStorage
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
  })

  it('add → getAll 返回包含新添加的情绪记录', async () => {
    const { useEmotionGarden } = await import('../emotion')
    const emotion = useEmotionGarden()

    const record = emotion.add('happy', '今天心情很好')

    expect(record.type).toBe('happy')
    expect(record.note).toBe('今天心情很好')
    expect(record.id).toBeTruthy()
    expect(emotion.records.value).toHaveLength(1)
    expect(emotion.records.value[0].id).toBe(record.id)
  })

  it('add → update 验证字段已更新', async () => {
    const { useEmotionGarden } = await import('../emotion')
    const emotion = useEmotionGarden()

    const record = emotion.add('happy', '开心')
    const result = emotion.update(record.id, { type: 'calm', note: '平静下来' })

    expect(result).toBe(true)
    const updated = emotion.records.value[0]
    expect(updated.type).toBe('calm')
    expect(updated.note).toBe('平静下来')
  })

  it('add → remove 后列表为空', async () => {
    const { useEmotionGarden } = await import('../emotion')
    const emotion = useEmotionGarden()

    emotion.add('happy', '开心')
    expect(emotion.records.value).toHaveLength(1)

    emotion.remove(emotion.records.value[0].id)
    expect(emotion.records.value).toEqual([])
  })

  it('update 不存在的 id 返回 false', async () => {
    const { useEmotionGarden } = await import('../emotion')
    const emotion = useEmotionGarden()

    emotion.add('happy', '开心')
    const result = emotion.update('nonexistent', { type: 'calm' })
    expect(result).toBe(false)
  })
})

// ============================================================
// anchor 模块集成测试
// ============================================================
describe('anchor 模块集成测试', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockLocalStorage = createMockStorage()
    ;(globalThis as any).localStorage = mockLocalStorage
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
  })

  it('add → getAll 返回包含新添加的锚点', async () => {
    const { useAnchor } = await import('../anchor')
    const anchor = useAnchor()

    const created = anchor.add('晨间冥想')

    expect(created.text).toBe('晨间冥想')
    expect(created.priority).toBe('can')
    expect(created.id).toBeTruthy()
    expect(anchor.anchors.value).toHaveLength(1)
    expect(anchor.anchors.value[0].id).toBe(created.id)
  })

  it('add 支持指定优先级', async () => {
    const { useAnchor } = await import('../anchor')
    const anchor = useAnchor()

    const created = anchor.add('重要会议', 'must')

    expect(created.text).toBe('重要会议')
    expect(created.priority).toBe('must')
    expect(anchor.anchors.value).toHaveLength(1)
  })

  it('add → remove 后列表为空', async () => {
    const { useAnchor } = await import('../anchor')
    const anchor = useAnchor()

    anchor.add('晨间冥想')
    expect(anchor.anchors.value).toHaveLength(1)

    anchor.remove(anchor.anchors.value[0].id)
    expect(anchor.anchors.value).toEqual([])
  })

  it('add 多个锚点后 remove 指定锚点', async () => {
    const { useAnchor } = await import('../anchor')
    const anchor = useAnchor()

    const a1 = anchor.add('锚点A')
    const a2 = anchor.add('锚点B')
    const a3 = anchor.add('锚点C')
    expect(anchor.anchors.value).toHaveLength(3)

    anchor.remove(a2.id)
    expect(anchor.anchors.value).toHaveLength(2)
    expect(anchor.anchors.value.some(a => a.id === a1.id)).toBe(true)
    expect(anchor.anchors.value.some(a => a.id === a3.id)).toBe(true)
    expect(anchor.anchors.value.some(a => a.id === a2.id)).toBe(false)
  })
})

// ============================================================
// carrier 模块集成测试
// ============================================================
describe('carrier 模块集成测试', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockLocalStorage = createMockStorage()
    ;(globalThis as any).localStorage = mockLocalStorage
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
  })

  it('create → getAll 返回包含新创建的载体', async () => {
    const { useCarrier } = await import('../carrier')
    const carrier = useCarrier()

    const created = carrier.create('笔记载体', 108)

    expect(created.name).toBe('笔记载体')
    expect(created.type).toBe('jade-bead')
    expect(created.beadCount).toBe(0)
    expect(created.maxBeads).toBe(108)
    expect(created.id).toBeTruthy()
    expect(carrier.carriers.value).toHaveLength(1)
    expect(carrier.carriers.value[0].id).toBe(created.id)
  })

  it('create 支持指定 maxBeads', async () => {
    const { useCarrier } = await import('../carrier')
    const carrier = useCarrier()

    const created = carrier.create('自定义载体', 54)

    expect(created.name).toBe('自定义载体')
    expect(created.beadCount).toBe(0)
    expect(created.maxBeads).toBe(54)
  })

  it('create → remove 后列表为空', async () => {
    const { useCarrier } = await import('../carrier')
    const carrier = useCarrier()

    carrier.create('笔记载体', 108)
    expect(carrier.carriers.value).toHaveLength(1)

    carrier.remove(carrier.carriers.value[0].id)
    expect(carrier.carriers.value).toEqual([])
  })

  it('create 多个载体后 remove 指定载体', async () => {
    const { useCarrier } = await import('../carrier')
    const carrier = useCarrier()

    const c1 = carrier.create('载体A', 108)
    const c2 = carrier.create('载体B', 54)
    const c3 = carrier.create('载体C', 27)
    expect(carrier.carriers.value).toHaveLength(3)

    carrier.remove(c2.id)
    expect(carrier.carriers.value).toHaveLength(2)
    expect(carrier.carriers.value.some(c => c.id === c1.id)).toBe(true)
    expect(carrier.carriers.value.some(c => c.id === c3.id)).toBe(true)
    expect(carrier.carriers.value.some(c => c.id === c2.id)).toBe(false)
  })
})