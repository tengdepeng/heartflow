// ============================================================
// 更漏 · 自然语言任务解析测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { parseTaskText, TASK_CATEGORY_KEYWORDS } from '../task-parse'

describe('parseTaskText 时长解析', () => {
  it('「25分钟学习」→ 1500 秒 + study', () => {
    const p = parseTaskText('25分钟学习')
    expect(p).not.toBeNull()
    expect(p!.durationSeconds).toBe(1500)
    expect(p!.category).toBe('study')
    expect(p!.matched).toBe(true)
  })

  it('「1小时30分写代码」→ 5400 秒 + project', () => {
    const p = parseTaskText('1小时30分写代码')
    expect(p!.durationSeconds).toBe(5400)
    expect(p!.category).toBe('project')
  })

  it('「45分钟 阅读」→ 2700 秒 + study，备注为空', () => {
    const p = parseTaskText('45分钟 阅读')
    expect(p!.durationSeconds).toBe(2700)
    expect(p!.category).toBe('study')
    expect(p!.note).toBe('')
  })

  it('「2小时 整理房间」→ 7200 秒 + daily', () => {
    const p = parseTaskText('2小时 整理房间')
    expect(p!.durationSeconds).toBe(7200)
    expect(p!.category).toBe('daily')
  })

  it('「30秒 深呼吸」→ 30 秒', () => {
    const p = parseTaskText('30秒 深呼吸')
    expect(p!.durationSeconds).toBe(30)
  })

  it('英文单位 h/min 也识别', () => {
    expect(parseTaskText('1h 学习')!.durationSeconds).toBe(3600)
    expect(parseTaskText('30min 阅读')!.durationSeconds).toBe(1800)
  })
})

describe('parseTaskText 分类路由', () => {
  it('未命中关键词 → custom', () => {
    const p = parseTaskText('30分钟 冥想')
    expect(p!.category).toBe('custom')
    expect(p!.note).toBe('冥想')
  })

  it('备注去除分类关键词后保留其余文字', () => {
    const p = parseTaskText('40分钟 学习 线性代数')
    expect(p!.category).toBe('study')
    expect(p!.note).toBe('线性代数')
  })
})

describe('parseTaskText 边界', () => {
  it('空文本返回 null', () => {
    expect(parseTaskText('')).toBeNull()
    expect(parseTaskText('   ')).toBeNull()
  })

  it('无时长 → matched false', () => {
    const p = parseTaskText('学习')
    expect(p!.matched).toBe(false)
    expect(p!.durationSeconds).toBe(0)
    expect(p!.category).toBe('study')
  })
})

describe('TASK_CATEGORY_KEYWORDS', () => {
  it('五个分类关键词表齐全', () => {
    expect(Object.keys(TASK_CATEGORY_KEYWORDS)).toHaveLength(5)
    expect(TASK_CATEGORY_KEYWORDS.study.length).toBeGreaterThan(0)
  })
})
