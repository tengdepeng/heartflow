// ============================================================
// AnomalyDetectorPanel 组件测试（INCR-84：实时异常检测）
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
  storageMock.clear()
  const { default: AnomalyDetectorPanel } = await import('../AnomalyDetectorPanel.vue')
  const wrapper = mount(AnomalyDetectorPanel)
  await nextTick()
  return wrapper
}

async function clickTab(wrapper: any, label: string) {
  const tab = wrapper.findAll('.adp-tab').find((t: any) => t.text().includes(label))
  await tab!.trigger('click')
  await nextTick()
}

beforeEach(() => {
  storageMock.clear()
})

describe('AnomalyDetectorPanel', () => {
  it('渲染标题与徽标', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.adp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('实时异常检测')
    expect(wrapper.find('.adp-badge').text()).toContain('0 异常')
    expect(wrapper.find('.adp-badge').text()).toContain('0 数据点')
  })

  it('概览页展示统计与空态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('检测次数')
    expect(wrapper.text()).toContain('异常率')
    expect(wrapper.text()).toContain('暂无严重未解决异常')
  })

  it('检测页记录数据点触发异常', async () => {
    const wrapper = await mountPanel()
    await clickTab(wrapper, '检测')
    const select = wrapper.find('.adp-form select')
    await select.setValue('permission_changes')
    await wrapper.findAll('.adp-form input')[0].setValue(10)
    await nextTick()
    await wrapper.find('.adp-form').trigger('submit')
    await nextTick()
    expect(wrapper.text()).toContain('超过阈值')
    expect(wrapper.find('.adp-badge').text()).toContain('1 异常')
  })

  it('异常可被解决', async () => {
    const wrapper = await mountPanel()
    await clickTab(wrapper, '检测')
    await wrapper.find('.adp-form select').setValue('permission_changes')
    await wrapper.findAll('.adp-form input')[0].setValue(10)
    await nextTick()
    await wrapper.find('.adp-form').trigger('submit')
    await nextTick()
    const resolveBtn = wrapper.findAll('button').find((b: any) => b.text() === '解决')
    await resolveBtn!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('已解决')
    expect(wrapper.find('.adp-badge').text()).toContain('0 未解决')
  })

  it('基线页计算基线并展示卡片', async () => {
    const wrapper = await mountPanel()
    await clickTab(wrapper, '检测')
    const select = wrapper.find('.adp-form select')
    await select.setValue('login_frequency')
    for (let i = 0; i < 25; i++) {
      await wrapper.findAll('.adp-form input')[0].setValue(10 + i)
      await wrapper.find('.adp-form').trigger('submit')
    }
    await nextTick()
    await clickTab(wrapper, '基线')
    await wrapper.findAll('button').find((b: any) => b.text().includes('计算全基线'))!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('登录频率')
    expect(wrapper.text()).toContain('均值')
  })

  it('规则页展示默认规则并支持启停', async () => {
    const wrapper = await mountPanel()
    await clickTab(wrapper, '规则')
    expect(wrapper.text()).toContain('登录频率异常')
    expect(wrapper.text()).toContain('数据访问量突增')
    const checkbox = wrapper.findAll('.adp-item input[type="checkbox"]')[0]
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    await checkbox.setValue(false)
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
  })
})
