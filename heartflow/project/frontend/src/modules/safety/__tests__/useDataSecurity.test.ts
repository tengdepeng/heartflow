// ============================================================
// 数据安全 composable · 纯函数测试
// ============================================================

import { describe, expect, it } from 'vitest'
import { encryptData, decryptData, formatBackupTime } from '../composables/useDataSecurity'

describe('encryptData', () => {
  it('加密中文文本', () => {
    const encrypted = encryptData('你好世界')
    expect(encrypted).not.toBe('你好世界')
    expect(encrypted).toBeTruthy()
  })

  it('加密英文文本', () => {
    const encrypted = encryptData('hello world')
    expect(encrypted).not.toBe('hello world')
    expect(encrypted).toBeTruthy()
  })

  it('加密空字符串', () => {
    const encrypted = encryptData('')
    expect(encrypted).toBe('')
  })

  it('加密与解密往返一致', () => {
    const original = 'Hello 你好世界！'
    const encrypted = encryptData(original)
    const decrypted = decryptData(encrypted)
    expect(decrypted).toBe(original)
  })

  it('加密特殊字符', () => {
    const original = '!@#$%^&*()_+-=[]{}|;:",.<>?/'
    const encrypted = encryptData(original)
    const decrypted = decryptData(encrypted)
    expect(decrypted).toBe(original)
  })
})

describe('decryptData', () => {
  it('解密正常数据', () => {
    const encrypted = encryptData('测试数据')
    expect(decryptData(encrypted)).toBe('测试数据')
  })

  it('解密无效数据返回原值', () => {
    const result = decryptData('not-valid-base64!!!')
    expect(result).toBe('not-valid-base64!!!')
  })

  it('解密空字符串', () => {
    expect(decryptData('')).toBe('')
  })
})

describe('formatBackupTime', () => {
  it('null 返回"从未备份"', () => {
    expect(formatBackupTime(null)).toBe('从未备份')
  })

  it('几分钟前', () => {
    const timestamp = Date.now() - 5 * 60000 // 5 分钟前
    expect(formatBackupTime(timestamp)).toContain('分钟前')
  })

  it('几小时前', () => {
    const timestamp = Date.now() - 3 * 3600000 // 3 小时前
    expect(formatBackupTime(timestamp)).toContain('小时前')
  })

  it('超过 24 小时显示日期', () => {
    const timestamp = Date.now() - 48 * 3600000 // 48 小时前
    const result = formatBackupTime(timestamp)
    expect(result).not.toContain('小时前')
    expect(result).not.toContain('分钟前')
    expect(result).not.toBe('从未备份')
  })
})