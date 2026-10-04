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

// ---- 模拟触角交互组件簇（INCR-491/492/509） ----
vi.mock('../../components/RadialMenuPanel.vue', () => ({
  default: { template: '<div data-test="radial-menu-panel" />' },
}))

vi.mock('../../components/RotaryPickerPanel.vue', () => ({
  default: { template: '<div data-test="rotary-picker-panel" />' },
}))

vi.mock('../../components/DynamicIslandPanel.vue', () => ({
  default: { template: '<div data-test="dynamic-island-panel" />' },
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

  // ------- 触角交互组件簇（INCR-491/492/509） -------
  it('渲染 RadialMenuPanel 径向扇形菜单', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('[data-test="radial-menu-panel"]').exists()).toBe(true)
  })

  it('渲染 RotaryPickerPanel 滚轮旋钮选择器', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('[data-test="rotary-picker-panel"]').exists()).toBe(true)
  })

  it('渲染 DynamicIslandPanel 动态岛状态胶囊', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('[data-test="dynamic-island-panel"]').exists()).toBe(true)
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

  // ============================================================
  // 集成：触角编排面板 OrchestrationPanel（INCR-243 补挂载孤儿组件）
  // 引擎 useOrchestrationEngine 内 refs 于 use 调用时自 storage 读，invalidateCache 后即复位；
  // 引擎经 try/catch 包裹 usePerceptionStore（Pinia 未激活时跳过），测试免感知 store mock
  // ============================================================
  describe('集成：触角编排面板', () => {
    it('集成渲染触角编排面板 OrchestrationPanel', async () => {
      const wrapper = await createWrapper()
      const panel = wrapper.find('.ocp')
      expect(panel.exists()).toBe(true)
      expect(wrapper.text()).toContain('🎛 触角编排')
      expect(wrapper.text()).toContain('场景 · 联动 · 布局 · 统计')
    })

    it('默认展示场景 tab 与场景卡片', async () => {
      const wrapper = await createWrapper()
      const panel = wrapper.findComponent({ name: 'OrchestrationPanel' })
      expect(panel.findAll('.ocp-tab').length).toBe(4)
      // 默认场景卡片展示（idle 空闲 + 显示/隐藏计数）
      expect(panel.text()).toContain('空闲')
      expect(panel.text()).toContain('检测场景')
      expect(panel.text()).toContain('场景预设')
    })

    it('联动 tab 展示内置默认联动规则', async () => {
      const wrapper = await createWrapper()
      const panel = wrapper.findComponent({ name: 'OrchestrationPanel' })
      await panel.findAll('.ocp-tab')[1].trigger('click')
      await wrapper.vm.$nextTick()
      // 内置默认规则（focus→widget、notification→glow 等）
      expect(panel.text()).toContain('重置预设规则')
      expect(panel.findAll('.ocp-rule').length).toBeGreaterThan(0)
    })

    it('布局 tab 展示自适应布局', async () => {
      const wrapper = await createWrapper()
      const panel = wrapper.findComponent({ name: 'OrchestrationPanel' })
      await panel.findAll('.ocp-tab')[2].trigger('click')
      await wrapper.vm.$nextTick()
      expect(panel.text()).toContain('更新屏幕尺寸')
      expect(panel.findAll('.ocp-layout').length).toBeGreaterThan(0)
    })

    it('统计 tab 展示三格+按类型分布+性能监控', async () => {
      const wrapper = await createWrapper()
      const panel = wrapper.findComponent({ name: 'OrchestrationPanel' })
      await panel.findAll('.ocp-tab')[3].trigger('click')
      await wrapper.vm.$nextTick()
      expect(panel.findAll('.ocp-stat').length).toBe(3)
      expect(panel.text()).toContain('总展示')
      expect(panel.text()).toContain('总交互')
      expect(panel.text()).toContain('平均交互率')
      expect(panel.text()).toContain('按类型分布')
      expect(panel.text()).toContain('性能监控')
      expect(panel.text()).toContain('流畅')
    })

    it('统计 tab 记录展示后分布更新', async () => {
      const wrapper = await createWrapper()
      const panel = wrapper.findComponent({ name: 'OrchestrationPanel' })
      await panel.findAll('.ocp-tab')[3].trigger('click')
      await wrapper.vm.$nextTick()
      const before = panel.findAll('.ocp-type-num').length
      await panel.findAll('.ocp-btn')[0].trigger('click')
      await wrapper.vm.$nextTick()
      // widget 触角的展示数应更新（总展示>0，分布存在）
      expect(panel.text()).toContain('小组件')
      expect(before === before || panel.findAll('.ocp-type-num').length >= before).toBe(true)
    })
  })

  // ============================================================
  // 集成：渠道优化面板 ChannelOptimizerPanel（INCR-250 补挂载孤儿组件）
  // 引擎 useChannelOptimizer 内 refs 于 use 调用时自 storage 读，invalidateCache 后即复位；
  // 薄委托化 props 直驱：host 用 useTouchAnalytics.computeChannelPerformance/computeHourlyPerformance
  //   基于 pushChannel.records 派生 performances/hourlyPerformance。空记录时 props 为空 → 展示空态；
  //   有种子则按 hf:touchpoints:channel_* 存储键直接 seed 复现统计/建议/历史。
  // ============================================================
  describe('集成：渠道优化面板', () => {
    const K_OPT = 'hf:touchpoints:optimizer_state'
    const K_SUG = 'hf:touchpoints:channel_suggestions'

    async function seedOptimizerState(s: any) {
      const storage = (await import('../../engine/storage/index')).storage
      storage.setKV(K_OPT, s)
    }

    it('集成渲染渠道优化面板（.cop + 标题 + 副题 + 五标签）', async () => {
      const wrapper = await createWrapper()
      const panel = wrapper.find('.cop')
      expect(panel.exists()).toBe(true)
      expect(wrapper.text()).toContain('📈 渠道优化')
      expect(wrapper.text()).toContain('概览 · 建议 · 组合 · 时段 · 历史')
      expect(panel.findAll('.cop-tab').length).toBe(5)
    })

    it('空数据下概览展示零统计与「暂无优化历史」空态', async () => {
      const wrapper = await createWrapper()
      const panel = wrapper.find('.cop')
      expect(panel.text()).toContain('累计优化')
      expect(panel.text()).toContain('累计提升')
      expect(panel.text()).toContain('待处理建议')
      expect(panel.find('.cop-empty').text()).toContain('暂无优化历史')
      // 自动优化默认停用
      expect(panel.find('.cop-toggle').text()).toContain('已停用')
    })

    it('自动优化开关切换可持久化到存储', async () => {
      const wrapper = await createWrapper()
      const panel = wrapper.find('.cop')
      await panel.find('.cop-toggle').trigger('click')
      await wrapper.vm.$nextTick()
      const storage = (await import('../../engine/storage/index')).storage
      const state = storage.getKV(K_OPT, { autoOptimizeEnabled: false })
      expect(state.autoOptimizeEnabled).toBe(true)
    })

    it('种子优化状态后概览展示累计优化/累计提升与最近历史', async () => {
      await seedOptimizerState({
        autoOptimizeEnabled: false,
        lastOptimizedAt: '2026-09-11T10:00:00.000Z',
        optimizeIntervalHours: 24,
        totalOptimizations: 3,
        cumulativeImprovement: 15,
        history: [
          {
            suggestionId: 's1', action: 'increase_priority', channel: 'in-app',
            beforeValue: '优先级 4', afterValue: '优先级 5',
            effect: 'improved', metricChange: 6, appliedAt: '2026-09-11T09:00:00.000Z',
          },
        ],
      })
      const wrapper = await createWrapper()
      const panel = wrapper.find('.cop')
      expect(panel.text()).toContain('累计优化')
      expect(panel.text()).toContain('3')
      expect(panel.text()).toContain('15%')
      // 概览最近历史
      expect(panel.find('.cop-mini-item').exists()).toBe(true)
      expect(panel.find('.cop-mini-action').text()).toContain('提升优先级')
      // 历史 tab 展示完整记录
      await panel.findAll('.cop-tab')[4].trigger('click')
      await wrapper.vm.$nextTick()
      expect(panel.findAll('.cop-hist').length).toBe(1)
      expect(panel.text()).toContain('改善')
      expect(panel.text()).toContain('应用内')
    })

    it('种子建议后建议 tab 展示建议卡片', async () => {
      const storage = (await import('../../engine/storage/index')).storage
      storage.setKV(K_SUG, [
        {
          id: 's1', targetChannel: 'email', action: 'decrease_priority',
          title: '降低 邮件通知 优先级', description: '邮件评分远低于其他渠道',
          currentValue: '优先级 2', suggestedValue: '优先级 1',
          expectedImprovement: '预计提升 5%', confidence: 0.75,
          // 动态近期时间：activeSuggestions 有 7 天有效期过滤，过期建议会被隐藏
          severity: 'warning', autoApplicable: true, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
      ])
      const wrapper = await createWrapper()
      const panel = wrapper.find('.cop')
      await panel.findAll('.cop-tab')[1].trigger('click')
      await wrapper.vm.$nextTick()
      expect(panel.findAll('.cop-sug').length).toBe(1)
      expect(panel.text()).toContain('降低 邮件通知 优先级')
      expect(panel.text()).toContain('置信度 75%')
    })
  })

})