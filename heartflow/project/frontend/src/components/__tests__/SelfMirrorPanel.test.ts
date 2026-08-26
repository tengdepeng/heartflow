import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const HOUSES_KEY = 'hf:self_mirror_houses'

function ratedHouses() {
  const ids = ['self', 'emotion', 'body', 'mind', 'work', 'wealth', 'family', 'social', 'love', 'hobby', 'spirit', 'future']
  const labels = ['自我认知', '情绪管理', '身体健康', '心智成长', '事业工作', '财富管理', '家庭关系', '社交关系', '情感关系', '兴趣创造', '精神信念', '未来方向']
  const icons = ['🧘', '💧', '🏃', '📚', '💼', '💰', '🏠', '🤝', '💞', '🎨', '🌟', '🧭']
  const descriptions = ids.map(i => `维度 ${i}`)
  return ids.map((id, i) => ({
    id,
    label: labels[i],
    icon: icons[i],
    description: descriptions[i],
    rating: i < 3 ? 5 : (i < 6 ? 3 : 1),
    note: '',
  }))
}

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../SelfMirrorPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('SelfMirrorPanel 自体镜像概览', () => {
  it('空状态显示未评估', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('自体镜像')
    expect(wrapper.text()).toContain('未评估')
  })

  it('展示平衡度与洞察', async () => {
    const wrapper = await mountPanel({ [HOUSES_KEY]: ratedHouses() })
    expect(wrapper.text()).toContain('平衡度')
    expect(wrapper.text()).toContain('星盘洞察')
    expect(wrapper.text()).toContain('最强')
    expect(wrapper.text()).toContain('最弱')
  })

  it('展示星级分布', async () => {
    const wrapper = await mountPanel({ [HOUSES_KEY]: ratedHouses() })
    expect(wrapper.text()).toContain('星级分布')
    expect(wrapper.text()).toContain('5 星')
    expect(wrapper.text()).toContain('1 星')
  })
})
