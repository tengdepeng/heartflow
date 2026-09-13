// ============================================================
// 更漏（工作类入口枢纽）视图测试
// INCR-298 补挂载孤儿组件 QuadrantKanban：紧急×重要四象限看板
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const TASKS_KEY = 'hf:tasks'

function task(over: Partial<Record<string, unknown>> & { title: string; urgency: boolean; importance: boolean }) {
  return {
    id: `t_${Math.random().toString(36).slice(2, 8)}`,
    detail: undefined,
    status: 'todo',
    focusCount: 0,
    createdAt: new Date().toISOString(),
    ...over,
  }
}

async function createWrapper(seededTasks: unknown[] = [], storageMock?: ReturnType<typeof createMockStorage>) {
  vi.resetModules()
  const mock = storageMock ?? createMockStorage()
  if (!storageMock) {
    mock.setItem('heartflow:storage', JSON.stringify({
      version: 10,
      kvStore: { [TASKS_KEY]: seededTasks },
      sessions: [],
      crystals: [],
    }))
  }
  ;(globalThis as any).localStorage = mock
  invalidateCache()
  const { default: ClepsydraRoom } = await import('../ClepsydraRoom.vue')
  const wrapper = mount(ClepsydraRoom, {
    global: {
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
  await wrapper.vm.$nextTick()
  return { wrapper, mock }
}

describe('ClepsydraRoom 更漏（工作类入口枢纽）', () => {
  it('渲染更漏标题与工作类空间入口', async () => {
    const { wrapper } = await createWrapper()
    expect(wrapper.text()).toContain('更漏')
    expect(wrapper.text()).toContain('工作类空间')
    // 6 个子空间入口：工痕/劳酬/匠庐/业脉/行囊/息壤
    for (const name of ['工痕', '劳酬', '匠庐', '业脉', '行囊', '息壤']) {
      expect(wrapper.text()).toContain(name)
    }
  })

  it('挂载四象限看板面板（标题与副题）', async () => {
    const { wrapper } = await createWrapper()
    const kb = wrapper.find('.kanban')
    expect(kb.exists()).toBe(true)
    expect(kb.find('.kb-title').text()).toContain('四象限看板')
    expect(kb.find('.kb-hint').text()).toContain('紧急 × 重要 矩阵')
  })

  it('空看板渲染四列空态（每列「空」+ 完成率 0%）', async () => {
    const { wrapper } = await createWrapper()
    const cols = wrapper.findAll('.kb-col')
    expect(cols.length).toBe(4)
    expect(cols.map((c) => c.find('.kb-col-label').text())).toEqual([
      '要事紧急', '要事从容', '琐事加急', '琐事勿扰',
    ])
    expect(wrapper.findAll('.kb-empty').length).toBe(4)
    for (const stat of wrapper.findAll('.kb-col-stat')) {
      expect(stat.text()).toContain('完成率 0%')
    }
  })

  it('seed 任务后按象限归位（重要且紧急 → 要事紧急列）', async () => {
    const { wrapper } = await createWrapper([
      task({ title: '赶发布', urgency: true, importance: true }),
      task({ title: '深耕读书', urgency: false, importance: true }),
      task({ title: '回个急电', urgency: true, importance: false }),
      task({ title: '刷闲帖', urgency: false, importance: false }),
    ])
    const cols = wrapper.findAll('.kb-col')
    // 列序：q1 要事紧急 → q4 琐事勿扰
    expect(cols[0].text()).toContain('赶发布')
    expect(cols[1].text()).toContain('深耕读书')
    expect(cols[2].text()).toContain('回个急电')
    expect(cols[3].text()).toContain('刷闲帖')
    // 计数：todo 未完成（done=0）仅显示 active；完成率 0%
    expect(cols[0].find('.kb-col-count').text()).toBe('1')
    expect(cols[0].find('.kb-col-stat').text()).toContain('完成率 0%')
  })

  it('新增任务进入默认象限（重要不紧急 → 要事从容）并持久化', async () => {
    const { wrapper, mock } = await createWrapper()
    const input = wrapper.find('.kb-input')
    await input.setValue('规划季度目标')
    await wrapper.find('.kb-btn').trigger('click')
    await wrapper.vm.$nextTick()
    const cols = wrapper.findAll('.kb-col')
    expect(cols[1].text()).toContain('规划季度目标')
    // 持久化：复用同一 storageMock 重新挂载后仍在
    const again = (await createWrapper([], mock)).wrapper
    expect(again.findAll('.kb-col')[1].text()).toContain('规划季度目标')
  })

  it('点击卡片切换状态（待办→进行中→已完成）并可删除', async () => {
    const { wrapper } = await createWrapper([
      task({ title: '切换状态任务', urgency: true, importance: true }),
    ])
    const card = wrapper.find('.kb-card')
    expect(card.find('.kb-card-status').text()).toBe('待办')
    await card.trigger('click')
    await wrapper.vm.$nextTick()
    expect(card.find('.kb-card-status').text()).toBe('进行中')
    await card.trigger('click')
    await wrapper.vm.$nextTick()
    expect(card.find('.kb-card-status').text()).toBe('已完成')
    expect(card.classes()).toContain('is-done')
    // 删除后列回到空态
    await wrapper.find('.kb-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.kb-card').length).toBe(0)
    expect(wrapper.findAll('.kb-empty').length).toBe(4)
  })
})
