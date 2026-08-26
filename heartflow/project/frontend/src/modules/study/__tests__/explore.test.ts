// ============================================================
// 思绪书房 · 探索纯函数测试
// 覆盖：空数组、词频统计、随机取数
// ============================================================
import { describe, it, expect } from 'vitest'
import { tagFrequencies, pickRandom, type Taggable } from '../explore'

function makeItems(tagsList: string[][]): Taggable[] {
  return tagsList.map((tags) => ({ tags }))
}

describe('tagFrequencies', () => {
  it('空数组返回空对象', () => {
    expect(tagFrequencies([])).toEqual({})
  })

  it('空标签被跳过', () => {
    const items = makeItems([['', '  ', 'ok']])
    expect(tagFrequencies(items)).toEqual({ ok: 1 })
  })

  it('统计词频且同条目内去重', () => {
    const items = makeItems([
      ['vue', 'ts', 'vue'],
      ['ts', 'pinia'],
      ['vue'],
    ])
    expect(tagFrequencies(items)).toEqual({
      vue: 2,
      ts: 2,
      pinia: 1,
    })
  })

  it('不修改原输入', () => {
    const items = makeItems([['a', 'b']])
    const before = JSON.stringify(items)
    tagFrequencies(items)
    expect(JSON.stringify(items)).toBe(before)
  })
})

describe('pickRandom', () => {
  it('空数组返回 null', () => {
    expect(pickRandom([])).toBeNull()
  })

  it('从非空数组返回其中一个元素', () => {
    const arr = [1, 2, 3]
    const picked = pickRandom(arr)
    expect(picked).not.toBeNull()
    expect(arr).toContain(picked)
  })

  it('不修改原数组', () => {
    const arr = ['x', 'y']
    pickRandom(arr)
    expect(arr).toEqual(['x', 'y'])
  })

  it('多次抽取覆盖所有元素', () => {
    const arr = ['only']
    for (let i = 0; i < 20; i++) {
      expect(pickRandom(arr)).toBe('only')
    }
  })
})
