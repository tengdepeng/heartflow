// ============================================================
// AI 引擎 · 提示词模板系统测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { BUILTIN_TEMPLATES, renderTemplate, getTemplate } from '../prompt'
import { buildAdvisorSystemPrompt, buildDingyinSystemPrompt, buildAnnualDialoguePrompt } from '../prompt'
import type { AdvisorRole, AdvisorPersonality } from '../../../types'

describe('BUILTIN_TEMPLATES', () => {
  it('包含 3 个内置模板', () => {
    expect(BUILTIN_TEMPLATES).toHaveLength(3)
    const ids = BUILTIN_TEMPLATES.map(t => t.id)
    expect(ids).toContain('advisor-chat')
    expect(ids).toContain('dingyin-hammer')
    expect(ids).toContain('annual-dialogue')
  })

  it('每个模板都有 systemTemplate', () => {
    for (const t of BUILTIN_TEMPLATES) {
      expect(t.systemTemplate).toBeTruthy()
      expect(t.systemTemplate).toContain('{{')
    }
  })
})

describe('getTemplate', () => {
  it('根据 ID 查找模板', () => {
    const t = getTemplate('advisor-chat')
    expect(t).toBeDefined()
    expect(t!.name).toBe('幕僚对话')
  })

  it('未知 ID 返回 undefined', () => {
    expect(getTemplate('nonexistent')).toBeUndefined()
  })
})

describe('renderTemplate', () => {
  it('替换 {{变量}} 占位符', () => {
    const result = renderTemplate('你好，{{name}}！', { name: '世界' })
    expect(result).toBe('你好，世界！')
  })

  it('替换多个变量', () => {
    const result = renderTemplate('{{greeting}}，{{name}}！', { greeting: 'Hello', name: 'World' })
    expect(result).toBe('Hello，World！')
  })

  it('移除未替换的占位符', () => {
    const result = renderTemplate('你好，{{name}}！{{unused}}', { name: '世界' })
    expect(result).toBe('你好，世界！')
  })

  it('空变量列表时保留原模板', () => {
    const result = renderTemplate('你好，世界！', {})
    expect(result).toBe('你好，世界！')
  })

  it('处理重复出现的相同变量', () => {
    const result = renderTemplate('{{name}}，你好！我是{{name}}。', { name: 'AI' })
    expect(result).toBe('AI，你好！我是AI。')
  })
})

describe('buildAdvisorSystemPrompt', () => {
  it('生成包含幕僚信息的系统提示词', () => {
    const prompt = buildAdvisorSystemPrompt({
      name: '小镜',
      role: 'scholar' as AdvisorRole,
      personality: 'steady' as AdvisorPersonality,
      affinity: 60,
      turnCount: 15,
      lastUserMessage: '今天心情不错',
    })
    expect(prompt).toContain('小镜')
    expect(prompt).toContain('学士')
    expect(prompt).toContain('简洁')
    expect(prompt).toContain('信赖')
    expect(prompt).toContain('15')
    expect(prompt).toContain('今天心情不错')
  })

  it('低好感度生成陌路描述', () => {
    const prompt = buildAdvisorSystemPrompt({
      name: '陌生人',
      role: 'hermit' as AdvisorRole,
      personality: 'lively' as AdvisorPersonality,
      affinity: 0,
      turnCount: 1,
      lastUserMessage: '你好',
    })
    expect(prompt).toContain('陌路')
    expect(prompt).toContain('好感度 20 以下')
  })

  it('高好感度生成羁绊描述', () => {
    const prompt = buildAdvisorSystemPrompt({
      name: '知己',
      role: 'guardian' as AdvisorRole,
      personality: 'caring' as AdvisorPersonality,
      affinity: 100,
      turnCount: 200,
      lastUserMessage: '谢谢你一直陪着我',
    })
    expect(prompt).toContain('羁绊')
    expect(prompt).toContain('好感度 95 以上')
  })

  it('空用户消息时使用占位符', () => {
    const prompt = buildAdvisorSystemPrompt({
      name: '小镜',
      role: 'craftsman' as AdvisorRole,
      personality: 'rigorous' as AdvisorPersonality,
      affinity: 30,
      turnCount: 5,
      lastUserMessage: '',
    })
    expect(prompt).toContain('暂无')
  })

  it('不同性格生成不同的额外规则', () => {
    const steady = buildAdvisorSystemPrompt({
      name: 'A', role: 'scholar' as AdvisorRole, personality: 'steady' as AdvisorPersonality,
      affinity: 50, turnCount: 10, lastUserMessage: 'test',
    })
    const lively = buildAdvisorSystemPrompt({
      name: 'B', role: 'scholar' as AdvisorRole, personality: 'lively' as AdvisorPersonality,
      affinity: 50, turnCount: 10, lastUserMessage: 'test',
    })
    expect(steady).not.toBe(lively)
    expect(steady).toContain('少用修饰词')
    expect(lively).toContain('语气活泼')
  })

  it('有 context 时追加「情境与知识」段落', () => {
    const prompt = buildAdvisorSystemPrompt({
      name: '小镜',
      role: 'hermit' as AdvisorRole,
      personality: 'intuitive' as AdvisorPersonality,
      affinity: 40,
      turnCount: 8,
      lastUserMessage: '在吗',
      context: '天色时段：深夜（沉思）。\n你正在：冥想。',
    })
    expect(prompt).toContain('情境与知识')
    expect(prompt).toContain('深夜')
    expect(prompt).toContain('冥想')
  })

  it('无 context 时不出现「情境与知识」段落', () => {
    const prompt = buildAdvisorSystemPrompt({
      name: '小镜',
      role: 'hermit' as AdvisorRole,
      personality: 'intuitive' as AdvisorPersonality,
      affinity: 40,
      turnCount: 8,
      lastUserMessage: '在吗',
    })
    expect(prompt).not.toContain('情境与知识')
  })
})

describe('buildDingyinSystemPrompt', () => {
  it('生成定音锤总结提示词', () => {
    const prompt = buildDingyinSystemPrompt({
      advisorName: '小镜',
      personality: 'intuitive' as AdvisorPersonality,
      eventType: 'focus_complete',
      count: 10,
    })
    expect(prompt).toContain('小镜')
    expect(prompt).toContain('专注完成')
    expect(prompt).toContain('10')
    expect(prompt).toContain('诗意')
  })
})

describe('buildAnnualDialoguePrompt', () => {
  it('生成年度对话提示词', () => {
    const prompt = buildAnnualDialoguePrompt({
      advisorName: '小镜',
      personality: 'caring' as AdvisorPersonality,
      dialogueType: 'annual',
    })
    expect(prompt).toContain('小镜')
    expect(prompt).toContain('年度')
    expect(prompt).toContain('温和')
  })

  it('生成季度对话提示词', () => {
    const prompt = buildAnnualDialoguePrompt({
      advisorName: '小镜',
      personality: 'caring' as AdvisorPersonality,
      dialogueType: 'quarterly',
    })
    expect(prompt).toContain('季度')
  })
})