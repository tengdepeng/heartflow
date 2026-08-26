// ============================================================
// plugin 模块入口测试
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'

function createMockStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
  }
}

async function fresh() {
  ;(globalThis as any).localStorage = createMockStorage()
  const { invalidateCache } = await import('../../../engine/storage/core')
  invalidateCache()
  const mod = await import('../index')
  const pm = mod.usePluginManager()
  pm.init()
  return pm
}

describe('plugin 模块', () => {
  beforeEach(async () => { await fresh() }, 30000)

  it('init 后 getAll 返回核心插件', async () => {
    const p = await fresh()
    const all = p.getAll()
    expect(all.length).toBeGreaterThan(0)
  }, 30000)

  it('init 后 enabledPlugins 包含默认启用的插件', async () => {
    const p = await fresh()
    expect(p.enabledPlugins.value.length).toBeGreaterThan(0)
  }, 30000)

  it('get 获取指定插件', async () => {
    const p = await fresh()
    const first = p.getAll()[0]
    const found = p.get(first.manifest.meta.id)
    expect(found).toBeDefined()
    expect(found!.manifest.meta.id).toBe(first.manifest.meta.id)
  }, 30000)

  it('toggle 切换插件启用状态', async () => {
    const p = await fresh()
    const first = p.getAll()[0]
    const original = first.enabled
    p.toggle(first.manifest.meta.id)
    expect(p.get(first.manifest.meta.id)!.enabled).toBe(!original)
  }, 30000)

  it('update 更新插件配置', async () => {
    const p = await fresh()
    const first = p.getAll()[0]
    p.update(first.manifest.meta.id, { enabled: false })
    expect(p.get(first.manifest.meta.id)!.enabled).toBe(false)
  }, 30000)
})