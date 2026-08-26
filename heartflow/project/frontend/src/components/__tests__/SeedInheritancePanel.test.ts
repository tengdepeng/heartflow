// ============================================================
// SeedInheritancePanel 组件测试（宪法第46/47/48条治理 UI）
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { getKvStore, resetKvStore } = vi.hoisted(() => {
  let _kvStore: Record<string, any> = {}
  return {
    getKvStore: () => _kvStore,
    resetKvStore: () => { _kvStore = {} },
  }
})

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: unknown) => {
      const store = getKvStore()
      return store[key] !== undefined ? (store[key] as unknown) : def
    },
    setKV: (key: string, val: unknown) => { getKvStore()[key] = val },
  },
}))

import SeedInheritancePanel from '../SeedInheritancePanel.vue'
import type { TimeSeed } from '../../modules/play/time-seed'

function makeSeed(over: Partial<TimeSeed> = {}): TimeSeed {
  return {
    id: `seed_${Math.random()}`,
    name: '测试种子',
    source: 'game',
    sourceId: 'src_1',
    timestamp: '2026-01-01T00:00:00.000Z',
    emotion: 0.5,
    tags: ['游戏'],
    inherited: false,
    description: '完整描述',
    rarity: 'rare',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

const seeds = [
  makeSeed({ id: 'a', name: 'A', description: '完整A', tags: ['游戏', 'RPG'] }),
  makeSeed({ id: 'b', name: 'B', description: '完整B', tags: ['游戏'] }),
]

function mountPanel(props = {}) {
  return mount(SeedInheritancePanel, {
    props: { seeds, ...props },
  })
}

describe('SeedInheritancePanel · 第47条 逐项授权', () => {
  beforeEach(() => resetKvStore())

  it('默认仅勾选「游戏记录」且至少保留一项', () => {
    const w = mountPanel()
    const activeChips = w.findAll('.type-chip.active').map(c => c.text())
    expect(activeChips).toContain('游戏记录')
    expect(w.findAll('.type-chip.active').length).toBeGreaterThanOrEqual(1)
  })

  it('取消唯一已选类型不生效（至少保留一项）', async () => {
    const w = mountPanel()
    const gameChip = w.findAll('.type-chip').find(c => c.text() === '游戏记录')!
    await gameChip.trigger('click') // 尝试取消
    const stillActive = w.findAll('.type-chip.active').map(c => c.text())
    expect(stillActive).toContain('游戏记录')
  })

  it('预览随授权类型与粒度变化', async () => {
    const w = mountPanel()
    // 默认 highlight 粒度
    expect(w.find('.preview-item').exists()).toBe(true)
    // 切到全部细节
    const fullBtn = w.findAll('.gran-btn').find(b => b.text() === '全部细节')!
    await fullBtn.trigger('click')
    expect(w.find('.pi-content').text()).toContain('完整')
  })
})

describe('SeedInheritancePanel · 第47条 发送前预览 + 守护室日志', () => {
  beforeEach(() => resetKvStore())

  it('发送后写入日志且预览条目数正确', async () => {
    const w = mountPanel()
    const sendBtn = w.find('.send-btn')
    expect(sendBtn.attributes('disabled')).toBeUndefined()
    await sendBtn.trigger('click')
    // 日志区出现 1 条
    expect(w.findAll('.log-item').length).toBe(1)
    expect(w.find('.log-item').text()).toContain('游戏记录')
  })

  it('无匹配种子时发送按钮禁用', async () => {
    const w = mountPanel({ seeds: [] })
    expect(w.find('.send-btn').attributes('disabled')).toBeDefined()
  })
})

describe('SeedInheritancePanel · 第48条 收回', () => {
  beforeEach(() => resetKvStore())

  it('收回后标记 revoked 且收回按钮消失', async () => {
    const w = mountPanel()
    await w.find('.send-btn').trigger('click')
    const revokeBtn = w.find('.log-revoke-btn')
    expect(revokeBtn.exists()).toBe(true)
    await revokeBtn.trigger('click')
    await flushPromises()
    await w.vm.$nextTick()
    const item = w.find('.log-item')
    expect(item.classes()).toContain('revoked')
    expect(w.find('.log-revoke-btn').exists()).toBe(false)
  })

  it('永久赠予的记录不可收回（无收回按钮）', async () => {
    const w = mountPanel()
    // 勾选永久赠予
    const cb = w.find('.permanent-toggle input')
    await cb.setValue(true)
    await w.find('.send-btn').trigger('click')
    expect(w.find('.log-revoke-btn').exists()).toBe(false)
    expect(w.find('.log-item').text()).toContain('永久赠予')
  })
})
