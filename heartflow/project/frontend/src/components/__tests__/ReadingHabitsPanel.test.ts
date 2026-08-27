// ============================================================
// 阅读习惯面板测试（reading · useReadingHabits + useReadingHall）
// 习惯管理 / 阅读模式 / 习惯洞察
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const HABITS_KEY = 'hf:reading:habits'
const INSIGHTS_KEY = 'hf:reading:habit_insights'
const BOOKS_KEY = 'hf:reading:books'
const SESSIONS_KEY = 'hf:reading:sessions'

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
  const mod = await import('../ReadingHabitsPanel.vue')
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

function habit(overrides: Record<string, any> = {}) {
  return {
    id: 'habit_1', name: '睡前阅读', description: '', type: 'daily_reading',
    strength: 0, streak: 0, bestStreak: 0, lastActiveDate: '', createdAt: '2026-08-01',
    ...overrides,
  }
}

function session(overrides: Record<string, any> = {}) {
  const ts = new Date()
  ts.setHours(20, 0, 0, 0)
  return {
    id: 'sess_1', bookId: 'book_1', startPage: 1, endPage: 31, duration: 30,
    note: '', date: ts.toISOString().split('T')[0], timestamp: ts.toISOString(),
    ...overrides,
  }
}

function book(overrides: Record<string, any> = {}) {
  return {
    id: 'book_1', title: '活着', author: '余华', totalPages: 200, currentPage: 200,
    status: 'finished', tags: ['文学'], quotes: [], totalReadingTime: 120,
    ...overrides,
  }
}

describe('ReadingHabitsPanel 阅读习惯', () => {
  it('渲染标题与空状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('阅读习惯')
    expect(wrapper.text()).toContain('还没有阅读习惯')
    expect(wrapper.text()).toContain('阅读模式 · 0 次会话')
  })

  it('创建阅读习惯并持久化', async () => {
    const wrapper = await mountPanel()
    await inputByPlaceholder(wrapper, '习惯名称').setValue('睡前阅读')
    await buttonByText(wrapper, '创建').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('睡前阅读')
    expect(wrapper.text()).toContain('🔥0天')
    const habits = readKv()[HABITS_KEY]
    expect(habits).toHaveLength(1)
    expect(habits[0].name).toBe('睡前阅读')
    expect(habits[0].type).toBe('daily_reading')
  })

  it('更新习惯强度并持久化', async () => {
    const wrapper = await mountPanel({ [HABITS_KEY]: [habit()] })
    await wrapper.find('.rhp-range').setValue(0.8)
    await buttonByText(wrapper, '设强度').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('80%')
    const habits = readKv()[HABITS_KEY]
    expect(habits[0].strength).toBe(0.8)
  })

  it('删除阅读习惯', async () => {
    const wrapper = await mountPanel({ [HABITS_KEY]: [habit()] })
    expect(wrapper.text()).toContain('睡前阅读')
    await buttonByText(wrapper, '删除').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('还没有阅读习惯')
    expect(readKv()[HABITS_KEY]).toHaveLength(0)
  })

  it('分析阅读模式展示时段与一致性', async () => {
    const wrapper = await mountPanel({
      [SESSIONS_KEY]: JSON.stringify([session({ id: 's1' }), session({ id: 's2' }), session({ id: 's3' })]),
    })
    expect(wrapper.text()).toContain('阅读模式 · 3 次会话')
    await buttonByText(wrapper, '分析').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('平均 30 分钟')
    expect(wrapper.text()).toContain('最佳时段 晚间 (18-22)')
    expect(wrapper.text()).toContain('一致性 100%')
  })

  it('生成习惯洞察并持久化', async () => {
    const wrapper = await mountPanel({
      [BOOKS_KEY]: JSON.stringify([
        book({ id: 'b1' }), book({ id: 'b2' }), book({ id: 'b3' }),
      ]),
      [SESSIONS_KEY]: JSON.stringify([session({ id: 's1' }), session({ id: 's2' }), session({ id: 's3' })]),
    })
    await buttonByText(wrapper, '生成洞察').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('已完成 3 本书')
    expect(wrapper.text()).toContain('阅读偏好倾向')
    expect(wrapper.text()).toContain('阅读连续性需要加强')
    const insights = readKv()[INSIGHTS_KEY]
    expect(insights.length).toBeGreaterThanOrEqual(4)
    expect(insights.some((i: any) => i.type === 'achievement')).toBe(true)
  })
})
