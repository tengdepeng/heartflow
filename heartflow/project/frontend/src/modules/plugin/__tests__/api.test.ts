// ============================================================
// 插件 API 初始化 · api.ts 测试
// 覆盖：initPluginAPIs 注册各 API 端点
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// 模拟 storage 模块
const mockStorage = {
  getSessions: vi.fn(() => [{ id: 's1', duration: 1500 }]),
  getCrystals: vi.fn(() => [{ id: 'c1', color: 'blue' }]),
  getNotes: vi.fn(() => [{ id: 'n1', content: 'test' }]),
  getEmotions: vi.fn(() => [{ id: 'e1', type: 'happy' }]),
  getConfig: vi.fn(() => ({ theme: 'dark' })),
  setNotes: vi.fn(),
  setEmotions: vi.fn(),
}

vi.mock('../../../engine/storage', () => ({
  storage: mockStorage,
}))

// 模拟 window 事件
const dispatchedEvents: Array<{ type: string; detail: any }> = []
const mockDispatchEvent = vi.fn((event: CustomEvent) => {
  dispatchedEvents.push({ type: event.type, detail: event.detail })
  return true
})

const originalDispatchEvent = window.dispatchEvent

describe('initPluginAPIs', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    dispatchedEvents.length = 0
    mockStorage.getSessions.mockReturnValue([{ id: 's1', duration: 1500 }])
    mockStorage.getCrystals.mockReturnValue([{ id: 'c1', color: 'blue' }])
    mockStorage.getNotes.mockReturnValue([{ id: 'n1', content: 'test' }])
    mockStorage.getEmotions.mockReturnValue([{ id: 'e1', type: 'happy' }])
    mockStorage.getConfig.mockReturnValue({ theme: 'dark' })
    window.dispatchEvent = mockDispatchEvent as any

    // 重置 loader 状态
    const { __resetLoader } = await import('../loader')
    __resetLoader()
  })

  afterEach(() => {
    window.dispatchEvent = originalDispatchEvent
  })

  it('注册 data:read API 端点', async () => {
    const { initPluginAPIs } = await import('../api')
    initPluginAPIs()

    const { getPluginAPI } = await import('../loader')
    const dataRead = getPluginAPI('data:read')
    expect(dataRead).not.toBeNull()

    const sessions = dataRead!.getSessions()
    expect(sessions).toEqual([{ id: 's1', duration: 1500 }])
    expect(mockStorage.getSessions).toHaveBeenCalled()

    const crystals = dataRead!.getCrystals()
    expect(crystals).toEqual([{ id: 'c1', color: 'blue' }])

    const notes = dataRead!.getNotes()
    expect(notes).toEqual([{ id: 'n1', content: 'test' }])

    const emotions = dataRead!.getEmotions()
    expect(emotions).toEqual([{ id: 'e1', type: 'happy' }])

    const config = dataRead!.getConfig()
    expect(config).toEqual({ theme: 'dark' })
  })

  it('注册 data:write API 端点', async () => {
    const { initPluginAPIs } = await import('../api')
    initPluginAPIs()

    const { getPluginAPI } = await import('../loader')
    const dataWrite = getPluginAPI('data:write')
    expect(dataWrite).not.toBeNull()

    const newNote = { id: 'n2', content: 'new note' }
    dataWrite!.addNote(newNote)
    expect(mockStorage.setNotes).toHaveBeenCalled()

    const newEmotion = { id: 'e2', type: 'sad' }
    dataWrite!.addEmotion(newEmotion)
    expect(mockStorage.setEmotions).toHaveBeenCalled()
  })

  it('注册 navigation API 端点', async () => {
    const { initPluginAPIs } = await import('../api')
    initPluginAPIs()

    const { getPluginAPI } = await import('../loader')
    const navigation = getPluginAPI('navigation')
    expect(navigation).not.toBeNull()

    navigation!.navigate('/home')
    const navEvent = dispatchedEvents.find(e => e.type === 'hf:navigate')
    expect(navEvent).toBeDefined()
    expect(navEvent!.detail).toEqual({ path: '/home' })
  })

  it('注册 notification API 端点', async () => {
    const { initPluginAPIs } = await import('../api')
    initPluginAPIs()

    const { getPluginAPI } = await import('../loader')
    const notification = getPluginAPI('notification')
    expect(notification).not.toBeNull()

    notification!.notify('你好，世界')
    const notifyEvent = dispatchedEvents.find(e => e.type === 'hf:notify')
    expect(notifyEvent).toBeDefined()
    expect(notifyEvent!.detail).toEqual({ text: '你好，世界' })
  })

  it('initPluginAPIs 注册了全部 4 个 API 端点', async () => {
    const { initPluginAPIs } = await import('../api')
    initPluginAPIs()

    const { getRegisteredAPIs } = await import('../loader')
    const apis = getRegisteredAPIs()
    expect(apis).toContain('data:read')
    expect(apis).toContain('data:write')
    expect(apis).toContain('navigation')
    expect(apis).toContain('notification')
  })
})