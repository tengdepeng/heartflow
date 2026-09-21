// ============================================================
// ExtraditionPanel 组件测试 · 数据引渡仪式（INCR-406）
// 受控引擎 mock（vi.hoisted 保证工厂与测试共享同一批绑定，详见 INCR-99 教训）。
// useDataExtradition 的真实返回形态：state 是 reactive 对象（直接 .phase/.progress 访问），
// availableModules/selectedModules/currentPackage/extraditionHistory 是 ref（.value 访问）。
// 测试用平凡持有对象注入引擎响应式状态，覆盖面板交互语义而不跑整套 2.7s 时序。
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ExtraditionPanel from '../ExtraditionPanel.vue'

// ---- 受控引擎 mock：state 模拟 reactive()（直接属性访问），其余持有对象 { value } 模拟 ref() ----
const h = vi.hoisted(() => {
  const state: any = {
    phase: 'idle',
    progress: 0,
    currentModule: '',
    packageId: null,
    transferCode: null,
    error: null,
  }
  const availableModules: any = { value: [] as any[] }
  const selectedModules: any = { value: new Set<string>() }
  const totalSize: any = { value: 0 }
  const encryptionKey: any = { value: '' }
  const currentPackage: any = { value: null as any }
  const extraditionHistory: any = { value: [] as any[] }
  const meditation: any = { value: '每一份数据，都是时间的沉淀。' }
  const selectedModuleDetails: any = { value: [] as any[] }

  const toggleModule = vi.fn()
  const selectAll = vi.fn()
  const refreshModules = vi.fn()
  const generateKey = vi.fn(() => {
    encryptionKey.value = 'MOCKKEY'
    return 'MOCKKEY'
  })
  const executeExtradition = vi.fn()
  const importExtradition = vi.fn()
  const reset = vi.fn()
  const clearHistory = vi.fn()

  return {
    state,
    availableModules,
    selectedModules,
    totalSize,
    encryptionKey,
    currentPackage,
    extraditionHistory,
    meditation,
    selectedModuleDetails,
    toggleModule,
    selectAll,
    refreshModules,
    generateKey,
    executeExtradition,
    importExtradition,
    reset,
    clearHistory,
  }
})

vi.mock('../../../modules/data-sovereignty/composables/useDataExtradition', () => ({
  EXTRADITION_PHASES: [
    { phase: 'idle', label: '待命', icon: '🪷', description: '待命' },
    { phase: 'preparing', label: '准备', icon: '📋', description: '准备' },
    { phase: 'packaging', label: '打包', icon: '📦', description: '打包' },
    { phase: 'transferring', label: '传输', icon: '📡', description: '传输' },
    { phase: 'verifying', label: '验证', icon: '🔍', description: '验证' },
    { phase: 'completed', label: '完成', icon: '✨', description: '完成' },
    { phase: 'failed', label: '失败', icon: '❌', description: '失败' },
  ],
  useDataExtradition: () => ({
    state: h.state,
    availableModules: h.availableModules,
    selectedModules: h.selectedModules,
    encryptionKey: h.encryptionKey,
    meditation: h.meditation,
    currentPackage: h.currentPackage,
    extraditionHistory: h.extraditionHistory,
    selectedModuleDetails: h.selectedModuleDetails,
    totalSize: h.totalSize,
    toggleModule: h.toggleModule,
    selectAll: h.selectAll,
    refreshModules: h.refreshModules,
    generateKey: h.generateKey,
    executeExtradition: h.executeExtradition,
    importExtradition: h.importExtradition,
    reset: h.reset,
    clearHistory: h.clearHistory,
  }),
}))

function makeModule(overrides: any = {}): any {
  return {
    moduleKey: 'timer',
    moduleName: '更漏·专注计时',
    itemCount: 3,
    sizeBytes: 2048,
    sensitive: false,
    ...overrides,
  }
}

function resetAll(): void {
  h.state.phase = 'idle'
  h.state.progress = 0
  h.state.currentModule = ''
  h.state.packageId = null
  h.state.transferCode = null
  h.state.error = null
  h.availableModules.value = []
  h.selectedModules.value = new Set()
  h.totalSize.value = 0
  h.encryptionKey.value = ''
  h.currentPackage.value = null
  h.extraditionHistory.value = []
  for (const fn of [
    h.toggleModule,
    h.selectAll,
    h.refreshModules,
    h.generateKey,
    h.executeExtradition,
    h.importExtradition,
    h.reset,
    h.clearHistory,
  ]) {
    fn.mockReset()
  }
}

beforeEach(() => {
  resetAll()
})

