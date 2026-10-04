// ============================================================
// 时间长廊 · 历史上的今天（INCR-510）测试
// 覆盖：数据完整性 / 按「月-日」检索 / 分类筛选 / 关键词搜索 /
//       年份格式化 / 随机抽取 / 收藏持久化。
// 键 hf:on_this_day_favs，本地私有、零网络。
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'
import { storage } from '../../../engine/storage'
import {
  HISTORY_EVENTS,
  HISTORY_CATEGORIES,
  eventsOn,
  eventsByCategory,
  searchEvents,
  formatYear,
  pickRandom,
  totalEvents,
  useOnThisDay,
  reloadOnThisDay,
} from '../on-this-day'

const KEY = 'hf:on_this_day_favs'

beforeEach(() => {
  const m = createMockStorage()
  ;(globalThis as any).localStorage = m
  invalidateCache()
  reloadOnThisDay()
})

describe('HISTORY_EVENTS 数据完整性', () => {
  it('数量充足且每条字段完整、月日合法', () => {
    expect(HISTORY_EVENTS.length).toBeGreaterThanOrEqual(40)
    for (const e of HISTORY_EVENTS) {
      expect(e.id).toBeTruthy()
      expect(e.title).toBeTruthy()
      expect(e.month).toBeGreaterThanOrEqual(1)
      expect(e.month).toBeLessThanOrEqual(12)
      expect(e.day).toBeGreaterThanOrEqual(1)
      expect(e.day).toBeLessThanOrEqual(31)
      expect(HISTORY_CATEGORIES).toContain(e.category)
    }
  })

  it('id 唯一', () => {
    const ids = HISTORY_EVENTS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('纯函数', () => {
  it('eventsOn 按「月-日」检索并按年份升序', () => {
    const r = eventsOn(10, 1)
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((e) => e.month === 10 && e.day === 1)).toBe(true)
    for (let i = 1; i < r.length; i++) {
      expect(r[i].year).toBeGreaterThanOrEqual(r[i - 1].year)
    }
    expect(eventsOn(2, 30)).toEqual([]) // 无收录日期优雅空态
  })

  it('eventsByCategory 分类筛选，空串返回全部', () => {
    const china = eventsByCategory('中国')
    expect(china.length).toBeGreaterThan(0)
    expect(china.every((e) => e.category === '中国')).toBe(true)
    expect(eventsByCategory('')).toHaveLength(HISTORY_EVENTS.length)
  })

  it('searchEvents 按标题不区分大小写，空白返回全部', () => {
    expect(searchEvents('登月').length).toBeGreaterThan(0)
    expect(searchEvents('   ')).toHaveLength(HISTORY_EVENTS.length)
    expect(searchEvents('不存在xyz')).toHaveLength(0)
  })

  it('formatYear 负数转「公元前」', () => {
    expect(formatYear(1949)).toBe('1949 年')
    expect(formatYear(-221)).toContain('公元前')
    expect(formatYear(-221)).toContain('221')
  })

  it('pickRandom 用注入 rng 可预期，空数组返回 null', () => {
    const events = eventsOn(10, 1)
    expect(pickRandom(events, () => 0)).toBe(events[0])
    expect(pickRandom(events, () => 0.999)).toBe(events[events.length - 1])
    expect(pickRandom([], () => 0.5)).toBeNull()
  })

  it('totalEvents 与库长度一致', () => {
    expect(totalEvents()).toBe(HISTORY_EVENTS.length)
  })
})

describe('useOnThisDay 收藏', () => {
  it('toggleFav 落盘、重载仍生效、可取消', () => {
    const { toggleFav, isFav, favEvents } = useOnThisDay()
    const target = HISTORY_EVENTS[0]

    expect(toggleFav(target.id)).toBe(true)
    expect(isFav(target.id)).toBe(true)
    expect(storage.getKV<string[]>(KEY, [])).toContain(target.id)
    expect(favEvents.value.map((e) => e.id)).toContain(target.id)

    reloadOnThisDay()
    expect(useOnThisDay().isFav(target.id)).toBe(true)

    expect(toggleFav(target.id)).toBe(false)
    expect(isFav(target.id)).toBe(false)
  })

  it('无效 id 不改变收藏', () => {
    const { toggleFav, isFav } = useOnThisDay()
    expect(toggleFav('bogus-id')).toBe(false)
    expect(isFav('bogus-id')).toBe(false)
  })
})
