// ============================================================
// 手写识别引擎测试（handwriting）
// ============================================================
import { describe, expect, it } from 'vitest'
import { HANZI_DATA } from '../hanzi-data'
import {
  strokeCount,
  classifyStrokeDirection,
  strokeDirections,
  strokeDirectionSummary,
  sequenceSimilarity,
  matchHandwriting,
  recognizeHandwriting,
  STROKE_SEQUENCES,
  STROKE_DIRECTION_META,
} from '../handwriting'
import type { HandwritingInput, HandwritingPoint } from '../handwriting'

const DB = HANZI_DATA

/** 构造一笔：从起点到终点画一条直线 */
function line(x1: number, y1: number, x2: number, y2: number, steps = 8): HandwritingPoint[] {
  const pts: HandwritingPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t })
  }
  return pts
}

/** 构造一笔折线 */
function poly(...segs: Array<[number, number]>): HandwritingPoint[] {
  const pts: HandwritingPoint[] = []
  for (let i = 0; i < segs.length - 1; i++) {
    const [x1, y1] = segs[i]
    const [x2, y2] = segs[i + 1]
    pts.push(...line(x1, y1, x2, y2, 6))
  }
  return pts
}

describe('strokeCount', () => {
  it('笔画数 = 抬笔次数', () => {
    const input: HandwritingInput = [line(0, 0, 10, 0), line(0, 0, 0, 10), line(0, 10, 10, 0)]
    expect(strokeCount(input)).toBe(3)
  })
  it('空输入为 0', () => {
    expect(strokeCount([])).toBe(0)
  })
})

describe('classifyStrokeDirection', () => {
  it('横向 → 横', () => {
    expect(classifyStrokeDirection(line(0, 5, 40, 5))).toBe('heng')
  })
  it('纵向 → 竖', () => {
    expect(classifyStrokeDirection(line(5, 0, 5, 40))).toBe('shu')
  })
  it('左下斜 → 撇', () => {
    expect(classifyStrokeDirection(line(30, 0, 0, 30))).toBe('pie')
  })
  it('右下斜 → 捺', () => {
    expect(classifyStrokeDirection(line(0, 0, 30, 30))).toBe('na')
  })
  it('右上斜 → 提', () => {
    expect(classifyStrokeDirection(line(0, 30, 30, 0))).toBe('ti')
  })
  it('短促 → 点', () => {
    expect(classifyStrokeDirection([{ x: 5, y: 5 }, { x: 6, y: 6 }])).toBe('dian')
  })
  it('中段转折 → 折', () => {
    expect(classifyStrokeDirection(poly([0, 0], [30, 0], [30, 30]))).toBe('zhe')
  })
  it('末端回钩 → 钩', () => {
    // 先向下再向左上回钩
    expect(classifyStrokeDirection(poly([10, 0], [10, 30], [2, 22]))).toBe('gou')
  })
})

describe('strokeDirections / strokeDirectionSummary', () => {
  it('逐笔分类并统计', () => {
    const input: HandwritingInput = [line(0, 5, 40, 5), line(5, 0, 5, 40), line(0, 0, 30, 30)]
    const dirs = strokeDirections(input)
    expect(dirs).toEqual(['heng', 'shu', 'na'])
    const summary = strokeDirectionSummary(input)
    expect(summary.heng).toBe(1)
    expect(summary.shu).toBe(1)
    expect(summary.na).toBe(1)
  })
})

describe('sequenceSimilarity', () => {
  it('完全一致 → 1', () => {
    expect(sequenceSimilarity(['heng', 'shu'], ['heng', 'shu'])).toBe(1)
  })
  it('部分一致按位计算', () => {
    expect(sequenceSimilarity(['heng', 'pie', 'na'], ['heng', 'shu', 'na'])).toBe(2 / 3)
  })
  it('空序列 → 0', () => {
    expect(sequenceSimilarity([], ['heng'])).toBe(0)
  })
})

describe('matchHandwriting', () => {
  it('按笔画数精确过滤', () => {
    // 三横 → 3 画，应命中「三」
    const input: HandwritingInput = [line(0, 0, 30, 0), line(0, 10, 30, 10), line(0, 20, 30, 20)]
    const matches = matchHandwriting(input, DB)
    expect(matches.length).toBeGreaterThan(0)
    expect(matches.every((m) => m.entry.strokes === 3)).toBe(true)
    expect(matches.some((m) => m.entry.char === '三')).toBe(true)
  })
  it('部首过滤生效', () => {
    const input: HandwritingInput = [line(0, 0, 30, 0), line(0, 10, 30, 10), line(0, 20, 30, 20)]
    const matches = matchHandwriting(input, DB, { radical: '一' })
    expect(matches.length).toBeGreaterThan(0)
    expect(matches.every((m) => m.entry.radical === '一')).toBe(true)
  })
  it('笔画走向序列加分：横撇捺 → 大 排前', () => {
    const input: HandwritingInput = [line(0, 5, 30, 5), line(30, 5, 5, 30), line(5, 30, 30, 30)]
    const matches = matchHandwriting(input, DB)
    const top = matches[0]
    expect(top.entry.char).toBe('大')
  })
  it('无匹配时返回空数组', () => {
    // 15 画以上手写，库内可能无对应 → 不报错
    const input: HandwritingInput = Array.from({ length: 30 }, () => line(0, 0, 30, 0))
    const matches = matchHandwriting(input, DB)
    expect(Array.isArray(matches)).toBe(true)
  })
})

describe('recognizeHandwriting / handwritingInsights', () => {
  it('返回完整识别结果', () => {
    const input: HandwritingInput = [line(0, 5, 30, 5), line(5, 0, 5, 30)]
    const r = recognizeHandwriting(input, DB)
    expect(r.strokeCount).toBe(2)
    expect(r.directions).toEqual(['heng', 'shu'])
    expect(r.candidates.length).toBeGreaterThan(0)
    expect(r.insights.length).toBeGreaterThan(0)
  })
  it('空输入给出引导文案', () => {
    const r = recognizeHandwriting([], DB)
    expect(r.insights[0]).toContain('画板')
  })
  it('候选为空时给出提示', () => {
    const input: HandwritingInput = Array.from({ length: 40 }, () => line(0, 0, 30, 0))
    const r = recognizeHandwriting(input, DB)
    expect(r.candidates.length).toBe(0)
    expect(r.insights.some((s) => s.includes('未找到'))).toBe(true)
  })
})

describe('STROKE_SEQUENCES', () => {
  it('常用字序列与库内笔画数一致', () => {
    for (const [ch, seq] of Object.entries(STROKE_SEQUENCES)) {
      const e = DB.find((x) => x.char === ch)
      if (e) {
        expect(seq.length, `${ch} 序列长度应等于 ${e.strokes} 画`).toBe(e.strokes)
      }
    }
  })
  it('方向标签齐全', () => {
    expect(STROKE_DIRECTION_META.heng.label).toBe('横')
    expect(STROKE_DIRECTION_META.gou.label).toBe('钩')
  })
})
