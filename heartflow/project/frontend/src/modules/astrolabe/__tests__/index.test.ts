// ============================================================
// 天星盘 · 单元测试
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAstrolabe, recordNavigation } from '../useAstrolabe'
import type { RoomNode } from '../../../engine/room-graph'

// ---- 模拟 room-graph ----
vi.mock('../../../engine/room-graph', () => {
  const mockRooms: any[] = [
    { id: 'home', name: '心流', path: '/', icon: '⊙', group: 'main-path', isMainPath: true },
    { id: 'anchor', name: '锚点', path: '/anchor', icon: '⚓', group: 'main-path', isMainPath: true },
    { id: 'timeline', name: '时间线', path: '/timeline', icon: '⟷', group: 'main-path', isMainPath: true },
    { id: 'garden', name: '花园', path: '/garden', icon: '❀', group: 'main-path', isMainPath: true },
    { id: 'worklog', name: '更漏', path: '/worklog', icon: '⏳', group: 'main-path', isMainPath: true },
    { id: 'scar', name: '伤疤', path: '/scar', icon: '✜', group: 'world', isMainPath: false, branchFrom: 'worklog' },
    { id: 'reward', name: '奖赏', path: '/reward', icon: '★', group: 'world', isMainPath: false, branchFrom: 'worklog' },
    { id: 'craft', name: '工坊', path: '/craft', icon: '⚒', group: 'world', isMainPath: false, branchFrom: 'worklog' },
    { id: 'career', name: '生涯', path: '/career', icon: '⚔', group: 'world', isMainPath: false, branchFrom: 'worklog' },
    { id: 'bag', name: '行囊', path: '/bag', icon: '◆', group: 'world', isMainPath: false, branchFrom: 'worklog' },
    { id: 'rest', name: '休憩', path: '/rest', icon: '◈', group: 'world', isMainPath: false, branchFrom: 'worklog' },
    { id: 'sanctuary', name: '安全岛', path: '/sanctuary', icon: '♢', group: 'system', isMainPath: true },
    { id: 'constitution', name: '约法', path: '/constitution', icon: '📜', group: 'system', isMainPath: false },
  ]

  return {
    getRoom: (id: string) => mockRooms.find(r => r.id === id) ?? null,
    getRoomByPath: (path: string) => mockRooms.find(r => r.path === path) ?? null,
    getAllRooms: () => [...mockRooms],
    getMainPath: () => mockRooms.filter(r => r.group === 'main-path'),
  }
})

// ---- 模拟 storage ----
const mockKvStore: Record<string, any> = {}
const mockGetKV = vi.fn((key: string, def: any) => key in mockKvStore ? mockKvStore[key] : def)
const mockSetKV = vi.fn((key: string, val: any) => { mockKvStore[key] = val })

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
    getConfig: () => ({ astrolabe: { maxRecentRooms: 8 } }),
  },
}))

// ---- 模拟 vue-router ----
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    currentRoute: { value: { path: '/' } },
  }),
}))

