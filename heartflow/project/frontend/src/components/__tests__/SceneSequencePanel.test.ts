// ============================================================
// SceneSequencePanel 组件测试 - INCR-144 场景序列面板
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

import SceneSequencePanel from '../SceneSequencePanel.vue'

describe('SceneSequencePanel (INCR-144)', () => {
  beforeEach(() => {
    for (const k in store) delete store[k]
  })

  it('挂载渲染标题与内置序列', () => {
    const wrapper = mount(SceneSequencePanel)
    expect(wrapper.text()).toContain('场景序列')
    expect(wrapper.text()).toContain('✦ 场景序列')
    expect(wrapper.text()).toContain('我的序列')
    expect(wrapper.text()).toContain('一日循环')
  })
})
