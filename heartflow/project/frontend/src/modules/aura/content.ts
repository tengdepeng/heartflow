// ============================================================
// AuraLayer · 静态内容（每日一言 + 节气近似）
// 纯前端、无网络、无收集，符合「本地私有」宪法。
// ============================================================

/** 每日一言（静谧、克制、与心流调性一致的短句） */
export const DAILY_QUOTES: string[] = [
  '让今天先安静落下来。',
  '心流不是努力，是忘了努力。',
  '呼吸一次，世界就轻了一点。',
  '你不需要追上什么，只需在此刻。',
  '慢，是把时间还给自己的方式。',
  '把念头轻轻放下，像放下一杯温水。',
  '专注时，喧嚣自己退场。',
  '未完成也没关系，明天还在。',
  '对自己温柔，是一种生产力。',
  '此刻的空白，也是作品的一部分。',
  '不必把所有灯都点亮。',
  '沉淀，比冲刺更接近答案。',
  '呼吸之间，藏着全部的安宁。',
  '你已经在路上，这就够了。',
  '允许自己什么都不做一会儿。',
  '真正的秩序，生于内心的安静。',
  '把每一天，过成一次深呼吸。',
  '少即是多，静即是满。',
  '世界很吵，但你可以选择安静。',
  '心若无岸，何处不是归处。',
]

/** 按日期取一言（同一天恒定，跨天轮换） */
export function quoteForDate(d: Date = new Date()): string {
  const dayIndex = Math.floor(d.getTime() / 86_400_000)
  return DAILY_QUOTES[((dayIndex % DAILY_QUOTES.length) + DAILY_QUOTES.length) % DAILY_QUOTES.length]
}

/** 24 节气近似日期（month*100 + day，误差 ±1 天，仅作氛围展示足够） */
const SOLAR_TERMS: { key: number; name: string }[] = [
  { key: 106, name: '小寒' },
  { key: 120, name: '大寒' },
  { key: 204, name: '立春' },
  { key: 219, name: '雨水' },
  { key: 306, name: '惊蛰' },
  { key: 321, name: '春分' },
  { key: 405, name: '清明' },
  { key: 420, name: '谷雨' },
  { key: 506, name: '立夏' },
  { key: 521, name: '小满' },
  { key: 606, name: '芒种' },
  { key: 621, name: '夏至' },
  { key: 707, name: '小暑' },
  { key: 723, name: '大暑' },
  { key: 808, name: '立秋' },
  { key: 823, name: '处暑' },
  { key: 908, name: '白露' },
  { key: 923, name: '秋分' },
  { key: 1008, name: '寒露' },
  { key: 1024, name: '霜降' },
  { key: 1108, name: '立冬' },
  { key: 1122, name: '小雪' },
  { key: 1207, name: '大雪' },
  { key: 1222, name: '冬至' },
]

/** 取当前节气（早于小寒则回退到上一年冬至） */
export function currentSolarTerm(d: Date = new Date()): string {
  const md = (d.getMonth() + 1) * 100 + d.getDate()
  let current = SOLAR_TERMS[SOLAR_TERMS.length - 1].name // 默认冬至（跨年回退）
  for (const t of SOLAR_TERMS) {
    if (md >= t.key) current = t.name
    else break
  }
  return current
}
