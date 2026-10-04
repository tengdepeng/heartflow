// ============================================================
// 健康状态管理 · 时区治理（INCR-466）
// 经络日志 MeridianLog.date 是「日键」：recordMeridianFeeling 写入 today、
// getMeridianFeeling 读取 targetDate，二者配对；与 at（UTC 序列化）无关。
// 东八区 00:00–08:00 时 UTC 切日会把当日经络感受归到前一天，故日键须取本地日历日。
// 反向验证：改回缺陷写法（today=UTC slice）会把 date 存成 UTC 前一天，用例应转红。
// ============================================================

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { getLocalDateKey } from '../../utils/time'

vi.mock('../../engine/storage', () => {
  const kv = new Map<string, any>()
  return {
    storage: {
      getKV: (k: string, d: any) => (kv.has(k) ? kv.get(k) : d),
      setKV: (k: string, v: any) => {
        kv.set(k, v)
      },
      getConfig: () => ({}),
    },
  }
})

describe('useHealthStore · 经络日志日键 本地日历日口径', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('前提：本机须为非 UTC 时区，否则时区敏感断言无意义', () => {
    const localKey = getLocalDateKey(new Date('2026-03-14T19:00:00.000Z'))
    const utcKey = '2026-03-14T19:00:00.000Z'.slice(0, 10)
    expect(localKey).not.toBe(utcKey)
  })

  it('东八区 00:00–08:00：经络感受归属本地当日（日键非 UTC 前一天）', async () => {
    vi.useFakeTimers()
    // 本地 2026-03-15 03:00（= UTC 2026-03-14 19:00，UTC 切日会退到前一天）
    vi.setSystemTime(new Date(2026, 2, 15, 3, 0, 0))
    try {
      const { useHealthStore } = await import('../health')
      const health = useHealthStore()

      health.recordMeridianFeeling(3, '顺畅')

      // 日键应为本地日历日 2026-03-15，而非 UTC 的 2026-03-14
      expect(health.meridianLogs[0].date).toBe('2026-03-15')
      // 按本地日键可回读到当日当时辰的感受
      expect(health.getMeridianFeeling(3, '2026-03-15')).toBe('顺畅')
      // 默认（今日=本地日）也能回读
      expect(health.getMeridianFeeling(3)).toBe('顺畅')
    } finally {
      vi.useRealTimers()
    }
  })
})
