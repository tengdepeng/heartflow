// ============================================================
// useViewEntrance 视图入场动画 · 测试
// ============================================================

import { describe, expect, it } from 'vitest'
import { getEnterDelay } from '../useViewEntrance'

describe('getEnterDelay', () => {
  function makeEl(dataEnter: string) {
    const el = document.createElement('div')
    el.setAttribute('data-enter', dataEnter)
    return el
  }

  it('data-enter="0" 返回 0', () => {
    expect(getEnterDelay(makeEl('0'), 80)).toBe(0)
  })

  it('data-enter="1" 返回 staggerMs', () => {
    expect(getEnterDelay(makeEl('1'), 80)).toBe(80)
  })

  it('data-enter="3" 返回 3 * staggerMs', () => {
    expect(getEnterDelay(makeEl('3'), 100)).toBe(300)
  })

  it('无 data-enter 属性时返回 0', () => {
    const el = document.createElement('div')
    expect(getEnterDelay(el, 80)).toBe(0)
  })

  it('data-enter 为非数字时返回 NaN * staggerMs', () => {
    const el = makeEl('abc')
    expect(getEnterDelay(el, 80)).toBeNaN()
  })

  it('staggerMs=0 时始终返回 0', () => {
    expect(getEnterDelay(makeEl('5'), 0)).toBe(0)
  })

  it('大数据索引正确计算', () => {
    expect(getEnterDelay(makeEl('999'), 50)).toBe(49950)
  })
})