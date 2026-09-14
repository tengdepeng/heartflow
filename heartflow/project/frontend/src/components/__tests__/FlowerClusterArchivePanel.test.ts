// ============================================================
// FlowerClusterArchivePanel 组件测试 - INCR-143 花丛分布档案面板
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'

const mockEmotions = ref<any[]>([])
vi.mock('../../engine/storage', () => ({
  storage: {
    getEmotions: () => mockEmotions.value,
    setEmotions: (v: any[]) => {
      mockEmotions.value = v
    },
  },
}))

import FlowerClusterArchivePanel from '../FlowerClusterArchivePanel.vue'

describe('FlowerClusterArchivePanel (INCR-143)', () => {
  beforeEach(() => {
    mockEmotions.value = []
  })

  it('无记录时渲染空态', async () => {
    const wrapper = mount(FlowerClusterArchivePanel)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.gcp').exists()).toBe(true)
    expect(wrapper.text()).toContain('花丛分布')
    expect(wrapper.find('.gcp-empty').exists()).toBe(true)
  })

  it('有记录时渲染花丛分布与健康档案', async () => {
    mockEmotions.value = [
      { id: 'e1', type: 'happy', note: '', createdAt: new Date().toISOString() },
      { id: 'e2', type: 'happy', note: '', createdAt: new Date().toISOString() },
      { id: 'e3', type: 'sad', note: '', createdAt: new Date().toISOString() },
    ]
    const wrapper = mount(FlowerClusterArchivePanel)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.gcp-metrics').exists()).toBe(true)
    expect(wrapper.find('.gcp-cluster').exists()).toBe(true)
    expect(wrapper.find('.gcp-health-score').exists()).toBe(true)
    expect(wrapper.find('.gcp-lod-tag').text()).toBe('高精度')
  })
})
