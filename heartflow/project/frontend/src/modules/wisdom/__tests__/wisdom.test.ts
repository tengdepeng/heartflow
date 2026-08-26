import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getKV, setKV } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const getKV = vi.fn((k: string, d: any) => (k in store ? store[k] : d))
  const setKV = vi.fn((k: string, v: any) => {
    store[k] = v
  })
  return { getKV, setKV }
})

vi.mock('../../../engine/storage', () => ({ storage: { getKV, setKV } }))

import { useWisdom, WISDOM_ITEMS_KEY } from '../index'

describe('useWisdom 模块（知微阁引擎已下沉）', () => {
  beforeEach(() => {
    getKV.mockClear()
    setKV.mockClear()
    getKV.mockImplementation((_k: string, d: any) => d)
    // 重置模块级单例，避免用例间状态泄漏
    useWisdom().reload()
  })

  it('addWisdomItem 持久化并返回新条目', () => {
    const w = useWisdom()
    const item = w.addWisdomItem('今天学到了什么', '关于耐心的体会', ['耐心', '成长'])
    expect(item.id).toBeTruthy()
    expect(item.question).toBe('今天学到了什么')
    expect(w.wisdomItems.value[0].id).toBe(item.id)
    expect(setKV).toHaveBeenCalledWith(WISDOM_ITEMS_KEY, expect.any(Array))
  })

  it('removeWisdomItem 删除指定条目', () => {
    const w = useWisdom()
    const item = w.addWisdomItem('问题A', '回答A', [])
    expect(w.wisdomItems.value.length).toBe(1)
    const ok = w.removeWisdomItem(item.id)
    expect(ok).toBe(true)
    expect(w.wisdomItems.value.length).toBe(0)
  })

  it('runAsk 身体查询返回已接入真实数据的身体卡片（修复硬编码缺口）', () => {
    const w = useWisdom()
    const ctx = {
      totalFocus: 1, totalMin: 2, todayFocus: 0,
      recentSad: 0, recentHappy: 0, recentCalm: 0, recentAnxious: 0, recentAngry: 0,
      totalNotes: 0, emotionCount: 0, doneAnchors: 0, pendingAnchors: 0,
      monthHours: 0, relations: 0, bodyRecords: 5,
    }
    const cards = w.runAsk(ctx, '身体健康')
    const body = cards.find(c => c.domain === '身体')
    expect(body).toBeTruthy()
    expect(body!.content).toContain('5 条')
  })

  it('runAsk 关系查询使用数字型 relations（修复数组误插 bug）', () => {
    const w = useWisdom()
    const ctx = {
      totalFocus: 0, totalMin: 0, todayFocus: 0,
      recentSad: 0, recentHappy: 0, recentCalm: 0, recentAnxious: 0, recentAngry: 0,
      totalNotes: 0, emotionCount: 0, doneAnchors: 0, pendingAnchors: 0,
      monthHours: 0, relations: 7, bodyRecords: 0,
    }
    const cards = w.runAsk(ctx, '我的关系和羁绊')
    const rel = cards.find(c => c.domain === '关系')
    expect(rel).toBeTruthy()
    expect(rel!.content).toContain('7 张')
  })

  it('runHammer 返回 4 段并置回看', () => {
    const w = useWisdom()
    const ctx = {
      totalFocus: 0, totalMin: 0, todayFocus: 0,
      recentSad: 0, recentHappy: 0, recentCalm: 0, recentAnxious: 0, recentAngry: 0,
      totalNotes: 0, emotionCount: 0, doneAnchors: 0, pendingAnchors: 0,
      monthHours: 0, relations: 0, bodyRecords: 0,
    }
    const acts = w.runHammer(ctx)
    expect(acts.length).toBe(4)
    expect(acts[0]).toHaveProperty('title')
  })

  it('buildAnnualLetter 罗列核心数据', () => {
    const w = useWisdom()
    const ctx = {
      totalFocus: 3, totalMin: 100, todayFocus: 0,
      recentSad: 0, recentHappy: 0, recentCalm: 0, recentAnxious: 0, recentAngry: 0,
      totalNotes: 0, emotionCount: 0, doneAnchors: 0, pendingAnchors: 0,
      monthHours: 0, relations: 0, bodyRecords: 0,
    }
    const text = w.buildAnnualLetter(ctx)
    expect(text).toContain('专注次数：3')
    expect(text).toContain('年度回看')
  })
})
