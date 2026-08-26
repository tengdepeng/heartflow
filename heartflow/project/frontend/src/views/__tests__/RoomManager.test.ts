// ============================================================
// RoomManager 视图测试 - 房间管理器
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟 storage ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// ---- 模拟 room-manager ----
const mockToggleVisibility = vi.fn()
const mockResetRoomConfig = vi.fn()
const mockRoomEntries = { value: [] as any[] }
const mockRoomsByGroup = { value: {} as Record<string, any[]> }
const mockStats = { total: 0, visible: 0, hidden: 0 }

vi.mock('../../modules/room-manager', () => ({
  useRoomManager: () => ({
    roomEntries: mockRoomEntries,
    roomsByGroup: mockRoomsByGroup,
    stats: mockStats,
    toggleVisibility: (id: string) => mockToggleVisibility(id),
    resetRoomConfig: (id: string) => mockResetRoomConfig(id),
  }),
  RoomNode: {},
  RoomConfig: {},
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: RoomManager } = await import('../RoomManager.vue')
  return mount(RoomManager, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('RoomManager 房间管理器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('房间管理器')
    expect(wrapper.text()).toContain('管理所有房间的可见性和自定义')
  })

  it('显示概览卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('总房间')
    expect(wrapper.text()).toContain('可见')
    expect(wrapper.text()).toContain('隐藏')
  })

  it('显示搜索框', async () => {
    const wrapper = await getWrapper()
    const searchInput = wrapper.find('.rm-search-input')
    expect(searchInput.exists()).toBe(true)
    expect(searchInput.attributes('placeholder')).toContain('搜索房间名称')
  })

  it('无房间时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('暂无可管理的房间')
  })

  it('有房间时显示分组标题', async () => {
    // 模拟有房间数据
    const mockEntry = {
      room: { id: 'test-room', name: '测试房间', path: 'test', icon: '🏠', group: 'gravity' },
      config: { visible: true, customName: null, customIcon: null, customColor: null },
    }
    mockRoomEntries.value = [mockEntry]
    mockRoomsByGroup.value = { gravity: [mockEntry] }
    mockStats.total = 1
    mockStats.visible = 1
    mockStats.hidden = 0

    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('引力中心')
    expect(wrapper.text()).toContain('测试房间')

    // 恢复
    mockRoomEntries.value = []
    mockRoomsByGroup.value = {}
  })

  it('显示搜索清空按钮（有搜索内容时）', async () => {
    const wrapper = await getWrapper()
    const searchInput = wrapper.find('.rm-search-input')
    await searchInput.setValue('测试')
    const clearBtn = wrapper.find('.rm-search-clear')
    expect(clearBtn.exists()).toBe(true)
  })
})