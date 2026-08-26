// ============================================================
// 自体镜像 · 十二宫格共享单例（getSelfMirrorHousesStore）测试
// 跨组件共享宫格状态 + setRating 即时同步 + 持久化
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { getSelfMirrorHousesStore } from '../houses-store'
import { storage } from '../../../engine/storage'

const HOUSES_KEY = 'hf:self_mirror_houses'

describe('getSelfMirrorHousesStore - 单例', () => {
  beforeEach(() => {
    storage.setKV(HOUSES_KEY, null)
  })

  it('多次调用返回同一实例', () => {
    const a = getSelfMirrorHousesStore()
    const b = getSelfMirrorHousesStore()
    expect(a).toBe(b)
  })

  it('初始为 12 宫格空状态', () => {
    const store = getSelfMirrorHousesStore()
    expect(store.houses.value).toHaveLength(12)
    expect(store.houses.value.every(h => h.rating === 0)).toBe(true)
  })

  it('setRating 更新共享状态并持久化', () => {
    const store = getSelfMirrorHousesStore()
    const first = store.houses.value[0]
    store.setRating(first.id, 4)
    expect(store.houses.value[0].rating).toBe(4)
    const saved = storage.getKV<{ id: string; rating: number }[] | null>(HOUSES_KEY, null)
    expect(saved?.[0]?.rating).toBe(4)
  })

  it('再次点击同一星级取消评分', () => {
    const store = getSelfMirrorHousesStore()
    const first = store.houses.value[0]
    store.setRating(first.id, 3)
    store.setRating(first.id, 3)
    expect(store.houses.value[0].rating).toBe(0)
  })

  it('单例改动对后续获取者可见（跨组件同步）', () => {
    const a = getSelfMirrorHousesStore()
    a.setRating(a.houses.value[1].id, 5)
    const b = getSelfMirrorHousesStore()
    expect(b.houses.value[1].rating).toBe(5)
  })
})
