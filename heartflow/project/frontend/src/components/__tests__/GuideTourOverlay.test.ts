// ============================================================
// GuideTourOverlay · 分步引导蒙层覆盖层（INCR-500）测试
// 覆盖：未激活不渲染 / start 后渲染首步 / 推进与末步文案 / 跳过。
// 覆盖层 Teleport 到 body，故通过 document 查询。
// 依赖真实 guide-tour 引擎 + 真实 storage（jsdom）。
// ============================================================
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { storage } from '../../engine/storage'
import { useGuideTour, reloadGuideTour } from '../../modules/guide-tour/guide-tour'
import GuideTourOverlay from '../GuideTourOverlay.vue'

const KEY = 'hf:guide_tour'
const TOUR_ID = 'touchpoints-tour'

let w: VueWrapper | null = null

function q(sel: string): HTMLElement | null {
  return document.body.querySelector(sel) as HTMLElement | null
}

describe('GuideTourOverlay · 分步引导蒙层', () => {
  beforeEach(() => {
    storage.setKV(KEY, '')
    reloadGuideTour()
  })

  afterEach(() => {
    w?.unmount()
    w = null
    document.body.innerHTML = ''
  })

  it('未激活时不渲染蒙层', async () => {
    w = mount(GuideTourOverlay, { attachTo: document.body })
    await nextTick()
    expect(q('.gt-root')).toBeNull()
  })

  it('start 后渲染蒙层与首步气泡', async () => {
    w = mount(GuideTourOverlay, { attachTo: document.body })
    useGuideTour().start(TOUR_ID)
    await nextTick()
    await nextTick()
    const root = q('.gt-root')
    expect(root).toBeTruthy()
    expect(root!.textContent).toContain('1 / 4')
    expect(root!.textContent).toContain('通知设置')
  })

  it('下一步推进计数，末步按钮文案为完成', async () => {
    w = mount(GuideTourOverlay, { attachTo: document.body })
    useGuideTour().start(TOUR_ID)
    await nextTick()
    await nextTick()
    expect(q('.gt-btn--primary')!.textContent).toContain('下一步')

    q('.gt-btn--primary')!.click()
    await nextTick()
    expect(q('.gt-root')!.textContent).toContain('2 / 4')

    for (let i = 0; i < 2; i++) {
      q('.gt-btn--primary')!.click()
      await nextTick()
    }
    expect(q('.gt-root')!.textContent).toContain('4 / 4')
    expect(q('.gt-btn--primary')!.textContent).toContain('完成')
  })

  it('跳过关闭蒙层并标记已完成', async () => {
    w = mount(GuideTourOverlay, { attachTo: document.body })
    const g = useGuideTour()
    g.start(TOUR_ID)
    await nextTick()
    await nextTick()
    q('.gt-btn--ghost')!.click()
    await nextTick()
    expect(q('.gt-root')).toBeNull()
    expect(g.isCompleted(TOUR_ID)).toBe(true)
  })
})
