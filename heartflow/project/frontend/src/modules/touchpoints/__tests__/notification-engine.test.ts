// ============================================================
// 殿堂触角 · 通知引擎 单元测试（INCR-459）
// 覆盖 useNotificationEngine 的预设加载（loadRules）与规则写路径（toggleRule / updateRule）。
//
// 为什么需要这个文件：此前 notification-engine 这条路径在
// touchpoints/__tests__ 下从未被直接测过（三个既有文件对 notification-engine
// 的符号零命中，p20-touchpoints.test.ts 只import 了 notification-strategy 的
// 一个类型），于是「loadRules 兜底只做数组浅拷贝 → toggleRule 的
// rule.enabled = !rule.enabled 经 reactive 代理写穿模块级常量
// DEFAULT_NOTIFICATION_RULES」这一缺陷才能长期潜伏。
// 用例 ① 即该缺陷的核心回归闸门。
//
// 存储走 createMockStorage + invalidateCache + 动态 import（同 light-practice），
// 因为引擎在 useNotificationEngine() 调用期同步读 localStorage，
// 必须在实例化前把 localStorage 换掉。
//
// ⚠️ 关键：DEFAULT_NOTIFICATION_RULES 必须从**动态 import 出来的同一个模块实例**取，
// 不能文件顶部静态 import —— 静态 import 会拿到被 vi.resetModules() 丢弃的旧实例，
// 预设常量与引擎实际使用的不是同一批对象，用例 ① 会退化成永远为真的空测。
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { toRaw } from 'vue'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const RULES_KEY = 'hf:touchpoints:notification_rules'
const NOTIF_KEY = 'hf:touchpoints:notifications'
const PREFS_KEY = 'hf:touchpoints:notification_prefs'

/**
 * 装载被测引擎模块。
 * @param kv 预置 kvStore（用于制造「用户已有落盘数据」与「数据损坏」两条真实分支）
 */
async function loadEngine(kv: Record<string, unknown> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem(
    'heartflow:storage',
    JSON.stringify({ version: 10, kvStore: kv, sessions: [], crystals: [] }),
  )
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  // 预设常量与引擎取自同一次 import，保证引用/写入是同一批对象
  return await import('../notification-engine')
}

/** 读回真实落盘数据（证明引擎副作用真的发生了，而非仅改内存） */
function readKv(key: string) {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return raw ? JSON.parse(raw).kvStore?.[key] : undefined
}

/** 预设规则的 5 个 id（写成字面量，基准不從被测对象推导） */
const PRESET_IDS = [
  'rule-daily-greeting',
  'rule-focus-streak',
  'rule-weekly-review',
  'rule-crystal-milestone',
  'rule-insight-digest',
]

/**
 * 取「未被 reactive 代理包裹的真实对象」。
 *
 * ⚠️ 这层toRaw 是断言有牙齿的关键：engine.rules 是 ref，rules.value 里的元素
 * 读出来一律是 reactive Proxy，而 Proxy 与它所代理的原始对象**永远不是同一引用**。
 * 若直接写 `expect(rules.value[0]).not.toBe(DEFAULT_NOTIFICATION_RULES[0])`，
 * 无论 loadRules 返的是浅拷贝还是深拷贝都会通过—— 恒真空测，挡不住任何东西。
 * 必须 toRaw 剥掉代理，比的才是「兜底返回的元素究竟是不是预设那批对象本身」。
 */
function rawOf<T>(value: T): T {
  return toRaw(value)
}

// ============================================================
// 1. 预设不被写穿（INCR-459 核心回归）
// ============================================================

