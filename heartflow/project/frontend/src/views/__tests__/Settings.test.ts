// ============================================================
// Settings 视图测试 - 殿堂设置
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { useBackgroundVideoSync } from '../../modules/background'

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

// ---- 模拟 config store (使用 ref 包装以匹配 bridge 的 storeToRefs 行为) ----
const mockConfig = ref({
  advisorEnabled: true,
  transitionDuration: 300,
  background: { type: 'default', presetScene: 'none', dataUrl: null, mimeType: null, fileName: null, updatedAt: null },
  display: {
    uploadImageMaxBytes: 2 * 1024 * 1024,
    uploadVideoMaxBytes: 4 * 1024 * 1024,
  },
  gestures: {
    enabled: true,
    bindings: {
      'tap': 'toggleFocusTimer',
      'long-press': 'doNothing',
      'circle-cw': 'enterSafeIsland',
      'circle-ccw': 'exitSafeIsland',
      'cross': 'finishFocusSession',
      'wave': 'doNothing',
      'horizontal-swipe-left': 'doNothing',
      'horizontal-swipe-right': 'doNothing',
    },
  },
})
const mockUpdateAdvisor = vi.fn()
const mockUpdateBackgroundMedia = vi.fn()
const mockUpdateGestureBinding = vi.fn()

