import { describe, it, expect } from 'vitest'
import {
  byCategory,
  searchSounds,
  pickForScene,
  defaultSoundForScene,
  gainForVolume,
  SOURCE_LIBRARY,
} from '../sound-scene'

describe('sound-scene · 专注声场', () => {
  it('素材库：至少 10 种且 id 唯一', () => {
    const ids = new Set(SOURCE_LIBRARY.map((s) => s.id))
    expect(ids.size).toBe(SOURCE_LIBRARY.length)
    expect(SOURCE_LIBRARY.length).toBeGreaterThanOrEqual(10)
  })

  it('byCategory：按类别筛选', () => {
    const naturals = byCategory(SOURCE_LIBRARY, 'nature')
    expect(naturals.length).toBeGreaterThan(0)
    expect(naturals.every((s) => s.category === 'nature')).toBe(true)
  })

  it('byCategory：all 返回全部', () => {
    expect(byCategory(SOURCE_LIBRARY, 'all').length).toBe(SOURCE_LIBRARY.length)
  })

  it('searchSounds：按名称/备注搜索（大小写不敏感）', () => {
    const r = searchSounds(SOURCE_LIBRARY, 'RAIN')
    expect(r.every((s) => s.name.includes('雨') || s.note.includes('雨'))).toBe(true)
  })

  it('pickForScene：专注场景含咖啡厅与海浪', () => {
    const focus = pickForScene(SOURCE_LIBRARY, 'focus')
    expect(focus.map((s) => s.id)).toContain('cafe')
    expect(focus.map((s) => s.id)).toContain('ocean')
  })

  it('defaultSoundForScene：返回各场景默认素材', () => {
    expect(defaultSoundForScene('sleep')!.id).toBe('pink')
    expect(defaultSoundForScene('focus')!.id).toBe('cafe')
  })

  it('gainForVolume：0→0，100→1，30 低于线性映射', () => {
    expect(gainForVolume(0)).toBe(0)
    expect(gainForVolume(100)).toBe(1)
    const g30 = gainForVolume(30)
    expect(g30).toBeLessThan(0.3)
  })
})