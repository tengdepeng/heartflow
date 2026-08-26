// ============================================================
// 情绪花房 · 聚合桥接层（useEmotionBridge · gardenState）单元测试
// 锁定任务①深度建设修复：品种按情绪派生、图鉴按真实解锁品种计算、花季按月份真实计算
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
  const mod = await import('../emotion-bridge')
  const bridge = mod.useEmotionBridge()
  bridge.initialize()
  return bridge
}

describe('emotion-bridge · gardenState 聚合正确性', () => {
  it('空花园：季节为有效值、品种展示全 null、图鉴 0%', async () => {
    const b = await fresh()
    const gs = b.gardenState.value
    expect(['spring', 'summer', 'autumn', 'winter']).toContain(gs.season) // 按月份真实计算，非硬编码
    expect(gs.varietyDisplay).toHaveLength(5)
    expect(gs.varietyDisplay.every(v => v.variety === null)).toBe(true)
    // FLOWER_VARIETIES 共 20 个品种
    expect(gs.collection.total).toBe(20)
    expect(gs.collection.completionRate).toBe(0)
    expect(gs.flowerCount).toBe(0)
  })

  it('连续 5 条 happy：happy 品种升为 legendary(happy_peony)，图鉴解锁 1 项', async () => {
    const b = await fresh()
    for (let i = 0; i < 5; i++) b.garden.add('happy', '开心')
    const gs = b.gardenState.value
    const happy = gs.varietyDisplay.find(v => v.emotion === 'happy')!
    expect(happy.variety?.id).toBe('happy_peony') // 连续 ≥5 → legendary
    expect(gs.collection.unlocked).toContain('happy_peony')
    expect(gs.collection.unlocked.length).toBe(1)
    expect(gs.collection.completionRate).toBe(5) // round(1/20*100)
    expect(gs.flowerCount).toBe(1)
  })

  it('混合情绪：各情绪按自身连续天数派生品种，图鉴统计正确', async () => {
    const b = await fresh()
    // 用受控时间戳直接驱动 gardenState（避免紧凑循环里时间戳碰撞导致连续判定失真）
    b.garden.records.value = [
      { id: 'h1', type: 'happy', note: '', createdAt: '2026-08-01T10:00:00.000Z' },
      { id: 'h2', type: 'happy', note: '', createdAt: '2026-08-02T10:00:00.000Z' },
      { id: 'h3', type: 'happy', note: '', createdAt: '2026-08-03T10:00:00.000Z' },
      { id: 's1', type: 'sad', note: '', createdAt: '2026-08-04T10:00:00.000Z' },
    ]
    const gs = b.gardenState.value
    const happy = gs.varietyDisplay.find(v => v.emotion === 'happy')!
    const sad = gs.varietyDisplay.find(v => v.emotion === 'sad')!
    expect(happy.variety?.id).toBe('happy_sunflower') // 连续 3 → rare
    expect(sad.variety?.id).toBe('sad_hydrangea') // 连续 1 → common
    // 每种情绪显示其自身品种，不再全部错显为最新一条记录的品种
    expect(happy.variety?.id).not.toBe(sad.variety?.id)
    expect(gs.collection.unlocked).toEqual(expect.arrayContaining(['happy_sunflower', 'sad_hydrangea']))
    expect(gs.collection.unlocked.length).toBe(2)
    expect(gs.flowerCount).toBe(2)
  })

  it('图鉴按真实解锁品种计算（不再把 EmotionRecord[] 误当品种 ID）', async () => {
    const b = await fresh()
    b.garden.add('angry', '烦')
    const gs = b.gardenState.value
    // 之前会把整条记录当品种 ID，导致 byEmotion 全 0、completionRate 恒 0
    const angry = gs.collection.byEmotion.find(e => e.type === 'angry')!
    expect(angry.unlocked).toBe(1)
    expect(angry.total).toBe(4)
    expect(gs.collection.completionRate).toBe(5) // 1/20
  })
})
