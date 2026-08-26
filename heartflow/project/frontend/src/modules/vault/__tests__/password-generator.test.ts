// ============================================================
// 密码生成器测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  generatePassword,
  generatePassphrase,
  evaluatePasswordStrength,
  DEFAULT_PASSWORD_CONFIG,
  PASSWORD_PRESETS,
} from '../password-generator'

describe('generatePassword', () => {
  it('生成指定长度的密码', () => {
    const pwd = generatePassword({ ...DEFAULT_PASSWORD_CONFIG, length: 12 })
    expect(pwd.length).toBe(12)
  })

  it('生成纯数字密码', () => {
    const pwd = generatePassword({ length: 8, includeLower: false, includeUpper: false, includeDigits: true, includeSymbols: false, excludeAmbiguous: false, requireEach: false })
    expect(pwd.length).toBe(8)
    expect(/^\d+$/.test(pwd)).toBe(true)
  })

  it('requireEach 保证每种字符集至少出现一次', () => {
    const pwd = generatePassword()
    expect(pwd).toMatch(/[a-z]/)
    expect(pwd).toMatch(/[A-Z]/)
    expect(pwd).toMatch(/\d/)
    expect(pwd).toMatch(/[^a-zA-Z0-9]/)
  })

  it('长度限制在 4~128', () => {
    expect(generatePassword({ ...DEFAULT_PASSWORD_CONFIG, length: 200 }).length).toBe(128)
    expect(generatePassword({ ...DEFAULT_PASSWORD_CONFIG, length: 1 }).length).toBe(4)
  })

  it('预设方案生成有效密码', () => {
    for (const preset of PASSWORD_PRESETS) {
      const pwd = generatePassword(preset.config)
      expect(pwd.length).toBeGreaterThanOrEqual(4)
    }
  })
})

describe('generatePassphrase', () => {
  it('生成指定单词数的短语', () => {
    const phrase = generatePassphrase(4, '-')
    expect(phrase.split('-').length).toBe(4)
  })

  it('短语不含空格', () => {
    const phrase = generatePassphrase(3, '-')
    expect(phrase).not.toContain(' ')
  })
})

describe('evaluatePasswordStrength', () => {
  it('长且多样化的密码评为强', () => {
    const result = evaluatePasswordStrength('aB3$xY9#zQ7!wP5')
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.label).toBe('强')
  })

  it('纯数字短密码评为弱', () => {
    const result = evaluatePasswordStrength('1234')
    expect(result.score).toBeLessThan(60)
  })

  it('空密码评分 0', () => {
    const result = evaluatePasswordStrength('')
    expect(result.score).toBe(0)
  })
})