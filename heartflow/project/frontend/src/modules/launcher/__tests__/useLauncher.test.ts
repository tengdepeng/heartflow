import { describe, it, expect, beforeEach } from 'vitest'
import { useLauncher } from '../useLauncher'

describe('useLauncher · 拖拽排序与分类管理（规格 §3.4）', () => {
  const { entries, addEntry, moveEntry, renameCategory } = useLauncher()

  beforeEach(() => {
    entries.value = []
  })

  it('moveEntry：把条目拖到目标之前，组内顺序重排并持久化 sort', () => {
    addEntry({ name: 'A', category: '音乐', launch: 'a' })
    addEntry({ name: 'B', category: '音乐', launch: 'b' })
    addEntry({ name: 'C', category: '音乐', launch: 'c' })
    // 初始 sort: A=0 B=1 C=2
    const ids = entries.value.map((e) => e.id)
    moveEntry(ids[2], ids[0]) // C 拖到 A 前
    const order = entries.value
      .filter((e) => e.category === '音乐')
      .sort((x, y) => x.sort - y.sort)
      .map((e) => e.name)
    expect(order).toEqual(['C', 'A', 'B'])
  })

  it('moveEntry：beforeId 为 null 时移到同组末尾', () => {
    addEntry({ name: 'A', category: '音乐', launch: 'a' })
    addEntry({ name: 'B', category: '音乐', launch: 'b' })
    const ids = entries.value.map((e) => e.id)
    moveEntry(ids[0], null) // A 移到末尾
    const order = entries.value
      .filter((e) => e.category === '音乐')
      .sort((x, y) => x.sort - y.sort)
      .map((e) => e.name)
    expect(order).toEqual(['B', 'A'])
  })

  it('moveEntry：跨分类拖拽被忽略（分类维度不可跨组）', () => {
    addEntry({ name: 'A', category: '音乐', launch: 'a' })
    addEntry({ name: 'X', category: '办公', launch: 'x' })
    const aId = entries.value.find((e) => e.name === 'A')!.id
    const xId = entries.value.find((e) => e.name === 'X')!.id
    moveEntry(aId, xId) // 不同分类，应忽略
    const musicOrder = entries.value
      .filter((e) => e.category === '音乐')
      .sort((x, y) => x.sort - y.sort)
      .map((e) => e.name)
    expect(musicOrder).toEqual(['A'])
  })

  it('renameCategory：重命名后同名词目合并到新分类', () => {
    addEntry({ name: 'A', category: '旧', launch: 'a' })
    addEntry({ name: 'B', category: '旧', launch: 'b' })
    renameCategory('旧', '新')
    const cats = [...new Set(entries.value.map((e) => e.category))]
    expect(cats).toEqual(['新'])
    expect(entries.value.length).toBe(2)
  })
})
