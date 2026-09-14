// ============================================================
// HabitFailurePanel 组件测试 - INCR-148 失败分析面板
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
import HabitFailurePanel from '../HabitFailurePanel.vue'

describe('HabitFailurePanel (INCR-148)', () => {
  beforeEach(() => {
    for (const k in store) delete store[k]
  })

  it('挂载渲染标题、副标、失败记录与空态', () => {
    const bridge = useDisciplineBridge()
    const wrapper = mount(HabitFailurePanel, { props: { bridge } })
    expect(wrapper.text()).toContain('🙏 失败分析')
    expect(wrapper.text()).toContain('中断复盘 · 恢复建议 · 重新出发')
    expect(wrapper.text()).toContain('失败记录')
    expect(wrapper.text()).toContain('暂无失败记录')
  })
})
