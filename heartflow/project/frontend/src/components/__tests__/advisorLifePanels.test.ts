// ============================================================
// 幕僚生活四面板测试（作息 / 互动 / 庆祝 / 见证）
//
// 背景（实证）：这四个面板共 1033 行，实现完备却从未被任何视图挂载
// （孤儿组件），本轮用一组标签页收进幕僚阁。这里守住底线：传入幕僚
// 名单后，四个面板都能挂载、能渲染各自内容，不因空数据抛错。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AdvisorDailyLifePanel from '../AdvisorDailyLifePanel.vue'
import AdvisorInteractionPanel from '../AdvisorInteractionPanel.vue'
import AdvisorCelebrationPanel from '../AdvisorCelebrationPanel.vue'
import AdvisorWitnessPanel from '../AdvisorWitnessPanel.vue'
import type { AdvisorProfile } from '../../types/advisor'

function makeAdvisor(id: string, name: string): AdvisorProfile {
  return {
    id,
    name,
    role: 'guardian',
    personality: 'gentle',
    state: 'awake',
    affinity: 30,
    level: 1,
  } as unknown as AdvisorProfile
}

const advisors = [makeAdvisor('a1', '守夜人'), makeAdvisor('a2', '书童')]

describe('幕僚生活四面板 · 挂载底线', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('作息面板：挂载成功并列出幕僚', () => {
    const w = mount(AdvisorDailyLifePanel, { props: { advisors } })
    expect(w.text()).toContain('守夜人')
    expect(w.text()).toContain('书童')
  })

  it('互动面板：挂载成功并列出幕僚', () => {
    const w = mount(AdvisorInteractionPanel, { props: { advisors } })
    expect(w.text()).toContain('守夜人')
  })

  it('庆祝面板：挂载成功并列出幕僚', () => {
    const w = mount(AdvisorCelebrationPanel, { props: { advisors } })
    expect(w.text()).toContain('守夜人')
  })

  it('见证面板：挂载成功，展示见证主题与统计', () => {
    const w = mount(AdvisorWitnessPanel, { props: { advisors } })
    expect(w.text()).toContain('幕僚见证你的每一次成长')
  })

  it('见证面板：空名单时不抛错，给出引导', () => {
    const w = mount(AdvisorWitnessPanel, { props: { advisors: [] } })
    expect(w.text()).toContain('先创建幕僚，才能记录见证')
  })

  it('四面板在空名单下都不抛错', () => {
    const panels = [
      AdvisorDailyLifePanel,
      AdvisorInteractionPanel,
      AdvisorCelebrationPanel,
      AdvisorWitnessPanel,
    ]
    for (const p of panels) {
      expect(() => mount(p, { props: { advisors: [] } })).not.toThrow()
    }
  })
})
