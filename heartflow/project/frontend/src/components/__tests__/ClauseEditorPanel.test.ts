// ============================================================
// ClauseEditorPanel 组件测试（INCR-66：立法厅 · 用户条款编辑器）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ClauseEditorPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

async function addClause(wrapper: any, number: string, title: string, content: string) {
  const form = wrapper.find('.cep-add-form')
  await form.find('input[placeholder="条款标题"]').setValue(title)
  await form.find('textarea').setValue(content)
  if (number) {
    await form.find('input[placeholder="编号(如 6.1)"]').setValue(number)
  }
  await form.trigger('submit')
  await wrapper.vm.$nextTick()
}

async function switchTab(wrapper: any, label: string) {
  const tab = wrapper.findAll('.cep-tab').find((b: any) => b.text() === label)
  await tab.trigger('click')
  await wrapper.vm.$nextTick()
}

describe('ClauseEditorPanel 立法厅·用户条款编辑器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空库渲染标题、统计概览与 5 条系统条款', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.cep-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('立法厅 · 用户条款')

    const stats = wrapper.find('.cep-stats')
    expect(stats.text()).toContain('条款总数')
    expect(stats.text()).toContain('用户条款')
    expect(stats.text()).toContain('修订案')
    expect(stats.text()).toContain('未决冲突')
    expect(stats.text()).toContain('宪法健康')
    expect(stats.text()).toContain('健康')

    // 5 条系统条款渲染
    expect(wrapper.findAll('.cep-clause').length).toBe(5)
    expect(wrapper.text()).toContain('数据本地私有')
    expect(wrapper.text()).toContain('超级自定义')
  })

  it('系统条款无编辑/废止/删除按钮', async () => {
    const wrapper = await mountPanel()
    const systemClause = wrapper.find('.cep-clause.is-system')
    expect(systemClause.exists()).toBe(true)
    expect(systemClause.find('button').exists()).toBe(false)
  })

  it('新增用户条款后统计与列表更新', async () => {
    const wrapper = await mountPanel()
    await addClause(wrapper, '6.1', '测试条款', '这是测试内容')

    const stats = wrapper.find('.cep-stats')
    expect(stats.text()).toContain('6') // 条款总数 5 + 1
    expect(wrapper.findAll('.cep-clause').length).toBe(6)
    expect(wrapper.text()).toContain('测试条款')
    expect(wrapper.text()).toContain('这是测试内容')
  })

  it('新增条款可编辑并保存', async () => {
    const wrapper = await mountPanel()
    await addClause(wrapper, '6.1', '测试条款', '原内容')

    // 用户条款有编辑按钮
    const userClause = wrapper.findAll('.cep-clause').find((c: any) => c.text().includes('测试条款'))!
    const editBtn = userClause.findAll('button').find((b: any) => b.text() === '编辑')!
    await editBtn.trigger('click')
    await wrapper.vm.$nextTick()

    const editForm = wrapper.find('.cep-edit-form')
    await editForm.find('textarea').setValue('新内容')
    await editForm.findAll('button').find((b: any) => b.text() === '保存')!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('新内容')
    expect(wrapper.text()).not.toContain('原内容')
  })

  it('修订工作流：创建→提交→通过→生效', async () => {
    const wrapper = await mountPanel()
    await addClause(wrapper, '6.1', '测试条款', '原内容')

    await switchTab(wrapper, '修订')
    const form = wrapper.find('.cep-add-form')
    await form.find('input[placeholder="修订案标题"]').setValue('修订测试')
    await form.find('textarea[placeholder="修订描述…"]').setValue('把内容改为新内容')
    // 选择目标条款 6.1
    await form.find('select').setValue('6.1')
    await form.find('textarea[placeholder="新条款内容…"]').setValue('新内容')
    await form.trigger('submit')
    await wrapper.vm.$nextTick()

    // 修订案出现，状态草稿
    expect(wrapper.text()).toContain('修订测试')
    expect(wrapper.text()).toContain('草稿')

    // 提交
    await wrapper.findAll('button').find((b: any) => b.text() === '提交')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已提议')

    // 通过（评审 + 批准）
    await wrapper.findAll('button').find((b: any) => b.text() === '通过')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已批准')

    // 生效
    await wrapper.findAll('button').find((b: any) => b.text() === '生效')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已生效')

    // 切回条款 tab，内容已更新
    await switchTab(wrapper, '条款')
    expect(wrapper.text()).toContain('新内容')
  })

  it('冲突检测：矛盾条款展示并可标记已解决', async () => {
    const wrapper = await mountPanel()
    await addClause(wrapper, '6.1', '条款A', '系统必须自动同步数据')
    await addClause(wrapper, '6.2', '条款B', '系统不应自动同步数据')

    await switchTab(wrapper, '冲突')
    expect(wrapper.text()).toContain('矛盾')
    expect(wrapper.text()).toContain('严重')

    // 标记已解决
    await wrapper.findAll('button').find((b: any) => b.text() === '标记已解决')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('暂无未决冲突')
  })

  it('空冲突 tab 显示温和空状态', async () => {
    const wrapper = await mountPanel()
    await switchTab(wrapper, '冲突')
    expect(wrapper.text()).toContain('暂无未决冲突')
  })
})
