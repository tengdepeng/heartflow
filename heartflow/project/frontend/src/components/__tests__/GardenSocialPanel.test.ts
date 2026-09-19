// ============================================================
// GardenSocialPanel 组件测试 - 花园社交面板（INCR-370）
// 走真实纯内存引擎 useGardenSocial，经交互（添加好友/访园/送礼）驱动断言。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

async function mountPanel() {
  const { default: GardenSocialPanel } = await import('../GardenSocialPanel.vue')
  return mount(GardenSocialPanel)
}

// 通过输入框添加一位好友并返回其 id
async function addFriend(wrapper: any, name = '小芽', garden = '晴雨花园') {
  await wrapper.find('[data-test="gsp-name"]').setValue(name)
  await wrapper.find('[data-test="gsp-garden"]').setValue(garden)
  await wrapper.find('form.gsp-add').trigger('submit')
  await nextTick()
  const friendEl = wrapper.find('.gsp-friend')
  if (!friendEl.exists()) return null
  const testId = friendEl.attributes('data-test') || ''
  return testId.replace('gsp-friend-', '')
}

describe('GardenSocialPanel 组件（INCR-370）', () => {
  beforeEach(() => {
    // 每用例 mount 独立实例，useGardenSocial 为纯内存无模块级状态
  })

  it('初始渲染空态与社交标题', async () => {
    const wrapper = await mountPanel()
    await nextTick()
    expect(wrapper.find('.gsp').exists()).toBe(true)
    expect(wrapper.text()).toContain('花园社交')
    expect(wrapper.find('.gsp-empty').exists()).toBe(true)
    expect(wrapper.find('[data-test="gsp-overview"]').exists()).toBe(false)
  })

  it('添加好友后列表与概览更新', async () => {
    const wrapper = await mountPanel()
    await nextTick()
    const id = await addFriend(wrapper)
    expect(id).toBeTruthy()
    expect(wrapper.find('.gsp-friend-list').exists()).toBe(true)
    expect(wrapper.find('.gsp-empty').exists()).toBe(false)
    expect(wrapper.find('[data-test="gsp-overview"]').exists()).toBe(true)
    expect(wrapper.find('.gsp-ov-box').text()).toContain('1')
    expect(wrapper.text()).toContain('小芽')
    expect(wrapper.text()).toContain('晴雨花园')
  })

  it('星标与移除好友', async () => {
    const wrapper = await mountPanel()
    await nextTick()
    const id = await addFriend(wrapper) as string
    // 星标
    await wrapper.find(`[data-test="gsp-star-${id}"]`).trigger('click')
    await nextTick()
    expect(wrapper.find('.gsp-star').exists()).toBe(true)
    // 移除
    await wrapper.find(`[data-test="gsp-remove-${id}"]`).trigger('click')
    await nextTick()
    expect(wrapper.find('.gsp-friend-list').exists()).toBe(false)
    expect(wrapper.find('.gsp-friend').exists()).toBe(false)
  })

  it('访问好友花园生成快照并留印记', async () => {
    const wrapper = await mountPanel()
    await nextTick()
    const id = await addFriend(wrapper) as string
    // 访问
    await wrapper.find('[data-test="gsp-visit-target"]').setValue(id)
    await nextTick()
    await wrapper.find('form.gsp-visit-form').trigger('submit')
    await nextTick()
    expect(wrapper.find('.gsp-snap').exists()).toBe(true)
    expect(wrapper.find('.gsp-snap-title').exists()).toBe(true)
    // 留印记
    await wrapper.find('[data-test="gsp-fp-like"]').trigger('click')
    await nextTick()
    // 印记产生 footnote 活动，动态面板出现
    expect(wrapper.find('[data-test="gsp-card-activities"]').exists()).toBe(true)
  })

  it('向好友送出礼物后统计与收礼箱出现', async () => {
    const wrapper = await mountPanel()
    await nextTick()
    const id = await addFriend(wrapper) as string
    await wrapper.find('[data-test="gsp-gift-target"]').setValue(id)
    await nextTick()
    await wrapper.find('[data-test="gsp-gift-sel"]').setValue('gift-flower-rose')
    await nextTick()
    await wrapper.find('form.gsp-gift-form').trigger('submit')
    await nextTick()
    // 送出礼物后统计区出现（sent + received > 0）
    expect(wrapper.find('[data-test="gsp-gift-stats"]').exists()).toBe(true)
  })

  it('动态流生成并可全部已读', async () => {
    const wrapper = await mountPanel()
    await nextTick()
    await addFriend(wrapper)
    // 添加好友产生 friend_added 动态
    expect(wrapper.find('[data-test="gsp-card-activities"]').exists()).toBe(true)
    const unreadBefore = wrapper.findAll('.gsp-activity--unread').length
    expect(unreadBefore).toBeGreaterThan(0)
    await wrapper.find('[data-test="gsp-all-read"]').trigger('click')
    await nextTick()
    expect(wrapper.findAll('.gsp-activity--unread').length).toBe(0)
  })
})