vi.mock('../../stores/config', () => ({
  useConfigStore: () => ({
    config: mockConfig,
    updateAdvisorEnabled: (v: boolean) => mockUpdateAdvisor(v),
    setPresetScene: vi.fn(),
    resetBackgroundMedia: vi.fn(),
    updateBackgroundMedia: (...args: any[]) => (mockUpdateBackgroundMedia as any)(...args),
    updateTransitionDuration: vi.fn(),
    updateGestureBinding: (...args: any[]) => (mockUpdateGestureBinding as any)(...args),
    $reset: () => {},
  }),
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

let activeWrapper: any = null

async function getWrapper() {
  if (activeWrapper) {
    activeWrapper.unmount()
    activeWrapper = null
  }
  const { default: Settings } = await import('../Settings.vue')
  const wrapper = mount(Settings, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
  activeWrapper = wrapper
  return wrapper
}

describe('Settings 殿堂设置', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
    useBackgroundVideoSync().setPreviewFollows(false)
  })

  afterEach(() => {
    if (activeWrapper) {
      activeWrapper.unmount()
      activeWrapper = null
    }
    useBackgroundVideoSync().setPreviewFollows(false)
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('殿堂设置')
    expect(wrapper.text()).toContain('自定义你的心流工坊环境与交互体验')
  })

  it('显示背景介质区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('背景介质')
    expect(wrapper.text()).toContain('导入图片')
    expect(wrapper.text()).toContain('导入视频')
    expect(wrapper.text()).toContain('回到默认')
  })

  it('显示预设场景', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('预设场景')
    const presetBtns = wrapper.findAll('.preset-btn')
    expect(presetBtns.length).toBeGreaterThan(0)
  })

  it('显示界面动画区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('界面动画')
    expect(wrapper.text()).toContain('切换动画时长')
  })

  it('显示默认背景标识', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('默认氛围背景')
  })

  // ---- 视频原声开关：静音/原声翻转（回归此前反转逻辑的 bug）----
  async function mountWithVideo(muted: boolean) {
    mockConfig.value.background = {
      type: 'video',
      presetScene: 'none',
      dataUrl: 'data:video/mp4;base64,AAAA',
      mimeType: 'video/mp4',
      fileName: 'bg.mp4',
      updatedAt: '2026-01-01T00:00:00.000Z',
      muted,
    } as any
    const wrapper = await getWrapper()
    return wrapper
  }

  it('默认静音的视频背景：点击开关应开启原声（muted=false）', async () => {
    const wrapper = await mountWithVideo(true)
    const row = wrapper.findAll('.toggle-row').find(r => r.text().includes('视频原声'))
    expect(row).toBeTruthy()
    await row!.trigger('click')
    expect(mockUpdateBackgroundMedia).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'video', muted: false }),
    )
  })

  it('已开启原声的视频背景：点击开关应回到静音（muted=true）', async () => {
    const wrapper = await mountWithVideo(false)
    const row = wrapper.findAll('.toggle-row').find(r => r.text().includes('视频原声'))
    expect(row).toBeTruthy()
    await row!.trigger('click')
    expect(mockUpdateBackgroundMedia).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'video', muted: true }),
    )
  })

  it('殿堂设置打开且开启原声时，预览视频出声（全局让位）', async () => {
    // 进入殿堂设置后 previewOwnsAudio 为真；配置开启原声（muted:false）时，
    // 预览缩略图应接管音频（不再静音），由全局背景让出声音，避免两路同源回声。
    const wrapper = await mountWithVideo(false)
    const previewVideo = wrapper.find('video.bg-preview__asset')
    expect(previewVideo.exists()).toBe(true)
    expect((previewVideo.element as HTMLVideoElement).muted).toBe(false)
  })

  it('殿堂设置打开但配置为静音时，预览视频仍静音', async () => {
    const wrapper = await mountWithVideo(true)
    const previewVideo = wrapper.find('video.bg-preview__asset')
    expect(previewVideo.exists()).toBe(true)
    expect((previewVideo.element as HTMLVideoElement).muted).toBe(true)
  })

  // ---- 手势映射（由首页迁入殿堂设置）----
  it('渲染手势映射分区与编辑器卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('手势映射')
    expect(wrapper.find('.gesture-config-card').exists()).toBe(true)
    // 默认展示前 4 个手势行
    expect(wrapper.findAll('.gesture-config-row').length).toBeGreaterThan(0)
  })

  it('修改手势下拉应调用 updateGestureBinding', async () => {
    const wrapper = await getWrapper()
    const select = wrapper.find('.gesture-config-row select')
    expect(select.exists()).toBe(true)
    await select.setValue('finishFocusSession')
    expect(mockUpdateGestureBinding).toHaveBeenCalled()
  })

  // ---- 上下边栏不透明度（与侧边栏同级的超级自定义）----
  it('渲染上下边栏分区与透明度滑块', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('上下边栏')
    expect(wrapper.text()).toContain('上下边栏不透明度')
    const group = wrapper.findAll('.slider-group').find(g => g.text().includes('上下边栏不透明度'))
    expect(group).toBeTruthy()
    const slider = group!.find('input[type="range"]')
    expect(slider.exists()).toBe(true)
  })

  it('拖动上下边栏不透明度滑块写入 storage（95→50）', async () => {
    const wrapper = await getWrapper()
    const group = wrapper.findAll('.slider-group').find(g => g.text().includes('上下边栏不透明度'))
    const slider = group!.find('input[type="range"]')
    await slider.setValue('50')
    expect(mockSetKV).toHaveBeenCalledWith('ui:edge-bar-alpha', 50)
  })

  // ---- 背景视频播放速度 + 预览全局同步 ----
  it('视频背景显示播放速度滑块与实时同步开关', async () => {
    const wrapper = await mountWithVideo(true)
    expect(wrapper.text()).toContain('视频播放速度')
    expect(wrapper.text()).toContain('预览与全局实时同步')
    const group = wrapper.findAll('.slider-group').find(g => g.text().includes('视频播放速度'))
    expect(group).toBeTruthy()
    const slider = group!.find('input[type="range"]')
    expect(slider.exists()).toBe(true)
    expect((slider.element as HTMLInputElement).value).toBe('1')
  })

  it('点击实时同步开关切换预览跟随全局状态', async () => {
    const wrapper = await mountWithVideo(true)
    const row = wrapper.findAll('.toggle-row').find(r => r.text().includes('预览与全局实时同步'))
    expect(row).toBeTruthy()
    expect(row!.find('.switch').classes()).not.toContain('on') // 默认关闭
    await row!.trigger('click')
    expect(row!.find('.switch').classes()).toContain('on')
  })

  // ---- 子分组折叠（可收缩展开）----
  it('折叠的分组点击标题可展开/收起', async () => {
    const wrapper = await getWrapper()
    // 界面动画默认折叠
    const animGroup = wrapper.findAll('.sub-group').find(g => g.text().includes('界面动画'))
    expect(animGroup).toBeTruthy()
    expect(animGroup!.classes()).toContain('is-collapsed')
    await animGroup!.find('.sub-group__head').trigger('click')
    const afterOpen = wrapper.findAll('.sub-group').find(g => g.text().includes('界面动画'))!
    expect(afterOpen.classes()).not.toContain('is-collapsed')
    await afterOpen.find('.sub-group__head').trigger('click')
    const afterClose = wrapper.findAll('.sub-group').find(g => g.text().includes('界面动画'))!
    expect(afterClose.classes()).toContain('is-collapsed')
  })

  it('上下边栏分区包含透明度实时预览', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.edge-bar-preview').exists()).toBe(true)
    expect(wrapper.find('.edge-bar-preview__bar--top').exists()).toBe(true)
    expect(wrapper.find('.edge-bar-preview__bar--bottom').exists()).toBe(true)
  })

  // ---- 回归：视频播放速度此前仅作用于全局视频，预览 <video> 无绑定 → 调速「控不住」 ----
  it('视频播放速度滑块实时应用到预览视频（修复调速无效）', async () => {
    const wrapper = await mountWithVideo(true)
    await nextTick()
    const video = wrapper.find('video.bg-preview__asset').element as HTMLVideoElement
    // 入口 onMounted 应已写入默认速率 1×
    expect(video.playbackRate).toBe(1)
    const group = wrapper.findAll('.slider-group').find(g => g.text().includes('视频播放速度'))!
    const slider = group.find('input[type="range"]')
    // 拖动到 2×
    await slider.setValue('2')
    await nextTick()
    expect(video.playbackRate).toBe(2)
    // 拖回 0.5×
    await slider.setValue('0.5')
    await nextTick()
    expect(video.playbackRate).toBe(0.5)
  })

  // ---- 星图主题换肤器（超级自定义 · 宪法第2条）：用户自选背景星图 × 搜索栏造型，本地保存 ----
  it('渲染星图主题分区标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('星图主题')
    expect(wrapper.text()).toContain('自定义天星盘的背景配色与搜索栏造型')
  })

  it('展开星图主题后渲染 6 套背景方案与 5 种搜索栏造型', async () => {
    const wrapper = await getWrapper()
    const group = wrapper.findAll('.sub-group').find(g => g.text().includes('星图主题'))!
    expect(group.classes()).toContain('is-collapsed') // 默认折叠
    await group.find('.sub-group__head').trigger('click')
    await nextTick()
    const open = wrapper.findAll('.sub-group').find(g => g.text().includes('星图主题'))!
    expect(open.classes()).not.toContain('is-collapsed')
    // 直接基于 DOM 元素计数，避免 test-utils 在 find(fn) 结果上 findAll 作用域异常（会回退为全页计数）
    expect(open.element.querySelectorAll('.theme-chip').length).toBe(6)
    expect(open.element.querySelectorAll('.seg-btn').length).toBe(5)
  })

  it('点击背景方案卡片写入本地存储 astrolabe:theme（scheme）', async () => {
    const wrapper = await getWrapper()
    const group = wrapper.findAll('.sub-group').find(g => g.text().includes('星图主题'))!
    await group.find('.sub-group__head').trigger('click')
    await nextTick()
    const open = wrapper.findAll('.sub-group').find(g => g.text().includes('星图主题'))!
    const aurora = open.findAll('.theme-chip').find(c => c.text().includes('极光深空'))!
    await aurora.trigger('click')
    await nextTick()
    expect(mockSetKV).toHaveBeenCalledWith('astrolabe:theme', expect.objectContaining({ scheme: 'aurora' }))
  })

  it('点击搜索栏造型写入本地存储 astrolabe:theme（search）', async () => {
    const wrapper = await getWrapper()
    const group = wrapper.findAll('.sub-group').find(g => g.text().includes('星图主题'))!
    await group.find('.sub-group__head').trigger('click')
    await nextTick()
    const open = wrapper.findAll('.sub-group').find(g => g.text().includes('星图主题'))!
    const neon = open.findAll('.seg-btn').find(b => b.text().includes('霓虹'))!
    await neon.trigger('click')
    await nextTick()
    expect(mockSetKV).toHaveBeenCalledWith('astrolabe:theme', expect.objectContaining({ search: 'neon' }))
  })
})