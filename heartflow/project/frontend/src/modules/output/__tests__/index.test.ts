// ============================================================
// 输出管理 · 测试
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useOutputManager } from '../index'
import type { OutputState } from '../types'

// ---- mock localStorage ----
function createMockStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
}

let mockLocalStorage: ReturnType<typeof createMockStorage>

beforeEach(() => {
  mockLocalStorage = createMockStorage()
  vi.stubGlobal('localStorage', mockLocalStorage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ============================================================
// 状态机测试
// ============================================================
describe('状态机', () => {
  it('初始状态为 hidden', () => {
    const manager = useOutputManager()
    expect(manager.state).toBe('hidden')
  })

  it('hidden → expanded 有效', () => {
    const manager = useOutputManager()
    expect(manager.transition('expanded')).toBe(true)
    expect(manager.state).toBe('expanded')
  })

  it('hidden → editing 无效', () => {
    const manager = useOutputManager()
    expect(manager.transition('editing')).toBe(false)
    expect(manager.state).toBe('hidden')
  })

  it('expanded → editing 有效', () => {
    const manager = useOutputManager()
    manager.transition('expanded')
    expect(manager.transition('editing')).toBe(true)
    expect(manager.state).toBe('editing')
  })

  it('expanded → hidden 有效（放弃）', () => {
    const manager = useOutputManager()
    manager.transition('expanded')
    expect(manager.transition('hidden')).toBe(true)
    expect(manager.state).toBe('hidden')
  })

  it('editing → submitting 有效', () => {
    const manager = useOutputManager()
    manager.transition('expanded')
    manager.transition('editing')
    expect(manager.transition('submitting')).toBe(true)
    expect(manager.state).toBe('submitting')
  })

  it('submitting → hidden 有效（提交成功）', () => {
    const manager = useOutputManager()
    manager.transition('expanded')
    manager.transition('editing')
    manager.transition('submitting')
    expect(manager.transition('hidden')).toBe(true)
    expect(manager.state).toBe('hidden')
  })

  it('submitting → error 有效（提交失败）', () => {
    const manager = useOutputManager()
    manager.transition('expanded')
    manager.transition('editing')
    manager.transition('submitting')
    expect(manager.transition('error')).toBe(true)
    expect(manager.state).toBe('error')
  })

  it('error → editing 有效（重试）', () => {
    const manager = useOutputManager()
    manager.transition('expanded')
    manager.transition('editing')
    manager.transition('submitting')
    manager.transition('error')
    expect(manager.transition('editing')).toBe(true)
    expect(manager.state).toBe('editing')
  })

  it('error → hidden 有效（放弃）', () => {
    const manager = useOutputManager()
    manager.transition('expanded')
    manager.transition('editing')
    manager.transition('submitting')
    manager.transition('error')
    expect(manager.transition('hidden')).toBe(true)
    expect(manager.state).toBe('hidden')
  })

  it('reset 后状态回到 hidden', () => {
    const manager = useOutputManager()
    manager.transition('expanded')
    manager.transition('editing')
    manager.reset()
    expect(manager.state).toBe('hidden')
  })

  it('所有无效状态转换均返回 false', () => {
    const manager = useOutputManager()
    const invalidTransitions: [OutputState, OutputState][] = [
      ['hidden', 'editing'],
      ['hidden', 'submitting'],
      ['hidden', 'error'],
      ['expanded', 'submitting'],
      ['expanded', 'error'],
      ['editing', 'hidden'],
      ['editing', 'error'],
      ['submitting', 'editing'],
      ['submitting', 'submitting'],
      ['error', 'expanded'],
      ['error', 'submitting'],
      ['error', 'error'],
    ]
    // 先设置有效状态
    manager.transition('expanded')
    manager.transition('editing')
    manager.transition('submitting')
    manager.transition('error')

    for (const [from, to] of invalidTransitions) {
      // 先重置到目标起始状态
      const m = useOutputManager()
      if (from === 'expanded') m.transition('expanded')
      else if (from === 'editing') { m.transition('expanded'); m.transition('editing') }
      else if (from === 'submitting') { m.transition('expanded'); m.transition('editing'); m.transition('submitting') }
      else if (from === 'error') { m.transition('expanded'); m.transition('editing'); m.transition('submitting'); m.transition('error') }

      expect(m.transition(to)).toBe(false)
      expect(m.state).toBe(from)
    }
  })
})

// ============================================================
// CRUD 操作测试
// ============================================================
describe('CRUD 操作', () => {
  it('create 创建一条笔记记录', () => {
    const manager = useOutputManager()
    const record = manager.create({
      type: 'note',
      content: '今天学习Vue',
      roomSource: 'study',
    })

    expect(record).not.toBeNull()
    expect(record!.type).toBe('note')
    expect(record!.content).toBe('今天学习Vue')
    expect(record!.roomSource).toBe('study')
    expect(record!.id).toBeTruthy()
    expect(record!.status).toBe('published')
    expect(record!.createdAt).toBeTruthy()
    expect(record!.updatedAt).toBeTruthy()
  })

  it('create 创建一条情绪记录（含扩展字段）', () => {
    const manager = useOutputManager()
    const record = manager.create({
      type: 'emotion',
      content: '今天很开心',
      roomSource: 'emotion',
      emotionCategory: 'joy',
      intensity: 0.8,
      triggerEvent: '完成了一个大项目',
    })

    expect(record).not.toBeNull()
    expect(record!.emotionCategory).toBe('joy')
    expect(record!.intensity).toBe(0.8)
    expect(record!.triggerEvent).toBe('完成了一个大项目')
  })

  it('create 创建一条锚点记录', () => {
    const manager = useOutputManager()
    const record = manager.create({
      type: 'anchor',
      content: '周会汇报',
      roomSource: 'anchor',
      anchorType: 'must',
      scheduledTime: '2026-07-28T09:00:00.000Z',
      zone: 'work',
    })

    expect(record).not.toBeNull()
    expect(record!.anchorType).toBe('must')
    expect(record!.scheduledTime).toBe('2026-07-28T09:00:00.000Z')
    expect(record!.zone).toBe('work')
  })

  it('create 后 get 能正确返回', () => {
    const manager = useOutputManager()
    const created = manager.create({
      type: 'note',
      content: '测试笔记',
      roomSource: 'study',
    })

    const fetched = manager.get(created!.id)
    expect(fetched).toBeDefined()
    expect(fetched!.content).toBe('测试笔记')
  })

  it('get 不存在的记录返回 undefined', () => {
    const manager = useOutputManager()
    expect(manager.get('nonexistent')).toBeUndefined()
  })

  it('update 能更新字段', () => {
    const manager = useOutputManager()
    const created = manager.create({
      type: 'note',
      content: '原始内容',
      roomSource: 'study',
    })

    const result = manager.update(created!.id, { content: '更新后的内容' })
    expect(result).toBe(true)

    const updated = manager.get(created!.id)
    expect(updated!.content).toBe('更新后的内容')
  })

  it('update 不存在的记录返回 false', () => {
    const manager = useOutputManager()
    expect(manager.update('nonexistent', { content: 'test' })).toBe(false)
  })

  it('delete 能删除记录', () => {
    const manager = useOutputManager()
    const created = manager.create({
      type: 'note',
      content: '待删除',
      roomSource: 'study',
    })

    expect(manager.delete(created!.id)).toBe(true)
    expect(manager.get(created!.id)).toBeUndefined()
  })

  it('delete 不存在的记录返回 false', () => {
    const manager = useOutputManager()
    expect(manager.delete('nonexistent')).toBe(false)
  })

  it('getAll 返回所有记录', () => {
    const manager = useOutputManager()
    manager.create({ type: 'note', content: '笔记1', roomSource: 'study' })
    manager.create({ type: 'note', content: '笔记2', roomSource: 'study' })
    manager.create({ type: 'emotion', content: '开心', roomSource: 'emotion' })

    expect(manager.getAll()).toHaveLength(3)
  })

  it('getByType 按类型筛选', () => {
    const manager = useOutputManager()
    manager.create({ type: 'note', content: '笔记1', roomSource: 'study' })
    manager.create({ type: 'emotion', content: '开心', roomSource: 'emotion' })
    manager.create({ type: 'note', content: '笔记2', roomSource: 'study' })

    const notes = manager.getByType('note')
    expect(notes).toHaveLength(2)

    const emotions = manager.getByType('emotion')
    expect(emotions).toHaveLength(1)
  })

  it('getByDateRange 按日期范围筛选', () => {
    const manager = useOutputManager()
    manager.create({ type: 'note', content: '旧笔记', roomSource: 'study' })

    // 模拟时间推移
    const later = new Date(Date.now() + 86400000).toISOString()
    const r2 = manager.create({ type: 'note', content: '新笔记', roomSource: 'study' })

    // 修改第二条记录的时间
    manager.update(r2!.id, { createdAt: later, updatedAt: later })

    const start = new Date(Date.now() + 43200000).toISOString()
    const end = new Date(Date.now() + 86400000 * 2).toISOString()

    const results = manager.getByDateRange(start, end)
    expect(results).toHaveLength(1)
    expect(results[0].content).toBe('新笔记')
  })

  it('records getter 返回所有记录的副本', () => {
    const manager = useOutputManager()
    manager.create({ type: 'note', content: '测试', roomSource: 'study' })
    expect(manager.records).toHaveLength(1)
    expect(manager.records[0].content).toBe('测试')
  })
})

// ============================================================
// 事件订阅测试
// ============================================================
describe('事件订阅', () => {
  it('create 后触发 record:created 事件', async () => {
    const manager = useOutputManager()
    const listener = vi.fn()
    manager.on('record:created', listener)

    manager.create({ type: 'note', content: '测试事件', roomSource: 'study' })

    // 等待事件发布（异步）
    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledTimes(1)
    })

    const event = listener.mock.calls[0][0]
    expect(event.type).toBe('record:created')
    expect(event.record.content).toBe('测试事件')
  })

  it('update 后触发 record:updated 事件', async () => {
    const manager = useOutputManager()
    const listener = vi.fn()
    manager.on('record:updated', listener)

    const created = manager.create({ type: 'note', content: '原始', roomSource: 'study' })
    manager.update(created!.id, { content: '更新后' })

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledTimes(1)
    })

    const event = listener.mock.calls[0][0]
    expect(event.type).toBe('record:updated')
    expect(event.record.content).toBe('更新后')
  })

  it('delete 后触发 record:deleted 事件', async () => {
    const manager = useOutputManager()
    const listener = vi.fn()
    manager.on('record:deleted', listener)

    const created = manager.create({ type: 'note', content: '待删除', roomSource: 'study' })
    manager.delete(created!.id)

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledTimes(1)
    })

    const event = listener.mock.calls[0][0]
    expect(event.type).toBe('record:deleted')
  })

  it('off 后不再触发事件', async () => {
    const manager = useOutputManager()
    const listener = vi.fn()
    manager.on('record:created', listener)
    manager.off('record:created', listener)

    manager.create({ type: 'note', content: '测试', roomSource: 'study' })

    // 等待一小段时间确认没有触发
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(listener).not.toHaveBeenCalled()
  })

  it('事件发布失败时自动重试', async () => {
    const manager = useOutputManager({
      eventRetryDelays: [10, 10, 10], // 极短延迟用于测试
    })
    let callCount = 0
    const failingListener = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount <= 2) {
        return Promise.reject(new Error('模拟失败'))
      }
      return Promise.resolve()
    })

    manager.on('record:created', failingListener)

    manager.create({
      type: 'note',
      content: '测试重试',
      roomSource: 'study',
    })

    // 等待重试完成
    await vi.waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(3)
    }, { timeout: 1000 })
  })
})

// ============================================================
// 持久化测试
// ============================================================
describe('持久化', () => {
  it('记录在 create 后持久化到 localStorage', () => {
    const manager = useOutputManager()
    manager.create({ type: 'note', content: '持久化测试', roomSource: 'study' })

    // 验证 localStorage 中有数据
    const saved = mockLocalStorage.setItem.mock.calls.find(
      call => call[0] === 'heartflow:storage',
    )
    expect(saved).toBeDefined()
    const parsed = JSON.parse(saved![1])
    expect(parsed.kvStore['hf:output_records']).toHaveLength(1)
  })

  it('重复创建多条记录', () => {
    const manager = useOutputManager()

    for (let i = 0; i < 10; i++) {
      manager.create({
        type: 'note',
        content: `笔记 ${i}`,
        roomSource: 'study',
      })
    }

    expect(manager.getAll()).toHaveLength(10)
  })

  it('按日期范围检索空结果', () => {
    const manager = useOutputManager()
    const results = manager.getByDateRange(
      '2099-01-01T00:00:00.000Z',
      '2099-12-31T23:59:59.999Z',
    )
    expect(results).toHaveLength(0)
  })
})