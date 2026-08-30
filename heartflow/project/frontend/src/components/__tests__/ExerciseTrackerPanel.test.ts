import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import type { ExerciseRecord } from '../../modules/body/exercise-tracker'

function rec(overrides: Partial<ExerciseRecord> = {}): ExerciseRecord {
  return {
    id: `ex_${Math.random().toString(36).slice(2, 8)}`,
    type: 'walking',
    name: '晨跑',
    duration: 30,
    intensity: 'moderate',
    calories: 120,
    moodAfter: 6,
    energyAfter: 4,
    date: '2026-08-28',
    timestamp: '2026-08-28T08:00:00.000Z',
    completion: 1,
    ...overrides,
  }
}

async function mountPanel(records: ExerciseRecord[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kv = records.length
    ? { 'hf:body:exercise:records': JSON.stringify(records), 'hf:body:exercise:goals': JSON.stringify([]) }
    : {}
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: kv, sessions: [], crystals: [] }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ExerciseTrackerPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('ExerciseTrackerPanel 身体数据接入面板', () => {
  it('空状态下给出守候录入提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('身体数据接入')
    expect(wrapper.text()).toContain('从记录一次运动开始')
  })

  it('渲染统计速览（累计/总时长/消耗/连续天数）', async () => {
    const wrapper = await mountPanel([
      rec({ duration: 30, calories: 120 }),
      rec({ duration: 45, calories: 180 }),
    ])
    expect(wrapper.text()).toContain('累计运动')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('75')
    expect(wrapper.text()).toContain('300')
  })

  it('录入一条运动并持久化到 hf:body:exercise:records', async () => {
    vi.resetModules()
    const storageMock = createMockStorage()
    const kv: Record<string, string> = { 'hf:body:exercise:goals': JSON.stringify([]) }
    storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: kv, sessions: [], crystals: [] }))
    ;(globalThis as any).localStorage = storageMock
    invalidateCache()
    const mod = await import('../ExerciseTrackerPanel.vue')
    const wrapper = mount(mod.default)
    await wrapper.vm.$nextTick()

    await wrapper.find('input.ex-name').setValue('晨跑')
    await wrapper.find('input.ex-min').setValue(30)
    await wrapper.find('button.ex-submit').trigger('click')
    await wrapper.vm.$nextTick()

    const persisted = JSON.parse(JSON.parse(storageMock.getItem('heartflow:storage') as string).kvStore['hf:body:exercise:records'])
    expect(persisted.length).toBe(1)
    expect(persisted[0].name).toBe('晨跑')
    expect(wrapper.text()).toContain('晨跑')
  })

  it('周小结与近期记录随预置数据渲染', async () => {
    const wrapper = await mountPanel([
      rec({ date: '2026-08-24', duration: 30, moodAfter: 7 }),
      rec({ date: '2026-08-26', duration: 60, moodAfter: 8 }),
    ])
    expect(wrapper.find('ul.ex-list').exists()).toBe(true)
    expect(wrapper.findAll('li.ex-item').length).toBe(2)
  })
})