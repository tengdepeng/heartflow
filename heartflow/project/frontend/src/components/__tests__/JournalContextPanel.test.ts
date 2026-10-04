// ============================================================
// 手札建议面板 · 建议卡 + 元数据条（P2 市面对标 Apple Journal / Day One）
// 用 storage mock 注入专注 / 情绪 / 运动 / 手札 / 照片种子，
// 验证元数据条、建议卡渲染与点选预填 emit。
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import { getLocalDateKey } from '../../utils/time'

const TODAY = getLocalDateKey()

function seed(kvStore: Record<string, any> = {}, extra: Record<string, any> = {}) {
  vi.resetModules()
  const mock = createMockStorage()
  mock.setItem(
    'heartflow:storage',
    JSON.stringify({ version: 10, kvStore, sessions: [], crystals: [], ...extra }),
  )
  ;(globalThis as any).localStorage = mock
  invalidateCache()
  return mock
}

const ANCHOR = {
  id: 'a1',
  text: '写完报告',
  done: false,
  targetDate: TODAY,
  createdAt: `${TODAY}T08:00:00.000Z`,
  priority: 'can',
  stage: 'active',
  driftCount: 0,
}

const FULL = {
  kvStore: {
    'hf:body:exercise:records': JSON.stringify([
      {
        id: 'x1',
        type: 'walking',
        name: '散步',
        duration: 30,
        intensity: 'light',
        calories: 120,
        moodAfter: 7,
        energyAfter: 4,
        date: TODAY,
        timestamp: `${TODAY}T12:00:00.000Z`,
        completion: 1,
      },
    ]),
    'hf:anchor_journals': [
      {
        id: 'j1',
        anchorId: 'a1',
        title: '手札',
        content: '内容',
        type: 'diary',
        linkedAnchorIds: [],
        createdAt: `${TODAY}T12:00:00.000Z`,
        updatedAt: `${TODAY}T12:00:00.000Z`,
      },
    ],
    'hf:anchor:photo_diary': [
      {
        id: 'p1',
        date: TODAY,
        images: ['A', 'B'],
        thumbs: ['a', 'b'],
        captions: ['', ''],
        caption: '',
        createdAt: `${TODAY}T12:00:00.000Z`,
      },
    ],
  },
  extra: {
    sessions: [
      {
        id: 'f1',
        status: 'completed',
        mode: 'focus',
        plannedDuration: 1500000,
        elapsed: 1500000,
        startedAt: `${TODAY}T12:00:00.000Z`,
        pausedDuration: 0,
        pausedAt: null,
        completedAt: `${TODAY}T12:25:00.000Z`,
        tags: [],
        note: '',
        carrierId: null,
      },
    ],
    emotions: [{ id: 'm1', type: 'calm', note: '', createdAt: `${TODAY}T12:00:00.000Z` }],
  },
}

async function mountPanel(opts: { full?: boolean; anchors?: any[] } = {}) {
  if (opts.full) {
    seed(FULL.kvStore, FULL.extra)
  } else {
    seed()
  }
  const mod = await import('../JournalContextPanel.vue')
  const wrapper = mount(mod.default, {
    props: { anchors: opts.anchors ?? [] },
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('JournalContextPanel 手札建议', () => {
  it('有运行数据时渲染元数据条各维度 chip', async () => {
    const wrapper = await mountPanel({ full: true, anchors: [{ ...ANCHOR, done: true }] })
    const meta = wrapper.find('[data-test="jcp-meta"]')
    expect(meta.exists()).toBe(true)
    expect(wrapper.find('[data-test="jcp-chip-focus"]').text()).toContain('25 分钟')
    expect(wrapper.find('[data-test="jcp-chip-emotion"]').text()).toContain('平静')
    expect(wrapper.find('[data-test="jcp-chip-body"]').text()).toContain('30 分')
    expect(wrapper.find('[data-test="jcp-chip-anchor"]').text()).toContain('1/1')
    expect(wrapper.find('[data-test="jcp-chip-photo"]').text()).toContain('2 张')
    expect(wrapper.find('[data-test="jcp-chip-journal"]').text()).toContain('1 篇')
  })

  it('无运行数据时展示元数据空态与兜底建议卡', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="jcp-meta-empty"]').exists()).toBe(true)
    const card = wrapper.find('[data-test="jcp-card-empty-day"]')
    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('今天还很安静')
  })

  it('无手札但有数据时 first-journal 置顶，并保留 anchor-pending', async () => {
    const wrapper = await mountPanel({ anchors: [ANCHOR] })
    const cards = wrapper.findAll('[data-test="jcp-cards"] .jcp-card')
    expect(cards[0].attributes('data-test')).toBe('jcp-card-first-journal')
    expect(wrapper.find('[data-test="jcp-card-anchor-pending"]').exists()).toBe(true)
  })

  it('未完成心锚渲染 anchor-pending 卡并含未完成文本', async () => {
    const wrapper = await mountPanel({ anchors: [ANCHOR] })
    const card = wrapper.find('[data-test="jcp-card-anchor-pending"]')
    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('还有 1 个心锚未完成')
  })

  it('点选建议卡 emit apply（含预填文本与手札类型）', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('[data-test="jcp-card-empty-day"]').trigger('click')
    const emitted = wrapper.emitted('apply')
    expect(emitted).toBeTruthy()
    const payload = emitted![0][0] as { prefill: string; type: string }
    expect(payload.prefill).toContain('此刻最想记下的一件事')
    expect(payload.type).toBe('diary')
  })
})
