import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

function baseConfig() {
  return {
    personalSafety: {
      emergencyContacts: [],
      locationSharingEnabled: false,
      healthDataEnabled: false,
    },
  }
}

const configRef = ref<any>(baseConfig())
const updatePersonalSafety = vi.fn()
const reloadSafetyConfig = vi.fn()

vi.mock('../../../modules/safety', () => ({
  getSafetyConfig: () => configRef,
  updatePersonalSafety: (...args: unknown[]) => updatePersonalSafety(...args),
  reloadSafetyConfig: (...args: unknown[]) => reloadSafetyConfig(...args),
}))

async function mountPanel() {
  const mod = await import('../PersonalSafetyConfigPanel.vue')
  return mount(mod.default)
}

describe('PersonalSafetyConfigPanel 人身安全模块配置（INCR-样例）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configRef.value = baseConfig()
  })

  it('渲染标题、两个开关、联系人计数、重载按钮', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.panel-title').text()).toBe('人身安全')
    expect(wrapper.find('[data-test="location-toggle"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="health-toggle"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="contacts-count"]').text()).toContain('0 位')
    expect(wrapper.find('[data-test="reload-btn"]').exists()).toBe(true)
  })

  it('切换位置共享调用 updatePersonalSafety', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('[data-test="location-toggle"]').setValue(true)
    expect(updatePersonalSafety).toHaveBeenCalledWith({ locationSharingEnabled: true })
  })

  it('切换健康数据调用 updatePersonalSafety', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('[data-test="health-toggle"]').setValue(true)
    expect(updatePersonalSafety).toHaveBeenCalledWith({ healthDataEnabled: true })
  })

  it('有联系人时显示数量且无空前引导', async () => {
    configRef.value.personalSafety.emergencyContacts = [{ id: 'c1', priority: 'primary', name: '张三', relation: '家人', phone: '13800000000' }]
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="contacts-count"]').text()).toContain('1 位')
    expect(wrapper.find('.enc-hint').exists()).toBe(false)
  })

  it('重载按钮触发 reloadSafetyConfig 并显示提示', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('[data-test="reload-btn"]').trigger('click')
    expect(reloadSafetyConfig).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-test="reload-msg"]').text()).toContain('已从存储重新载入配置')
  })
})