import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MirrorSceneCards from '../MirrorSceneCards.vue'

describe('MirrorSceneCards 组件', () => {
  setActivePinia(createPinia())

  it('渲染全部 11 个意图（不含 unknown，含 finance 记账）', () => {
    const wrapper = mount(MirrorSceneCards)
    expect(wrapper.findAll('.mssc-card').length).toBe(11)
  })

  it('点击卡片 emit launch 并携带正确意图', async () => {
    const wrapper = mount(MirrorSceneCards)
    const cards = wrapper.findAll('.mssc-card')
    await cards[0].trigger('click')
    const emitted = wrapper.emitted('launch') as unknown[][]
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toBe('focus')
  })

  it('支持外部传入自定义意图列表', () => {
    const wrapper = mount(MirrorSceneCards, {
      props: {
        intents: [
          { category: 'note', label: '笔记', icon: '📝', description: '记录' },
        ],
      },
    })
    expect(wrapper.findAll('.mssc-card').length).toBe(1)
  })
})
