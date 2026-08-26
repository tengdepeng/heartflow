// ============================================================
// 逐日心锚 · 智能提醒宪法门控测试（A2 批② · behavior:reminder）
// 验证 isReminderSuppressedByConstitution：宪法活跃时仅抑制 App 默认诱导型提醒，
// 用户自建规则不受影响（不造宪法陷阱）。
// ============================================================

import { describe, expect, it } from 'vitest'
import { isReminderSuppressedByConstitution } from '../celebration'
import type { ReminderRule } from '../celebration'

function makeRule(type: ReminderRule['type'], isDefault = false): ReminderRule {
  return {
    id: 'r',
    type,
    enabled: true,
    condition: {},
    messageTemplate: 'x',
    priority: 'low',
    isDefault,
  }
}

describe('isReminderSuppressedByConstitution (A2 批②)', () => {
  it('宪法活跃时抑制 App 默认的诱导型提醒（time/idle/streak）', () => {
    expect(isReminderSuppressedByConstitution(makeRule('time', true), true)).toBe(true)
    expect(isReminderSuppressedByConstitution(makeRule('idle', true), true)).toBe(true)
    expect(isReminderSuppressedByConstitution(makeRule('streak', true), true)).toBe(true)
  })

  it('功能型默认提醒（deadline/drift/priority）不被抑制', () => {
    expect(isReminderSuppressedByConstitution(makeRule('deadline', true), true)).toBe(false)
    expect(isReminderSuppressedByConstitution(makeRule('drift', true), true)).toBe(false)
    expect(isReminderSuppressedByConstitution(makeRule('priority', true), true)).toBe(false)
  })

  it('用户自建规则（isDefault=false）不被抑制，避免宪法陷阱', () => {
    expect(isReminderSuppressedByConstitution(makeRule('time', false), true)).toBe(false)
    expect(isReminderSuppressedByConstitution(makeRule('idle', false), true)).toBe(false)
    expect(isReminderSuppressedByConstitution(makeRule('streak', false), true)).toBe(false)
  })

  it('宪法关闭时（reminderActive=false）默认提醒照常触发', () => {
    expect(isReminderSuppressedByConstitution(makeRule('time', true), false)).toBe(false)
    expect(isReminderSuppressedByConstitution(makeRule('idle', true), false)).toBe(false)
  })
})
