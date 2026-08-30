import { describe, expect, it } from 'vitest'
import { parseCommandIntent } from '../commandIntent'
import router from '../../../router'
import { getFeatureEntries, resetFeatureDictionaryCache, searchFeatures } from '../featureDictionary'

/** 目标路由必须是真实存在的路由（严禁编造 /accounting 之类） */
function expectRealRoute(route: string | undefined): void {
  expect(route).toBeTruthy()
  const exists = router.getRoutes().some((r) => r.path === route)
  expect(exists, `路由 ${route} 不存在于真实路由表`).toBe(true)
}

describe('parseCommandIntent', () => {
  it('review 优先：含「查/统计/分析/工作记录」判为汇总检索', () => {
    expect(parseCommandIntent('帮我查一下最近三个月的工作记录，看看加班最密集的是哪段').taskType).toBe('review')
    expect(parseCommandIntent('统计一下本周的专注时长').taskType).toBe('review')
    expect(parseCommandIntent('分析我的情绪曲线').taskType).toBe('review')
  })

  it('emotion：含情绪/焦虑等判为情绪梳理', () => {
    expect(parseCommandIntent('我今天有点焦虑').taskType).toBe('emotion')
    expect(parseCommandIntent('记录一下现在的心情').taskType).toBe('emotion')
  })

  it('anchor：含目标/习惯/打卡判为锚点锚定', () => {
    expect(parseCommandIntent('帮我定个本周目标').taskType).toBe('anchor')
    expect(parseCommandIntent('提醒我每天打卡阅读').taskType).toBe('anchor')
  })

  it('note：含笔记/记一下判为笔记记录（无 review 关键词时）', () => {
    expect(parseCommandIntent('记一下这个想法').taskType).toBe('note')
    expect(parseCommandIntent('写一条读书笔记').taskType).toBe('note')
  })

  it('focus：含专注/番茄/计时判为专注调度', () => {
    expect(parseCommandIntent('开始专注写代码').taskType).toBe('focus')
    expect(parseCommandIntent('来个番茄钟').taskType).toBe('focus')
  })

  it('general：无关键词回落通用协调', () => {
    expect(parseCommandIntent('随便聊聊今天的事').taskType).toBe('general')
  })

  it('navigate：导航动词 + 目的地别名 → 空间跳转，并给出目标路由', () => {
    const a = parseCommandIntent('打开殿堂设置')
    expect(a.taskType).toBe('navigate')
    expect(a.targetRoute).toBe('/settings')
    expect(a.targetName).toBe('殿堂设置')
    expect(a.intentLabel).toBe('前往殿堂设置')

    const b = parseCommandIntent('帮我打开幕僚阁')
    expect(b.taskType).toBe('navigate')
    expect(b.targetRoute).toBe('/advisors')
  })

  it('navigate：情绪花房/成长花园 落到真实路由（非 room-resonance 键）', () => {
    const e = parseCommandIntent('打开情绪花房')
    expect(e.taskType).toBe('navigate')
    expect(e.targetRoute).toBe('/garden')
    expect(e.targetName).toBe('情绪花房')

    const g = parseCommandIntent('带我去成长花园')
    expect(g.taskType).toBe('navigate')
    expect(g.targetRoute).toBe('/growth-garden')
    expect(g.targetName).toBe('成长花园')
  })

  it('navigate 防误判：只有目的地名 / 只有导航动词都不触发跳转', () => {
    // 含目的地别名但无导航动词 → 不当跳转
    expect(parseCommandIntent('殿堂设置里有什么').taskType).not.toBe('navigate')
    // 含导航动词但无目的地别名 → 回落常规意图
    expect(parseCommandIntent('记一下今天的开销').taskType).toBe('note')
    // 「锚点」是功能词，只有「锚点庭院」才是目的地别名
    expect(parseCommandIntent('帮我设个锚点').taskType).toBe('anchor')
  })

  it('产出字段完整：意图标签 / 房间 / 动作', () => {
    const intent = parseCommandIntent('查一下我的笔记')
    expect(intent.intentLabel).toBeTruthy()
    expect(intent.room).toBeTruthy()
    expect(intent.action).toBeTruthy()
    expect(intent.dispatchKey).toBe('review')
  })
})

// ============================================================
// 财务 / 记账意图（用户投诉：「我要记账告诉我没有这个功能？」）
// 项目里真实存在的是 /reward「劳酬」（记账 v2：多账户 / 预算预警 / 支出流水 / 月结单 / 导入）
// ============================================================
describe('parseCommandIntent · 财务 / 记账', () => {
  it('「我要记账」命中财务意图，且目标路由真实存在', () => {
    const intent = parseCommandIntent('我要记账')
    expect(intent.taskType).toBe('finance')
    expect(intent.targetRoute).toBe('/reward')
    expect(intent.targetName).toBe('劳酬')
    expectRealRoute(intent.targetRoute)
  })

  it('「记一笔账」「查一下这个月的开销」「预算超了吗」都落到财务', () => {
    for (const q of ['记一笔账', '查一下这个月的开销', '预算超了吗']) {
      const intent = parseCommandIntent(q)
      expect(intent.taskType, `${q} 应判为 finance`).toBe('finance')
      expect(intent.targetRoute).toBe('/reward')
      expectRealRoute(intent.targetRoute)
    }
  })

  it('更多财务说法：账本 / 花销 / 支出流水 / 月结 / 报销', () => {
    for (const q of ['看看我的账本', '昨天花销多少', '导出支出流水', '这个月月结', '帮我报销']) {
      expect(parseCommandIntent(q).taskType, `${q} 应判为 finance`).toBe('finance')
    }
  })

  it('财务意图的派单/房间/动作字段完整', () => {
    const intent = parseCommandIntent('我要记账')
    expect(intent.intentLabel).toBe('记账理财')
    expect(intent.dispatchKey).toBe('finance')
    expect(intent.room).toBe('劳酬')
    expect(intent.action).toBeTruthy()
  })

  it('「打开记账」「打开账本」走 navigate 双条件（导航动词 + 目的地别名）', () => {
    const a = parseCommandIntent('打开记账')
    expect(a.taskType).toBe('navigate')
    expect(a.targetRoute).toBe('/reward')
    expectRealRoute(a.targetRoute)
  })
})

