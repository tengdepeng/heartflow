// ============================================================
// 阅览殿 · 金句墙 组件测试
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ReadingQuoteWallPanel from '../ReadingQuoteWallPanel.vue'
import { useReading } from '../../modules/reading'
import type { Excerpt } from '../../modules/reading'

function makeExcerpt(id: string, text: string, note = '', source = '三体'): Excerpt {
  return { id, source, text, note, createdAt: '2026-09-26T10:00:00.000Z' }
}

describe('ReadingQuoteWallPanel 金句墙', () => {
  beforeEach(() => {
    const reading = useReading()
    reading.excerpts.value = []
  })

  it('空摘录时显示空状态', () => {
    const w = mount(ReadingQuoteWallPanel)
    expect(w.text()).toContain('金句墙还空着')
    expect(w.findAll('.rqw-card')).toHaveLength(0)
  })

  it('摘录渲染为卡片墙，含金句/批注/来源/时间', () => {
    const reading = useReading()
    reading.excerpts.value = [
      makeExcerpt('e1', '给岁月以文明，而非给文明以岁月。', '宇宙级浪漫', '三体'),
      makeExcerpt('e2', '弱小和无知不是生存的障碍，傲慢才是。'),
    ]
    const w = mount(ReadingQuoteWallPanel)
    expect(w.findAll('.rqw-card')).toHaveLength(2)
    expect(w.find('[data-test="rqw-card-e1"] .rqw-quote').text()).toContain('给岁月以文明')
    expect(w.find('[data-test="rqw-card-e1"] .rqw-note').text()).toContain('宇宙级浪漫')
    expect(w.find('[data-test="rqw-card-e1"] .rqw-source').text()).toContain('三体')
    expect(w.find('[data-test="rqw-card-e1"] .rqw-time').text()).toContain('2026-09-26')
    // 无批注的卡片不渲染批注块
    expect(w.find('[data-test="rqw-card-e2"] .rqw-note').exists()).toBe(false)
  })

  it('删除卡片即时从墙与数据中移除', async () => {
    const reading = useReading()
    reading.excerpts.value = [
      makeExcerpt('e1', '第一句'),
      makeExcerpt('e2', '第二句'),
    ]
    const w = mount(ReadingQuoteWallPanel)
    expect(w.findAll('.rqw-card')).toHaveLength(2)
    await w.find('[data-test="rqw-del-e1"]').trigger('click')
    await w.vm.$nextTick()
    expect(w.findAll('.rqw-card')).toHaveLength(1)
    expect(w.find('[data-test="rqw-card-e1"]').exists()).toBe(false)
    expect(reading.excerpts.value).toHaveLength(1)
    expect(reading.excerpts.value[0].id).toBe('e2')
  })
})
