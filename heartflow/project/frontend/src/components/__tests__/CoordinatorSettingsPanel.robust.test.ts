// ============================================================
// CoordinatorSettingsPanel 健壮性测试 - 配置/顾问缺失兜底
// ============================================================
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/modules/advisor/coordinator', () => ({
  getCoordinatorConfig: () => undefined,
  setCoordinatorConfig: vi.fn(),
  resolveCoordinator: () => null,
}))
vi.mock('@/engine/storage', () => ({
  storage: { getAdvisors: () => undefined },
}))

import CoordinatorSettingsPanel from '../CoordinatorSettingsPanel.vue'

describe('CoordinatorSettingsPanel 健壮性', () => {
  it('getCoordinatorConfig / getAdvisors 为 undefined 时回退默认且不崩溃', () => {
    const wrapper = mount(CoordinatorSettingsPanel)
    expect(wrapper.find('.csp').exists()).toBe(true)
    expect(wrapper.findAll('.csp-mode')).toHaveLength(3)
    expect(wrapper.find('.csp-current-value--none').exists()).toBe(true)
  })
})
