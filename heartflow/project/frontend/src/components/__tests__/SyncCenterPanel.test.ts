import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// 隔离引擎，精准控制 importSyncFile 的拒绝与 updateConfig 的调用断言
const importSyncFile = vi.fn()
const updateConfig = vi.fn()
const createSnapshot = vi.fn()
vi.mock('@/modules/sync', () => {
  return {
    useSync: () => ({
      config: ref({ deviceName: 'dev', conflictStrategy: 'local', logRetentionLimit: 10, snapshotRetentionLimit: 5 }),
      targets: ref([]),
      conflicts: ref([]),
      snapshots: ref([]),
      syncStatus: ref('idle'),
      syncProgress: ref(0),
      syncError: ref<string | null>(null),
      unresolvedConflictCount: ref(0),
      recentLogs: ref([]),
      recentSnapshots: ref([]),
      updateConfig,
      addTarget: vi.fn(),
      removeTarget: vi.fn(),
      sync: vi.fn(),
      createSnapshot,
      restoreSnapshot: vi.fn(),
      resolveConflict: vi.fn(),
      resolveAllConflicts: vi.fn(),
      downloadSyncData: vi.fn(),
      importSyncFile,
    }),
  }
})

import SyncCenterPanel from '../SyncCenterPanel.vue'

describe('SyncCenterPanel', () => {
  beforeEach(() => {
    importSyncFile.mockReset()
    updateConfig.mockReset()
    createSnapshot.mockReset()
  })

  it('挂载不崩溃且含标题与四 Tab', () => {
    const wrapper = mount(SyncCenterPanel)
    expect(wrapper.find('.syc-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('同步中心')
    expect(wrapper.findAll('.syc-tab')).toHaveLength(4)
  })

  it('切换 Tab 不崩溃', async () => {
    const wrapper = mount(SyncCenterPanel)
    const tabs = wrapper.findAll('.syc-tab')
    await tabs[1].trigger('click')
    await tabs[2].trigger('click')
    await tabs[3].trigger('click')
    expect(wrapper.find('.syc-panel').exists()).toBe(true)
  })

  it('修改配置触发 updateConfig 写回', async () => {
    const wrapper = mount(SyncCenterPanel)
    const input = wrapper.find('input.syc-input')
    await input.setValue('新设备名')
    await input.trigger('change')
    expect(updateConfig).toHaveBeenCalled()
    const arg = updateConfig.mock.calls[0][0]
    expect(arg.deviceName).toBe('新设备名')
  })

  it('导入失败时就地展示错误（不再静默吞掉）', async () => {
    importSyncFile.mockRejectedValueOnce(new Error('文件解析失败'))
    const wrapper = mount(SyncCenterPanel)
    const tabs = wrapper.findAll('.syc-tab')
    await tabs[3].trigger('click')
    const fileInput = wrapper.find('input[type="file"]').element as HTMLInputElement
    const file = new File(['x'], 'bad.json', { type: 'application/json' })
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
    await wrapper.find('input[type="file"]').trigger('change')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.syc-error').exists()).toBe(true)
    expect(wrapper.text()).toContain('文件解析失败')
  })

  it('导入成功不显示错误且清空输入', async () => {
    importSyncFile.mockResolvedValueOnce({ count: 3, conflicts: 0 })
    const wrapper = mount(SyncCenterPanel)
    const tabs = wrapper.findAll('.syc-tab')
    await tabs[3].trigger('click')
    const fileInput = wrapper.find('input[type="file"]').element as HTMLInputElement
    const file = new File(['{}'], 'ok.json', { type: 'application/json' })
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
    await wrapper.find('input[type="file"]').trigger('change')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.syc-error').exists()).toBe(false)
  })

  it('创建快照按钮触发 createSnapshot', async () => {
    const wrapper = mount(SyncCenterPanel)
    const tabs = wrapper.findAll('.syc-tab')
    await tabs[2].trigger('click')
    const btn = wrapper.findAll('button').find((b) => b.text().includes('创建快照'))
    expect(btn).toBeTruthy()
    await btn!.trigger('click')
    expect(createSnapshot).toHaveBeenCalled()
  })
})
