import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const BRANCHES_KEY = 'hf:parallel-world:branches'
const CHECKPOINTS_KEY = 'hf:parallel-world:checkpoints'
const SNAPSHOTS_KEY = 'hf:parallel-world:snapshots'

async function mountPanel() {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {},
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../BranchManagementPanel.vue')
  const wrapper = mount(mod.default)
  await flushPromises()
  return wrapper
}

function storedKey(key: string): any {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  const data = JSON.parse(raw)
  return data.kvStore[key]
}

describe('BranchManagementPanel 时间分支管理', () => {
  it('空存储时初始化默认主干分支', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('时间分支')
    expect(wrapper.findAll('.bmp-branch').length).toBe(1)
    expect(wrapper.text()).toContain('主干')
    expect(wrapper.text()).toContain('当前')
  })

  it('创建分支并持久化', async () => {
    const wrapper = await mountPanel()
    const inputs = wrapper.findAll('.bmp-create input')
    await inputs[0].setValue('副业线')
    await inputs[1].setValue('接单赚钱')
    await wrapper.find('.bmp-create-btn').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.bmp-branch').length).toBe(2)
    expect(wrapper.text()).toContain('副业线')
    const branches = storedKey(BRANCHES_KEY)
    expect(branches.length).toBe(2)
    expect(branches[1].name).toBe('副业线')
  })

  it('切换分支并更新当前分支', async () => {
    const wrapper = await mountPanel()
    const inputs = wrapper.findAll('.bmp-create input')
    await inputs[0].setValue('副业线')
    await wrapper.find('.bmp-create-btn').trigger('click')
    await flushPromises()

    await wrapper.find('.bmp-switch-btn').trigger('click')
    await flushPromises()

    const branches = storedKey(BRANCHES_KEY)
    const active = branches.filter((b: any) => b.isActive)
    expect(active.length).toBe(1)
    expect(active[0].name).toBe('副业线')
    expect(wrapper.text()).toContain('副业线')
  })

  it('创建检查点并持久化到当前分支', async () => {
    const wrapper = await mountPanel()
    const inputs = wrapper.findAll('.bmp-create input')
    await inputs[0].setValue('副业线')
    await wrapper.find('.bmp-create-btn').trigger('click')
    await flushPromises()
    await wrapper.find('.bmp-switch-btn').trigger('click')
    await flushPromises()

    // 检查点表单（第二个 .bmp-create 块）
    const cpInputs = wrapper.findAll('.bmp-block')[1].findAll('input')
    await cpInputs[0].setValue('接单')
    await cpInputs[1].setValue('第一单')
    await cpInputs[2].setValue('工作,副业')
    await wrapper.find('.bmp-cp-btn').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.bmp-cp').length).toBe(1)
    expect(wrapper.text()).toContain('接单')
    const checkpoints = storedKey(CHECKPOINTS_KEY)
    expect(checkpoints.length).toBe(1)
    expect(checkpoints[0].branchId).toBe(storedKey(BRANCHES_KEY)[1].id)
    expect(checkpoints[0].tags).toEqual(['工作', '副业'])
  })

  it('删除检查点', async () => {
    const wrapper = await mountPanel()
    const cpInputs = wrapper.findAll('.bmp-block')[1].findAll('input')
    await cpInputs[0].setValue('接单')
    await wrapper.find('.bmp-cp-btn').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.bmp-cp').length).toBe(1)
    await wrapper.find('.bmp-del-btn').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.bmp-cp').length).toBe(0)
    expect(storedKey(CHECKPOINTS_KEY).length).toBe(0)
  })

  it('拍摄世界快照并持久化', async () => {
    const wrapper = await mountPanel()
    const snapInputs = wrapper.findAll('.bmp-block')[2].findAll('input')
    await snapInputs[0].setValue('2026 年 3 月')
    await wrapper.find('.bmp-snap-btn').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.bmp-snap').length).toBe(1)
    expect(wrapper.text()).toContain('2026 年 3 月')
    const snapshots = storedKey(SNAPSHOTS_KEY)
    expect(snapshots.length).toBe(1)
    expect(snapshots[0].metadata.label).toBe('2026 年 3 月')
  })
})