describe('notification-engine · 预设常量不被写穿（INCR-459）', () => {
  it('① toggleRule 后模块级预设 DEFAULT_NOTIFICATION_RULES 的 enabled 保持false', async () => {
    const { useNotificationEngine, DEFAULT_NOTIFICATION_RULES } = await loadEngine()

    // 前置条件钉死：预设 5 条、id 与顺序如预期、enabled 全为 false。
    // 基准写成字面量 0/字面量 id 序列 —— 若从被测对象推导，基准会随被测行为漂移。
    expect(DEFAULT_NOTIFICATION_RULES.length).toBe(5)
    expect(DEFAULT_NOTIFICATION_RULES.map(r => r.id)).toEqual(PRESET_IDS)
    for (const r of DEFAULT_NOTIFICATION_RULES) {
      expect(r.enabled, `预设 ${r.id} 初始 enabled 应为 false`).toBe(false)
    }

    const engine = useNotificationEngine()
    // 兜底分支：实例拿到的是预设的独立副本
    expect(engine.rules.value.length).toBe(5)
    expect(engine.rules.value.map(r => r.id)).toEqual(PRESET_IDS)

    // 用户点开「每日问候」
    expect(engine.toggleRule('rule-daily-greeting')).toBe(true)
    // 实例内确实生效
    expect(engine.rules.value[0].enabled).toBe(true)

    // 核心断言：预设常量本身没有被写穿（修复前此处为 true）
    expect(
      DEFAULT_NOTIFICATION_RULES[0].enabled,
      '预设常量被 toggleRule 写穿（loadRules 只做了数组浅拷贝）',
    ).toBe(false)
    // 全部预设逐条复核，避免只挡住第一个元素
    for (const r of DEFAULT_NOTIFICATION_RULES) {
      expect(r.enabled, `预设 ${r.id} 的 enabled 被污染`).toBe(false)
    }
  })

  it('① 幽灵启用锁死：清空落盘后重挂引擎，新加载的预设仍是未开启', async () => {
    const { useNotificationEngine, DEFAULT_NOTIFICATION_RULES } = await loadEngine()

    const first = useNotificationEngine()
    expect(first.toggleRule('rule-daily-greeting')).toBe(true)
    // 此刻规则已落盘（用户视角：他确实开过）
    expect(readKv(RULES_KEY), 'toggleRule 未落盘 notification_rules').toBeTruthy()

    // 用户反悔，把落盘数据清空（等同于「清空数据后重进」）
    ;(globalThis as any).localStorage.setItem(
      'heartflow:storage',
      JSON.stringify({ version: 10, kvStore: {}, sessions: [], crystals: [] }),
    )
    invalidateCache()

    // 重新挂载引擎 → 走兜底分支
    const second = useNotificationEngine()
    expect(readKv(RULES_KEY), '清空后不应再有 notification_rules').toBeUndefined()
    expect(second.rules.value.length).toBe(5)
    // 幽灵启用的本质：预设带着上一次会话遗留的 true 回来了
    expect(
      second.rules.value[0].enabled,
      '幽灵启用：清空落盘后新加载的预设规则凭空处于启用态',
    ).toBe(false)
    expect(DEFAULT_NOTIFICATION_RULES[0].enabled, '预设常量被污染').toBe(false)
  })

  it('② 嵌套写穿：updateRule 写 template 后预设的嵌套 template 不得被改', async () => {
    const { useNotificationEngine, DEFAULT_NOTIFICATION_RULES } = await loadEngine()

    // 前置：预设「每日问候」的模板字段（字面量基准）
    expect(DEFAULT_NOTIFICATION_RULES[0].template.title).toBe('早安')
    expect(DEFAULT_NOTIFICATION_RULES[0].template.channel).toBe('floating')

    const engine = useNotificationEngine()
    const changed = engine.updateRule('rule-daily-greeting', {
      name: '被改过的名字',
      template: {
        title: '被改过的标题',
        message: '被改过的正文',
        icon: 'X',
        channel: 'log',
      },
    })
    expect(changed).toBe(true)

    // 实例内确实写入了
    expect(engine.rules.value[0].name).toBe('被改过的名字')
    expect(engine.rules.value[0].template.title).toBe('被改过的标题')

    // 核心断言：预设的顶层与嵌套字段都未被改
    //（这正是 .map(r => ({...r})) 式浅拷贝挡不住的一层）
    expect(
      DEFAULT_NOTIFICATION_RULES[0].name,
      '预设顶层字段被 updateRule 写穿',
    ).toBe('每日问候')
    expect(
      DEFAULT_NOTIFICATION_RULES[0].template.title,
      '预设嵌套 template.title 被写穿（浅拷贝只断元素不断嵌套）',
    ).toBe('早安')
    expect(DEFAULT_NOTIFICATION_RULES[0].template.message).toBe('新的一天开始了，今日宜专注')
    expect(DEFAULT_NOTIFICATION_RULES[0].template.icon).toBe('🌅')
    expect(DEFAULT_NOTIFICATION_RULES[0].template.channel).toBe('floating')
  })

  it('② 变体：直接改实例副本的嵌套 template 字段同样不得写穿预设', async () => {
    const { useNotificationEngine, DEFAULT_NOTIFICATION_RULES } = await loadEngine()

    const engine = useNotificationEngine()
    // 绕过 updateRule，直接经引擎暴露的 ref 改嵌套字段（消费方也可能这么干）
    engine.rules.value[1].template.title = '就地改标题'
    engine.rules.value[1].lastTriggeredAt = '2026-10-03T00:00:00.000Z'

    expect(engine.rules.value[1].template.title).toBe('就地改标题')
    expect(
      DEFAULT_NOTIFICATION_RULES[1].template.title,
      '预设嵌套 template.title 被就地改写穿',
    ).toBe('专注连击达成！')
    expect(DEFAULT_NOTIFICATION_RULES[1].lastTriggeredAt).toBeUndefined()
  })

  it('③ 跨实例：A/B 两实例各toggle 不同规则，预设常量应保持全部 false', async () => {
    const { useNotificationEngine, DEFAULT_NOTIFICATION_RULES } = await loadEngine()

    const a = useNotificationEngine()
    const b = useNotificationEngine()

    // 两实例持有独立 ref 与独立副本，彼此与预设三方互不相等。
    // 同样经 rawOf 比较：代理层可能因缓存掩盖真实别名，故比原始对象。
    const rawA = rawOf(a.rules.value)
    const rawB = rawOf(b.rules.value)
    expect(a.rules).not.toBe(b.rules)
    expect(rawA).not.toBe(DEFAULT_NOTIFICATION_RULES)
    expect(rawA).not.toBe(rawB)
    for (let i = 0; i < PRESET_IDS.length; i++) {
      expect(rawOf(rawA[i]), `A 实例第 ${i} 条不应是预设对象本身`).not.toBe(DEFAULT_NOTIFICATION_RULES[i])
      expect(rawOf(rawB[i]), `B 实例第 ${i} 条不应是预设对象本身`).not.toBe(DEFAULT_NOTIFICATION_RULES[i])
      expect(rawOf(rawA[i]), `A/B 第 ${i} 条元素应互不相同`).not.toBe(rawOf(rawB[i]))
      expect(rawOf(rawA[i].template), `A/B 第 ${i} 条 template 应互不相同`)
        .not.toBe(rawOf(rawB[i].template))
    }

    // 各自 toggle 不同规则
    expect(a.toggleRule('rule-daily-greeting')).toBe(true)
    expect(b.toggleRule('rule-crystal-milestone')).toBe(true)

    // 各自实例内生效，且互不串味
    expect(a.rules.value[0].enabled).toBe(true)
    expect(a.rules.value[3].enabled).toBe(false)
    expect(b.rules.value[3].enabled).toBe(true)
    expect(b.rules.value[0].enabled).toBe(false)

    // 预设常量逐条复核，仍全为 false
    for (const r of DEFAULT_NOTIFICATION_RULES) {
      expect(r.enabled, `预设 ${r.id} 的 enabled 被跨实例污染`).toBe(false)
    }
  })
})

