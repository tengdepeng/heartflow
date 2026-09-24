// ============================================================
// SeedLineageGraphPanel 组件测试 · 种子遗传图谱（INCR-409）
// 薄委托：数据（allSeeds）来自 mocked usePlayBridge，
// 图谱计算走真实 seed-share 纯函数（buildSeedGraph / computeGraphSummary）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { TimeSeed } from '../../modules/play/time-seed'

const h = vi.hoisted(() => {
  // 纯对象容器（形状与 ref 一致：.value），避免 hoisted 前引用运行时 import
  const allSeeds: { value: TimeSeed[] } = { value: [] }
  return { allSeeds }
})

vi.mock('../../modules/play/play-bridge', () => ({
  usePlayBridge: () => ({ allSeeds: h.allSeeds }),
}))

import SeedLineageGraphPanel from '../SeedLineageGraphPanel.vue'

/** 构造测试种子 */
function seed(partial: Partial<TimeSeed> & { id: string; name: string; tags: string[] }): TimeSeed {
  return {
    source: 'game',
    sourceId: partial.id,
    timestamp: '2026-01-01T00:00:00.000Z',
    emotion: 0.5,
    description: '',
    inherited: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  } as TimeSeed
}

function mountPanel() {
  return mount(SeedLineageGraphPanel)
}

describe('SeedLineageGraphPanel 遗传种子图谱', () => {
  beforeEach(() => {
    h.allSeeds.value = []
  })

  it('空态：无种子时显示提示，节点数为 0', async () => {
    h.allSeeds.value = []
    const wrapper = mountPanel()
    await nextTick()
    expect(wrapper.text()).toContain('遗传种子图谱')
    expect(wrapper.text()).toContain('还没有收藏种子')
    expect(wrapper.find('[data-testid="slg-node-count"]').text()).toBe('0')
    expect(wrapper.find('.slg-node').exists()).toBe(false)
  })

  it('图摘要：种子数/连接边/最大度来自真实 buildSeedGraph+computeGraphSummary', async () => {
    h.allSeeds.value = [
      seed({ id: 'g1', name: '塞尔达', rarity: 'epic', tags: ['冒险', '开放世界', '任天堂'] }),
      seed({ id: 'g2', name: '旷野', rarity: 'legendary', tags: ['冒险', '开放世界'] }),
      seed({ id: 't1', name: '手办A', rarity: 'common', tags: ['手办', '任天堂'] }),
    ]
    const wrapper = mountPanel()
    await nextTick()
    // 节点 3，边（g1-g2、g1-t1）2 条，最大度 2（g1）
    expect(wrapper.find('[data-testid="slg-node-count"]').text()).toBe('3')
    expect(wrapper.find('[data-testid="slg-edge-count"]').text()).toBe('2')
    expect(wrapper.find('[data-testid="slg-max-degree"]').text()).toBe('2')
    // 三个节点都渲染
    expect(wrapper.findAll('.slg-node').length).toBe(3)
  })

  it('点击种子节点：显示其血脉连接与共享标签', async () => {
    h.allSeeds.value = [
      seed({ id: 'g1', name: '塞尔达', rarity: 'epic', tags: ['冒险', '开放世界', '任天堂'] }),
      seed({ id: 'g2', name: '旷野', rarity: 'legendary', tags: ['冒险', '开放世界'] }),
      seed({ id: 't1', name: '手办A', rarity: 'common', tags: ['手办', '任天堂'] }),
    ]
    const wrapper = mountPanel()
    await nextTick()
    await wrapper.find('[data-testid="slg-node-g1"]').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('「塞尔达」的血脉')
    expect(wrapper.text()).toContain('与 2 枚种子共享标签')
    // 两个 friend 节点 + 共享标签
    expect(wrapper.find('.slg-edge-row:first-child .slg-edge-friend').text()).toBe('旷野')
    expect(wrapper.findAll('.slg-edge-tags').length).toBe(2)
    expect(wrapper.text()).toContain('冒险')
    expect(wrapper.text()).toContain('开放世界')
  })

  it('孤立种子的血脉为空提示', async () => {
    h.allSeeds.value = [
      seed({ id: 'g1', name: '塞尔达', rarity: 'epic', tags: ['冒险', '开放世界', '任天堂'] }),
      seed({ id: 'g2', name: '钢琴', rarity: 'common', tags: ['乐器', '练习'] }),
    ]
    const wrapper = mountPanel()
    await nextTick()
    await wrapper.find('[data-testid="slg-node-g2"]').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('与 0 枚种子共享标签')
    expect(wrapper.text()).toContain('孤独却独特')
  })

  it('再次点击选中种子取消选中，回到提示', async () => {
    h.allSeeds.value = [
      seed({ id: 'g1', name: '塞尔达', rarity: 'epic', tags: ['冒险', '开放世界', '任天堂'] }),
      seed({ id: 'g2', name: '旷野', rarity: 'legendary', tags: ['冒险', '开放世界'] }),
    ]
    const wrapper = mountPanel()
    await nextTick()
    const node = wrapper.find('[data-testid="slg-node-g1"]')
    await node.trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="slg-selected-edges"]').exists()).toBe(true)
    await node.trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="slg-selected-edges"]').exists()).toBe(false)
  })

  it('最连接种子 Top：依赖真实 degree 排序', async () => {
    h.allSeeds.value = [
      seed({ id: 'g1', name: '塞尔达', rarity: 'epic', tags: ['冒险', '开放世界', '任天堂'] }),
      seed({ id: 'g2', name: '旷野', rarity: 'legendary', tags: ['冒险', '开放世界'] }),
      seed({ id: 't1', name: '手办A', rarity: 'common', tags: ['手办', '任天堂'] }),
    ]
    const wrapper = mountPanel()
    await nextTick()
    // 最高连接节点的 rank1 = 塞尔达（degree 2）
    expect(wrapper.find('.slg-top-row .slg-top-rank').text()).toBe('1')
    expect(wrapper.text()).toContain('2 条连接')
  })
})