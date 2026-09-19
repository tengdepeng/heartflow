// ============================================================
// RootVitalityPanel 组件测试 - 文明根系·生命力栽培（INCR-377）
// 纯函数引擎直引（root-vitality），无 storage mock
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RootVitalityPanel from '../RootVitalityPanel.vue'
import type { FolkloreEntry } from '../../modules/traditions/types'

const DAY = 86400000

function makeEntry(overrides: Partial<FolkloreEntry> & { name: string }): FolkloreEntry {
  return {
    id: `folklore_${Math.random().toString(36).slice(2, 7)}`,
    category: 'seasonal',
    region: '江南',
    description: '',
    steps: [],
    materials: [],
    meanings: [],
    tags: [],
    endangered: false,
    source: 'personal',
    mediaUrls: [],
    recordedAt: new Date(Date.now() - 3 * DAY).toISOString(),
    practiceCount: 0,
    ...overrides,
  }
}

function mountPanel(entries: FolkloreEntry[], terms?: string[]) {
  return mount(RootVitalityPanel, {
    props: { entries, terms },
  })
}

describe('RootVitalityPanel 文明根系·生命力栽培（INCR-377）', () => {
  it('空态：标题与徽标归零，各守卫卡不渲染', () => {
    const wrapper = mountPanel([])
    expect(wrapper.find('[data-test="root-vitality-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('根系生命力')
    expect(wrapper.find('[data-test="rvt-badge"]').text()).toBe('共 0 条 · 均值 0')
    expect(wrapper.find('[data-test="rvt-overview"]').text()).toContain('文明根系还是空的')
    expect(wrapper.find('[data-test="rvt-thriving"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="rvt-withering"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="rvt-nurture"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="rvt-terms"]').exists()).toBe(false)
  })

  it('培育总览：四阶段分布计数与均值徽标', () => {
    // seed: 0 实践且久未记录 → 20 分；sprout: 1 实践约 50 天前 → 43 分
    // wood: 5 实践约 30 天前 → 68 分；canopy: 10 实践今天 → 87 分
    const entries = [
      makeEntry({ name: '旧手艺', recordedAt: new Date(Date.now() - 200 * DAY).toISOString() }),
      makeEntry({
        name: '晨间吟诵',
        practiceCount: 1,
        recordedAt: new Date(Date.now() - 50 * DAY).toISOString(),
        lastPracticedAt: new Date(Date.now() - 50 * DAY).toISOString(),
      }),
      makeEntry({
        name: '竹编',
        practiceCount: 5,
        recordedAt: new Date(Date.now() - 30 * DAY).toISOString(),
        lastPracticedAt: new Date(Date.now() - 30 * DAY).toISOString(),
      }),
      makeEntry({
        name: '端午龙舟',
        practiceCount: 10,
        lastPracticedAt: new Date().toISOString(),
      }),
    ]
    const wrapper = mountPanel(entries)
    const badge = wrapper.find('[data-test="rvt-badge"]').text()
    expect(badge).toContain('共 4 条')
    expect(badge).toContain('均值 55') // (20+43+68+87)/4 = 54.5 → 55
    expect(wrapper.find('[data-test="rvt-stage-seed"]').text()).toContain('1')
    expect(wrapper.find('[data-test="rvt-stage-sprout"]').text()).toContain('1')
    expect(wrapper.find('[data-test="rvt-stage-wood"]').text()).toContain('1')
    expect(wrapper.find('[data-test="rvt-stage-canopy"]').text()).toContain('1')
    expect(wrapper.find('[data-test="rvt-overview"]').text()).toContain('种子')
    expect(wrapper.find('[data-test="rvt-overview"]').text()).toContain('华盖')
  })

  it('枝繁叶茂：高生命力条目列示', () => {
    const entries = [
      makeEntry({ name: '端午龙舟', practiceCount: 10, lastPracticedAt: new Date().toISOString() }),
      makeEntry({ name: '竹编', practiceCount: 5, recordedAt: new Date(Date.now() - 30 * DAY).toISOString(), lastPracticedAt: new Date(Date.now() - 30 * DAY).toISOString() }),
      makeEntry({ name: '旧手艺', recordedAt: new Date(Date.now() - 200 * DAY).toISOString() }),
    ]
    const wrapper = mountPanel(entries)
    const thriving = wrapper.find('[data-test="rvt-thriving"]')
    expect(thriving.exists()).toBe(true)
    expect(thriving.text()).toContain('端午龙舟')
    expect(thriving.text()).toContain('竹编')
    expect(thriving.text()).toContain('87')
    expect(thriving.text()).toContain('68')
    expect(thriving.text()).not.toContain('旧手艺')
  })

  it('凋零守望：低生命力与濒危久未实践条目列示并带濒危标记', () => {
    const entries = [
      makeEntry({ name: '失传小调', endangered: true, recordedAt: new Date(Date.now() - 300 * DAY).toISOString(), lastPracticedAt: new Date(Date.now() - 300 * DAY).toISOString() }),
      makeEntry({ name: '旧手艺', recordedAt: new Date(Date.now() - 200 * DAY).toISOString() }),
    ]
    const wrapper = mountPanel(entries)
    const withering = wrapper.find('[data-test="rvt-withering"]')
    expect(withering.exists()).toBe(true)
    expect(withering.text()).toContain('失传小调')
    expect(withering.text()).toContain('濒危')
    expect(withering.text()).toContain('旧手艺')
  })

  it('此刻浇灌：超过新鲜度窗口的条目提示未实践天数', () => {
    const entries = [
      makeEntry({ name: '旧手艺', recordedAt: new Date(Date.now() - 200 * DAY).toISOString() }),
      makeEntry({ name: '晨间吟诵', practiceCount: 1, recordedAt: new Date(Date.now() - 10 * DAY).toISOString(), lastPracticedAt: new Date(Date.now() - 10 * DAY).toISOString() }),
    ]
    const wrapper = mountPanel(entries)
    const nurture = wrapper.find('[data-test="rvt-nurture"]')
    expect(nurture.exists()).toBe(true)
    expect(nurture.text()).toContain('旧手艺')
    expect(nurture.text()).toContain('200 天未实践')
    expect(nurture.text()).not.toContain('晨间吟诵')
  })

  it('岁时关联：传入节气词时命中条目列示，未传不渲染', () => {
    const entries = [
      makeEntry({ name: '端午龙舟', category: 'seasonal', tags: ['龙舟', '节令'] }),
      makeEntry({ name: '竹编', category: 'handicraft', tags: ['竹器'] }),
    ]
    const withTerms = mountPanel(entries, ['端午'])
    const termsCard = withTerms.find('[data-test="rvt-terms"]')
    expect(termsCard.exists()).toBe(true)
    expect(termsCard.text()).toContain('端午龙舟')
    expect(termsCard.text()).toContain('端午')
    expect(termsCard.text()).not.toContain('竹编')

    const withoutTerms = mountPanel(entries)
    expect(withoutTerms.find('[data-test="rvt-terms"]').exists()).toBe(false)
  })
})