// ============================================================
// 2. loadRules 兜底分支（经 useNotificationEngine().rules 观察，
//    因 loadRules 是模块私有、未export）
// ============================================================

describe('notification-engine · loadRules 兜底分支', () => {
  it('④ kv 无该键时返回预设的四层独立副本（数组/元素/template 引用全断）', async () => {
    const { useNotificationEngine, DEFAULT_NOTIFICATION_RULES } = await loadEngine()
    const result = useNotificationEngine().rules.value

    // 内容与预设一致
    expect(result.length).toBe(5)
    expect(result.map(r => r.id)).toEqual(PRESET_IDS)
    expect(result).toEqual(DEFAULT_NOTIFICATION_RULES)

    // 四层引用断裂：数组 / 元素 / 嵌套 template。
    // 一律经rawOf 剥掉 reactive 代理再比引用，否则断言恒真（见 rawOf 注释）。
    const rawList = rawOf(result)
    expect(rawList, '数组引用应与预设不同').not.toBe(DEFAULT_NOTIFICATION_RULES)
    for (let i = 0; i < PRESET_IDS.length; i++) {
      expect(rawOf(rawList[i]), `第 ${i} 条元素引用应与预设不同`).not.toBe(DEFAULT_NOTIFICATION_RULES[i])
      expect(rawOf(rawList[i].template), `第 ${i} 条的 template 引用应与预设不同`)
        .not.toBe(DEFAULT_NOTIFICATION_RULES[i].template)
    }
  })

  it('④ 变体：kv 为空串时同样返回独立副本', async () => {
    const { useNotificationEngine, DEFAULT_NOTIFICATION_RULES } = await loadEngine({
      [RULES_KEY]: '',
    })
    const rawList = rawOf(useNotificationEngine().rules.value)

    expect(rawList.length).toBe(5)
    expect(rawList).not.toBe(DEFAULT_NOTIFICATION_RULES)
    expect(rawOf(rawList[0])).not.toBe(DEFAULT_NOTIFICATION_RULES[0])
    expect(rawOf(rawList[0].template)).not.toBe(DEFAULT_NOTIFICATION_RULES[0].template)
  })

  it('④ 变体：kv 为合法 JSON 时用户数据优先于预设', async () => {
    const saved = [
      {
        id: 'rule-custom',
        name: '我的规则',
        type: 'reminder',
        condition: 'time:daily',
        template: { title: 'T', message: 'M', icon: 'I', channel: 'log' },
        enabled: true,
        cooldownMinutes: 60,
      },
    ]
    const { useNotificationEngine, DEFAULT_NOTIFICATION_RULES } = await loadEngine({
      [RULES_KEY]: JSON.stringify(saved),
    })
    const result = useNotificationEngine().rules.value

    expect(result).toEqual(saved)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe('rule-custom')
    expect(result[0].enabled).toBe(true)
    // 走解析分支时不会碰预设常量
    expect(DEFAULT_NOTIFICATION_RULES.length).toBe(5)
  })

  it('④ 变体：kv 为非法 JSON 时走 catch 兜底且不抛', async () => {
    const { useNotificationEngine, DEFAULT_NOTIFICATION_RULES } = await loadEngine({
      [RULES_KEY]: '{ 这不是合法 JSON',
    })
    let engine!: ReturnType<typeof useNotificationEngine>
    expect(() => { engine = useNotificationEngine() }).not.toThrow()

    expect(engine.rules.value.map(r => r.id)).toEqual(PRESET_IDS)
    // catch 分支同样必须给独立副本，不能退回浅拷贝（经 rawOf 剥代理，否则恒真）
    const rawList = rawOf(engine.rules.value)
    expect(rawList).not.toBe(DEFAULT_NOTIFICATION_RULES)
    expect(rawOf(rawList[0])).not.toBe(DEFAULT_NOTIFICATION_RULES[0])
    expect(rawOf(rawList[0].template)).not.toBe(DEFAULT_NOTIFICATION_RULES[0].template)
  })

  it('④ 变体：用户落盘空数组时 rules 为空（面板据此渲染空态）', async () => {
    const { useNotificationEngine } = await loadEngine({ [RULES_KEY]: JSON.stringify([]) })
    expect(useNotificationEngine().rules.value).toEqual([])
  })
})

