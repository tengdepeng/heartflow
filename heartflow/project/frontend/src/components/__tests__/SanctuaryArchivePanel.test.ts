// ============================================================
// SanctuaryArchivePanel 测试 - 安全岛档案面板（INCR-19）
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SanctuaryArchivePanel from '../SanctuaryArchivePanel.vue'
import type { SanctuaryLog, SanctuaryNote } from '../../modules/sanctuary'

const DAY = 24 * 60 * 60 * 1000

interface LogOverrides {
  durationSec?: number
  breathCount?: number
  notesReleased?: number
}

function makeLog(id: string, daysAgo = 0, o: LogOverrides = {}): SanctuaryLog {
  const at = Date.now() - daysAgo * DAY
  return {
    id,
    enterAt: new Date(at).toISOString(),
    exitAt: new Date(at + 6 * 60 * 1000).toISOString(),
    durationSec: o.durationSec ?? 600,
    breathCount: o.breathCount ?? 10,
    notesReleased: o.notesReleased ?? 1,
  }
}

function makeNote(id: string, text = '放下一句话'): SanctuaryNote {
  return { id, text, at: new Date().toISOString() }
}

function mountPanel(logs: SanctuaryLog[] = [], notes: SanctuaryNote[] = []) {
  return mount(SanctuaryArchivePanel, { props: { logs, notes } })
}

describe('SanctuaryArchivePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空库渲染档案标题与空态引导', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('安全岛档案')
    expect(wrapper.text()).toContain('安全岛还空着')
    expect(wrapper.find('.sanp-empty').exists()).toBe(true)
  })

  it('档案概览统计正确', () => {
    const logs = [
      makeLog('a', 0, { durationSec: 600 }),
      makeLog('b', 1, { durationSec: 600 }),
      makeLog('c', 2, { durationSec: 0 }),
    ]
    const wrapper = mountPanel(logs)
    const text = wrapper.text()
    expect(text).toContain('档案概览')
    expect(text).toContain('总访问')
    expect(text).toContain('总停留(分)')
    expect(text).toContain('平均每次(秒)')
    expect(text).toContain('安定率')
    expect(text).toContain('3')
    expect(text).toContain('20')
    expect(text).toContain('400')
    expect(text).toContain('67%')
    expect(wrapper.find('.sanp-empty').exists()).toBe(false)
  })

  it('驻足节奏渲染', () => {
    const logs = [makeLog('a', 0), makeLog('b', 1)]
    const wrapper = mountPanel(logs)
    const text = wrapper.text()
    expect(text).toContain('驻足节奏')
    expect(text).toContain('本周访问')
    expect(text).toContain('连续天数')
    expect(text).toContain('平均间隔')
    expect(text).toContain('偏好时段')
    expect(text).toContain('最近造访')
    expect(text).toContain('2')
  })

  it('深研修习分数与标签渲染', () => {
    const logs = [
      makeLog('a', 0, { durationSec: 1800, breathCount: 30 }),
      makeLog('b', 1, { durationSec: 1800, breathCount: 20 }),
      makeLog('c', 2, { durationSec: 1800, breathCount: 25 }),
    ]
    const wrapper = mountPanel(logs)
    const text = wrapper.text()
    expect(text).toContain('深研修习')
    expect(text).toContain('广度')
    expect(text).toContain('深度')
    expect(text).toContain('仪式感')
    expect(wrapper.find('.sanp-score').exists()).toBe(true)
  })

  it('温和洞察生成', () => {
    const logs = [
      makeLog('a', 0, { breathCount: 40 }),
      makeLog('b', 1, { durationSec: 0 }),
    ]
    const notes = [makeNote('n1'), makeNote('n2')]
    const wrapper = mountPanel(logs, notes)
    expect(wrapper.text()).toContain('温和洞察')
    expect(wrapper.find('.sanp-insights li').exists()).toBe(true)
  })
})