// ============================================================
// ScarArchivePanel 铸造档案面板测试
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScarArchivePanel from '../ScarArchivePanel.vue'
import type { ScarMark } from '../../modules/scar/marks'

const DAY = 86_400_000
const NOW = new Date('2026-08-22T12:00:00.000Z')

function mk(
  bodyPart: string,
  severity: number,
  scarType: ScarMark['scarType'],
  daysAgo: number,
): ScarMark {
  return {
    id: `${bodyPart}_${Math.random().toString(36).slice(2, 6)}`,
    bodyPart,
    severity,
    description: '',
    scarType,
    at: new Date(NOW.getTime() - daysAgo * DAY).toISOString(),
  }
}

function mountPanel(marks: ScarMark[]) {
  return mount(ScarArchivePanel, { props: { marks } })
}

describe('ScarArchivePanel 铸造档案', () => {
  it('空态：标题 + 印记待启徽标 + 引导文案', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('铸造档案')
    expect(wrapper.text()).toContain('印记待启')
    expect(wrapper.text()).toContain('工痕尚未开炉')
  })

  it('填充态：健康标签徽标', () => {
    const marks = [
      mk('腰', 3, 'wear', 60),
      mk('肩', 4, 'impact', 50),
      mk('手', 2, 'cut', 40),
      mk('脚', 1, 'burn', 30),
      mk('背', 3, 'impact', 20),
      mk('腿', 2, 'wear', 10),
      mk('颈', 3, 'cut', 5),
      mk('头', 2, 'burn', 1),
    ]
    const wrapper = mountPanel(marks)
    const badge = wrapper.find('.scap-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).not.toBe('印记待启')
  })

  it('填充态：档案概览八格', () => {
    const marks = [
      mk('腰', 3, 'wear', 5),
      mk('肩', 4, 'impact', 10),
      mk('手', 5, 'cut', 2),
    ]
    const wrapper = mountPanel(marks)
    const overviewBlock = wrapper.findAll('.scap-block').find((b) => b.text().includes('档案概览'))!
    const cells = overviewBlock.findAll('.scap-cell')
    expect(cells.length).toBe(8)
    expect(wrapper.text()).toContain('总印记')
    expect(wrapper.text()).toContain('平均严重度')
    expect(wrapper.text()).toContain('最近记录')
  })

  it('填充态：锻造节律五格', () => {
    const marks = [
      mk('腰', 3, 'wear', 0),
      mk('肩', 2, 'cut', 1),
      mk('手', 1, 'burn', 2),
    ]
    const wrapper = mountPanel(marks)
    const cells = wrapper.findAll('.scap-cell')
    expect(cells.length).toBe(13) // 8 概览 + 5 节律
    expect(wrapper.text()).toContain('近7天')
    expect(wrapper.text()).toContain('连续记录')
  })

  it('填充态：铸造健康分数与三进度条', () => {
    const marks = [
      mk('腰', 3, 'wear', 60),
      mk('肩', 4, 'impact', 50),
      mk('手', 2, 'cut', 40),
      mk('脚', 1, 'burn', 30),
      mk('背', 3, 'impact', 20),
      mk('腿', 2, 'wear', 10),
      mk('颈', 3, 'cut', 5),
      mk('头', 2, 'burn', 1),
    ]
    const wrapper = mountPanel(marks)
    const score = wrapper.find('.scap-health-score b')
    expect(Number(score.text())).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('觉察广度')
    expect(wrapper.text()).toContain('沉淀深度')
    expect(wrapper.text()).toContain('锻造节律')
    expect(wrapper.findAll('.scap-health-bar').length).toBe(3)
  })

  it('填充态：温和洞察列表', () => {
    const marks = [
      mk('腰', 5, 'impact', 1),
      mk('肩', 4, 'burn', 2),
      mk('手', 1, 'cut', 30),
    ]
    const wrapper = mountPanel(marks)
    const insights = wrapper.findAll('.scap-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
  })
})
