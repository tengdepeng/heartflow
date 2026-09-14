// ============================================================
// LauncherPanel 外部应用启动台面板测试（INCR-107）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'

const mockEntries = ref<any[]>([])
const mockGroups = ref<Array<[string, any[]]>>([])

const mockAddEntry = vi.fn()
const mockUpdateEntry = vi.fn()
const mockRemoveEntry = vi.fn()
const mockMoveEntry = vi.fn()
const mockRenameCategory = vi.fn()
const mockLaunchEntry = vi.fn()

vi.mock('../../modules/launcher/useLauncher', () => ({
  useLauncher: () => ({
    entries: mockEntries,
    grouped: computed(() => mockGroups.value),
    addEntry: mockAddEntry,
    updateEntry: mockUpdateEntry,
    removeEntry: mockRemoveEntry,
    moveEntry: mockMoveEntry,
    renameCategory: mockRenameCategory,
    launchEntry: mockLaunchEntry,
  }),
}))

const music = {
  id: 'e1',
  name: '网易云音乐',
  icon: '🎵',
  category: '音乐',
  launch: 'C:\\apps\\cloudmusic.exe',
  useDeepLink: false,
  sort: 0,
  launchCount: 3,
  lastLaunchedAt: '2026-09-01T10:20:00.000Z',
}
const payment = {
  id: 'e2',
  name: '支付宝',
  icon: '💰',
  category: '支付',
  launch: 'weixin://',
  useDeepLink: true,
  deepLink: 'alipay://',
  sort: 0,
  launchCount: 0,
}

async function getWrapper(overrides: { groups?: Array<[string, any[]]> } = {}) {
  mockGroups.value = overrides.groups ?? [[music.category, [music]]]
  const { default: LauncherPanel } = await import('../LauncherPanel.vue')
  return mount(LauncherPanel)
}

describe('LauncherPanel 外部应用启动台', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEntries.value = []
    mockGroups.value = []
    mockLaunchEntry.mockResolvedValue({ ok: true, target: 'x' })
  })

  it('标题徽标与副题渲染', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.lcp').exists()).toBe(true)
    expect(wrapper.text()).toContain('🚀 启动台')
    expect(wrapper.text()).toContain('外部应用 · 启动 · 管理')
  })

  it('分组渲染条目：分类名 + 应用名 + 启动次数', async () => {
    const wrapper = await getWrapper()
    await nextTick()
    expect(wrapper.text()).toContain('音乐')
    expect(wrapper.text()).toContain('网易云音乐')
    expect(wrapper.text()).toContain('启动 3 次')
    expect(wrapper.findAll('.lcp-item').length).toBe(1)
  })

  it('空态提示', async () => {
    const wrapper = await getWrapper({ groups: [] })
    await nextTick()
    expect(wrapper.text()).toContain('还没有启动条目')
  })

  it('未填名称或启动路径时添加按钮禁用', async () => {
    const wrapper = await getWrapper()
    const btn = wrapper.find('.lcp-btn--primary')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('添加条目：填表单调用 addEntry 并清空表单', async () => {
    const wrapper = await getWrapper()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('网易云音乐')
    await inputs[2].setValue('音乐')
    await inputs[3].setValue('C:\\apps\\cloudmusic.exe')
    const btn = wrapper.find('.lcp-btn--primary')
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)
    await btn.trigger('click')
    await nextTick()
    expect(mockAddEntry).toHaveBeenCalledWith({
      name: '网易云音乐',
      icon: '',
      category: '音乐',
      launch: 'C:\\apps\\cloudmusic.exe',
      deepLink: undefined,
      useDeepLink: false,
    })
    const nameInputs = wrapper.findAll('input')
    expect((nameInputs[0].element as HTMLInputElement).value).toBe('')
  })

  it('编辑：预填表单，保存调用 updateEntry', async () => {
    const wrapper = await getWrapper()
    await nextTick()
    const editBtn = wrapper.findAll('.lcp-item .lcp-btn--ghost').length
      ? wrapper.findAll('.lcp-item .lcp-btn')[0]!
      : wrapper.findAll('.lcp-btn').find((b) => b.text() === '编辑')!
    await editBtn.trigger('click')
    await nextTick()
    const nameInput = wrapper.find('.lcp-input--name')
    expect((nameInput.element as HTMLInputElement).value).toBe('网易云音乐')
    await nameInput.setValue('网易云')
    await wrapper.findAll('button').find((b) => b.text() === '保存更新')!.trigger('click')
    await nextTick()
    expect(mockUpdateEntry).toHaveBeenCalledWith('e1', expect.objectContaining({ name: '网易云' }))
  })

  it('删除条目调用 removeEntry', async () => {
    const wrapper = await getWrapper()
    await nextTick()
    const delBtn = wrapper.findAll('button').find((b) => b.text() === '删除')!
    await delBtn.trigger('click')
    await nextTick()
    expect(mockRemoveEntry).toHaveBeenCalledWith('e1')
  })

  it('启动条目调用 launchEntry 并展示成功信息', async () => {
    const wrapper = await getWrapper()
    await nextTick()
    await wrapper.findAll('button').find((b) => b.text() === '启动')!.trigger('click')
    await nextTick()
    expect(mockLaunchEntry).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }))
    expect(wrapper.text()).toContain('已启动')
  })

  it('启动失败展示错误信息', async () => {
    mockLaunchEntry.mockResolvedValue({ ok: false, target: 'bad://' })
    const wrapper = await getWrapper()
    await nextTick()
    await wrapper.findAll('button').find((b) => b.text() === '启动')!.trigger('click')
    await nextTick()
    expect(wrapper.find('.lcp-msg.err').exists()).toBe(true)
    expect(wrapper.text()).toContain('无法打开')
  })

  it('上移首项禁用、下移调用 moveEntry', async () => {
    const wrapper = await getWrapper({
      groups: [['音乐', [music, { ...payment, id: 'e3', name: 'QQ音乐', category: '音乐' }]]],
    })
    await nextTick()
    const upBtn = wrapper.findAll('button').find((b) => b.text() === '↑')!
    expect((upBtn.element as HTMLButtonElement).disabled).toBe(true)
    const downBtn = wrapper.findAll('button').find((b) => b.text() === '↓')!
    await downBtn.trigger('click')
    await nextTick()
    expect(mockMoveEntry).toHaveBeenCalledWith('e3', 'e1')
  })

  it('重命名分类调用 renameCategory', async () => {
    const wrapper = await getWrapper()
    await nextTick()
    const renameBtn = wrapper.findAll('button').find((b) => b.text() === '重命名')!
    await renameBtn.trigger('click')
    await nextTick()
    const renameInput = wrapper.find('.lcp-input--rename')
    await renameInput.setValue('音频')
    await wrapper.findAll('button').find((b) => b.text() === '确定')!.trigger('click')
    await nextTick()
    expect(mockRenameCategory).toHaveBeenCalledWith('音乐', '音频')
  })
})