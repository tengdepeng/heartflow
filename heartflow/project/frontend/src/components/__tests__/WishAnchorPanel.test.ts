import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const WISHES_KEY = 'hf:wish_anchor_list'

function dateStr(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function wish(overrides: Record<string, any> = {}) {
  return {
    id: `wish_${Math.random().toString(36).slice(2, 8)}`,
    title: '心愿',
    targetDate: dateStr(30),
    createdAt: '2026-08-20T08:00:00.000Z',
    done: false,
    ...overrides,
  }
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
  const mod = await import('../WishAnchorPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('WishAnchorPanel 心愿锚', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('心愿锚')
    expect(wrapper.text()).toContain('尚无心愿')
  })

  it('展示心愿清单与紧急程度', async () => {
    const wrapper = await mountPanel({
      [WISHES_KEY]: [
        wish({ title: '学会游泳', targetDate: dateStr(3) }),
        wish({ title: '读完一本书', targetDate: dateStr(200) }),
      ],
    })
    expect(wrapper.text()).toContain('学会游泳')
    expect(wrapper.text()).toContain('读完一本书')
    expect(wrapper.text()).toContain('迫在眉睫')
    expect(wrapper.text()).toContain('长期')
  })

  it('展示概览统计（过期/已达成）', async () => {
    const wrapper = await mountPanel({
      [WISHES_KEY]: [
        wish({ targetDate: dateStr(-10) }),
        wish({ targetDate: dateStr(3) }),
        wish({ targetDate: dateStr(200), done: true }),
      ],
    })
    expect(wrapper.text()).toContain('已过期')
    expect(wrapper.text()).toContain('迫在眉睫')
    expect(wrapper.text()).toContain('已达成')
  })

  it('立新心愿并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('input[placeholder="心愿内容"]').setValue('学会游泳')
    await wrapper.find('input[type="date"]').setValue(dateStr(30))
    await wrapper.find('button.wa-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('学会游泳')
    const records = storedKV()[WISHES_KEY]
    expect(records.length).toBe(1)
    expect(records[0].title).toBe('学会游泳')
    expect(records[0].done).toBe(false)
  })

  it('切换达成状态并持久化', async () => {
    const wrapper = await mountPanel({
      [WISHES_KEY]: [wish({ id: 'w1', title: '读完一本书', targetDate: dateStr(30) })],
    })
    await wrapper.find('button.wa-toggle').trigger('click')
    await wrapper.vm.$nextTick()
    const records = storedKV()[WISHES_KEY]
    expect(records[0].done).toBe(true)
    expect(wrapper.text()).toContain('已达成')
  })

  it('删除心愿并持久化', async () => {
    const wrapper = await mountPanel({
      [WISHES_KEY]: [wish({ id: 'w_del', title: '待删心愿', targetDate: dateStr(30) })],
    })
    await wrapper.find('button.wa-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(storedKV()[WISHES_KEY].length).toBe(0)
    expect(wrapper.text()).toContain('尚无心愿')
  })
})
