import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const CARDS_KEY = 'hf:recite_cards'

function card(overrides: Record<string, any> = {}) {
  return {
    id: `rc_${Math.random().toString(36).slice(2, 8)}`,
    title: '背诵卡',
    text: '静以修身',
    lang: 'cjk',
    createdAt: '2026-08-20T08:00:00.000Z',
    stepIndex: 0,
    bestAccuracy: 0,
    attempts: 0,
    correctCount: 0,
    wrongCount: 0,
    errorTokens: {},
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
  const mod = await import('../RecitePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('RecitePanel 渐进背诵', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('渐进背诵')
    expect(wrapper.text()).toContain('暂无背诵卡')
  })

  it('展示背诵卡清单与进度', async () => {
    const wrapper = await mountPanel({
      [CARDS_KEY]: [
        card({ id: 'c1', title: '静以修身', text: '静以修身', lang: 'cjk', stepIndex: 1, bestAccuracy: 95, attempts: 3 }),
      ],
    })
    expect(wrapper.text()).toContain('静以修身')
    expect(wrapper.text()).toContain('第 2/5 档')
    expect(wrapper.text()).toContain('最佳 95%')
    expect(wrapper.text()).toContain('练习 3 次')
  })

  it('添加背诵卡并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('input[placeholder="标题"]').setValue('岳阳楼记')
    await wrapper.find('textarea.rc-textarea').setValue('先天下之忧而忧')
    await wrapper.find('button.rc-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('岳阳楼记')
    const cards = storedKV()[CARDS_KEY]
    expect(cards.length).toBe(1)
    expect(cards[0].title).toBe('岳阳楼记')
    expect(cards[0].stepIndex).toBe(0)
  })

  it('背诵流程：遮盖 → 提交 → 通过并推进', async () => {
    const wrapper = await mountPanel({
      [CARDS_KEY]: [card({ id: 'c1', title: '静以修身', text: '静以修身', lang: 'cjk' })],
    })
    await wrapper.find('button.rc-btn-sm').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.rc-masked').exists()).toBe(true)
    await wrapper.find('.rc-practice input.rc-input').setValue('静以修身')
    await wrapper.find('.rc-practice button.rc-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('准确率 100%')
    expect(wrapper.text()).toContain('通过')
    const cards = storedKV()[CARDS_KEY]
    expect(cards[0].attempts).toBe(1)
    expect(cards[0].stepIndex).toBe(1)
  })

  it('删除背诵卡并持久化', async () => {
    const wrapper = await mountPanel({
      [CARDS_KEY]: [card({ id: 'c_del', title: '待删', text: 'abc', lang: 'latin' })],
    })
    await wrapper.find('button.rc-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(storedKV()[CARDS_KEY].length).toBe(0)
    expect(wrapper.text()).toContain('暂无背诵卡')
  })
})
