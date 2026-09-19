// ============================================================
// AnchorJournalRetroPanel 组件测试 - 逐日心锚·手札回溯（INCR-378）
// 纯函数引擎直引（anchor-journals + anchor-journal-templates），无 storage mock
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AnchorJournalRetroPanel from '../AnchorJournalRetroPanel.vue'
import type { AnchorJournal } from '../../modules/anchor/anchor-journals'

let seed = 0

function makeJournal(overrides: Partial<AnchorJournal> & { content: string }): AnchorJournal {
  seed += 1
  return {
    anchorId: `anchor_${seed}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function mountPanel(journals: AnchorJournal[]) {
  return mount(AnchorJournalRetroPanel, {
    props: { journals },
  })
}

describe('AnchorJournalRetroPanel 逐日心锚·手札回溯（INCR-378）', () => {
  it('空态：徽标归零，那年今日空态引导，检索卡不渲染，脚手架常驻 5 模板', () => {
    const wrapper = mountPanel([])
    expect(wrapper.find('[data-test="anchor-journal-retro-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('手札回溯')
    expect(wrapper.find('[data-test="ajr-badge"]').text()).toBe('共 0 篇')
    expect(wrapper.find('[data-test="ajr-this-day"]').text()).toContain('往年今日还没有留下手札')
    expect(wrapper.find('[data-test="ajr-search"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ajr-moods"]').exists()).toBe(false)
    const templates = wrapper.find('[data-test="ajr-templates"]')
    expect(templates.find('[data-test="ajr-tpl-three-things"]').exists()).toBe(true)
    expect(templates.find('[data-test="ajr-tpl-gratitude"]').exists()).toBe(true)
    expect(templates.find('[data-test="ajr-tpl-reflection"]').exists()).toBe(true)
    expect(templates.find('[data-test="ajr-tpl-inspiration"]').exists()).toBe(true)
    expect(templates.find('[data-test="ajr-tpl-free"]').exists()).toBe(true)
    expect(templates.text()).toContain('今日三件事')
    expect(templates.text()).toContain('自由书写')
  })

  it('那年今日：往年同月同日条目列示，今年条目排除', () => {
    const now = new Date()
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 12, 0, 0)
    const entries = [
      makeJournal({ content: '去年的今天去了江边', title: '旧年同日', createdAt: lastYear.toISOString() }),
      makeJournal({ content: '今年的今天', title: '今天', createdAt: now.toISOString() }),
    ]
    const wrapper = mountPanel(entries)
    const thisDay = wrapper.find('[data-test="ajr-this-day"]')
    expect(thisDay.text()).toContain('旧年同日')
    // 条目按创建日期渲染，日期键应呈现去年年份
    expect(thisDay.text()).toContain(String(now.getFullYear() - 1))
    expect(thisDay.text()).not.toContain('今天')
  })

  it('心情分布：各情绪计数与占比条', () => {
    const entries = [
      makeJournal({ content: 'a', title: 'A', mood: '开心' }),
      makeJournal({ content: 'b', title: 'B', mood: '开心' }),
      makeJournal({ content: 'c', title: 'C', mood: '平静' }),
      makeJournal({ content: 'd', title: 'D' }),
    ]
    const wrapper = mountPanel(entries)
    const moods = wrapper.find('[data-test="ajr-moods"]')
    expect(moods.exists()).toBe(true)
    expect(moods.text()).toContain('开心')
    expect(moods.text()).toContain('平静')
    // 开心 2/4 = 50%，平静 1/4 = 25%
    expect(wrapper.find('.ajr-mood-seg').attributes('style')).toContain('50%')
  })

  it('组合检索：关键词过滤命中标题与内容', async () => {
    const entries = [
      makeJournal({ content: '今天完成了晨跑', title: '晨跑记录', mood: '振奋' }),
      makeJournal({ content: '读了半本书', title: '阅读' }),
    ]
    const wrapper = mountPanel(entries)
    await wrapper.find('[data-test="ajr-keyword"]').setValue('晨跑')
    expect(wrapper.find('[data-test="ajr-search"]').text()).toContain('晨跑记录')
    expect(wrapper.find('[data-test="ajr-search"]').text()).not.toContain('阅读')
  })

  it('组合检索：情绪过滤与日期范围叠加', async () => {
    const entries = [
      makeJournal({ content: '一号', title: '甲', mood: '开心', createdAt: '2026-01-05T10:00:00.000Z' }),
      makeJournal({ content: '二号', title: '乙', mood: '平静', createdAt: '2026-03-05T10:00:00.000Z' }),
    ]
    const wrapper = mountPanel(entries)
    await wrapper.find('[data-test="ajr-mood"]').setValue('开心')
    expect(wrapper.find('[data-test="ajr-search"]').text()).toContain('甲')
    expect(wrapper.find('[data-test="ajr-search"]').text()).not.toContain('乙')
    await wrapper.find('[data-test="ajr-mood"]').setValue('')
    await wrapper.find('[data-test="ajr-from"]').setValue('2026-02-01')
    expect(wrapper.find('[data-test="ajr-search"]').text()).toContain('乙')
    expect(wrapper.find('[data-test="ajr-search"]').text()).not.toContain('甲')
  })

  it('组合检索：无匹配提示', async () => {
    const entries = [makeJournal({ content: '随便写写', title: '随笔', mood: '平静' })]
    const wrapper = mountPanel(entries)
    await wrapper.find('[data-test="ajr-keyword"]').setValue('不存在的词')
    expect(wrapper.find('[data-test="ajr-search"]').text()).toContain('没有匹配的手札')
  })
})
