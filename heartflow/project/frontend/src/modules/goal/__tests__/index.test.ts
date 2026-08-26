// ============================================================
// goal 模块入口测试
// ============================================================
import { describe, expect, it } from 'vitest'

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
  const api = mod.useGoal()
  api.load()
  return api
}

describe('goal 模块', () => {

  it('create 创建目标后 goals.value 返回包含该目标', async () => {
    const g = await fresh()
    g.create('学习TypeScript', 'target', 'growth')
    const all = g.goals.value
    expect(all).toHaveLength(1)
    expect(all[0].title).toBe('学习TypeScript')
  })

  it('create 创建子目标', async () => {
    const g = await fresh()
    const parent = g.create('健康计划', 'target', 'health')
    g.create('晨跑', 'plan', 'health', parent.id)
    const all = g.goals.value
    expect(all).toHaveLength(2)
  })

  it('update 更新目标字段', async () => {
    const g = await fresh()
    const goal = g.create('学习', 'target', 'growth')
    g.update(goal.id, { title: '学习Vue3' })
    const updated = g.goals.value.find((t: any) => t.id === goal.id)
    expect(updated?.title).toBe('学习Vue3')
  })

  it('remove 删除目标', async () => {
    const g = await fresh()
    g.create('测试', 'target', 'growth')
    const all = g.goals.value
    g.remove(all[0].id)
    expect(g.goals.value).toHaveLength(0)
  })

  it('goals.value 返回空数组当无目标', async () => {
    const g = await fresh()
    expect(g.goals.value).toEqual([])
  })
})