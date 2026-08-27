// ============================================================
// 人身安全面板测试（safety · usePersonalSafety）
// 紧急联系人 / SOS / 跌倒检测
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const CONTACTS_KEY = 'hf:emergency_contacts'
const SOS_EVENTS_KEY = 'hf:sos_events'
const SOS_CONFIG_KEY = 'hf:sos_config'
const FALL_EVENTS_KEY = 'hf:fall_events'
const FALL_CONFIG_KEY = 'hf:fall_config'

const DEFAULT_SOS_CONFIG = { countdownSeconds: 5, autoSendLocation: true, playAlarm: true, autoDial: false }
const DEFAULT_FALL_CONFIG = { enabled: true, sensitivity: 0.7, methods: ['accelerometer'], autoSOSDelay: 10, cancelWindow: 15 }

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
  const mod = await import('../PersonalSafetyPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function inputByPlaceholder(wrapper: any, placeholder: string) {
  const el = wrapper.findAll('input').find((i: any) => i.attributes('placeholder') === placeholder)
  expect(el, `input[placeholder=${placeholder}] 应存在`).toBeTruthy()
  return el!
}

function buttonByText(wrapper: any, text: string) {
  const el = wrapper.findAll('button').find((b: any) => b.text().trim() === text)
  expect(el, `button[${text}] 应存在`).toBeTruthy()
  return el!
}

describe('PersonalSafetyPanel 人身安全', () => {
  it('渲染标题与空状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('人身安全')
    expect(wrapper.text()).toContain('SOS 紧急求助')
    expect(wrapper.text()).toContain('紧急联系人 · 0')
    expect(wrapper.text()).toContain('跌倒检测 · 0 次')
  })

  it('添加紧急联系人并持久化', async () => {
    const wrapper = await mountPanel()
    await inputByPlaceholder(wrapper, '姓名').setValue('张三')
    await inputByPlaceholder(wrapper, '电话').setValue('13800000000')
    await buttonByText(wrapper, '添加').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('紧急联系人 · 1')
    expect(wrapper.text()).toContain('张三 · 13800000000')
    expect(wrapper.text()).toContain('主要联系人')
    const contacts = readKv()[CONTACTS_KEY]
    expect(contacts).toHaveLength(1)
    expect(contacts[0].name).toBe('张三')
    expect(contacts[0].priority).toBe('primary')
  })

  it('移除紧急联系人', async () => {
    const wrapper = await mountPanel({
      [CONTACTS_KEY]: [{ id: 'c1', name: '李四', phone: '13900000000', priority: 'secondary' }],
    })
    expect(wrapper.text()).toContain('李四')
    await buttonByText(wrapper, '移除').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('紧急联系人 · 0')
    expect(readKv()[CONTACTS_KEY]).toHaveLength(0)
  })

  it('倒计时为 0 时触发 SOS 立即发送并持久化事件', async () => {
    const wrapper = await mountPanel({
      [SOS_CONFIG_KEY]: { ...DEFAULT_SOS_CONFIG, countdownSeconds: 0 },
    })
    await buttonByText(wrapper, '触发 SOS').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('已发送')
    const events = readKv()[SOS_EVENTS_KEY]
    expect(events).toHaveLength(1)
    expect(events[0].status).toBe('sent')
    expect(events[0].cancelled).toBe(false)
  })

  it('SOS 倒计时可取消', async () => {
    const wrapper = await mountPanel()
    await buttonByText(wrapper, '触发 SOS').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('倒计时中')

    await buttonByText(wrapper, '取消').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已取消')
    expect(readKv()[SOS_EVENTS_KEY] ?? []).toHaveLength(0)
  })

  it('模拟跌倒产生事件并持久化', async () => {
    const wrapper = await mountPanel({
      [FALL_CONFIG_KEY]: { ...DEFAULT_FALL_CONFIG, sensitivity: 0.95 },
    })
    await buttonByText(wrapper, '模拟跌倒').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('跌倒检测 · 1 次')
    expect(wrapper.text()).toContain('置信度')
    const events = readKv()[FALL_EVENTS_KEY]
    expect(events).toHaveLength(1)
    expect(events[0].falseAlarm).toBe(false)
  })

  it('标记跌倒为误报并持久化', async () => {
    const wrapper = await mountPanel({
      [FALL_EVENTS_KEY]: [{ id: 'fall1', timestamp: Date.now(), confidence: 0.9, falseAlarm: false, triggeredSOS: false }],
    })
    expect(wrapper.text()).toContain('置信度 90%')
    await buttonByText(wrapper, '误报').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('已误报')
    const events = readKv()[FALL_EVENTS_KEY]
    expect(events[0].falseAlarm).toBe(true)
  })
})
