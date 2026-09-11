// ============================================================
// Touchpoints 殿堂触角视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'

// ---- 模拟 useDesktopTouchpoints ----
const mockTouchpoints = {
  isTauri: false,
  showNotification: vi.fn(),
  pinToDesktop: vi.fn(),
  getLockScreenGlow: vi.fn(() => false),
  setLockScreenGlow: vi.fn(),
  getGreetingFloating: vi.fn(() => true),
  setGreetingFloating: vi.fn(),
}

vi.mock('../../composables/useDesktopTouchpoints', () => ({
  useDesktopTouchpoints: () => mockTouchpoints,
}))

// ---- 模拟子面板组件（INCR-177） ----
vi.mock('../../components/GreetingWidgetPanel.vue', () => ({
  default: { template: '<div data-test="greeting-widget-panel" />' },
}))

vi.mock('../../components/ClipboardPanel.vue', () => ({
  default: { template: '<div data-test="clipboard-panel" />' },
}))

// ---- 辅助函数 ----
async function createWrapper() {
  const { default: Touchpoints } = await import('../Touchpoints.vue')
  return mount(Touchpoints, { attachTo: document.body })
}

// ---- 测试 ----
describe('Touchpoints 殿堂触角视图', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
  })

  // ------- 渲染标题 -------
  it('渲染页面标题和副标题', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('殿堂触角')
    expect(wrapper.text()).toContain('殿堂触角 · 设备交互与通知')
  })

  // ------- 通知设置 -------
  it('渲染通知设置区域', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('通知设置')
    expect(wrapper.text()).toContain('启用原生通知')
    expect(wrapper.text()).toContain('专注完成时通知')
    expect(wrapper.text()).toContain('幕僚问候时通知')
  })

  it('通知测试按钮存在且可点击', async () => {
    const wrapper = await createWrapper()
    const testBtn = wrapper.find('.test-btn')
    expect(testBtn.exists()).toBe(true)
    await testBtn.trigger('click')
    // 按钮点击不抛出错误即可，底层 push 由 push-channel 模块处理
  })

  it('通知开关可切换状态', async () => {
    const wrapper = await createWrapper()
    // 找到第一个 checkbox（启用原生通知）
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThanOrEqual(3)
    // 默认是 checked（notificationEnabled = true）
    const firstCheckbox = checkboxes[0] as any
    expect(firstCheckbox.element.checked).toBe(true)
    // 点击切换
    await firstCheckbox.setValue(false)
    expect(firstCheckbox.element.checked).toBe(false)
  })

  // ------- 锁屏光痕 -------
  it('渲染锁屏光痕区域', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('锁屏光痕')
    expect(wrapper.text()).toContain('启用锁屏光痕')
    expect(wrapper.text()).toContain('光痕颜色')
    expect(wrapper.text()).toContain('预览')
  })

  it('锁屏光痕开关变化时调用 setLockScreenGlow', async () => {
    const wrapper = await createWrapper()
    // 找到锁屏光痕的 checkbox（第4个 checkbox，在"启用锁屏光痕"所在卡片中）
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    // 前3个是通知设置，第4个是锁屏光痕
    const glowCheckbox = checkboxes[3]
    expect(glowCheckbox.exists()).toBe(true)
    // 从 false 切换到 true
    await glowCheckbox.setValue(true)
    expect(mockTouchpoints.setLockScreenGlow).toHaveBeenCalledWith(true)
  })

  it('锁屏光痕启用时显示光痕覆盖层', async () => {
    // 模拟 getLockScreenGlow 返回 true
    mockTouchpoints.getLockScreenGlow.mockReturnValueOnce(true)
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 光痕启用时，.tp-glow-preview 应该存在
    expect(wrapper.find('.tp-glow-preview').exists()).toBe(true)
  })

  it('锁屏光痕禁用时不显示光痕覆盖层', async () => {
    mockTouchpoints.getLockScreenGlow.mockReturnValueOnce(false)
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tp-glow-preview').exists()).toBe(false)
  })

  it('渲染颜色选择器', async () => {
    const wrapper = await createWrapper()
    const swatches = wrapper.findAll('.tp-color-swatch')
    // 8种颜色
    expect(swatches.length).toBe(8)
    // 默认紫色激活
    const activeSwatch = wrapper.find('.tp-color-swatch.active')
    expect(activeSwatch.exists()).toBe(true)
  })

  it('点击颜色选择器切换颜色', async () => {
    const wrapper = await createWrapper()
    const swatches = wrapper.findAll('.tp-color-swatch')
    // 默认第一个紫色 active，点击第二个青色
    await swatches[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(swatches[1].classes()).toContain('active')
    expect(swatches[0].classes()).not.toContain('active')
  })

  // ------- 幕僚问候浮窗 -------
  it('渲染幕僚问候浮窗区域', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('幕僚问候浮窗')
    expect(wrapper.text()).toContain('启用浮窗')
    expect(wrapper.text()).toContain('浮窗大小')
    expect(wrapper.text()).toContain('浮窗位置')
  })

  it('浮窗大小分段控件可点击切换', async () => {
    const wrapper = await createWrapper()
    // 全局 tp-card 顺序：索引0-2=通知设置, 3=锁屏光痕, 4=启用浮窗, 5=浮窗大小, 6=浮窗位置
    // 浮窗大小在第6个 tp-card（索引5）
    const sizeCard = wrapper.findAll('.tp-card')[5]
    expect(sizeCard).toBeTruthy()
    const sizeBtns = sizeCard!.findAll('.tp-seg-option')
    expect(sizeBtns.length).toBe(3)
    // 默认"中"激活
    expect(sizeBtns[1].classes()).toContain('active')
    await sizeBtns[0].trigger('click')
    expect(sizeBtns[0].classes()).toContain('active')
    expect(sizeBtns[1].classes()).not.toContain('active')
  })

  it('浮窗位置分段控件可点击切换', async () => {
    const wrapper = await createWrapper()
    // 浮窗位置在第7个 tp-card（索引6）
    const posCard = wrapper.findAll('.tp-card')[6]
    expect(posCard).toBeTruthy()
    const positionBtns = posCard!.findAll('.tp-seg-option')
    expect(positionBtns.length).toBe(2)
    // 默认"右下"激活
    expect(positionBtns[1].classes()).toContain('active')
    await positionBtns[0].trigger('click')
    expect(positionBtns[0].classes()).toContain('active')
    expect(positionBtns[1].classes()).not.toContain('active')
  })

  it('浮窗启用开关变化时调用 setGreetingFloating', async () => {
    const wrapper = await createWrapper()
    // 幕僚问候浮窗的 checkbox 在通知设置区域之后
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    // 找到浮窗的 checkbox（getGreetingFloating 默认返回 true，所以初始为 checked）
    // 第一个 checkbox 在通知区，第4个在锁屏区，第5个在浮窗区
    const floatingCheckbox = checkboxes[4]
    expect(floatingCheckbox.exists()).toBe(true)
    await floatingCheckbox.setValue(false)
    expect(mockTouchpoints.setGreetingFloating).toHaveBeenCalledWith(false)
  })

  // ------- 触达策略（P17-3） -------
  it('渲染触达策略区域', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('触达策略')
    expect(wrapper.text()).toContain('智能调度通知触达时机')
  })

  it('渲染推送渠道区域', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('推送渠道')
  })

  it('渲染触达分析区域', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('触达分析')
  })

  // ------- 问候浮窗增强（INCR-177） -------
  it('渲染 GreetingWidgetPanel 问候浮窗增强', async () => {
    const wrapper = await createWrapper()
    const panel = wrapper.find('[data-test="greeting-widget-panel"]')
    expect(panel.exists()).toBe(true)
  })

  // ------- 剪贴板管理（INCR-177） -------
  it('渲染 ClipboardPanel 剪贴板管理', async () => {
    const wrapper = await createWrapper()
    const panel = wrapper.find('[data-test="clipboard-panel"]')
    expect(panel.exists()).toBe(true)
  })

  // ============================================================
  // 集成：通知中心面板 NotificationCenterPanel（INCR-241 补挂载孤儿组件）
  // 引擎 useNotificationEngine 内 refs 于 use 调用时自 storage 读，invalidateCache 后即复位
  // ============================================================
  describe('集成：通知中心面板', () => {
    const K_NOTIF = 'hf:touchpoints:notifications'
    const K_PREFS = 'hf:touchpoints:notification_prefs'

    async function seedNotification(n: any[]) {
      const storage = (await import('../../engine/storage/index')).storage
      storage.setKV(K_NOTIF, JSON.stringify(n))
    }

    it('集成渲染通知中心面板 NotificationCenterPanel', async () => {
      const wrapper = await createWrapper()
      const panel = wrapper.findComponent({ name: 'NotificationCenterPanel' })
      expect(panel.exists()).toBe(true)
    })

    it('空存储渲染收件箱空态与四标签', async () => {
      const wrapper = await createWrapper()
      const panel = wrapper.findComponent({ name: 'NotificationCenterPanel' })
      expect(panel.text()).toContain('通知中心')
      expect(panel.text()).toContain('收件箱 · 规则 · 偏好 · 统计')
      expect(panel.findAll('.ncp-tab').length).toBe(4)
      expect(panel.text()).toContain('收件箱空空如也')
      // 规则 tab 展示 5 条默认预设规则
      await panel.findAll('.ncp-tab')[1].trigger('click')
      await wrapper.vm.$nextTick()
      expect(panel.text()).toContain('每日问候')
      expect(panel.text()).toContain('专注连击')
      expect(panel.text()).toContain('周回顾提醒')
      expect(panel.text()).toContain('结晶里程碑')
      expect(panel.text()).toContain('洞察摘要')
    })

    it('种通知种子后收件箱展示未读项并可标已读', async () => {
      await seedNotification([
        {
          id: 'n1', type: 'reminder', priority: 'urgent',
          title: '专注计时结束', message: '25 分钟专注已完成',
          icon: '⏰', channel: 'log', read: false, dismissed: false,
          createdAt: '2026-09-11T08:00:00.000Z',
        },
        {
          id: 'n2', type: 'achievement', priority: 'normal',
          title: '达成新成就', message: '连续专注 7 天',
          icon: '🏆', channel: 'log', read: false, dismissed: false,
          createdAt: '2026-09-11T09:00:00.000Z',
        },
      ])
      const wrapper = await createWrapper()
      const panel = wrapper.findComponent({ name: 'NotificationCenterPanel' })
      expect(panel.text()).toContain('专注计时结束')
      expect(panel.text()).toContain('达成新成就')
      expect(panel.findAll('.ncp-item').length).toBe(2)
      // 标为已读后 hf 存储持久化：重挂载后不再显示
      const readBtn = panel.findAll('.ncp-btn--small').find(b => b.text() === '标为已读')!
      await readBtn.trigger('click')
      await wrapper.vm.$nextTick()
      expect(panel.findAll('.ncp-item').length).toBe(1)
    })

    it('偏好 tab 切换启用持久化 enable', async () => {
      const wrapper = await createWrapper()
      const panel = wrapper.findComponent({ name: 'NotificationCenterPanel' })
      await panel.findAll('.ncp-tab')[2].trigger('click')
      await wrapper.vm.$nextTick()
      expect(panel.text()).toContain('免打扰开始')
      const checkbox = panel.find('.ncp-pref-row input[type="checkbox"]')
      await checkbox.setValue(true)
      await wrapper.vm.$nextTick()
      const storage = (await import('../../engine/storage/index')).storage
      const prefs = JSON.parse(storage.getKV(K_PREFS, '') || '{}')
      expect(prefs.enabled).toBe(true)
    })

    it('统计 tab 展示已发送/已读/已读率', async () => {
      await seedNotification([
        {
          id: 'n1', type: 'reminder', priority: 'normal',
          title: '周回顾', message: '回顾本周', icon: '📊', channel: 'widget',
          read: true, dismissed: false, createdAt: '2026-09-11T08:00:00.000Z',
        },
        {
          id: 'n2', type: 'insight', priority: 'low',
          title: '今日洞察', message: '发现', icon: '💡', channel: 'log',
          read: false, dismissed: false, createdAt: '2026-09-11T09:00:00.000Z',
        },
      ])
      const wrapper = await createWrapper()
      const panel = wrapper.findComponent({ name: 'NotificationCenterPanel' })
      await panel.findAll('.ncp-tab')[3].trigger('click')
      await wrapper.vm.$nextTick()
      expect(panel.text()).toContain('已发送')
      expect(panel.text()).toContain('已读')
      expect(panel.text()).toContain('已读率')
      expect(panel.text()).toContain('按类型分布')
      expect(panel.text()).toContain('提醒')
      expect(panel.text()).toContain('洞察')
    })
  })

})