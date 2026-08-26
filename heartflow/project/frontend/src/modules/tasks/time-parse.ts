// ============================================================
// 自律工坊 · 自然语言时间解析（NLP 时间解析器）
// 吸收滴答清单 / Todoist："明天下午3点" 等口语化输入 → 结构化到期
// 纯函数，无副作用，便于单测
// ============================================================

export interface DueInfo {
  /** 原始输入 */
  raw: string
  /** 归一化后的可读到期描述，如 "明天 15:30" */
  label: string
  /** 相对今天的天数偏移（用于排序）：未识别则 null */
  dayOffset: number | null
  /** 排序键：未识别到来 → 排到末尾；同天按小时 */
  sortKey: number
}

const WEEKDAY_ALIASES: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7,
}

/** 相对日期别名（词 → 天数偏移），需与 parseDay 内的匹配保持一致 */
const DAY_ORDER: Array<[string, number]> = [
  ['大后天', 3],
  ['后天', 2],
  ['明天', 1],
  ['明儿', 1],
  ['明日', 1],
  ['今天', 0],
  ['今日', 0],
  ['今晚', 0],
]

const TIME_OF_DAY: Array<{ re: RegExp; fallbackHour: number }> = [
  { re: /凌晨/, fallbackHour: 5 },
  { re: /早上|清晨/, fallbackHour: 7 },
  { re: /上午|上午/, fallbackHour: 9 },
  { re: /中午/, fallbackHour: 12 },
  { re: /下午/, fallbackHour: 14 },
  { re: /傍晚/, fallbackHour: 18 },
  { re: /晚上|晚间|夜间|夜晚/, fallbackHour: 20 },
  { re: /深夜/, fallbackHour: 23 },
  { re: /晚/, fallbackHour: 20, }, // 今晚/明晚 等后缀
]

function parseDay(text: string, out: { dayWord: string }): number | null {
  // 从长词到短词匹配，避免「明天」被当作「今天」段覆盖
  const daysByLength = DAY_ORDER.slice().sort((a, b) => b[0].length - a[0].length)
  for (const [word, offset] of daysByLength) {
    if (text.includes(word)) {
      out.dayWord = word === '今晚' ? '今天' : word === '今儿' ? '今天' : word
      return offset
    }
  }
  // 参考今天作为基准算星期偏移
  const wdMatch = text.match(/(?:周|星期|礼拜)([一二三四五六日天])/)
  if (wdMatch) {
    const target = WEEKDAY_ALIASES[wdMatch[1]]
    if (target !== undefined) {
      out.dayWord = wdMatch[0]
      const todayNumber = new Date().getDay()
      const targetNumber = target % 7
      let offset = (targetNumber - todayNumber + 7) % 7
      if (offset === 0) offset = 7 // 本日同星期 → 视为本周下一次
      return offset
    }
  }
  return null
}

function parseHour(text: string): { hour: number | null; minute: number } {
  const m = text.match(/(\d{1,2})([点时：:])/)
  let hour: number | null = null
  let minute = 0
  if (m) {
    const parsed = parseInt(m[1], 10)
    hour = isValidHour(parsed) ? parsed : null
    const tail = text.slice((m.index ?? 0) + m[0].length)
    if (/^[半]/.test(tail)) minute = 30
    else if (/^一刻|一刻钟/.test(tail)) minute = 15
    else if (/^三刻/.test(tail)) minute = 45
    else {
      const minutesMatch = tail.match(/^(\d{1,2})分/)
      if (minutesMatch) minute = Math.min(59, parseInt(minutesMatch[1], 10))
      else if (/^(\d{1,2})(?!分)/.test(tail)) minute = Math.min(59, parseInt(tail.match(/^(\d{1,2})/)?.[1] as string, 10))
    }
  }
  return { hour, minute }
}

function isValidHour(h: number): boolean {
  return Number.isInteger(h) && h >= 0 && h <= 23
}

function pickTimeOfDay(text: string): number | null {
  for (const t of TIME_OF_DAY) {
    if (t.re.test(text)) return t.fallbackHour
  }
  return null
}

/** 解析口语化到期描述 */
export function parseDueText(raw: string): DueInfo {
  const text = raw.trim()
  const dayCtx = { dayWord: '' }
  const dayOffset = parseDay(text, dayCtx)
  const { hour: h, minute } = parseHour(text)
  const todHour = pickTimeOfDay(text)

  // 12 小时制上午/下午补正：如 "下午3点" 但小时<12
  let hour = h
  let timeDesc = ''
  if (h !== null) {
    // 检测是否有明确上午/下午再补正
    let eff = h
    if (/下午|晚上|傍晚|夜间|深夜/.test(text) && h > 0 && h <= 12) eff = h + 12
    if (/凌晨|早上|上午/.test(text) && h >= 12 && h < 24) eff = h - 12
    hour = eff
    timeDesc = eff < 10 ? `0${eff}` : `${eff}`
    timeDesc += minute > 0 ? `:${minute < 10 ? `0${minute}` : minute}` : ':00'
  } else if (todHour !== null) {
    timeDesc = `${todHour}:00`
    hour = todHour
  }

  const dayWord = dayCtx.dayWord || (dayOffset === 0 ? '今天' : dayOffset === 1 ? '明天' : dayOffset === 2 ? '后天' : dayOffset === 3 ? '大后天' : '')
  const label = dayWord
    ? (timeDesc ? `${dayWord} ${timeDesc}` : dayWord)
    : (timeDesc ? timeDesc : (dayOffset !== null ? `+${dayOffset} 天` : text))

  const sortDay = dayOffset ?? 999
  const sortHour = hour ?? 0
  const sortKey = sortDay * 100 + sortHour
  return { raw, label, dayOffset, sortKey }
}

/** 按到期（缺省到来 → 末尾）排序任务标题/原始描述 */
export function sortByDue(descriptions: string[]): string[] {
  return [...descriptions].sort((a, b) => parseDueText(a).sortKey - parseDueText(b).sortKey)
}