// ============================================================
// 宪法运行时检测 · 文案中性（第8条）+ 第4条·只给原材料不给结论
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import {
  checkNeutrality,
  checkAdvisorNeutrality,
  checkAdvisorDataDriven,
  getUserNeutralityExtensions,
  setUserNeutralityExtensions,
  addNeutralityExtension,
  removeNeutralityExtension,
  getNeutralityFlagThreshold,
  setNeutralityFlagThreshold,
  getNeutralityCoverageReport,
  emptyNeutralityExtensions,
} from '../neutrality-checker'
import { storage } from '../../../engine/storage'

describe('宪法 · 运行时文案中性检测', () => {
  it('正常中性文案不触发任何命中', () => {
    const r = checkNeutrality('今天你记录了一件小事，留在这里慢慢看。')
    expect(r.flag).toBe(false)
    expect(r.hits.length).toBe(0)
    expect(r.counts).toEqual({ forbiddenPatterns: 0, comparativePhrases: 0, personification: 0 })
  })

  it('空串 / 非字符串安全返回', () => {
    expect(checkNeutrality('').flag).toBe(false)
    // @ts-expect-error 故意传入非法类型
    expect(checkNeutrality(undefined).flag).toBe(false)
  })

  it('评价性表达（你应该/你必须）被捕获', () => {
    const r = checkNeutrality('你应该每天坚持记录，这是对的。')
    expect(r.flag).toBe(true)
    expect(r.counts.forbiddenPatterns).toBeGreaterThan(0)
    expect(r.hits.some(h => h.matched === '你应该')).toBe(true)
    expect(r.hits.some(h => h.matched === '正确的' || h.matched === '对的')).toBe(true)
  })

  it('比较性表达（比上次好）被捕获', () => {
    const r = checkNeutrality('这次专注比上次好多了。')
    expect(r.counts.comparativePhrases).toBeGreaterThan(0)
    expect(r.hits.some(h => h.category === 'comparativePhrases')).toBe(true)
  })

  it('拟人化表达（他/她觉得、像朋友一样）被捕获', () => {
    const r = checkNeutrality('她觉得你今天状态不错，像朋友一样陪着你。')
    expect(r.counts.personification).toBeGreaterThan(0)
    expect(r.hits.some(h => h.category === 'personification')).toBe(true)
  })

  it('第一人称拟人化（我觉得）被捕获', () => {
    const r = checkNeutrality('我觉得你已经做得很好了。')
    expect(r.counts.personification).toBeGreaterThan(0)
  })

  it('多条命中按分类聚合', () => {
    const r = checkNeutrality('你应该记录，这次比上次好，她认为这很棒。')
    expect(r.counts.forbiddenPatterns).toBeGreaterThan(0)
    expect(r.counts.comparativePhrases).toBeGreaterThan(0)
    expect(r.counts.personification).toBeGreaterThan(0)
  })

  describe('checkAdvisorNeutrality 与合规开关联动', () => {
    it('默认（开关关闭 = 过滤器激活）返回真实命中', () => {
      storage.clear()
      const cfg = storage.getConfig()
      cfg.complianceOverride = {
        ...cfg.complianceOverride,
        forbiddenPatterns: false,
        comparativePhrases: false,
        personification: false,
      }
      storage.setConfig(cfg)

      const res = checkAdvisorNeutrality('你应该记录，这次比上次好。')
      expect(res.forbiddenPatterns.length).toBeGreaterThan(0)
      expect(res.comparativePhrases.length).toBeGreaterThan(0)
      expect(res.personification).toEqual([])
    })

    it('对应开关开启时该分类跳过检测', () => {
      storage.clear()
      const cfg = storage.getConfig()
      cfg.complianceOverride = {
        ...cfg.complianceOverride,
        forbiddenPatterns: true, // 用户允许评价性表达
        comparativePhrases: false,
        personification: false,
      }
      storage.setConfig(cfg)

      const res = checkAdvisorNeutrality('你应该记录，这次比上次好。')
      expect(res.forbiddenPatterns).toEqual([]) // 被覆盖跳过
      expect(res.comparativePhrases.length).toBeGreaterThan(0) // 仍检测
    })
  })
})

