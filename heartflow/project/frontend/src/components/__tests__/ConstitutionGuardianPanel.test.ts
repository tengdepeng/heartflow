// ============================================================
// ConstitutionGuardianPanel 组件测试（INCR-151 合规守卫面板）
// 覆盖：默认渲染 / 默认不自动生成报告（不污染审计日志）/
// 主动点击生成报告 / 默认宪法 100 分·健康（isDefault 跳过修复）/
// 按钮文案切换。
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ConstitutionGuardianPanel from '@/components/ConstitutionGuardianPanel.vue'

describe('ConstitutionGuardianPanel · 合规守卫', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('默认渲染面板与主动检查按钮', () => {
    const wrapper = mount(ConstitutionGuardianPanel)
    expect(wrapper.find('.cgr-panel').exists()).toBe(true)
    expect(wrapper.find('.cgr-btn-primary').exists()).toBe(true)
    expect(wrapper.find('.cgr-btn-primary').text()).toContain('运行合规检查')
  })

  it('默认不自动生成报告（进视图不污染审计日志）', () => {
    const wrapper = mount(ConstitutionGuardianPanel)
    // 挂载态不应出现报告区，避免 generateReport 内部 recordAudit 污染日志
    expect(wrapper.find('[data-testid="cgr-report"]').exists()).toBe(false)
    expect(wrapper.find('.cgr-hint').exists()).toBe(true)
  })

  it('点击按钮生成报告：显示分数与状态徽标', async () => {
    const wrapper = mount(ConstitutionGuardianPanel)
    await wrapper.find('.cgr-btn-primary').trigger('click')
    expect(wrapper.find('[data-testid="cgr-report"]').exists()).toBe(true)
    expect(wrapper.find('.cgr-score-num').exists()).toBe(true)
    expect(wrapper.find('.cgr-badge').exists()).toBe(true)
  })

  it('默认宪法自查得 100 分 · 健康（验证 isDefault 跳过修复）', async () => {
    const wrapper = mount(ConstitutionGuardianPanel)
    await wrapper.find('.cgr-btn-primary').trigger('click')
    const score = Number(wrapper.find('.cgr-score-num').text())
    expect(score).toBe(100)
    expect(wrapper.find('.cgr-badge').text()).toBe('健康')
    // 默认弹性条款充斥否定/例外措辞，跳过后应无价值冲突
    expect(wrapper.find('.cgr-ok').exists()).toBe(true)
  })

  it('再次点击按钮：文案切换为「重新检查」', async () => {
    const wrapper = mount(ConstitutionGuardianPanel)
    await wrapper.find('.cgr-btn-primary').trigger('click')
    expect(wrapper.find('.cgr-btn-primary').text()).toContain('重新检查')
  })
})
