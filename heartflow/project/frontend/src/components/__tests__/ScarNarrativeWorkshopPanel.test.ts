import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScarNarrativeWorkshopPanel from '../ScarNarrativeWorkshopPanel.vue'

describe('ScarNarrativeWorkshopPanel', () => {
  it('挂载不崩溃，含标题与四 Tab', () => {
    const wrapper = mount(ScarNarrativeWorkshopPanel, {
      props: { marks: [{ id: 'm1', description: 'test', bodyPart: 'heart', severity: 3, healingProgress: 50, healingStage: 'acute' }] as any },
    })
    expect(wrapper.find('.snw').exists()).toBe(true)
    expect(wrapper.text()).toContain('伤痕叙事工坊')
    expect(wrapper.findAll('.snw-tab')).toHaveLength(4)
    expect(wrapper.findAll('.snw-tab')[0].text()).toBe('故事')
  })

  it('切换 Tab 不崩溃', async () => {
    const wrapper = mount(ScarNarrativeWorkshopPanel, { props: { marks: [] } })
    const tabs = wrapper.findAll('.snw-tab')
    await tabs[1].trigger('click')
    await tabs[2].trigger('click')
    await tabs[3].trigger('click')
    expect(wrapper.find('.snw').exists()).toBe(true)
  })

  it('传入完整 BodyMark 时地图 Tab 可渲染、无 marks 时生成按钮禁用', async () => {
    const marks = [{
      id: 'm1', bodyPart: 'heart', severity: 3, description: 'x',
      scarType: 'cut', recordedAt: '2026-01-01', healingProgress: 50, healingStage: 'acute',
    }] as any
    const w1 = mount(ScarNarrativeWorkshopPanel, { props: { marks } })
    const t1 = w1.findAll('.snw-tab')
    await t1[2].trigger('click')
    expect(w1.find('.snw').exists()).toBe(true)

    const w2 = mount(ScarNarrativeWorkshopPanel, { props: { marks: [] } })
    const t2 = w2.findAll('.snw-tab')
    await t2[2].trigger('click')
    const genBtn = w2.findAll('button').find(b => b.text().includes('生成伤痕地图'))!
    expect(genBtn.attributes('disabled')).toBeDefined()
  })
})