describe('checkAdvisorDataDriven · 第4条', () => {
  beforeEach(() => {
    storage.clear()
    const cfg = storage.getConfig()
    storage.setConfig({
      ...cfg,
      complianceOverride: {
        ...cfg.complianceOverride,
        dataDriven: false,
      },
    })
  })

  it('干净文案：无结论性表达，返回空数组', () => {
    expect(checkAdvisorDataDriven('今天你完成了一篇笔记，时间是下午三点')).toEqual([])
  })

  it('含"建议"：命中并返回该关键词', () => {
    const hits = checkAdvisorDataDriven('我建议你今天先休息一下')
    expect(hits).toContain('建议')
  })

  it('含"分析结论/诊断/评估/评分"：命中并返回', () => {
    expect(checkAdvisorDataDriven('这是本次复盘的分析结论')).toContain('分析结论')
    expect(checkAdvisorDataDriven('系统为你做了一次诊断')).toContain('诊断')
    expect(checkAdvisorDataDriven('我帮你评估了风险')).toContain('评估')
    expect(checkAdvisorDataDriven('本项得分为评分结果')).toContain('评分')
  })

  it('含"你应该/你必须"：与第8条同源关键词也命中第4条', () => {
    const hits = checkAdvisorDataDriven('你应该早点睡觉')
    expect(hits).toContain('你应该')
  })

  it('override 开启（dataDriven=true）：即便含结论词也不报告命中', () => {
    const cfg = storage.getConfig()
    storage.setConfig({
      ...cfg,
      complianceOverride: { ...cfg.complianceOverride, dataDriven: true },
    })
    expect(checkAdvisorDataDriven('我建议你今天先休息一下')).toEqual([])
  })

  it('非字符串 / 空输入：安全返回空数组，不抛错', () => {
    // @ts-expect-error 故意传入非字符串以验证健壮性
    expect(checkAdvisorDataDriven(null)).toEqual([])
    expect(checkAdvisorDataDriven('')).toEqual([])
  })
})

// ============================================================
// C2-EXT · 中性检测词表「用户可本地扩展」（零外网 / 本地 KV）
// ============================================================
describe('C2-EXT · 中性检测词表本地扩展', () => {
  beforeEach(() => {
    storage.clear()
  })

  it('默认无扩展：基线规模与覆盖率报告一致', () => {
    const ext = getUserNeutralityExtensions()
    expect(ext.forbidden).toEqual([])
    expect(ext.comparative).toEqual([])
    expect(ext.personification).toEqual([])

    const report = getNeutralityCoverageReport()
    // 内置基线：15 个 forbidden / 6 个 comparative / 18 个 personification
    expect(report.forbidden.builtin).toBe(15)
    expect(report.forbidden.extended).toBe(0)
    expect(report.forbidden.total).toBe(15)
    expect(report.comparative.builtin).toBe(6)
    expect(report.personification.builtin).toBe(17)
    expect(report.threshold).toBe(1)
  })

  it('追加本地短语后检测自动覆盖（观测式命中）', () => {
    addNeutralityExtension('forbidden', '快点去做')
    const r = checkNeutrality('你快点去做这件事。')
    expect(r.flag).toBe(true)
    expect(r.counts.forbiddenPatterns).toBeGreaterThan(0)
    expect(r.hits.some(h => h.matched === '快点去做')).toBe(true)
  })

  it('追加本地正则（比较性）后命中', () => {
    addNeutralityExtension('comparative', '远超常人')
    const r = checkNeutrality('你这次的表现远超常人。')
    expect(r.counts.comparativePhrases).toBeGreaterThan(0)
  })

  it('追加本地正则（拟人化）后命中', () => {
    addNeutralityExtension('personification', '它很想')
    const r = checkNeutrality('它很想陪在你身边。')
    expect(r.counts.personification).toBeGreaterThan(0)
  })

  it('重复追加被去重，空串/空白被忽略', () => {
    addNeutralityExtension('forbidden', '测试词')
    const after1 = addNeutralityExtension('forbidden', '测试词')
    expect(after1.filter(x => x === '测试词').length).toBe(1)
    const after2 = addNeutralityExtension('forbidden', '   ')
    expect(after2).toEqual(['测试词'])
  })

  it('移除本地词后不再命中', () => {
    addNeutralityExtension('forbidden', '测试词')
    removeNeutralityExtension('forbidden', '测试词')
    const r = checkNeutrality('测试词在这里。')
    expect(r.counts.forbiddenPatterns).toBe(0)
  })

  it('非法正则写入不抛错（静默忽略匹配）', () => {
    addNeutralityExtension('comparative', '(未闭合')
    const ext = getUserNeutralityExtensions()
    expect(ext.comparative).toContain('(未闭合')
    // 非法正则不应导致检测崩溃
    expect(() => checkNeutrality('任意文本')).not.toThrow()
  })

  it('setUserNeutralityExtensions 全量写入并覆盖', () => {
    setUserNeutralityExtensions({ forbidden: ['甲', '乙'], comparative: ['[0-9]+'], personification: [] })
    const ext = getUserNeutralityExtensions()
    expect(ext.forbidden).toEqual(['甲', '乙'])
    expect(ext.comparative).toEqual(['[0-9]+'])
    expect(ext.comparativeCompiled.length).toBe(1)
  })

  it('阈值默认 1；命中数 >= 阈值才置 flag；下限钳制为 1', () => {
    expect(getNeutralityFlagThreshold()).toBe(1)
    setNeutralityFlagThreshold(0) // 越界，应回落 1
    expect(getNeutralityFlagThreshold()).toBe(1)
    setNeutralityFlagThreshold(3)
    expect(getNeutralityFlagThreshold()).toBe(3)

    // 单条命中 + 阈值 3 => flag=false
    const r = checkNeutrality('你应该记录。')
    expect(r.hits.length).toBeGreaterThan(0)
    expect(r.flag).toBe(false)
  })

  it('emptyNeutralityExtensions 返回三空数组', () => {
    expect(emptyNeutralityExtensions()).toEqual({ forbidden: [], comparative: [], personification: [] })
  })
})
