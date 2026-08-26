// ============================================================
// emotion 模块入口测试
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
  const api = mod.useEmotionGarden()
  api.load()
  return api
}

describe('emotion 模块', () => {

  it('add 添加情绪后 records.value 返回包含该记录', async () => {
    const e = await fresh()
    e.add('happy', '今天很开心')
    const all = e.records.value
    expect(all).toHaveLength(1)
    expect(all[0].type).toBe('happy')
  })

  it('add 多条记录', async () => {
    const e = await fresh()
    e.add('happy', '开心')
    e.add('calm', '平静')
    expect(e.records.value).toHaveLength(2)
  })

  it('update 更新情绪备注', async () => {
    const e = await fresh()
    e.add('sad', '不太开心')
    const record = e.records.value[0]
    e.update(record.id, { note: '好多了' })
    expect(e.records.value[0].note).toBe('好多了')
  })

  it('remove 删除情绪记录', async () => {
    const e = await fresh()
    e.add('happy', 'test')
    const record = e.records.value[0]
    e.remove(record.id)
    expect(e.records.value).toHaveLength(0)
  })

  it('records.value 返回空数组当无数据', async () => {
    const e = await fresh()
    expect(e.records.value).toEqual([])
  })

  it('add 不带天气时 weather 为 undefined（情绪前置、天气可选）', async () => {
    const e = await fresh()
    e.add('happy', '今天很开心')
    expect(e.records.value[0].weather).toBeUndefined()
  })

  it('add 带天气时持久化 weather 第二轴', async () => {
    const e = await fresh()
    e.add('calm', '安静的午后', 'sunny')
    const rec = e.records.value[0]
    expect(rec.type).toBe('calm')
    expect(rec.weather).toBe('sunny')
  })

  it('add 仅天气无文字时仍创建记录', async () => {
    const e = await fresh()
    e.add('sad', '', 'rainy')
    expect(e.records.value).toHaveLength(1)
    expect(e.records.value[0].weather).toBe('rainy')
    expect(e.records.value[0].note).toBe('')
  })

  it('update 可补充天气第二轴', async () => {
    const e = await fresh()
    e.add('angry', '烦')
    const id = e.records.value[0].id
    e.update(id, { weather: 'windy' })
    expect(e.records.value[0].weather).toBe('windy')
    expect(e.records.value[0].note).toBe('烦')
  })
})