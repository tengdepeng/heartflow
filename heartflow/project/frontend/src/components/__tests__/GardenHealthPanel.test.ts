// ============================================================
// 花园状态面板 · 接线测试
// 锁定任务①深度建设：useEmotionBridge 经 GardenHealthPanel 真正接入视图（体验闭环）
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GardenHealthPanel from '../GardenHealthPanel.vue'
import type { EmotionType } from '../../modules/emotion/emotion-bridge'

function setupStorage() {
  const store: Record<string, string> = {}
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
  }
}

async function seed(types: EmotionType[]) {
  setupStorage()
  const { invalidateCache } = await import('../../engine/storage/core')
  invalidateCache()
  const mod = await import('../../modules/emotion/emotion-bridge')
  const bridge = mod.useEmotionBridge()
  bridge.initialize()
  for (const t of types) bridge.garden.add(t, '')
  return bridge
}

describe('GardenHealthPanel · 接线闭环', () => {
  it('空花园：标题渲染、5 个情绪均「尚未绽放」、完成度 0%', async () => {
    await seed([])
    const wrapper = mount(GardenHealthPanel)
    expect(wrapper.text()).toContain('花园状态')
    expect(wrapper.text()).toContain('0%')
    expect(wrapper.findAll('.ghp-var-empty')).toHaveLength(5)
  })

  it('播种 1 条 happy：完成度 5%、happy 行已绽放（其余 4 行未绽放）', async () => {
    await seed(['happy'])
    const wrapper = mount(GardenHealthPanel)
    const text = wrapper.text()
    expect(text).toContain('5%') // 1/20 品种解锁
    // 恰好 4 个情绪仍为「尚未绽放」（happy 已绽放）
    expect(wrapper.findAll('.ghp-var-empty')).toHaveLength(4)
    // happy 行已绽放：恰好 1 个品种名展示（非「尚未绽放」）
    expect(wrapper.findAll('.ghp-var-name')).toHaveLength(1)
  })
})
