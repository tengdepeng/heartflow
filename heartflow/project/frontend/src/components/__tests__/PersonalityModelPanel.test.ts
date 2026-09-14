// ============================================================
// PersonalityModelPanel 组件测试（INCR-82：镜我·人格建模）
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PersonalityModelPanel from '../PersonalityModelPanel.vue'
import type { SelfTalk } from '../../modules/self'

const storageMock = new Map<string, unknown>()

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, defaultValue: T): T => {
      const val = storageMock.get(key)
      return val !== undefined ? val as T : defaultValue
    },
    setKV: (key: string, value: unknown) => {
      storageMock.set(key, value)
    },
    removeKV: (key: string) => {
      storageMock.delete(key)
    },
  },
}))

function iso(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

function mkTalks(count: number): SelfTalk[] {
  const templates = [
    '我今天感觉很开心，因为完成了一个重要的项目。',
    '最近在想，为什么我总是容易焦虑？也许需要更深入地反思一下。',
    '我觉得自己需要更多的独立空间，但同时也渴望与人连接。',
    '今天学习了一些新的知识，感觉成长了很多。',
    '和朋友聊天让我感到温暖，谢谢他们的陪伴。',
    '我想创建一个新的计划，帮助自己更好地管理时间。',
    '最近在思考人生的意义，有时候觉得迷茫，有时候又觉得充满希望。',
    '完成了一个目标！虽然过程很辛苦，但结果很值得。',
    '今天尝试了一些新的方法，发现效果很好，很有创造力的一天。',
    '我觉得应该更坦诚地面对自己的感受，不要总是伪装。',
    '工作太累了，需要好好休息一下，找到生活的平衡。',
    '好奇心驱使我探索了很多新领域，这个世界真有趣。',
    '为什么我总是在重复同样的模式？也许需要认真分析一下。',
    '谢谢你的建议，我会认真考虑的。',
    '今天心情不太好，但没关系，明天会更好。',
  ]
  return Array.from({ length: count }, (_, i) => ({
    id: `t${i}`,
    text: `${templates[i % templates.length]} ${i}`,
    at: iso(i),
    roomContext: i % 2 === 0 ? '时间长廊' : null,
  }))
}

beforeEach(() => {
  storageMock.clear()
})

describe('PersonalityModelPanel', () => {
  it('无画像时展示空态', () => {
    const wrapper = mount(PersonalityModelPanel, { props: { talks: [] } })
    expect(wrapper.find('.pmp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('人格建模')
    expect(wrapper.text()).toContain('暂无人格画像')
  })

  it('对话不足时提示还需多少条', () => {
    const wrapper = mount(PersonalityModelPanel, { props: { talks: mkTalks(5) } })
    expect(wrapper.text()).toContain('还需 15 条对话')
  })

  it('有足够对话时点击分析风格生成画像', async () => {
    const wrapper = mount(PersonalityModelPanel, { props: { talks: mkTalks(30) } })
    const btn = wrapper.findAll('button').find(b => b.text().includes('分析风格'))
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    expect(wrapper.text()).toContain('风格维度')
    expect(wrapper.text()).toContain('表达偏好')
  })

  it('标签导航可切换到价值观页并分析', async () => {
    const wrapper = mount(PersonalityModelPanel, { props: { talks: mkTalks(60) } })
    const valuesTab = wrapper.findAll('.pmp-tab').find(t => t.text().includes('价值观'))
    expect(valuesTab).toBeDefined()
    await valuesTab!.trigger('click')
    const btn = wrapper.findAll('button').find(b => b.text().includes('分析价值观'))
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    expect(wrapper.text()).toContain('核心价值观')
    expect(wrapper.text()).toContain('价值观维度')
  })

  it('徽标展示画像与报告计数', async () => {
    const wrapper = mount(PersonalityModelPanel, { props: { talks: mkTalks(60) } })
    const styleBtn = wrapper.findAll('button').find(b => b.text().includes('分析风格'))
    await styleBtn!.trigger('click')
    expect(wrapper.find('.pmp-badge').text()).toContain('1 画像')
  })
})
