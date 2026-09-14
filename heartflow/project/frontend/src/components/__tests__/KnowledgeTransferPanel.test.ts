// ============================================================
// 知识迁移面板测试（桩恢复：消费 useKnowledgeTransfer）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { WorldBranch } from '../../modules/parallel-world/types'
import KnowledgeTransferPanel from '../KnowledgeTransferPanel.vue'

function makeBranch(overrides: Partial<WorldBranch> = {}): WorldBranch {
  return {
    id: 'b-1',
    name: '主干',
    description: '',
    color: '#4A90D9',
    createdAt: '2026-08-01T00:00:00.000Z',
    isActive: true,
    checkpointCount: 1,
    ...overrides,
  }
}

function getWrapper(branches: WorldBranch[]) {
  return mount(KnowledgeTransferPanel, { props: { branches } })
}

async function createTransfer(wrapper: ReturnType<typeof getWrapper>, knowledge: string) {
  const input = wrapper.find('input.ktp-wide')
  await input.setValue(knowledge)
  await wrapper.find('button.ktp-add').trigger('click')
  await wrapper.vm.$nextTick()
}

describe('KnowledgeTransferPanel · 知识迁移（桩恢复）', () => {
  it('空态：少于两个分支时显示引导文案', () => {
    const wrapper = getWrapper([makeBranch()])
    expect(wrapper.find('.ktp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('至少需要两个时间分支')
  })

  it('创建迁移：填写知识点后生成迁移卡片', async () => {
    const wrapper = getWrapper([makeBranch(), makeBranch({ id: 'b-2', name: '副线' })])
    await createTransfer(wrapper, '时间管理技巧')
    expect(wrapper.text()).toContain('时间管理技巧')
    expect(wrapper.find('.ktp-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('待处理')
  })

  it('应用迁移：pending 卡片点击应用后状态变为已应用', async () => {
    const wrapper = getWrapper([makeBranch(), makeBranch({ id: 'b-2', name: '副线' })])
    await createTransfer(wrapper, '沟通经验')
    await wrapper.find('button.ktp-apply').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已应用')
  })

  it('拒绝迁移：点击拒绝后状态变为已拒绝', async () => {
    const wrapper = getWrapper([makeBranch(), makeBranch({ id: 'b-2', name: '副线' })])
    await createTransfer(wrapper, '不适用经验')
    await wrapper.find('button.ktp-reject').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已拒绝')
  })

  it('成功率徽标：渲染成功率百分比', () => {
    const wrapper = getWrapper([makeBranch(), makeBranch({ id: 'b-2', name: '副线' })])
    expect(wrapper.find('.ktp-badge').exists()).toBe(true)
    expect(wrapper.text()).toContain('成功率')
  })
})