// ============================================================
// 功能搜索兜底（用户诉求：「搜索词加强」）
// ============================================================
describe('parseCommandIntent · 功能搜索兜底', () => {
  it('词典在运行时由真实数据生成，覆盖路由与房间，且不含动态路由', () => {
    resetFeatureDictionaryCache()
    const entries = getFeatureEntries()
    expect(entries.length).toBeGreaterThan(30)
    // 每个条目的路由都真实存在
    const realPaths = new Set(router.getRoutes().map((r) => r.path))
    for (const e of entries) {
      expect(realPaths.has(e.route), `词典里出现不存在的路由 ${e.route}`).toBe(true)
      expect(e.route).not.toContain(':') // 动态段不可直接跳转
    }
    // 财务空间在词典里
    expect(entries.some((e) => e.route === '/reward')).toBe(true)
  })

  it('未命中已知意图时返回候选建议，而不是空/死路一条', () => {
    // 「书房」不含任何意图关键词，但词典里有「思绪书房」→ 给出候选而非干瞪眼
    const intent = parseCommandIntent('书房')
    expect(intent.taskType).toBe('general')
    expect(intent.suggestions).toBeTruthy()
    expect(intent.suggestions!.length).toBeGreaterThan(0)
    expect(intent.suggestions![0].route).toBe('/study')
    expectRealRoute(intent.suggestions![0].route)
  })

  it('相近功能有多个候选时：只给建议、不擅自跳转', () => {
    // 「庭院」同时贴近「锚点庭院」「成长庭院」等多个空间 → 让用户一句话确认
    const intent = parseCommandIntent('庭院')
    expect(intent.taskType).toBe('general')
    expect(intent.targetRoute).toBeUndefined()
    expect(intent.suggestions).toBeTruthy()
    expect(intent.suggestions!.length).toBeGreaterThanOrEqual(2)
    for (const s of intent.suggestions!) expectRealRoute(s.route)
  })

  it('模糊输入「劳酬」直接跳到真实存在的 /reward', () => {
    const intent = parseCommandIntent('劳酬')
    expect(intent.taskType).toBe('navigate')
    expect(intent.targetRoute).toBe('/reward')
    expectRealRoute(intent.targetRoute)
  })

  it('完全不着边际的输入：给出可用功能清单提示（替代「没有这个功能」）', () => {
    const intent = parseCommandIntent('随便聊聊今天的事')
    expect(intent.taskType).toBe('general')
    expect(intent.featureHint).toBeTruthy()
    expect(intent.featureHint!.length).toBeGreaterThan(0)
  })

  it('searchFeatures 能按名字/别名/路由段检索到空间', () => {
    resetFeatureDictionaryCache()
    const byName = searchFeatures('时间长廊', 3)
    expect(byName[0]?.route).toBe('/time-corridor')

    const byAlias = searchFeatures('花房', 3)
    expect(byAlias.some((h) => h.route === '/garden')).toBe(true)

    const byPath = searchFeatures('growth-garden', 3)
    expect(byPath[0]?.route).toBe('/growth-garden')
  })
})

// ============================================================
// 回归防护：新词表不得误判历史用例
// ============================================================
describe('parseCommandIntent · 新增 finance / 兜底后的回归防护', () => {
  it('「记一下今天的开销」仍判为 note（有明确记录动作词）', () => {
    expect(parseCommandIntent('记一下今天的开销').taskType).toBe('note')
  })

  it('「帮我设个锚点」仍判为 anchor，不被财务/导航误伤', () => {
    expect(parseCommandIntent('帮我设个锚点').taskType).toBe('anchor')
  })

  it('「安排房间」含「房间」但非跳转：不触发 navigate', () => {
    // '房间' 是目的地别名，但 '安排' 不是导航动词 → 双条件不成立
    expect(parseCommandIntent('安排房间').taskType).not.toBe('navigate')
  })

  it('「殿堂设置里有什么」仍不触发 navigate（只有目的地名、无导航动词）', () => {
    expect(parseCommandIntent('殿堂设置里有什么').taskType).not.toBe('navigate')
  })

  it('历史用例 taskType 全量回归', () => {
    expect(parseCommandIntent('帮我查一下最近三个月的工作记录，看看加班最密集的是哪段').taskType).toBe('review')
    expect(parseCommandIntent('统计一下本周的专注时长').taskType).toBe('review')
    expect(parseCommandIntent('分析我的情绪曲线').taskType).toBe('review')
    expect(parseCommandIntent('我今天有点焦虑').taskType).toBe('emotion')
    expect(parseCommandIntent('提醒我每天打卡阅读').taskType).toBe('anchor')
    expect(parseCommandIntent('记一下这个想法').taskType).toBe('note')
    expect(parseCommandIntent('写一条读书笔记').taskType).toBe('note')
    expect(parseCommandIntent('开始专注写代码').taskType).toBe('focus')
    expect(parseCommandIntent('来个番茄钟').taskType).toBe('focus')
    expect(parseCommandIntent('随便聊聊今天的事').taskType).toBe('general')
  })
})
