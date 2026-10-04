import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => (k in mockStore ? mockStore[k] : def),
    setKV: (k: string, val: any) => {
      mockStore[k] = val
    },
  },
}))

import AquariumPanel from '../AquariumPanel.vue'
import { useAquarium } from '../../modules/aquarium'

describe('AquariumPanel', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    useAquarium().clearAll()
  })

  it('renders title and empty guidance', () => {
    const w = mount(AquariumPanel)
    expect(w.text()).toContain('电子水族箱')
    expect(w.text()).toContain('累计投食')
    expect(w.text()).toContain('水中尚空')
  })

  it('adds a fish and feeds it', async () => {
    const w = mount(AquariumPanel)
    await w.find('.aq-btn--add').trigger('click')
    expect(w.findAll('.aq-fish').length).toBe(1)
    expect(w.text()).toContain('1 / 12 尾')
    expect(w.find('.aq-empty').exists()).toBe(false)

    const feedBtn = w.find('.aq-btn--feed')
    await feedBtn.trigger('click')
    await feedBtn.trigger('click')
    const stats = w.findAll('.aq-stat-num').map((n) => n.text())
    expect(stats[0]).toBe('1') // 鱼数
    expect(stats[1]).toBe('2') // 累计投食（1 尾 × 2 次）
    expect(stats[2]).toBe('2') // 今日投食
  })

  it('feed button is disabled while the tank is empty', () => {
    const w = mount(AquariumPanel)
    expect(w.find('.aq-btn--feed').attributes('disabled')).toBeDefined()
  })
})
