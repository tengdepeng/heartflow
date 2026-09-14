// ============================================================
// SecurityIncidentPanel 组件测试（INCR-83：安全事件响应）
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const storageMock = new Map<string, unknown>()

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, defaultValue: T): T => {
      const val = storageMock.get(key)
      return val !== undefined ? (val as T) : defaultValue
    },
    setKV: (key: string, value: unknown) => { storageMock.set(key, value) },
    removeKV: (key: string) => { storageMock.delete(key) },
  },
}))

async function mountPanel() {
  vi.resetModules()
  storageMock.clear()
  const { default: SecurityIncidentPanel } = await import('../SecurityIncidentPanel.vue')
  const wrapper = mount(SecurityIncidentPanel)
  await nextTick()
  return wrapper
}

async function clickTab(wrapper: any, label: string) {
  const tab = wrapper.findAll('.sip-tab').find((t: any) => t.text().includes(label))
  await tab!.trigger('click')
  await nextTick()
}

async function openCreateForm(wrapper: any) {
  await clickTab(wrapper, '事件')
  const btn = wrapper.findAll('button').find((b: any) => b.text().includes('登记事件'))
  await btn!.trigger('click')
  await nextTick()
}

async function submitCreate(wrapper: any, description: string) {
  const inputs = wrapper.findAll('input')
  await inputs[0].setValue(description)
  await nextTick()
  await wrapper.find('form').trigger('submit')
  await nextTick()
}

beforeEach(() => {
  storageMock.clear()
})

describe('SecurityIncidentPanel', () => {
  it('渲染标题与徽标', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.sip-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('安全事件响应')
    expect(wrapper.find('.sip-badge').text()).toContain('0 事件')
    expect(wrapper.find('.sip-badge').text()).toContain('6 规则')
  })

  it('态势页展示安全评分与分布', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('安全评分')
    expect(wrapper.find('.sip-score-num').exists()).toBe(true)
    expect(wrapper.text()).toContain('总事件')
    expect(wrapper.text()).toContain('无威胁')
  })

  it('事件页可登记事件并显示列表', async () => {
    const wrapper = await mountPanel()
    await openCreateForm(wrapper)
    await submitCreate(wrapper, '检测到未授权访问')
    expect(wrapper.text()).toContain('检测到未授权访问')
    expect(wrapper.find('.sip-badge').text()).toContain('1 事件')
  })

  it('事件可被解决并显示解决方式', async () => {
    const wrapper = await mountPanel()
    await openCreateForm(wrapper)
    await submitCreate(wrapper, '数据泄露风险')
    const resolveBtn = wrapper.findAll('button').find((b: any) => b.text() === '解决')
    await resolveBtn!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('已人工处置')
    expect(wrapper.find('.sip-badge').text()).toContain('0 待处置')
  })

  it('检测页运行威胁检测并展示命中规则', async () => {
    const wrapper = await mountPanel()
    await clickTab(wrapper, '检测')
    const numInputs = wrapper.findAll('input[type="number"]')
    await numInputs[0].setValue(6)
    await nextTick()
    const runBtn = wrapper.findAll('button').find((b: any) => b.text().includes('运行威胁检测'))
    await runBtn!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('检测结果')
    expect(wrapper.text()).toContain('频繁失败登录')
  })

  it('检测命中可登记为事件', async () => {
    const wrapper = await mountPanel()
    await clickTab(wrapper, '检测')
    await wrapper.findAll('input[type="number"]')[0].setValue(6)
    await nextTick()
    await wrapper.findAll('button').find((b: any) => b.text().includes('运行威胁检测'))!.trigger('click')
    await nextTick()
    await wrapper.findAll('button').find((b: any) => b.text().includes('将命中登记为事件'))!.trigger('click')
    await nextTick()
    expect(wrapper.find('.sip-badge').text()).toContain('1 事件')
  })

  it('规则页展示默认规则并支持启停', async () => {
    const wrapper = await mountPanel()
    await clickTab(wrapper, '规则')
    expect(wrapper.text()).toContain('频繁失败登录')
    expect(wrapper.text()).toContain('大体积数据导出')
    const checkbox = wrapper.findAll('.sip-item input[type="checkbox"]')[0]
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    await checkbox.setValue(false)
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
  })
})
