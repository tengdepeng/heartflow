// ============================================================
// 输出治理闸 · #85 测试
// 覆盖三条宪法信号（中性呈现 / 只给原材料不给结论 / 本地私有）
// 在 create / publish / export 三个入口的命中与处置（flag vs block）。
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { store, mockConfig, recordAuditMock } = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  mockConfig: {
    complianceOverride: {
      forbiddenPatterns: false,
      comparativePhrases: false,
      personification: false,
      advisorEnabled: false,
      autoStartOverwrite: false,
      hapticFeedbackOverwrite: false,
      dataDriven: false,
    },
  },
  recordAuditMock: vi.fn(),
}))

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(k: string, d: T): T => (store.has(k) ? (store.get(k) as T) : d),
    setKV: (k: string, v: unknown) => { store.set(k, v) },
    removeKV: (k: string) => { store.delete(k) },
    getConfig: () => mockConfig,
  },
}))

vi.mock('../../../modules/constitution/compliance-baseline', () => ({
  useComplianceBaseline: () => ({ recordAudit: recordAuditMock }),
}))

import {
  governanceCheckRecord,
  governanceCheckPublish,
  governanceCheckExport,
} from '../governance-gate'
import type { CreateRecordParams } from '../types'

function makeParams(content: string): CreateRecordParams {
  return {
    type: 'note',
    content,
    roomSource: 'craft',
  }
}

beforeEach(() => {
  store.clear()
  recordAuditMock.mockClear()
  // 每次重置覆盖开关为默认（过滤器激活）
  mockConfig.complianceOverride = {
    forbiddenPatterns: false,
    comparativePhrases: false,
    personification: false,
    advisorEnabled: false,
    autoStartOverwrite: false,
    hapticFeedbackOverwrite: false,
    dataDriven: false,
  }
})

describe('中性呈现（第8条）', () => {
  it('干净内容：放行、无命中、不上报审计', () => {
    const r = governanceCheckRecord(makeParams('今天完成了一篇笔记'))
    expect(r.allowed).toBe(true)
    expect(r.action).toBe('allow')
    expect(r.severity).toBe('none')
    expect(r.hits).toHaveLength(0)
    expect(recordAuditMock).not.toHaveBeenCalled()
  })

  it('含评价性表达（你应该）：仅标注、上报审计、不拦截', () => {
    const r = governanceCheckRecord(makeParams('你应该去休息一下'))
    expect(r.allowed).toBe(true)
    expect(r.action).toBe('flag')
    expect(r.hits.some(h => h.signal === 'neutral' && h.matched === '你应该')).toBe(true)
    expect(recordAuditMock).toHaveBeenCalledTimes(1)
    expect(recordAuditMock.mock.calls[0][2]).toBe('neutral')
  })

  it('含比较性表达（比上次好）：命中 comparativePhrases', () => {
    const r = governanceCheckRecord(makeParams('这次比上次好很多'))
    expect(r.hits.some(h => h.signal === 'neutral' && h.category === 'comparativePhrases')).toBe(true)
    expect(recordAuditMock).toHaveBeenCalled()
  })

  it('forbiddenPatterns 覆盖开启（override=true）：不命中、不上报', () => {
    mockConfig.complianceOverride.forbiddenPatterns = true
    // 使用仅命中 forbidden 词表、不命中结论性词表的短语，隔离验证 override
    const r = governanceCheckRecord(makeParams('他给出了正确的答案'))
    expect(r.hits.some(h => h.signal === 'neutral' && h.matched === '正确的')).toBe(false)
    expect(recordAuditMock).not.toHaveBeenCalled()
  })
})

describe('只给原材料不给结论（第4条）', () => {
  it('含结论性关键词（建议）：命中 dataDriven', () => {
    const r = governanceCheckRecord(makeParams('我建议你明天早点出发'))
    const hit = r.hits.find(h => h.signal === 'dataDriven' && h.matched === '建议')
    expect(hit).toBeDefined()
    expect(hit!.category).toBe('conclusionKeywords')
    expect(r.allowed).toBe(true)
    expect(recordAuditMock).toHaveBeenCalled()
  })
})

describe('本地私有（第1条）', () => {
  it('create 内容提及「上传」：仅观测提醒（major），不拦截', () => {
    const r = governanceCheckRecord(makeParams('把照片上传到云端备份'))
    const hit = r.hits.find(h => h.signal === 'localPrivate')
    expect(hit).toBeDefined()
    expect(hit!.severity).toBe('major')
    expect(r.allowed).toBe(true) // 本地写入始终放行
    expect(r.action).toBe('flag')
  })

  it('publish 到外部分享渠道 share：硬拦截（critical），不放行', () => {
    const r = governanceCheckPublish(['share'], '随便写点什么')
    expect(r.allowed).toBe(false)
    expect(r.action).toBe('block')
    expect(r.blockedBy).toBe('localPrivate')
    expect(r.severity).toBe('critical')
    expect(r.reason).toContain('本地私有')
    expect(recordAuditMock).toHaveBeenCalled()
  })

  it('publish 到本地渠道（timeline）且内容提及云端：放行、仅标注', () => {
    const r = governanceCheckPublish(['timeline'], '记录一下，以后要上传资料')
    expect(r.allowed).toBe(true)
    expect(r.action).toBe('flag')
    expect(r.hits.some(h => h.signal === 'localPrivate')).toBe(true)
  })

  it('export 内容含结论性关键词：放行、仅标注、不拦截', () => {
    const r = governanceCheckExport('我评估了一下，建议换个方案')
    expect(r.allowed).toBe(true)
    expect(r.action).toBe('flag')
    expect(r.hits.some(h => h.signal === 'dataDriven')).toBe(true)
  })
})

describe('聚合严重度', () => {
  it('publish share 同时含中性命中：severity 取 critical', () => {
    const r = governanceCheckPublish(['share'], '你应该把数据分享到云端')
    expect(r.severity).toBe('critical')
    expect(r.action).toBe('block')
  })
})