// ============================================================
// 3. toggleRule / updateRule 正常行为（未被本次改动回归）
// ============================================================

describe('notification-engine · 规则写路径正常行为', () => {
  it('⑤ toggleRule 返回切换后状态、反向再切回false，并落盘 notification_rules', async () => {
    const { useNotificationEngine } = await loadEngine()
    const engine = useNotificationEngine()

    // 落盘键此前不存在，故其出现只能来自 toggleRule → saveRules
    expect(readKv(RULES_KEY), 'toggleRule 前不应已有 notification_rules').toBeUndefined()

    expect(engine.toggleRule('rule-daily-greeting')).toBe(true)
    expect(engine.rules.value[0].enabled).toBe(true)

    // 真实落盘内容
    const raw = readKv(RULES_KEY)
    expect(raw, 'toggleRule 未落盘 hf:touchpoints:notification_rules').toBeTruthy()
    const saved = JSON.parse(raw)
    expect(saved.length).toBe(5)
    expect(saved[0].id).toBe('rule-daily-greeting')
    expect(saved[0].enabled).toBe(true)
    expect(saved[1].enabled).toBe(false)
    // 深拷贝没有丢字段
    expect(saved[0].template.title).toBe('早安')
    expect(saved[0].cooldownMinutes).toBe(480)

    // 反向切换回false
    expect(engine.toggleRule('rule-daily-greeting')).toBe(false)
    expect(engine.rules.value[0].enabled).toBe(false)
  })

  it('⑤ updateRule 传不存在的 id 返回 false 且不产生副作用', async () => {
    const { useNotificationEngine } = await loadEngine()
    const engine = useNotificationEngine()

    expect(engine.updateRule('rule-does-not-exist', { enabled: true })).toBe(false)
    expect(engine.toggleRule('rule-does-not-exist')).toBe(false)
    // 未落盘 rules 键
    expect(readKv(RULES_KEY)).toBeUndefined()
    // 实例内 5 条预设仍全是关闭态
    for (const r of engine.rules.value) {
      expect(r.enabled, `${r.id} 不该被不存在的 id 影响`).toBe(false)
    }
  })

  it('⑤ updateRule 落盘完整规则集（供重挂后复现用户配置）', async () => {
    const { useNotificationEngine } = await loadEngine()
    const engine = useNotificationEngine()

    expect(engine.updateRule('rule-weekly-review', { cooldownMinutes: 42 })).toBe(true)

    const raw = readKv(RULES_KEY)
    expect(raw, 'updateRule 未落盘 hf:touchpoints:notification_rules').toBeTruthy()
    const saved = JSON.parse(raw)
    expect(saved.length).toBe(5)
    const weekly = saved.find((r: any) => r.id === 'rule-weekly-review')
    expect(weekly.cooldownMinutes).toBe(42)
    expect(weekly.name).toBe('周回顾提醒')
  })

  it('⑤通知与偏好两条相邻 load 分支未被本次改动影响', async () => {
    const { useNotificationEngine } = await loadEngine()
    const engine = useNotificationEngine()

    // loadNotifications：无kv → 走 JSON.parse('[]') 分支 → 空数组
    expect(engine.notifications.value).toEqual([])
    expect(readKv(NOTIF_KEY)).toBeUndefined()
    // loadPreferences：无 kv → 浅拷贝兜底（本次刻意不改，读路径无写操作）
    expect(engine.preferences.value.enabled).toBe(false)
    expect(engine.preferences.value.quietStart).toBe('22:00')
    expect(readKv(PREFS_KEY)).toBeUndefined()
  })
})
