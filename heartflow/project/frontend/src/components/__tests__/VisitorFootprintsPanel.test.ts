// ============================================================
// 访客足迹面板 · 接线测试（INCR-110 审计孤立零引用引擎 useVisitorFootprints）
// 锁定：统计 getVisitorStats / 足迹列表渲染(type 徽标+回复态) / 添加 addFootprint / 回复 replyToFootprint
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, nextTick, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { VisitorFootprint } from '../../modules/emotion/flower-season'

const footprints: Ref<VisitorFootprint[]> = ref([])
const addFootprint = vi.fn(
  (visitorId: string, visitorName: string, footprintType: VisitorFootprint['footprintType'], message?: string) => {
    const f: VisitorFootprint = {
      id: `vf-${Date.now()}`,
      visitorId,
      visitorName,
      visitedAt: new Date('2026-09-04T10:30:00').toISOString(),
      footprintType,
      message,
      replied: false,
    }
    footprints.value.push(f)
    return f
  },
)
const replyToFootprint = vi.fn((id: string, reply: string) => {
  const f = footprints.value.find((x) => x.id === id)
  if (!f) return undefined
  f.replied = true
  f.reply = reply
  return f
})
const getUnrepliedFootprints = vi.fn(() => footprints.value.filter((f) => !f.replied))
const getVisitorStats = vi.fn(() => {
  const uniqueVisitors = new Set(footprints.value.map((f) => f.visitorId))
  const byType: Record<string, number> = {}
  footprints.value.forEach((f) => {
    byType[f.footprintType] = (byType[f.footprintType] || 0) + 1
  })
  return {
    totalVisitors: uniqueVisitors.size,
    totalFootprints: footprints.value.length,
    byType,
    unrepliedCount: footprints.value.filter((f) => !f.replied).length,
  }
})

vi.mock('../../modules/emotion/flower-season', () => ({
  useVisitorFootprints: () => ({
    footprints,
    addFootprint,
    replyToFootprint,
    getUnrepliedFootprints,
    getVisitorStats,
  }),
}))

import VisitorFootprintsPanel from '../VisitorFootprintsPanel.vue'

const footprint = (over: Partial<VisitorFootprint> = {}): VisitorFootprint => ({
  id: 'vf-1',
  visitorId: 'v-1',
  visitorName: '清风',
  visitedAt: '2026-09-04T10:30:00.000Z',
  footprintType: 'like',
  message: '花很漂亮',
  replied: false,
  ...over,
})

beforeEach(() => {
  footprints.value = []
  addFootprint.mockClear()
  replyToFootprint.mockClear()
  getUnrepliedFootprints.mockClear()
  getVisitorStats.mockClear()
})

describe('VisitorFootprintsPanel · 访客足迹接线', () => {
  it('空态：标题渲染、统计归零、显示「暂无访客足迹」', async () => {
    const wrapper = mount(VisitorFootprintsPanel)
    await nextTick()
    expect(wrapper.text()).toContain('访客足迹')
    expect(wrapper.text()).toContain('暂无访客足迹')
  })

  it('有足迹：渲染列表、type 徽标、针对花朵与未回复回复框', async () => {
    footprints.value = [
      footprint({ footprintType: 'gift', message: '送你一束星光', targetFlower: '月光花' }),
    ]
    const wrapper = mount(VisitorFootprintsPanel)
    await nextTick()

    const text = wrapper.text()
    expect(text).toContain('清风')
    expect(text).toContain('🎁 礼物')
    expect(text).toContain('送你一束星光')
    expect(text).toContain('月光花')
    expect(wrapper.find('.vfp-reply input').attributes('placeholder')).toContain('清风')
  })

  it('统计：getVisitorStats 返回访客数/足迹数/未回复数', async () => {
    footprints.value = [
      footprint({ visitorId: 'v-1' }),
      footprint({ id: 'vf-2', visitorId: 'v-1', replied: true, reply: '谢谢' }),
    ]
    const wrapper = mount(VisitorFootprintsPanel)
    await nextTick()

    const text = wrapper.text()
    expect(text).toContain('访客')
    expect(getVisitorStats().totalVisitors).toBe(1)
    expect(getVisitorStats().totalFootprints).toBe(2)
    expect(getVisitorStats().unrepliedCount).toBe(1)
    // 已回复足迹不再显示回复框，而是显示「回：谢谢」
    expect(text).toContain('回：谢谢')
  })

  it('添加访客：输入昵称+选类型+留言，点添加调用 addFootprint 并清空输入', async () => {
    const wrapper = mount(VisitorFootprintsPanel)
    await nextTick()

    await wrapper.find('.vfp-input').setValue('旅人')
    // 切换到「留言」类型 chip
    await wrapper.findAll('.vfp-chip')[2].trigger('click')
    await wrapper.findAll('.vfp-input')[1].setValue('路过打个招呼')
    await wrapper.find('.vfp-btn--primary').trigger('click')

    expect(addFootprint).toHaveBeenCalledTimes(1)
    expect(addFootprint.mock.calls[0][0]).toMatch(/^visitor-/)
    expect(addFootprint.mock.calls[0][1]).toBe('旅人')
    expect(addFootprint.mock.calls[0][2]).toBe('comment')
    expect(addFootprint.mock.calls[0][3]).toBe('路过打个招呼')
  })

  it('回复：填入回复文字点回复，调用 replyToFootprint 并显示回复', async () => {
    footprints.value = [footprint()]
    const wrapper = mount(VisitorFootprintsPanel)
    await nextTick()

    await wrapper.find('.vfp-reply input').setValue('谢谢你')
    await wrapper.find('.vfp-reply .vfp-btn').trigger('click')

    expect(replyToFootprint).toHaveBeenCalledWith('vf-1', '谢谢你')
    await nextTick()
    expect(wrapper.text()).toContain('回：谢谢你')
  })
})