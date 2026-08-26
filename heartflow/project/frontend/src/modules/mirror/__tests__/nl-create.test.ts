// ============================================================
// 镜我 · 自然语言创建测试
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { executeNaturalLanguageCreate, detectHabitIntent, previewIntent, personaReply, extractStructured, extractDue, extractAssignee, extractPriority } from '../nl-create'
import { useStudy } from '../../study'
import { getNodes } from '../../knowledge/relation'

describe('自然语言创建', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  it('detectHabitIntent 识别习惯关键词', () => {
    expect(detectHabitIntent('每天背单词')).toBe(true)
    expect(detectHabitIntent('记录一下今天的心情')).toBe(false)
  })

  it('习惯语句 → 自律工坊创建习惯', () => {
    const r = executeNaturalLanguageCreate('每天坚持跑步')
    expect(r.kind).toBe('habit')
    if (r.kind === 'habit') {
      expect(r.id).toBeTruthy()
      expect(r.title).toBe('跑步')
    }
  })

  it('计划语句 → 经略阁创建知识节点', () => {
    const r = executeNaturalLanguageCreate('制定计划：整理季度复盘')
    expect(r.kind).toBe('plan')
    if (r.kind === 'plan') {
      expect(r.id).toBeTruthy()
      expect(r.title).toContain('季度复盘')
    }
  })

  it('笔记语句 → 思绪书房快速记录', () => {
    const r = executeNaturalLanguageCreate('记一下刚才的灵感 #idea')
    expect(r.kind).toBe('note')
    if (r.kind === 'note') expect(r.id).toBeTruthy()
  })

  it('空输入 → unsupported', () => {
    expect(executeNaturalLanguageCreate('   ').kind).toBe('unsupported')
  })
})

// ============================================================
// MVP 四件套：实时预览 / 房间感知 / 意图覆盖 / 人格化回应
// ============================================================
describe('自然语言创建 · 预览与房间感知', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  it('previewIntent 习惯语句 → habit + 标题', () => {
    const p = previewIntent('每天坚持跑步')
    expect(p.kind).toBe('habit')
    expect(p.habitHit).toBe(true)
    expect(p.title).toContain('跑步')
  })

  it('previewIntent 计划/笔记/专注 → 对应分类', () => {
    expect(previewIntent('制定计划：季度复盘').kind).toBe('plan')
    expect(previewIntent('记一下灵感 #idea').kind).toBe('note')
    expect(previewIntent('开始专注').kind).toBe('focus')
  })

  it('previewIntent 空输入 → unsupported', () => {
    expect(previewIntent('  ').kind).toBe('unsupported')
  })

  it('previewIntent 透传 roomId', () => {
    const p = previewIntent('记一下灵感', { roomId: 'study' })
    expect(p.roomId).toBe('study')
  })

  it('executeNaturalLanguageCreate 带 roomId → 笔记打上 roomId', () => {
    const r = executeNaturalLanguageCreate('记一下灵感 #idea', { roomId: 'study' })
    expect(r.kind).toBe('note')
    if (r.kind === 'note') {
      const note = useStudy().notes.value.find(n => n.id === r.id)
      expect(note?.roomId).toBe('study')
    }
  })

  it('executeNaturalLanguageCreate 带 roomId → 计划节点打上 roomId', () => {
    const r = executeNaturalLanguageCreate('制定计划：季度复盘', { roomId: 'study' })
    expect(r.kind).toBe('plan')
    if (r.kind === 'plan') {
      const node = getNodes().find(n => n.id === r.id)
      expect(node?.roomId).toBe('study')
    }
  })

  it('overrideKind 优先级高于自动识别', () => {
    const r = executeNaturalLanguageCreate('记一下灵感', { overrideKind: 'plan' })
    expect(r.kind).toBe('plan')
  })

  it('personaReply 各性格返回非空文案（含未知性格回落）', () => {
    for (const kind of ['habit', 'plan', 'note', 'focus'] as const) {
      for (const persona of ['steady', 'lively', 'rigorous', 'intuitive', 'caring']) {
        expect(personaReply(kind, persona)).toBeTruthy()
      }
      expect(personaReply(kind, 'unknown-persona')).toBeTruthy()
    }
  })
})

// ============================================================
// 方案 14 · 语丝结构化抽取（时间 / 执行人 / 优先级）
// ============================================================
describe('自然语言创建 · 结构化抽取', () => {
  it('extractDue 相对日 + 时间点 → 本地 ISO', () => {
    const base = new Date()
    const tmr = new Date(base)
    tmr.setDate(tmr.getDate() + 1)
    const pad = (n: number) => String(n).padStart(2, '0')
    const exp = `${tmr.getFullYear()}-${pad(tmr.getMonth() + 1)}-${pad(tmr.getDate())}T15:00:00`
    const d = extractDue('明天下午3点交报告')
    expect(d.iso).toBe(exp)
    expect(d.label).toContain('明天')
  })

  it('extractDue 星期 → 非空日期', () => {
    const d = extractDue('周五开会')
    expect(d.iso).toBeTruthy()
    expect(d.iso).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  it('extractDue 绝对月日 → 固定月日', () => {
    const d = extractDue('3月5日提交')
    expect(d.iso).toMatch(/-03-05$/)
  })

  it('extractAssignee @提及 / 交给 / 和X一起', () => {
    expect(extractAssignee('@张三 做设计')).toBe('张三')
    expect(extractAssignee('交给李四完成')).toBe('李四')
    expect(extractAssignee('和小明去跑步')).toBe('小明')
    expect(extractAssignee('记一下灵感')).toBeNull()
  })

  it('extractPriority 紧急/有空/普通', () => {
    expect(extractPriority('紧急修复登录bug')).toBe('high')
    expect(extractPriority('有空看看文档')).toBe('low')
    expect(extractPriority('记一下灵感')).toBe('normal')
  })

  it('extractStructured 综合抽取 时间+执行人+优先级+标签', () => {
    const s = extractStructured('明天下午3点让张三紧急处理上线 #ops')
    expect(s.due).toBeTruthy()
    expect(s.assignee).toBe('张三')
    expect(s.priority).toBe('high')
    expect(s.tags).toContain('ops')
    expect(s.title).toBeTruthy()
  })

  it('executeNaturalLanguageCreate 笔记落库带上结构化字段', () => {
    const r = executeNaturalLanguageCreate('记一下明天下午3点让张三紧急处理上线 #ops')
    expect(r.kind).toBe('note')
    if (r.kind === 'note') {
      const note = useStudy().notes.value.find(n => n.id === r.id)
      expect(note?.due).toBeTruthy()
      expect(note?.assignee).toBe('张三')
      expect(note?.priority).toBe('high')
      expect(note?.tags).toContain('ops')
      expect(note?.title).toBeTruthy()
    }
  })

  it('executeNaturalLanguageCreate 计划节点落库带上结构化字段', () => {
    const r = executeNaturalLanguageCreate('制定计划：明天下午3点让张三紧急处理上线 #ops')
    expect(r.kind).toBe('plan')
    if (r.kind === 'plan') {
      const node = getNodes().find(n => n.id === r.id)
      expect(node?.due).toBeTruthy()
      expect(node?.assignee).toBe('张三')
      expect(node?.priority).toBe('high')
    }
  })
})
