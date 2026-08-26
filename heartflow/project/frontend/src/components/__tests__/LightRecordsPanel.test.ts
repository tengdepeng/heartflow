import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

async function mountPanel() {
  vi.resetModules()
  const storage = createMockStorage()
  ;(globalThis as any).localStorage = storage
  invalidateCache()

  const mod = await import('../LightRecordsPanel.vue')
  const { useLightPavilion } = await import('../../modules/light')

  // 通过模块级单例预置记录（组件内部 useLightBridge 共享同一 ref）
  const pavilion = useLightPavilion()
  pavilion.recordMeditation('breath', 10, '焦虑', '平静', '一次安静的呼吸')
  pavilion.release('把执念放下', 'write', '轻松')

  const wrapper = mount(mod.default)
  return { wrapper, pavilion }
}

describe('LightRecordsPanel', () => {
  it('显示冥想与释怀记录并提供归档按钮', async () => {
    const { wrapper } = await mountPanel()
    expect(wrapper.text()).toContain('冥想记录')
    expect(wrapper.text()).toContain('释怀记录')
    expect(wrapper.text()).toContain('呼吸冥想')
    expect(wrapper.text()).toContain('把执念放下')
    // 活跃区应有「归档」按钮
    const archiveBtns = wrapper.findAll('button.lr-btn').filter(b => b.text() === '归档')
    expect(archiveBtns.length).toBeGreaterThanOrEqual(2)
  })

  it('点击归档将冥想移入已归档并可恢复', async () => {
    const { wrapper, pavilion } = await mountPanel()
    const m = pavilion.meditations.value[0]
    const archiveBtn = wrapper.findAll('button.lr-btn').find(b => b.text() === '归档')!
    await archiveButton(archiveBtn)

    expect(pavilion.archivedMeditations.value.some(x => x.id === m.id)).toBe(true)
    expect(pavilion.activeMeditations.value.some(x => x.id === m.id)).toBe(false)
    // 已归档区出现「恢复」按钮
    const restoreBtn = wrapper.findAll('button.lr-btn-restore').find(b => b.text() === '恢复')
    expect(restoreBtn).toBeTruthy()
    await archiveButton(restoreBtn!)
    expect(pavilion.activeMeditations.value.some(x => x.id === m.id)).toBe(true)
  })

  it('点击归档将释怀移入已归档', async () => {
    const { wrapper, pavilion } = await mountPanel()
    const r = pavilion.releases.value[0]
    // 找到释怀区的归档按钮（第二个）
    const archiveBtns = wrapper.findAll('button.lr-btn').filter(b => b.text() === '归档')
    await archiveButton(archiveBtns[archiveBtns.length - 1])

    expect(pavilion.archivedReleases.value.some(x => x.id === r.id)).toBe(true)
    expect(pavilion.activeReleases.value.some(x => x.id === r.id)).toBe(false)
  })
})

async function archiveButton(btn: any) {
  await btn.trigger('click')
}
