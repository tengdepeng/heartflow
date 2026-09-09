import { describe, it, expect, vi } from 'vitest'
import {
  advisorActionAllowed,
  isAdvisorRestrained,
  RESTRICTED_ADVISOR_ACTIONS,
} from '../restraint'

vi.mock('../../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn((t: string) => t === 'advisor:restraint'),
}))

import { isTargetActive } from '../../../engine/constitution-effect'

describe('advisorActionAllowed · 第44条幕僚的克制', () => {
  it('非受限动作一律放行', () => {
    for (const a of [
      'focus',
      'note',
      'emotion',
      'anchor',
      'review',
      'finance',
      'navigate',
      'general',
    ]) {
      expect(advisorActionAllowed(a)).toBe(true)
    }
  })

  it('克制生效时代执行动作被拦截', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    expect(advisorActionAllowed('send')).toBe(false)
    expect(advisorActionAllowed('trade')).toBe(false)
    expect(advisorActionAllowed('external-interact')).toBe(false)
    expect(isAdvisorRestrained()).toBe(true)
  })

  it('克制关闭时代执行动作放行', () => {
    vi.mocked(isTargetActive).mockReturnValue(false)
    expect(advisorActionAllowed('send')).toBe(true)
    expect(isAdvisorRestrained()).toBe(false)
  })

  it('受限动作集合含 send/trade/external-interact', () => {
    expect(RESTRICTED_ADVISOR_ACTIONS.has('send')).toBe(true)
    expect(RESTRICTED_ADVISOR_ACTIONS.has('trade')).toBe(true)
    expect(RESTRICTED_ADVISOR_ACTIONS.has('external-interact')).toBe(true)
  })
})
