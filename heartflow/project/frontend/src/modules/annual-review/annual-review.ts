// ============================================================
// annual-review · 镜我 · 年度对话（模块七 P1 深度）
// 每年用户触发时，以「手写信」的形式回顾一年的关键变化。
// 宪法约束：陈列而非叙事 —— 不生成因果/总结性连接词，不评判，
// 默认不主动触发（仅用户主动发起）。数据全部本地来源。
// ============================================================

export type ReviewTone = '陈列' | '静默'

export interface AnnualSource {
  /** 情绪记录：at=ISO 时间戳，type=情绪类型 */
  emotions: { at: string; type: string }[]
  /** 专注/工作逐日累计：at=日期，totalSeconds=当日秒数 */
  focus: { at: string; totalSeconds: number }[]
  /** 心愿锚内容物：at=时间戳，text，done */
  anchors: { at: string; text: string; done: boolean }[]
  /** 里程碑：at=时间戳，label */
  milestones: { at: string; label: string }[]
}

export interface AnnualLetter {
  year: number
  opening: string
  /** 按月陈列全年变化（陈列不叙事） */
  months: AnnualMonth[]
  milestones: string[]
  closing: string
  tone: ReviewTone
}

export interface AnnualMonth {
  month: number
  notes: string[]
}

export const MOOD_LABELS: Record<string, string> = {
  happy: '轻快',
  calm: '平静',
  sad: '低落',
  anxious: '紧绷',
  angry: '烦躁',
}

export const OPENING_TEMPLATE =
  '你就要翻开这一年的封存。没有总结，只有陈列；下面是十二个月的留痕，都是你已经走过的。'

export const CLOSING_TEMPLATE = '我把我看到的东西放在这里了。'

const ZERO = { emotions: 0, focus: 0, anchors: 0, milestones: 0 }

export function collectAnnual(year: number, src: AnnualSource): AnnualLetter {
  const byMonth = new Map<number, AnnualMonth>()

  function ensure(m: number): AnnualMonth {
    if (!byMonth.has(m)) byMonth.set(m, { month: m, notes: [] })
    return byMonth.get(m)!
  }

  // 逐条陈列情绪变化（不评判、不关联）
  for (const e of src.emotions) {
    const d = new Date(e.at)
    if (d.getFullYear() !== year) continue
    ensure(d.getMonth() + 1).notes.push(`花房：一处${MOOD_LABELS[e.type] ?? '情绪'}的留痕`)
  }

  // 逐日专注累计（仅记录投入，不评价多寡）
  for (const f of src.focus) {
    const d = new Date(f.at)
    if (d.getFullYear() !== year) continue
    if (f.totalSeconds >= 60) {
      ensure(d.getMonth() + 1).notes.push(
        `${d.getDate()} 日 · 更漏刻下 ${fmtHm(f.totalSeconds)} 的工作投入`,
      )
    }
  }

  // 心愿锚：完成的锚点（仅陈列内容，不点评pletion）
  for (const a of src.anchors) {
    const d = new Date(a.at)
    if (d.getFullYear() !== year) continue
    if (a.done) ensure(d.getMonth() + 1).notes.push(`心锚：完成“${a.text}”`)
  }

  const milestones: string[] = []
  for (const m of src.milestones) {
    const d = new Date(m.at)
    if (d.getFullYear() !== year) continue
    milestones.push(`${d.getMonth() + 1} 月 · ${m.label}`)
  }

  const tone: ReviewTone =
    src.emotions.length + src.focus.length + src.anchors.length === 0 ? '静默' : '陈列'

  const months = [...byMonth.keys()].sort((a, b) => a - b).map((m) => byMonth.get(m)!)

  return {
    year,
    opening: OPENING_TEMPLATE,
    months,
    milestones,
    closing: CLOSING_TEMPLATE,
    tone,
  }
}

/** 单月是否有留下任何痕迹（供界面区分空月） */
export function hasAnyTrace(src: AnnualSource, year: number): boolean {
  const counts = countByMonth(src, year)
  return [...counts.values()].some((c) => c.emotions + c.focus + c.anchors > 0)
}

/** 每月各类留痕计数 */
export function countByMonth(
  src: AnnualSource,
  year: number,
): Map<number, { emotions: number; focus: number; anchors: number; milestones: number }> {
  const out = new Map<number, typeof ZERO>()
  let month = (iso: string): number => {
    const d = new Date(iso)
    const m = d.getMonth() + 1
    if (!out.has(m)) out.set(m, { ...ZERO })
    return m
  }
  for (const e of src.emotions) if (new Date(e.at).getFullYear() === year) out.get(month(e.at))!.emotions++
  for (const f of src.focus) if (new Date(f.at).getFullYear() === year) out.get(month(f.at))!.focus++
  for (const a of src.anchors) if (new Date(a.at).getFullYear() === year) out.get(month(a.at))!.anchors++
  for (const m of src.milestones) if (new Date(m.at).getFullYear() === year) out.get(month(m.at))!.milestones++
  return out
}

/** 以「手写信」文本渲染信纸内容（供复制或朗读） */
export function renderLetter(letter: AnnualLetter): string {
  const lines: string[] = []
  lines.push(`${letter.year} 年的陈列`, '')
  lines.push(letter.opening, '')
  for (const m of letter.months) {
    lines.push(`${m.month} 月`)
    for (const note of m.notes) lines.push(`  · ${note}`)
    lines.push('')
  }
  if (letter.milestones.length) {
    lines.push('值得记下的刻痕', ...letter.milestones.map((x) => `  · ${x}`), '')
  }
  lines.push(letter.closing)
  return lines.join('\n')
}

function fmtHm(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return h > 0 ? `${h}h${m}m` : `${m}m`
}