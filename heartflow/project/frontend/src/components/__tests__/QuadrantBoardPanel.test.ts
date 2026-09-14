// ============================================================
// 自律工坊 · 四象限任务看板面板测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { Task } from '../../modules/tasks'

const mockTasks = ref<Task[]>([])

vi.mock('../../modules/tasks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../modules/tasks')>()
  return {
    ...actual,
    useTaskManager: () => ({ tasks: mockTasks }),
  }
})

async function getWrapper() {
  const { default: QuadrantBoardPanel } = await import('../QuadrantBoardPanel.vue')
  return mount(QuadrantBoardPanel)
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: '任务',
    urgency: false,
    importance: true,
    status: 'todo',
    focusCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('QuadrantBoardPanel 四象限任务看板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTasks.value = []
  })

  it('空态显示「任务池未启」引导', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('四象限看板')
    expect(wrapper.text()).toContain('任务池未启')
    expect(wrapper.text()).toContain('任务池还空着')
  })

  it('填充态显示标题与任务徽章', async () => {
    mockTasks.value = [task({ id: 't1', title: 'A', urgency: true, importance: true })]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('四象限看板')
    expect(wrapper.text()).toContain('1 件任务')
  })

  it('四象限分桶正确', async () => {
    mockTasks.value = [
      task({ id: 't1', title: '紧急重要', urgency: true, importance: true }),
      task({ id: 't2', title: '重要不紧急', urgency: false, importance: true }),
      task({ id: 't3', title: '紧急不重要', urgency: true, importance: false }),
      task({ id: 't4', title: '不紧急不重要', urgency: false, importance: false }),
    ]
    const wrapper = await getWrapper()
    const cols = wrapper.findAll('.qbp-col')
    expect(cols).toHaveLength(4)
    expect(cols[0].text()).toContain('要事紧急')
    expect(cols[0].text()).toContain('紧急重要')
    expect(cols[1].text()).toContain('要事从容')
    expect(cols[1].text()).toContain('重要不紧急')
    expect(cols[2].text()).toContain('琐事加急')
    expect(cols[2].text()).toContain('紧急不重要')
    expect(cols[3].text()).toContain('琐事勿扰')
    expect(cols[3].text()).toContain('不紧急不重要')
  })

  it('列统计显示任务数与完成率', async () => {
    mockTasks.value = [
      task({ id: 't1', title: 'A', urgency: true, importance: true, status: 'done' }),
      task({ id: 't2', title: 'B', urgency: true, importance: true, status: 'todo' }),
    ]
    const wrapper = await getWrapper()
    const cols = wrapper.findAll('.qbp-col')
    expect(cols[0].text()).toContain('2 件')
    expect(cols[0].text()).toContain('50%')
  })

  it('任务显示到期标签（逾期）', async () => {
    const now = new Date()
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    mockTasks.value = [
      task({ id: 't1', title: '逾期任务', urgency: true, importance: true, dueDate: yesterdayStr }),
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('逾期 1 天')
  })

  it('温和洞察不超过4条', async () => {
    mockTasks.value = [
      task({ id: 't1', title: 'A', urgency: true, importance: true }),
      task({ id: 't2', title: 'B', urgency: false, importance: true }),
    ]
    const wrapper = await getWrapper()
    const items = wrapper.findAll('.qbp-insight')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(4)
  })
})
