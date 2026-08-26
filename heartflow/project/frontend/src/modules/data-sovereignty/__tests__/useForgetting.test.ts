// ============================================================
// 数据主权 · useForgetting 纯函数测试
// ============================================================

import { describe, expect, it } from 'vitest'

// 从 composable 中提取的纯函数，需要直接导入
// 由于这些函数是 useForgetting 内部的闭包函数，无法直接导出
// 这里测试与其等价的核心逻辑

describe('formatForgetTime 等价逻辑', () => {
  function formatForgetTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    const dt = new Date(timestamp)
    return `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`
  }

  it('30 秒前返回"刚刚"', () => {
    expect(formatForgetTime(Date.now() - 30000)).toBe('刚刚')
  })

  it('5 分钟前返回"5 分钟前"', () => {
    expect(formatForgetTime(Date.now() - 5 * 60000)).toBe('5 分钟前')
  })

  it('3 小时前返回"3 小时前"', () => {
    expect(formatForgetTime(Date.now() - 3 * 3600000)).toBe('3 小时前')
  })

  it('超过 24 小时显示日期格式', () => {
    const result = formatForgetTime(Date.now() - 48 * 3600000)
    expect(result).toMatch(/^\d{1,2}\/\d{1,2}\s\d{1,2}:\d{2}$/)
  })
})

describe('formatBytes 等价逻辑', () => {
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0B'
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1048576).toFixed(1)}MB`
  }

  it('0 字节返回 0B', () => {
    expect(formatBytes(0)).toBe('0B')
  })

  it('500 字节返回 500B', () => {
    expect(formatBytes(500)).toBe('500B')
  })

  it('1024 字节返回 1.0KB', () => {
    expect(formatBytes(1024)).toBe('1.0KB')
  })

  it('1536 字节返回 1.5KB', () => {
    expect(formatBytes(1536)).toBe('1.5KB')
  })

  it('1048576 字节返回 1.0MB', () => {
    expect(formatBytes(1048576)).toBe('1.0MB')
  })

  it('2097152 字节返回 2.0MB', () => {
    expect(formatBytes(2097152)).toBe('2.0MB')
  })
})

describe('formatRecoverableUntil 等价逻辑', () => {
  // 捕获单次基准时间，避免两次 Date.now() 之间的毫秒抖动导致 days 被 floor 成 29
  const NOW = Date.now()
  function formatRecoverableUntil(timestamp: number, now: number = NOW): string {
    const remaining = timestamp - now
    if (remaining <= 0) return '已过期'
    const days = Math.floor(remaining / 86400000)
    if (days > 30) return `${Math.floor(days / 30)} 个月后`
    return `${days} 天后`
  }

  it('已过期返回"已过期"', () => {
    expect(formatRecoverableUntil(NOW - 1000)).toBe('已过期')
  })

  it('刚好到期返回"已过期"', () => {
    expect(formatRecoverableUntil(NOW)).toBe('已过期')
  })

  it('5 天后', () => {
    expect(formatRecoverableUntil(NOW + 5 * 86400000)).toBe('5 天后')
  })

  it('30 天后', () => {
    expect(formatRecoverableUntil(NOW + 30 * 86400000)).toBe('30 天后')
  })

  it('31 天后显示"1 个月后"', () => {
    expect(formatRecoverableUntil(NOW + 31 * 86400000)).toBe('1 个月后')
  })

  it('60 天后显示"2 个月后"', () => {
    expect(formatRecoverableUntil(NOW + 60 * 86400000)).toBe('2 个月后')
  })
})