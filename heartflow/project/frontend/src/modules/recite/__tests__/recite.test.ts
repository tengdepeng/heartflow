import { describe, it, expect } from 'vitest'
import {
  segmentText,
  maskText,
  evaluateAccuracy,
  nextCoverStep,
  reciteDisplay,
  RECITE_STEPS,
  PASS_THRESHOLD,
  type ReciteCard,
} from '../recite'

describe('recite · 渐进式背诵引擎', () => {
  it('segmentText：CJK 按字分段且标实词', () => {
    const s = segmentText('床前明月光，疑是地上霜。', 'cjk')
    expect(s.tokens.length).toBeGreaterThan(10)
    expect(s.content.filter(Boolean).length).toBe(10)
    // 逗号句号不是实词
    const commaIdx = s.tokens.indexOf('，')
    expect(s.content[commaIdx]).toBe(false)
  })

  it('segmentText：拉丁按词分段', () => {
    const s = segmentText('The quick brown fox.', 'latin')
    expect(s.tokens).toContain('The')
    expect(s.tokens).toContain('quick')
    expect(s.tokens).not.toContain(' ')
  })

  it('maskText：遮蔽比例正确且标点可见', () => {
    const { tokens, content } = segmentText('床前明月光，疑是地上霜', 'cjk')
    const masked = maskText(tokens, content, 0.5)
    expect(masked.coveredCount).toBe(Math.round(masked.totalContent * 0.5))
    // 标点未被遮蔽
    const commaIdx = tokens.indexOf('，')
    expect(masked.tokens[commaIdx]).toBe('，')
  })

  it('evaluateAccuracy：完全正确为 100，错误计 0', () => {
    expect(evaluateAccuracy('床前明月光，疑是地上霜', '床前明月光，疑是地上霜').accuracy).toBe(100)
    expect(evaluateAccuracy('xxxxxx', '床前明月光').accuracy).toBe(0)
  })

  it('evaluateAccuracy：大小写与空白被忽略', () => {
    const r = evaluateAccuracy('The Quick Fox', 'the quick  fox')
    expect(r.accuracy).toBe(100)
  })

  it('evaluateAccuracy：标出错误位置', () => {
    const r = evaluateAccuracy('窗前明月光', '床前明月光')
    expect(r.wrongIndices.length).toBeGreaterThan(0)
    expect(r.wrongTokens).toContain('床')
  })

  it('nextCoverStep：高准确率升档，低准确率保档或降档', () => {
    expect(nextCoverStep(0, 95)).toBe(1)
    expect(nextCoverStep(1, 70)).toBe(1)
    expect(nextCoverStep(1, 30)).toBe(0)
    expect(nextCoverStep(RECITE_STEPS.length - 1, 95)).toBe(RECITE_STEPS.length - 1)
  })

  it('RECITE_STEPS：从 20% 渐进到 100%', () => {
    expect(RECITE_STEPS[0]).toBe(0.2)
    expect(RECITE_STEPS[RECITE_STEPS.length - 1]).toBe(1.0)
    expect(PASS_THRESHOLD).toBe(90)
  })

  it('reciteDisplay：由卡片索引取遮盖档', () => {
    const card: ReciteCard = {
      id: 'c1', title: '静夜思', text: '床前明月光', lang: 'cjk',
      createdAt: new Date().toISOString(), stepIndex: 0, bestAccuracy: 0, attempts: 0,
      correctCount: 0, wrongCount: 0, errorTokens: {},
    }
    const disp = reciteDisplay(card)
    expect(disp.coveredCount).toBe(Math.round(5 * 0.2))
    expect(disp.tokens).toContain('▁')
  })
})