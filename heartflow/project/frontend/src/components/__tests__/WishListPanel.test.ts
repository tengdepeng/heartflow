// ============================================================
// WishListPanel 组件测试（INCR-67：成长庭院 · 心愿清单 · 习惯联动解锁）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const WISHES_KEY = 'hf:garden:wishes'
const HABITS_KEY = 'hf:habits'

function habit(id: string, text: string, ticks: string[] = []) {
  return { id, text, streak: ticks.length, streakPct: 0, ticks }
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
  const mod = await import('../WishListPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

async function addWish(wrapper: any, title: string, icon = '') {
  const form = wrapper.find('.wlp-add-form')
  await form.find('input[placeholder*="心愿标题"]').setValue(title)
  if (icon) {
    await form.find('.wlp-icon-input').setValue(icon)
  }
  await form.trigger('submit')
  await wrapper.vm.$nextTick()
}

describe('WishListPanel 心愿清单', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空库渲染标题、统计概览与空状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.wlp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('心愿清单')
    expect(wrapper.text()).toContain('习惯联动解锁')

    const stats = wrapper.find('.wlp-stats')
    expect(stats.text()).toContain('心愿总数')
    expect(stats.text()).toContain('已点亮')
    expect(stats.text()).toContain('进行中')
    expect(stats.text()).toContain('整体进度')

    expect(wrapper.text()).toContain('还没有心愿')
  })

  it('无习惯时提示先添加习惯', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('先在「习惯追踪」里添加习惯')
  })

  it('新增心愿后统计与列表更新', async () => {
    const wrapper = await mountPanel()
    await addWish(wrapper, '去旅行', '✈️')
    expect(wrapper.text()).toContain('去旅行')
    expect(wrapper.text()).toContain('✈️')
    expect(wrapper.findAll('.wlp-wish').length).toBe(1)
  })

  it('关联习惯后显示习惯进度', async () => {
    const wrapper = await mountPanel({
      [HABITS_KEY]: [habit('h1', '晨跑', ['2026-08-01', '2026-08-02'])],
    })
    const form = wrapper.find('.wlp-add-form')
    await form.find('input[placeholder*="心愿标题"]').setValue('跑完十次')
    const checkbox = wrapper.findAll('.wlp-habit-check input').find((c: any) => (c.element as HTMLInputElement).value === 'h1')!
    await checkbox.setValue(true)
    await wrapper.vm.$nextTick()
    await wrapper.find('.wlp-count-input').setValue(10)
    await form.trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('跑完十次')
    expect(wrapper.text()).toContain('晨跑')
    expect(wrapper.text()).toContain('2/10')
  })

  it('达标心愿自动点亮', async () => {
    const wrapper = await mountPanel({
      [HABITS_KEY]: [habit('h1', '晨跑', ['2026-08-01', '2026-08-02', '2026-08-03'])],
    })
    const form = wrapper.find('.wlp-add-form')
    await form.find('input[placeholder*="心愿标题"]').setValue('点亮心愿')
    const checkbox = wrapper.findAll('.wlp-habit-check input').find((c: any) => (c.element as HTMLInputElement).value === 'h1')!
    await checkbox.setValue(true)
    await wrapper.vm.$nextTick()
    await wrapper.find('.wlp-count-input').setValue(3)
    await form.trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('已点亮')
    expect(wrapper.text()).toContain('点亮于')
  })

  it('编辑心愿可保存', async () => {
    const wrapper = await mountPanel()
    await addWish(wrapper, '旧标题')
    const wish = wrapper.findAll('.wlp-wish').find((c: any) => c.text().includes('旧标题'))!
    await wish.findAll('button').find((b: any) => b.text() === '编辑')!.trigger('click')
    await wrapper.vm.$nextTick()

    const editForm = wrapper.find('.wlp-edit-form')
    await editForm.find('input[placeholder="心愿标题"]').setValue('新标题')
    await editForm.trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('新标题')
    expect(wrapper.text()).not.toContain('旧标题')
  })

  it('删除心愿', async () => {
    const wrapper = await mountPanel()
    await addWish(wrapper, '要删除的')
    const wish = wrapper.findAll('.wlp-wish').find((c: any) => c.text().includes('要删除的'))!
    await wish.findAll('button').find((b: any) => b.text() === '删除')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('要删除的')
    expect(wrapper.text()).toContain('还没有心愿')
  })

  it('温和小结渲染', async () => {
    const wrapper = await mountPanel({
      [WISHES_KEY]: [
        { id: 'w1', title: '已点亮', icon: '✨', linkedHabitIds: [], requiredCounts: {}, unlocked: true, unlockedAt: '2026-08-02T00:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z' },
      ],
    })
    expect(wrapper.text()).toContain('已点亮 1 个心愿')
  })
})
