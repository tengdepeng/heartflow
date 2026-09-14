// ============================================================
// EnvironmentTemplatePanel 组件测试 - INCR-145 环境模板面板
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

import EnvironmentTemplatePanel from '../EnvironmentTemplatePanel.vue'

describe('EnvironmentTemplatePanel (INCR-145)', () => {
  beforeEach(() => {
    for (const k in store) delete store[k]
  })

  it('挂载渲染标题与内置模板', () => {
    const wrapper = mount(EnvironmentTemplatePanel)
    expect(wrapper.text()).toContain('环境模板')
    expect(wrapper.text()).toContain('◈ 环境模板')
    expect(wrapper.text()).toContain('全部模板')
    expect(wrapper.text()).toContain('暖琥珀')
  })
})
