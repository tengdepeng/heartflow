// ============================================================
// situation.ts 单元测试
// 验证：时段判定 + 情境上下文拼装（任意子项缺失都安全省略）
// ============================================================

import { describe, it, expect } from 'vitest'
import { detectTimeSlot, buildAdvisorSituationContext } from '../situation'

describe('detectTimeSlot', () => {
  it('按小时正确归位时段', () => {
    expect(detectTimeSlot(6)).toBe('dawn')
    expect(detectTimeSlot(8)).toBe('morning')
    expect(detectTimeSlot(12)).toBe('noon')
    expect(detectTimeSlot(15)).toBe('afternoon')
    expect(detectTimeSlot(18)).toBe('dusk')
    expect(detectTimeSlot(20)).toBe('evening')
    expect(detectTimeSlot(23)).toBe('night')
    expect(detectTimeSlot(3)).toBe('midnight')
  })

  it('处理时段边界', () => {
    // morning = [7,11) 左闭右开
    expect(detectTimeSlot(7)).toBe('morning')
    expect(detectTimeSlot(11)).toBe('noon')
    // night = [22,1) 跨午夜：0 点落入 night，1 点起进入 midnight
    expect(detectTimeSlot(22)).toBe('night')
    expect(detectTimeSlot(0)).toBe('night')
    expect(detectTimeSlot(1)).toBe('midnight')
  })

  it('非法小时（NaN）回退午后', () => {
    expect(detectTimeSlot(Number.NaN)).toBe('afternoon')
  })
})

describe('buildAdvisorSituationContext', () => {
  it('空输入返回空串', () => {
    expect(buildAdvisorSituationContext({})).toBe('')
  })

  it('仅时段时输出时段句', () => {
    const out = buildAdvisorSituationContext({ timeSlot: 'evening' })
    expect(out).toContain('晚间')
    expect(out).toContain('放松')
    expect(out).not.toContain('你正在')
    expect(out).not.toContain('殿堂痕迹')
  })

  it('时段 + 活动组合', () => {
    const out = buildAdvisorSituationContext({
      timeSlot: 'night',
      activities: ['meditating', 'reading'],
    })
    expect(out).toContain('深夜')
    expect(out).toContain('你正在：冥想、阅读。')
  })

  it('仅知识库有内容时带标签', () => {
    const out = buildAdvisorSituationContext({
      knowledge: '- [笔记] 关于心流\n- [情绪] 焦虑',
    })
    expect(out).toContain('你被授权可参考的用户近期殿堂痕迹：')
    expect(out).toContain('- [笔记] 关于心流')
  })

  it('知识库为空白时省略', () => {
    const out = buildAdvisorSituationContext({ knowledge: '   \n  ' })
    expect(out).toBe('')
  })

  it('全字段拼装多行', () => {
    const out = buildAdvisorSituationContext({
      timeSlot: 'dawn',
      activities: ['wandering'],
      knowledge: '- [活动] 晨练',
    })
    const lines = out.split('\n')
    expect(lines).toHaveLength(4)
    expect(out).toContain('破晓')
    expect(out).toContain('你正在：漫步。')
    expect(out).toContain('- [活动] 晨练')
  })
})