describe('ExtraditionPanel · 数据引渡仪式（INCR-406）', () => {
  it('渲染标题与六阶段指示', () => {
    const wrapper = mount(ExtraditionPanel)
    expect(wrapper.text()).toContain('数据引渡仪式')
    expect(wrapper.text()).toContain('准备')
    expect(wrapper.text()).toContain('打包')
    expect(wrapper.text()).toContain('传输')
    expect(wrapper.text()).toContain('验证')
    expect(wrapper.text()).toContain('完成')
  })

  it('无可引渡模块时显示空态引导', () => {
    const wrapper = mount(ExtraditionPanel)
    expect(wrapper.text()).toContain('暂无可引渡模块')
  })

  it('渲染模块列表：名称/计数/大小/敏感徽标', () => {
    h.availableModules.value = [
      makeModule({ moduleKey: 'emotion', moduleName: '情绪花房', itemCount: 12, sizeBytes: 4096 }),
      makeModule({ moduleKey: 'safety', moduleName: '安全守护', itemCount: 2, sizeBytes: 512, sensitive: true }),
    ]
    const wrapper = mount(ExtraditionPanel)
    expect(wrapper.text()).toContain('情绪花房')
    expect(wrapper.text()).toContain('12 项')
    expect(wrapper.text()).toContain('安全守护')
    expect(wrapper.text()).toContain('敏感')
  })

  it('选择模块后显示已选统计', async () => {
    h.availableModules.value = [makeModule({ sizeBytes: 2048 })]
    h.selectedModules.value = new Set(['timer'])
    h.totalSize.value = 2048
    const wrapper = mount(ExtraditionPanel)
    await flushPromises()
    expect(wrapper.text()).toContain('已选 1 个模块')
    expect(wrapper.text()).toContain('2.0 KB')
  })

  it('未选模块时开始引渡按钮禁用', async () => {
    h.availableModules.value = [makeModule()]
    const wrapper = mount(ExtraditionPanel)
    await flushPromises()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('开始引渡'))!
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('勾选模块后开始引渡按钮可用', async () => {
    h.availableModules.value = [makeModule()]
    h.selectedModules.value = new Set(['timer'])
    const wrapper = mount(ExtraditionPanel)
    await flushPromises()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('开始引渡'))!
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('生成密钥：点击生成填充输入框', async () => {
    const wrapper = mount(ExtraditionPanel)
    const gen = wrapper.findAll('button').find((b) => b.text().includes('生成'))!
    await gen.trigger('click')
    expect(h.generateKey).toHaveBeenCalled()
    expect(wrapper.find('.exp-key-row input').element).toHaveProperty('value', 'MOCKKEY')
  })

  it('执行引渡完成：展示传输码与引渡密码/时长', async () => {
    h.availableModules.value = [makeModule()]
    h.selectedModules.value = new Set(['timer'])
    h.currentPackage.value = {
      manifest: {
        packageId: 'ext-123',
        modules: [makeModule()],
        passcode: '123456',
        createdAt: 1,
      },
      transferCode: ['ext-123', 'a1b2c3d4', '1'].join('|'),
      expiresAt: Date.now() + 30 * 60000,
    }
    h.state.phase = 'completed'
    h.state.progress = 100
    const wrapper = mount(ExtraditionPanel)
    await flushPromises()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('开始引渡'))!
    await btn.trigger('click')
    await flushPromises()
    expect(h.executeExtradition).toHaveBeenCalled()
    expect(wrapper.text()).toContain('引渡完成 · 传输码已生成')
    expect(wrapper.text()).toContain('剩余 30 分钟有效')
  })

  it('填充导入表单后调用 importExtradition 并展示结果', async () => {
    h.importExtradition.mockResolvedValue({ success: true, importedModules: ['timer'] })
    const wrapper = mount(ExtraditionPanel)
    await wrapper.find('.exp-import-code').setValue('transfer-code')
    await wrapper.find('.exp-import-grid input[type="text"]').setValue('123456')
    const keyInput = wrapper.findAll('.exp-import-grid input[type="text"]')[1]
    await keyInput.setValue('KEY')
    await wrapper.findAll('button').find((b) => b.text().includes('恢复引渡数据'))!.trigger('click')
    await flushPromises()
    expect(h.importExtradition).toHaveBeenCalledWith('transfer-code', '123456', 'KEY')
    expect(wrapper.text()).toContain('已恢复 1 个模块')
    expect(wrapper.text()).toContain('timer')
  })

  it('导入表单缺字段时提示且不调用引擎', async () => {
    const wrapper = mount(ExtraditionPanel)
    await wrapper.findAll('button').find((b) => b.text().includes('恢复引渡数据'))!.trigger('click')
    await flushPromises()
    expect(h.importExtradition).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请填写传输码、引渡密码与解密密钥')
  })

  it('渲染引渡历史列表', () => {
    h.extraditionHistory.value = [
      {
        packageId: 'ext-old',
        createdAt: 1700000000000,
        sourceDevice: 'Windows 设备',
        modules: [{ moduleName: '更漏·专注计时' }],
      },
    ]
    const wrapper = mount(ExtraditionPanel)
    expect(wrapper.text()).toContain('引渡历史')
    expect(wrapper.text()).toContain('ext-old')
    expect(wrapper.text()).toContain('更漏·专注计时')
    expect(wrapper.text()).toContain('Windows 设备')
  })

  it('清空历史调用 clearHistory 并复位表单', async () => {
    h.extraditionHistory.value = [{ packageId: 'ext-old', createdAt: 1, sourceDevice: '', modules: [] }]
    const wrapper = mount(ExtraditionPanel)
    await flushPromises()
    const clear = wrapper.findAll('button').filter((b) => b.text().includes('清空')).pop()!
    await clear.trigger('click')
    expect(h.clearHistory).toHaveBeenCalled()
    expect(h.reset).toHaveBeenCalled()
  })

  it('引渡进行中按钮显示「仪式进行中…」', async () => {
    h.availableModules.value = [makeModule()]
    h.selectedModules.value = new Set(['timer'])
    h.state.phase = 'packaging'
    h.state.progress = 40
    h.state.currentModule = '情绪花房'
    const wrapper = mount(ExtraditionPanel)
    await flushPromises()
    expect(wrapper.text()).toContain('仪式进行中…')
    expect(wrapper.text()).toContain('正在 情绪花房')
  })

  it('失败态展示错误信息', () => {
    h.state.phase = 'failed'
    h.state.error = '请至少选择一个模块'
    const wrapper = mount(ExtraditionPanel)
    expect(wrapper.text()).toContain('请至少选择一个模块')
  })
})