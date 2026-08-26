// ============================================================
// 心流工坊 · 房间导航组合式函数测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// 模拟 vue-router
const mockPush = vi.fn()
const mockRoutePath = ref('/')

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ path: mockRoutePath.value }),
}))

// 需要在导入 useRoomNavigation 之前完成 mock
import { useRoomNavigation } from '../useRoomNavigation'

describe('useRoomNavigation 房间导航组合式函数', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoutePath.value = '/'
  })

  // ------- 基础状态 -------
  it('在心流时 currentRoomId 为 home', () => {
    const nav = useRoomNavigation()
    expect(nav.currentRoomId.value).toBe('home')
  })

  it('currentRoom 返回当前房间对象', () => {
    const nav = useRoomNavigation()
    expect(nav.currentRoom.value).toBeDefined()
    expect(nav.currentRoom.value?.name).toBe('心流')
  })

  it('isOnMainPath 在心流时为 false（心流是 gravity 组）', () => {
    const nav = useRoomNavigation()
    expect(nav.isOnMainPath.value).toBe(false)
  })

  it('mainPath 包含 3 个房间（安全岛已移出主链路）', () => {
    const nav = useRoomNavigation()
    expect(nav.mainPath.value.length).toBe(3)
  })

  // ------- 导航到不同房间 -------
  it('在不同路径时更新 currentRoomId', () => {
    mockRoutePath.value = '/timeline'
    const nav = useRoomNavigation()
    expect(nav.currentRoomId.value).toBe('timeline')
    expect(nav.currentRoom.value?.name).toBe('时间线枢纽')
  })

  it('在非主链路房间时 isOnMainPath 为 false', () => {
    mockRoutePath.value = '/reading'
    const nav = useRoomNavigation()
    expect(nav.isOnMainPath.value).toBe(false)
  })

  // ------- 邻接房间 -------
  it('adjacentRooms 返回相邻房间列表', () => {
    mockRoutePath.value = '/timeline'
    const nav = useRoomNavigation()
    expect(nav.adjacentRooms.value.length).toBeGreaterThan(0)
  })

  it('adjacentRooms 包含心流', () => {
    mockRoutePath.value = '/timeline'
    const nav = useRoomNavigation()
    expect(nav.adjacentRooms.value.some(r => r.id === 'home-space')).toBe(true)
  })

  // ------- 主链路导航 -------
  it('previousOnMainPath 在当前为锚点时返回时间长廊', () => {
    mockRoutePath.value = '/anchor'
    const nav = useRoomNavigation()
    expect(nav.previousOnMainPath.value).toBeDefined()
    expect(nav.previousOnMainPath.value?.id).toBe('timeline')
  })

  it('nextOnMainPath 在当前为锚点时返回情绪花房', () => {
    mockRoutePath.value = '/anchor'
    const nav = useRoomNavigation()
    expect(nav.nextOnMainPath.value).toBeDefined()
    expect(nav.nextOnMainPath.value?.id).toBe('garden')
  })

  it('nextOnMainPath 在情绪花房时为 undefined（安全岛已移出主链路）', () => {
    mockRoutePath.value = '/garden'
    const nav = useRoomNavigation()
    expect(nav.nextOnMainPath.value).toBeUndefined()
  })

  it('previousOnMainPath 在心流时为 undefined', () => {
    const nav = useRoomNavigation()
    expect(nav.previousOnMainPath.value).toBeUndefined()
  })

  // ------- 返回路径 -------
  it('returnPath 包含心流', () => {
    mockRoutePath.value = '/garden'
    const nav = useRoomNavigation()
    expect(nav.returnPath.value.length).toBeGreaterThan(0)
    expect(nav.returnPath.value[nav.returnPath.value.length - 1]).toBe('home-space')
  })

  it('pathToHome 包含当前房间', () => {
    mockRoutePath.value = '/garden'
    const nav = useRoomNavigation()
    expect(nav.pathToHome.value.length).toBeGreaterThan(0)
  })

  // ------- 导航方法 -------
  it('enterRoom 调用 router.push', () => {
    const nav = useRoomNavigation()
    nav.enterRoom('timeline')
    expect(mockPush).toHaveBeenCalledWith('/timeline')
  })

  it('goHome 调用 router.push("/")', () => {
    const nav = useRoomNavigation()
    nav.goHome()
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('goNextOnMainPath 导航到下一个主链路房间', () => {
    mockRoutePath.value = '/anchor'
    const nav = useRoomNavigation()
    nav.goNextOnMainPath()
    expect(mockPush).toHaveBeenCalledWith('/garden')
  })

  it('goPreviousOnMainPath 导航到上一个主链路房间', () => {
    mockRoutePath.value = '/anchor'
    const nav = useRoomNavigation()
    nav.goPreviousOnMainPath()
    expect(mockPush).toHaveBeenCalledWith('/timeline')
  })

  it('goBack 在没有历史记录时回到根路径', () => {
    const nav = useRoomNavigation()
    nav.goBack()
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('enterRoom 对不存在的房间 ID 不调用 push', () => {
    const nav = useRoomNavigation()
    nav.enterRoom('non-existent')
    expect(mockPush).not.toHaveBeenCalled()
  })

  // ------- 浏览模式 ----
  it('browseMode 返回导航状态', () => {
    const nav = useRoomNavigation()
    expect(nav.browseMode.value.isHome).toBe(true)
    expect(nav.browseMode.value.roomCount).toBeGreaterThan(30)
  })

  it('browseMode 在非根路径时 canGoBack 为 true', () => {
    mockRoutePath.value = '/timeline'
    const nav = useRoomNavigation()
    expect(nav.browseMode.value.canGoBack).toBe(true)
  })

  it('browseMode 在根路径时 canGoBack 为 false', () => {
    const nav = useRoomNavigation()
    expect(nav.browseMode.value.canGoBack).toBe(false)
  })

  it('browseMode 在锚点时 canGoNext 和 canGoPrev 正确', () => {
    mockRoutePath.value = '/anchor'
    const nav = useRoomNavigation()
    expect(nav.browseMode.value.canGoNext).toBe(true)
    expect(nav.browseMode.value.canGoPrev).toBe(true)
  })
})