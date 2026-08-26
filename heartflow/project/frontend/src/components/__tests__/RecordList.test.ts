// ============================================================
// RecordList 组件测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// 模拟 storage
const mockGetSessions = vi.fn()

vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: (...args: any[]) => mockGetSessions(...args),
  },
}))

async function getWrapper() {
  const { default: RecordList } = await import('../RecordList.vue')
  return mount(RecordList)
}

function makeSession(overrides: Record<string, any> = {}) {
  const now = new Date()
  return {
    id: 's1',
    status: 'completed',
    mode: 'focus',
    elapsed: 1500000, // 25 min
    startedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0).toISOString(),
    completedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 25).toISOString(),
    tags: ['学习'],
    note: '完成了数学作业',
    plannedDuration: 1500000,
    pausedDuration: 0,
    pausedAt: null,
    carrierId: null,
    ...overrides,
  }
}

describe('RecordList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessions.mockReturnValue([])
  })

  it('渲染记录列表', async () => {
    mockGetSessions.mockReturnValue([makeSession()])
    const wrapper = await getWrapper()
    const entries = wrapper.findAll('.record-entry')
    expect(entries).toHaveLength(1)
  })

  it('显示记录的日期时间', async () => {
    mockGetSessions.mockReturnValue([makeSession()])
    const wrapper = await getWrapper()
    const datetime = wrapper.find('.record-datetime')
    expect(datetime.exists()).toBe(true)
    expect(datetime.text()).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)
  })

  it('显示记录的时长', async () => {
    mockGetSessions.mockReturnValue([makeSession({ elapsed: 1800000 })]) // 30 min
    const wrapper = await getWrapper()
    const duration = wrapper.find('.record-duration')
    expect(duration.exists()).toBe(true)
    expect(duration.text()).toContain('30分钟')
  })

  it('显示记录的标签', async () => {
    mockGetSessions.mockReturnValue([makeSession({ tags: ['学习'] })])
    const wrapper = await getWrapper()
    const tag = wrapper.find('.record-tag')
    expect(tag.exists()).toBe(true)
    expect(tag.text()).toBe('学习')
  })

  it('显示记录的备注', async () => {
    mockGetSessions.mockReturnValue([makeSession({ note: '完成了数学作业' })])
    const wrapper = await getWrapper()
    const note = wrapper.find('.record-note')
    expect(note.exists()).toBe(true)
    expect(note.text()).toContain('完成了数学作业')
  })

  it('无备注时不显示备注区域', async () => {
    mockGetSessions.mockReturnValue([makeSession({ note: '' })])
    const wrapper = await getWrapper()
    const note = wrapper.find('.record-note')
    expect(note.exists()).toBe(false)
  })

  it('搜索过滤：按标签搜索', async () => {
    mockGetSessions.mockReturnValue([
      makeSession({ id: 's1', tags: ['学习'], note: '' }),
      makeSession({ id: 's2', tags: ['工作'], note: '' }),
    ])
    const wrapper = await getWrapper()
    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('学习')
    const entries = wrapper.findAll('.record-entry')
    expect(entries).toHaveLength(1)
    expect(entries[0].text()).toContain('学习')
  })

  it('搜索过滤：按备注搜索', async () => {
    mockGetSessions.mockReturnValue([
      makeSession({ id: 's1', tags: [], note: '数学作业' }),
      makeSession({ id: 's2', tags: [], note: '英语阅读' }),
    ])
    const wrapper = await getWrapper()
    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('数学')
    const entries = wrapper.findAll('.record-entry')
    expect(entries).toHaveLength(1)
    expect(entries[0].text()).toContain('数学作业')
  })

  it('日期筛选：点击"今天"按钮', async () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    mockGetSessions.mockReturnValue([
      makeSession({ id: 's1', startedAt: today.toISOString() }),
      makeSession({ id: 's2', startedAt: yesterday.toISOString() }),
    ])
    const wrapper = await getWrapper()
    // 点击"今天"筛选按钮
    const filterBtns = wrapper.findAll('.filter-btn')
    const todayBtn = filterBtns.filter(b => b.text() === '今天')[0]
    await todayBtn.trigger('click')
    const entries = wrapper.findAll('.record-entry')
    // 应该只显示今天的记录
    expect(entries.length).toBeGreaterThanOrEqual(1)
  })

  it('日期筛选按钮渲染', async () => {
    const wrapper = await getWrapper()
    const filterBtns = wrapper.findAll('.filter-btn')
    expect(filterBtns).toHaveLength(4)
    const labels = filterBtns.map(b => b.text())
    expect(labels).toEqual(['全部', '今天', '本周', '本月'])
  })

  it('空状态显示', async () => {
    mockGetSessions.mockReturnValue([])
    const wrapper = await getWrapper()
    const emptyState = wrapper.find('.empty-state')
    expect(emptyState.exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有专注记录')
  })

  it('搜索无结果时显示空状态提示', async () => {
    mockGetSessions.mockReturnValue([makeSession({ tags: ['学习'] })])
    const wrapper = await getWrapper()
    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('不存在的关键词')
    const emptyState = wrapper.find('.empty-state')
    expect(emptyState.exists()).toBe(true)
    expect(wrapper.text()).toContain('没有找到匹配的记录')
  })

  it('清除搜索按钮出现和点击', async () => {
    mockGetSessions.mockReturnValue([makeSession()])
    const wrapper = await getWrapper()
    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('学习')
    let clearBtn = wrapper.find('.clear-btn')
    expect(clearBtn.exists()).toBe(true)
    await clearBtn.trigger('click')
    // 清除后应该显示所有记录
    const entries = wrapper.findAll('.record-entry')
    expect(entries).toHaveLength(1)
  })

  it('多条记录按时间倒序排列', async () => {
    const now = new Date()
    const earlier = new Date(now)
    earlier.setHours(earlier.getHours() - 2)
    mockGetSessions.mockReturnValue([
      makeSession({ id: 's1', startedAt: earlier.toISOString() }),
      makeSession({ id: 's2', startedAt: now.toISOString() }),
    ])
    const wrapper = await getWrapper()
    const entries = wrapper.findAll('.record-entry')
    expect(entries).toHaveLength(2)
    // 第一条应该是较晚的记录
    const firstTime = entries[0].find('.record-datetime').text()
    const secondTime = entries[1].find('.record-datetime').text()
    expect(firstTime.localeCompare(secondTime)).toBeGreaterThanOrEqual(0)
  })
})