describe('useAstrolabe', () => {
  beforeEach(() => {
    Object.keys(mockKvStore).forEach(k => delete mockKvStore[k])
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with closed state', () => {
    const astrolabe = useAstrolabe()
    expect(astrolabe.isOpen.value).toBe(false)
    expect(astrolabe.visibility.value.visible).toBe(false)
    expect(astrolabe.visibility.value.trigger).toBe('unknown')
    expect(astrolabe.visibility.value.openedAt).toBeNull()
  })

  it('should open with specified trigger', () => {
    const astrolabe = useAstrolabe()
    astrolabe.open('keyboard')
    expect(astrolabe.isOpen.value).toBe(true)
    expect(astrolabe.visibility.value.trigger).toBe('keyboard')
    expect(astrolabe.visibility.value.openedAt).not.toBeNull()
  })

  it('should close properly', () => {
    const astrolabe = useAstrolabe()
    astrolabe.open('keyboard')
    expect(astrolabe.isOpen.value).toBe(true)
    astrolabe.close()
    expect(astrolabe.isOpen.value).toBe(false)
    expect(astrolabe.visibility.value.trigger).toBe('unknown')
    expect(astrolabe.visibility.value.openedAt).toBeNull()
  })

  it('should toggle between open and closed', () => {
    const astrolabe = useAstrolabe()
    astrolabe.toggle('keyboard')
    expect(astrolabe.isOpen.value).toBe(true)
    astrolabe.toggle('keyboard')
    expect(astrolabe.isOpen.value).toBe(false)
  })

  it('should not open if already open', () => {
    const astrolabe = useAstrolabe()
    astrolabe.open('keyboard')
    const openedAt = astrolabe.visibility.value.openedAt
    astrolabe.open('long-press')
    // 应该保持第一次打开的时间戳
    expect(astrolabe.visibility.value.openedAt).toBe(openedAt)
  })

  it('should reset search state on open', () => {
    const astrolabe = useAstrolabe()
    // 先手动修改搜索状态
    astrolabe.search.value.query = 'test'
    astrolabe.search.value.selectedIndex = 2
    astrolabe.open('keyboard')
    expect(astrolabe.search.value.query).toBe('')
    expect(astrolabe.search.value.selectedIndex).toBe(0)
  })

  it('should compute main path rooms excluding home', () => {
    const astrolabe = useAstrolabe()
    const mainPath = astrolabe.mainPathRooms.value
    expect(mainPath.length).toBe(4) // anchor, timeline, garden, worklog
    expect(mainPath.every((r: RoomNode) => r.id !== 'home')).toBe(true)
  })

  it('should search rooms by name', async () => {
    const astrolabe = useAstrolabe()
    astrolabe.search.value.query = '伤疤'
    await vi.advanceTimersByTimeAsync(300) // 等待防抖
    expect(astrolabe.searchResults.value.length).toBe(1)
    expect(astrolabe.searchResults.value[0].id).toBe('scar')
  })

  it('should search rooms by id', async () => {
    const astrolabe = useAstrolabe()
    astrolabe.search.value.query = 'scar'
    await vi.advanceTimersByTimeAsync(300) // 等待防抖
    expect(astrolabe.searchResults.value.length).toBe(1)
    expect(astrolabe.searchResults.value[0].id).toBe('scar')
  })

  it('should return empty search results for no match', async () => {
    const astrolabe = useAstrolabe()
    astrolabe.search.value.query = '不存在'
    await vi.advanceTimersByTimeAsync(300) // 等待防抖
    expect(astrolabe.searchResults.value.length).toBe(0)
  })

  it('should highlight matching text', async () => {
    const astrolabe = useAstrolabe()
    astrolabe.search.value.query = '伤'
    await vi.advanceTimersByTimeAsync(300) // 等待防抖
    const result = astrolabe.highlightMatch('伤疤')
    expect(result).toContain('<mark>')
    expect(result).toContain('</mark>')
  })

  it('should include sanctuary as a star-map node (接入安全岛)', () => {
    const astrolabe = useAstrolabe()
    const worldRooms = astrolabe.worldRooms.value
    expect(worldRooms.some((r: RoomNode) => r.id === 'sanctuary')).toBe(true)
  })

  it('should compute branch topology lines from branchFrom parents', () => {
    const astrolabe = useAstrolabe()
    const lines = astrolabe.branchLines.value
    // 至少应有一条「父→子」连线：scar 的 branchFrom 为 worklog
    expect(lines.some((l) => l.key === 'branch-scar')).toBe(true)
    const scar = lines.find((l) => l.key === 'branch-scar')
    expect(scar).toBeTruthy()
    expect(typeof scar!.x1).toBe('number')
    expect(typeof scar!.x2).toBe('number')
  })

  it('should compute star style with correct properties', () => {
    const astrolabe = useAstrolabe()
    const style = astrolabe.starStyle(1)
    expect(style).toHaveProperty('width')
    expect(style).toHaveProperty('height')
    expect(style).toHaveProperty('left')
    expect(style).toHaveProperty('top')
    expect(style).toHaveProperty('animationDelay')
    expect(style).toHaveProperty('animationDuration')
    expect(style).toHaveProperty('opacity')
  })

  it('should compute degree tick style', () => {
    const astrolabe = useAstrolabe()
    const style = astrolabe.degStyle(0, 72)
    expect(style).toHaveProperty('transform')
    expect(style).toHaveProperty('opacity')
    expect(style).toHaveProperty('height')
  })

  it('should compute main path coordinates', () => {
    const astrolabe = useAstrolabe()
    const coord = astrolabe.mainPathCoord(0)
    expect(coord).toHaveProperty('x')
    expect(coord).toHaveProperty('y')
    expect(typeof coord.x).toBe('number')
    expect(typeof coord.y).toBe('number')
  })

  it('should compute main path style', () => {
    const astrolabe = useAstrolabe()
    const style = astrolabe.mainPathStyle(0)
    expect(style).toHaveProperty('left')
    expect(style).toHaveProperty('top')
    expect(style).toHaveProperty('--node-angle')
    expect(style).toHaveProperty('--node-delay')
  })

  it('should compute world coordinates', () => {
    const astrolabe = useAstrolabe()
    const coord = astrolabe.worldCoord(0)
    expect(coord).toHaveProperty('x')
    expect(coord).toHaveProperty('y')
  })

  it('should compute world style', () => {
    const astrolabe = useAstrolabe()
    const style = astrolabe.worldStyle(0)
    expect(style).toHaveProperty('left')
    expect(style).toHaveProperty('top')
    expect(style).toHaveProperty('--node-angle')
    expect(style).toHaveProperty('--node-delay')
  })

  it('should persist recent rooms to storage', () => {
    const astrolabe = useAstrolabe()
    astrolabe.goTo('scar')
    expect(mockKvStore['heartflow:astrolabe:recent']).toContain('scar')
  })

  it('should load recent rooms from storage', () => {
    mockKvStore['heartflow:astrolabe:recent'] = ['scar', 'reward']
    const astrolabe = useAstrolabe()
    expect(astrolabe.recentRooms.value.length).toBe(2)
    expect(astrolabe.recentRooms.value[0].id).toBe('scar')
  })

  it('should navigate to a room and add to recent', () => {
    const astrolabe = useAstrolabe()
    astrolabe.goTo('scar')
    expect(astrolabe.isOpen.value).toBe(false)
    expect(astrolabe.recentRooms.value.length).toBeGreaterThan(0)
    expect(astrolabe.recentRooms.value[0].id).toBe('scar')
  })

  it('should not add home to recent rooms', () => {
    const astrolabe = useAstrolabe()
    astrolabe.goTo('home')
    expect(astrolabe.recentRooms.value.length).toBe(0)
  })

  it('should handle search keyboard navigation down', async () => {
    const astrolabe = useAstrolabe()
    astrolabe.search.value.query = 'a'
    await vi.advanceTimersByTimeAsync(300) // 等待防抖
    const e = new KeyboardEvent('keydown', { key: 'ArrowDown' })
    e.preventDefault = vi.fn()
    astrolabe.onSearchKeydown(e)
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('should handle search keyboard navigation up', async () => {
    const astrolabe = useAstrolabe()
    astrolabe.search.value.query = 'a'
    await vi.advanceTimersByTimeAsync(300) // 等待防抖
    const e = new KeyboardEvent('keydown', { key: 'ArrowUp' })
    e.preventDefault = vi.fn()
    astrolabe.onSearchKeydown(e)
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('should handle enter key on search result', async () => {
    const astrolabe = useAstrolabe()
    astrolabe.search.value.query = '伤疤'
    await vi.advanceTimersByTimeAsync(300) // 等待防抖
    const e = new KeyboardEvent('keydown', { key: 'Enter' })
    e.preventDefault = vi.fn()
    astrolabe.onSearchKeydown(e)
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('should limit recent rooms to maxRecentRooms', () => {
    const astrolabe = useAstrolabe({ config: { maxRecentRooms: 3 } })
    astrolabe.goTo('scar')
    astrolabe.goTo('reward')
    astrolabe.goTo('craft')
    astrolabe.goTo('career') // 应该超出限制
    expect(astrolabe.recentRooms.value.length).toBe(3)
  })

  it('should load recent rooms from storage ignoring invalid ids', () => {
    mockKvStore['heartflow:astrolabe:recent'] = ['nonexistent', 'scar']
    const astrolabe = useAstrolabe()
    expect(astrolabe.recentRooms.value.length).toBe(1)
    expect(astrolabe.recentRooms.value[0].id).toBe('scar')
  })
})

describe('recordNavigation', () => {
  it('should record navigation history', () => {
    recordNavigation('anchor')
    recordNavigation('timeline')
    // 不直接测试内部状态，只是确保不会报错
    expect(true).toBe(true)
  })
})