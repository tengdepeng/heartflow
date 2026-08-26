// ============================================================
// 逸趣阁 · 数据常量与工具函数测试
// ============================================================

import { describe, expect, it } from 'vitest'
import {
  PLAY_TABS,
  TOY_FILTERS,
  STATUS_LABEL_MAP,
  VALUE_LABEL_MAP,
  valueLabel,
  statusLabel,
  formatDate,
} from '../data'

describe('PLAY_TABS', () => {
  it('包含 4 个 tab', () => {
    expect(PLAY_TABS.length).toBe(4)
  })

  it('每个 tab 有 key 和 label', () => {
    for (const tab of PLAY_TABS) {
      expect(tab.key).toBeTruthy()
      expect(tab.label).toBeTruthy()
    }
  })
})

describe('TOY_FILTERS', () => {
  it('包含 5 个筛选项', () => {
    expect(TOY_FILTERS.length).toBe(5)
  })

  it('第一个是全部', () => {
    expect(TOY_FILTERS[0].key).toBe('all')
  })
})

describe('STATUS_LABEL_MAP', () => {
  it('sealed → 未开封', () => {
    expect(STATUS_LABEL_MAP.sealed).toBe('未开封')
  })

  it('display → 展示', () => {
    expect(STATUS_LABEL_MAP.display).toBe('展示')
  })

  it('opened → 拆盒', () => {
    expect(STATUS_LABEL_MAP.opened).toBe('拆盒')
  })
})

describe('VALUE_LABEL_MAP', () => {
  it('mint → 全新', () => {
    expect(VALUE_LABEL_MAP.mint).toBe('全新')
  })

  it('used → 常用', () => {
    expect(VALUE_LABEL_MAP.used).toBe('常用')
  })
})

describe('valueLabel', () => {
  it('已知键返回对应标签', () => {
    expect(valueLabel('mint')).toBe('全新')
    expect(valueLabel('light')).toBe('轻微')
    expect(valueLabel('used')).toBe('常用')
    expect(valueLabel('display')).toBe('展示')
  })

  it('未知键返回原值', () => {
    expect(valueLabel('unknown')).toBe('unknown')
  })

  it('空字符串返回空字符串', () => {
    expect(valueLabel('')).toBe('')
  })
})

describe('statusLabel', () => {
  it('已知键返回对应标签', () => {
    expect(statusLabel('sealed')).toBe('未开封')
    expect(statusLabel('display')).toBe('展示')
    expect(statusLabel('opened')).toBe('拆盒')
  })

  it('未知键返回原值', () => {
    expect(statusLabel('random')).toBe('random')
  })
})

describe('formatDate', () => {
  it('格式化 ISO 日期为 YY/MM/DD', () => {
    const result = formatDate('2026-07-31T10:00:00.000Z')
    expect(result).toBe('26/7/31')
  })

  it('格式化 1 月 1 日', () => {
    const result = formatDate('2026-01-01T00:00:00.000Z')
    expect(result).toBe('26/1/1')
  })

  it('格式化 12 月 31 日（使用本地日期避免时区偏移）', () => {
    // 使用不含时区的日期字符串，避免 UTC 偏移导致日期跨天
    const result = formatDate('2025-12-31')
    expect(result).toBe('25/12/31')
  })
})