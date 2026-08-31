// ============================================================
// MovementArchivePanel 动律档案面板测试
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MovementArchivePanel from '../MovementArchivePanel.vue'
import type { Move } from '../../modules/movement/movement-log'

function mk(partial: Partial<Move> & { at: string }): Move {
  return {
    id: `m${Math.random().toString(36).slice(2, 6)}`,
    type: 'run',
    duration: 30,
    withWhom: '',
    location: '',
    note: '',
    isMoment: false,
    ...partial,
  }
}

function mountPanel(moves: Move[]) {
  return mount(MovementArchivePanel, { props: { moves } })
}

describe('MovementArchivePanel 动律档案', () => {
  it('空态：标题 + 静待启程徽标 + 引导文案', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('动律档案')
    expect(wrapper.text()).toContain('静待启程')
    expect(wrapper.text()).toContain('身体还空着')
  })

  it('填充态：健康标签徽标（非空态标签）', () => {
    const moves = Array.from({ length: 30 }, (_, i) =>
      mk({
        type: ['run', 'swim', 'yoga', 'gym', 'dance'][i % 5],
        duration: 30,
        isMoment: i % 3 === 0,
        at: `2026-08-${String((i % 15) + 1).padStart(2, '0')}T09:00:00+08:00`,
      })
    )
    const wrapper = mountPanel(moves)
    const badge = wrapper.find('.mvap-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).not.toBe('静待启程')
  })

  it('填充态：档案概览八格', () => {
    const moves = [
      mk({ type: 'run', duration: 30, at: '2026-08-15T09:00:00+08:00' }),
      mk({ type: 'swim', duration: 60, at: '2026-08-14T09:00:00+08:00' }),
      mk({ type: 'hike', duration: 90, at: '2026-07-20T09:00:00+08:00' }),
    ]
    const wrapper = mountPanel(moves)
    const overviewBlock = wrapper.findAll('.mvap-block').find((b) => b.text().includes('档案概览'))!
    const cells = overviewBlock.findAll('.mvap-cell')
    expect(cells.length).toBe(8)
    expect(wrapper.text()).toContain('总次数')
    expect(wrapper.text()).toContain('平均时长')
    expect(wrapper.text()).toContain('最长单次')
  })

  it('填充态：运动节律六格', () => {
    const moves = [
      mk({ at: '2026-08-15T09:00:00+08:00' }),
      mk({ at: '2026-08-14T09:00:00+08:00' }),
      mk({ at: '2026-08-10T09:00:00+08:00' }),
    ]
    const wrapper = mountPanel(moves)
    const cells = wrapper.findAll('.mvap-cell')
    expect(cells.length).toBe(14) // 8 概览 + 6 节律
    expect(wrapper.text()).toContain('活跃天数')
    expect(wrapper.text()).toContain('当前连续')
    expect(wrapper.text()).toContain('周均频次')
  })

  it('填充态：运动健康分数与三进度条', () => {
    const moves = Array.from({ length: 20 }, (_, i) =>
      mk({
        type: ['run', 'swim', 'yoga', 'gym', 'dance'][i % 5],
        duration: 30,
        isMoment: i % 3 === 0,
        at: `2026-08-${String((i % 15) + 1).padStart(2, '0')}T09:00:00+08:00`,
      })
    )
    const wrapper = mountPanel(moves)
    const score = wrapper.find('.mvap-health-score b')
    expect(Number(score.text())).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('频率')
    expect(wrapper.text()).toContain('多样性')
    expect(wrapper.text()).toContain('仪式')
    expect(wrapper.findAll('.mvap-health-bar').length).toBe(3)
  })

  it('填充态：类型分布与同游者', () => {
    const moves = [
      mk({ type: 'run', withWhom: '阿明', at: '2026-08-15T09:00:00+08:00' }),
      mk({ type: 'run', withWhom: '阿明', at: '2026-08-14T09:00:00+08:00' }),
      mk({ type: 'swim', withWhom: '小北', at: '2026-08-13T09:00:00+08:00' }),
    ]
    const wrapper = mountPanel(moves)
    expect(wrapper.text()).toContain('类型分布')
    expect(wrapper.text()).toContain('跑步')
    expect(wrapper.text()).toContain('同游者')
    expect(wrapper.text()).toContain('阿明')
    expect(wrapper.text()).toContain('小北')
  })

  it('填充态：温和洞察列表有界', () => {
    const moves = Array.from({ length: 20 }, (_, i) =>
      mk({
        type: ['run', 'swim', 'yoga'][i % 3],
        isMoment: i % 2 === 0,
        withWhom: '阿明',
        duration: 60,
        at: `2026-08-${String((i % 10) + 1).padStart(2, '0')}T09:00:00+08:00`,
      })
    )
    const wrapper = mountPanel(moves)
    const insights = wrapper.findAll('.mvap-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
  })

  it('数据联动：props 变化后档案随之更新', async () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('静待启程')
    await wrapper.setProps({
      moves: Array.from({ length: 30 }, (_, i) =>
        mk({
          type: ['run', 'swim', 'yoga', 'gym', 'dance'][i % 5],
          duration: 30,
          isMoment: i % 3 === 0,
          at: `2026-08-${String((i % 15) + 1).padStart(2, '0')}T09:00:00+08:00`,
        })
      ),
    })
    expect(wrapper.text()).toContain('档案概览')
    expect(wrapper.text()).toContain('总次数')
    expect(wrapper.text()).toContain('运动节律')
  })
})
