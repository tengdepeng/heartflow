import { describe, expect, it } from 'vitest'
import {
  INTENT_ROUTE,
  DIRECT_ACTION_INTENTS,
  getIntentRoute,
  isDirectAction,
} from '../intent-launch'

describe('intent-launch 映射', () => {
  it('专注需直接执行而非导航', () => {
    expect(isDirectAction('focus')).toBe(true)
    expect(getIntentRoute('focus')).toBeNull()
  })

  it('笔记 / 情绪 / 锚点等可导航至对应房间', () => {
    expect(getIntentRoute('note')).toBe('/notes')
    expect(getIntentRoute('emotion')).toBe('/emotion')
    expect(getIntentRoute('anchor')).toBe('/anchor')
    expect(getIntentRoute('plan')).toBe('/notes')
    expect(getIntentRoute('reflect')).toBe('/timeline')
    expect(getIntentRoute('learn')).toBe('/wisdom')
    expect(getIntentRoute('create')).toBe('/craft')
    expect(getIntentRoute('rest')).toBe('/rest')
    expect(getIntentRoute('explore')).toBe('/')
  })

  it('未知意图返回 null', () => {
    expect(getIntentRoute('unknown' as never)).toBeNull()
  })

  it('映射表不含直接执行意图', () => {
    for (const c of DIRECT_ACTION_INTENTS) {
      expect(INTENT_ROUTE[c]).toBeUndefined()
    }
  })
})
