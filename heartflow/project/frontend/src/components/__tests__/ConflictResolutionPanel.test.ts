import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const BRANCHES_KEY = 'hf:parallel-world:branches'
const CHECKPOINTS_KEY = 'hf:parallel-world:checkpoints'
const RULES_KEY = 'hf:parallel-world:resolution-rules'
const HISTORY_KEY = 'hf:parallel-world:resolution-history'

function makeBranch(overrides: Record<string, any> = {}) {
  return {
    id: 'b_' + Math.random().toString(36).slice(2, 7),
    name: '分支',
    description: '',
    color: '#4A90D9',
    createdAt: '2026-01-01T00:00:00.000Z',
    isActive: false,
    checkpointCount: 0,
    ...overrides,
  }
}

function makeCheckpoint(overrides: Record<string, any> = {}) {
  return {
    id: 'cp_' + Math.random().toString(36).slice(2, 7),
    branchId: '',
    label: '检查点',
    description: '',
    snapshot: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    tags: [],
    ...overrides,
  }
}

async function mountPanel(branches: Record<string, any>[] = [], checkpoints: Record<string, any>[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, any> = {}
  if (branches.length) kvStore[BRANCHES_KEY] = branches
  if (checkpoints.length) kvStore[CHECKPOINTS_KEY] = checkpoints
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ConflictResolutionPanel.vue')
  const wrapper = mount(mod.default)
  await flushPromises()
  return wrapper
}

function storedKey(key: string): any {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  const data = JSON.parse(raw)
  return data.kvStore[key]
}

/** 两个存在标签/数据/时间线冲突的检查点 */
function makeConflictingCheckpoints() {
  const branches = [
    makeBranch({ id: 'bA', name: '工作线', isActive: true }),
    makeBranch({ id: 'bB', name: '生活线' }),
  ]
  const checkpoints = [
    makeCheckpoint({ id: 'cpA', branchId: 'bA', label: '升职', tags: ['工作'], snapshot: { level: 1 }, createdAt: '2026-01-01T00:00:00.000Z' }),
    makeCheckpoint({ id: 'cpB', branchId: 'bB', label: '搬家', tags: ['生活'], snapshot: { level: 2 }, createdAt: '2026-02-01T00:00:00.000Z' }),
  ]
  return { branches, checkpoints }
}

async function selectCheckpoints(wrapper: any) {
  const selects = wrapper.findAll('.crp-detect select')
  await selects[0].setValue('cpA')
  await selects[1].setValue('cpB')
  await wrapper.find('.crp-detect-btn').trigger('click')
}

describe('ConflictResolutionPanel 冲突解决', () => {
  it('无检查点时检测按钮禁用', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('冲突解决')
    const btn = wrapper.find('.crp-detect-btn')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('默认加载 5 条内置规则并持久化', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.findAll('.crp-rule').length).toBe(5)
    expect(wrapper.text()).toContain('时间戳冲突取最新')
    expect(storedKey(RULES_KEY).length).toBe(5)
  })

  it('检测到冲突并展示冲突列表', async () => {
    const { branches, checkpoints } = makeConflictingCheckpoints()
    const wrapper = await mountPanel(branches, checkpoints)
    await selectCheckpoints(wrapper)

    expect(wrapper.findAll('.crp-conflict').length).toBeGreaterThanOrEqual(4)
    expect(wrapper.text()).toContain('标签名称冲突')
    expect(wrapper.text()).toContain('数据字段冲突')
  })

  it('解决冲突后写入历史并持久化', async () => {
    const { branches, checkpoints } = makeConflictingCheckpoints()
    const wrapper = await mountPanel(branches, checkpoints)
    await selectCheckpoints(wrapper)

    const conflictCount = wrapper.findAll('.crp-conflict').length
    await wrapper.find('.crp-resolve-btn').trigger('click')

    expect(wrapper.findAll('.crp-conflict').length).toBe(0)
    expect(wrapper.findAll('.crp-history').length).toBe(1)
    expect(wrapper.text()).toContain('全部解决')
    expect(storedKey(HISTORY_KEY).length).toBe(1)
    expect(storedKey(HISTORY_KEY)[0].totalConflicts).toBe(conflictCount)
  })

  it('切换规则启用/禁用并持久化', async () => {
    const wrapper = await mountPanel([])
    const firstRule = wrapper.findAll('.crp-rule')[0]
    expect(firstRule.classes()).not.toContain('disabled')

    await firstRule.find('.crp-rule-toggle').trigger('click')
    expect(wrapper.findAll('.crp-rule')[0].classes()).toContain('disabled')
    expect(storedKey(RULES_KEY)[0].enabled).toBe(false)

    await wrapper.findAll('.crp-rule')[0].find('.crp-rule-toggle').trigger('click')
    expect(storedKey(RULES_KEY)[0].enabled).toBe(true)
  })

  it('新建自定义规则并持久化', async () => {
    const wrapper = await mountPanel([])
    await wrapper.find('.crp-rule-actions .crp-btn').trigger('click')

    const form = wrapper.find('.crp-rule-form')
    const inputs = form.findAll('input')
    await inputs[0].setValue('工作线优先')
    await inputs[1].setValue('工作线分支冲突时保留源')
    // 勾选「数据」类型
    const typeCheckboxes = form.findAll('.crp-rule-type input[type="checkbox"]')
    await typeCheckboxes[0].setValue(true)
    await wrapper.find('.crp-rule-save').trigger('click')

    expect(wrapper.findAll('.crp-rule').length).toBe(6)
    expect(wrapper.text()).toContain('工作线优先')
    expect(storedKey(RULES_KEY).length).toBe(6)
    expect(storedKey(RULES_KEY)[5].name).toBe('工作线优先')
  })

  it('重置为默认规则', async () => {
    const wrapper = await mountPanel([])
    // 先删一条规则
    await wrapper.findAll('.crp-rule')[0].find('.crp-rule-del').trigger('click')
    expect(wrapper.findAll('.crp-rule').length).toBe(4)

    await wrapper.find('.crp-rule-reset').trigger('click')
    expect(wrapper.findAll('.crp-rule').length).toBe(5)
    expect(storedKey(RULES_KEY).length).toBe(5)
  })
})
