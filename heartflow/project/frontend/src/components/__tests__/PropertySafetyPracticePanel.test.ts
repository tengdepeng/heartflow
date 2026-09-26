// ============================================================
// 财产安全实践面板测试（safety · usePropertySafety 真实引擎全链路）
// 诈骗检测 / 报平安签到 / 假来电脱身
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const CHECKIN_KEY = 'hf:safety_checkin'
const CONFIG_KEY = 'hf:safety_config'

const DEFAULT_PROPERTY_SECURITY = {
  fraudCheckEnabled: true,
  sosEnabled: false,
  fakeCallEnabled: false,
  safetyCheckinEnabled: true,
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../safety/PropertySafetyPracticePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function buttonByText(wrapper: any, text: string) {
  const el = wrapper.findAll('button').find((b: any) => b.text().trim() === text)
  expect(el, `button[${text}] 应存在`).toBeTruthy()
  return el!
}

describe('PropertySafetyPracticePanel 财产安全实践', () => {
  it('渲染标题与三个能力区块（默认开启反诈/报平安，假来电默认关闭）', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('财产安全实践')
    expect(wrapper.text()).toContain('反诈核验')
    expect(wrapper.text()).toContain('报平安签到')
    expect(wrapper.text()).toContain('假来电脱身')
    expect(wrapper.text()).toContain('未启用 · 请在财产安全设置开启')
  })

  it('诈骗检测：命中钓鱼词库展示风险分级/类型/置信度/警示/建议', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('[data-testid="psp-fraud-input"]').setValue('您好，您的账号异常，请点击链接更新信息，验证码是1234')
    await wrapper.find('[data-testid="psp-fraud-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="psp-fraud-result"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="psp-risk-badge"]').text()).toMatch(/低风险|中风险|高风险|危急/)
    expect(wrapper.text()).toContain('钓鱼')
    expect(wrapper.text()).toContain('置信度')
    expect(wrapper.text()).toContain('验证码')
    expect(wrapper.text()).toContain('请勿点击')
  })

  it('诈骗检测：无风险文本显示未发现已知风险模式', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('[data-testid="psp-fraud-input"]').setValue('今天天气很好，我们一起去公园散步吧')
    await wrapper.find('[data-testid="psp-fraud-btn"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="psp-clean-hint"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('未发现已知风险模式')
  })

  it('清除按钮复位检测结果', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('[data-testid="psp-fraud-input"]').setValue('恭喜中奖，请先支付手续费')
    await wrapper.find('[data-testid="psp-fraud-btn"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="psp-fraud-result"]').exists()).toBe(true)
    await wrapper.find('[data-testid="psp-fraud-clear"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="psp-fraud-result"]').exists()).toBe(false)
  })

  it('报平安：手动签到持久化并更新统计与列表', async () => {
    const wrapper = await mountPanel()
    await buttonByText(wrapper, '✅ 报平安').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="psp-checkin-total"]').text()).toBe('1')
    expect(wrapper.find('[data-testid="psp-checkin-streak"]').text()).toBe('1')
    expect(wrapper.text()).toContain('手动')
    expect(wrapper.text()).toContain('安全')
    const checkins = readKv()[CHECKIN_KEY]
    expect(checkins).toHaveLength(1)
    expect(checkins[0].type).toBe('manual')
    expect(checkins[0].safe).toBe(true)
  })

  it('紧急签到计入紧急计数且标记不安全', async () => {
    const wrapper = await mountPanel()
    await buttonByText(wrapper, '🚨 紧急签到').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="psp-checkin-total"]').text()).toBe('1')
    expect(wrapper.text()).toContain('紧急')
    const checkins = readKv()[CHECKIN_KEY]
    expect(checkins[0].type).toBe('emergency')
    expect(checkins[0].safe).toBe(false)
  })

  it('预置签到记录渲染最近列表与统计', async () => {
    const now = Date.now()
    const wrapper = await mountPanel({
      [CHECKIN_KEY]: [
        { id: 'c1', timestamp: now, type: 'manual', safe: true, note: '已到家' },
        { id: 'c2', timestamp: now - 3600000, type: 'auto', safe: true },
        { id: 'c3', timestamp: now - 7200000, type: 'emergency', safe: false, note: '紧急签到' },
      ],
    })
    expect(wrapper.find('[data-testid="psp-checkin-total"]').text()).toBe('3')
    expect(wrapper.text()).toContain('已到家')
    expect(wrapper.text()).toContain('紧急签到')
    expect(wrapper.findAll('.psp-checkin-item').length).toBe(3)
  })

  it('假来电：默认未启用时触发按钮禁用', async () => {
    const wrapper = await mountPanel()
    expect((wrapper.find('[data-testid="psp-trigger-call"]').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('假来电：启用后填写名称触发来电卡，挂断后消失', async () => {
    const wrapper = await mountPanel({
      [CONFIG_KEY]: { propertySecurity: { ...DEFAULT_PROPERTY_SECURITY, fakeCallEnabled: true } },
    })
    await wrapper.find('[data-testid="psp-call-name"]').setValue('快递小哥')
    await wrapper.find('[data-testid="psp-call-reason"]').setValue('送快递')
    await wrapper.find('[data-testid="psp-call-delay"]').setValue(3)
    await wrapper.find('[data-testid="psp-trigger-call"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="psp-call-active"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('快递小哥')
    expect(wrapper.text()).toContain('送快递')
    expect(wrapper.text()).toContain('来电中')

    await wrapper.find('[data-testid="psp-call-hangup"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="psp-call-active"]').exists()).toBe(false)
  })
})
