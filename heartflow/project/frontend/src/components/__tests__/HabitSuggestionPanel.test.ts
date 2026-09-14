// ============================================================
// HabitSuggestionPanel 组件测试 - INCR-147 习惯建议面板
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const store: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => (k in store ? store[k] : def),
    setKV: (k: string, v: any) => {
      store[k] = v
    },
  },
}))

import { useDisciplineBridge } from '@/modules/discipline/workshop-bridge'
import HabitSuggestionPanel from '../HabitSuggestionPanel.vue'

describe('HabitSuggestionPanel (INCR-147)', () => {
  beforeEach(() => {
    for (const k in store) delete store[k]
  })

  it('挂载渲染标题、副标、为你推荐与空态', () => {
    const bridge = useDisciplineBridge()
    const wrapper = mount(HabitSuggestionPanel, { props: { bridge } })
    expect(wrapper.text()).toContain('💡 习惯建议')
    expect(wrapper.text()).toContain('互补习惯 · 一键采纳 · 自律加码')
    expect(wrapper.text()).toContain('为你推荐')
    expect(wrapper.text()).toContain('暂无建议')
  })
})
