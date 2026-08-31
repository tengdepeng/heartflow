// ============================================================
// 跨领域调令拆解测试（蓝图第四部分·八）
//
// 重点验证三件事，都是本项目容易翻车的地方：
//   1. **只拆真跨域**——单域调令不能被硬拆成「多幕僚协作」的表演；
//   2. **结论必须来自真实读取**——统计数字要跟着 mock 的库数据变，
//      不是写死的漂亮话（项目纪律：占位可以，虚假数据不行）；
//   3. 汇总层在「一个都没查完」时要老实说没查到，而不是编一段总结。
// ============================================================
import { describe, expect, it, vi } from 'vitest'
import {
  detectDomains,
  decomposeCommand,
  isCrossDomainQuery,
  runSubTask,
  summarizeSubTasks,
  DOMAIN_TASK_TYPE,
  DOMAIN_ROOM_LABEL,
} from '../task-decompose'
import type { CommandSubTask } from '../task-decompose'

const db = vi.hoisted(() => ({
  sessions: [] as any[],
  notes: [] as any[],
  emotions: [] as any[],
  ledger: [] as any[],
  anchors: [] as any[],
  goals: [] as any[],
  relations: [] as any[],
  crystals: [] as any[],
}))

vi.mock('../../../engine/storage', () => ({
  storage: {
    getSessions: () => db.sessions,
    getNotes: () => db.notes,
    getEmotions: () => db.emotions,
    getLedger: () => db.ledger,
    getAnchors: () => db.anchors,
    getGoals: () => db.goals,
    getRelations: () => db.relations,
    getCrystals: () => db.crystals,
  },
}))

function reset() {
  db.sessions = []
  db.notes = []
  db.emotions = []
  db.ledger = []
  db.anchors = []
  db.goals = []
  db.relations = []
  db.crystals = []
}

describe('detectDomains · 领域识别', () => {
  it('空文本 → 无命中', () => {
    expect(detectDomains('')).toEqual([])
    expect(detectDomains('   ')).toEqual([])
  })

  it('单域调令只命中一个域', () => {
    expect(detectDomains('帮我看看这个月的开销')).toEqual(['ledger'])
    expect(detectDomains('我最近专注了多久')).toEqual(['session'])
  })

  it('跨域调令命中多个域', () => {
    const hits = detectDomains('把我最近的专注、情绪和开销一起理一下')
    expect(hits).toContain('session')
    expect(hits).toContain('emotion')
    expect(hits).toContain('ledger')
    expect(hits.length).toBeGreaterThanOrEqual(3)
  })

  it('载体 / 幕僚域没有关键词，永不命中（不是调令要查的领域）', () => {
    const hits = detectDomains('载体 幕僚 载体 幕僚')
    expect(hits).not.toContain('carrier')
    expect(hits).not.toContain('advisor')
  })
})

describe('isCrossDomainQuery · 拆解闸门', () => {
  it('动作型调令一律不拆（要落一笔账 / 要新建 / 要跳房间的，交回原路执行）', () => {
    expect(isCrossDomainQuery('记一笔 20 车费，顺便看看情绪')).toBe(false)
    expect(isCrossDomainQuery('打开账本和情绪花房看看')).toBe(false)
    expect(isCrossDomainQuery('开始专注，之后再看看开销')).toBe(false)
  })

  it('没有查询动词的裸词堆不拆（避免为了热闹硬拆）', () => {
    expect(isCrossDomainQuery('专注 情绪 开销')).toBe(false)
  })

  it('查询动词 + ≥2 域才算跨领域查询', () => {
    expect(isCrossDomainQuery('把专注和情绪一起复盘')).toBe(true)
    expect(isCrossDomainQuery('帮我梳理下最近的情绪和开销')).toBe(true)
    expect(isCrossDomainQuery('复盘一下最近的专注')).toBe(false) // 单域
  })

  it('弱财务词让整条被判 finance 时，仍能识别为跨领域查询（原漏拦点）', () => {
    // 「开销」是 commandIntent 的弱财务词，taskType 会是 finance；
    // 拆解判据必须独立于 taskType，否则这类跨域复盘永远拆不出来。
    expect(isCrossDomainQuery('把我最近的专注、情绪和开销一起复盘一下')).toBe(true)
  })
})

describe('decomposeCommand · 只拆真跨域', () => {
  it('单域不拆（返回空数组，调用方维持单任务）', () => {
    expect(decomposeCommand('看看账本')).toEqual([])
    expect(decomposeCommand('随便聊聊')).toEqual([])
  })

  it('动作型不拆（与 isCrossDomainQuery 同源，不许两套判据）', () => {
    expect(decomposeCommand('记一笔 20 车费，顺便看看情绪')).toEqual([])
    expect(decomposeCommand('打开账本和情绪花房看看')).toEqual([])
  })

  it('≥2 域才拆，且每个子任务都带房间名与 running 初态', () => {
    const subs = decomposeCommand('把专注和情绪一起复盘')
    expect(subs.length).toBeGreaterThanOrEqual(2)
    for (const s of subs) {
      expect(s.id).toMatch(/^sub_/)
      expect(s.status).toBe('running')
      expect(s.room).toBe(DOMAIN_ROOM_LABEL[s.domain])
      expect(s.room.length).toBeGreaterThan(0)
    }
  })

  it('子任务 id 互不重复（同一次拆解内）', () => {
    const subs = decomposeCommand('专注、情绪、开销、笔记都看看')
    const ids = new Set(subs.map((s) => s.id))
    expect(ids.size).toBe(subs.length)
  })
})

describe('runSubTask · 结论来自真实读取', () => {
  it('库为空时如实说「暂无」，不编内容', () => {
    reset()
    expect(runSubTask({ id: 'a', domain: 'note', room: '思绪书房', status: 'running' })).toBe('暂无笔记')
    expect(runSubTask({ id: 'b', domain: 'ledger', room: '劳酬', status: 'running' })).toBe('暂无账目')
    expect(runSubTask({ id: 'c', domain: 'session', room: '时间长廊', status: 'running' })).toBe('暂无专注记录')
  })

  it('统计跟着真实数据变（专注：次数 + 累计分钟）', () => {
    reset()
    db.sessions = [
      { id: 's1', completedAt: '2026-08-30T10:00:00Z', elapsed: 25 * 60000 },
      { id: 's2', completedAt: '2026-08-30T11:00:00Z', elapsed: 35 * 60000 },
      { id: 's3', completedAt: null, elapsed: 99 * 60000 }, // 未完成不计
    ]
    expect(runSubTask({ id: 'a', domain: 'session', room: '时间长廊', status: 'running' }))
      .toBe('专注 2 次，累计 60 分钟')
  })

  it('账目区分收支笔数', () => {
    reset()
    db.ledger = [
      { id: 'l1', type: 'income', amount: 100 },
      { id: 'l2', type: 'expense', amount: 20 },
      { id: 'l3', type: 'expense', amount: 30 },
    ]
    expect(runSubTask({ id: 'a', domain: 'ledger', room: '劳酬', status: 'running' }))
      .toBe('账目 3 笔（收入 1 / 支出 2）')
  })

  it('情绪带上最近一条的备注', () => {
    reset()
    db.emotions = [
      { id: 'e1', type: 'calm', note: '还行' },
      { id: 'e2', type: 'happy', note: '今天很松快' },
    ]
    expect(runSubTask({ id: 'a', domain: 'emotion', room: '情绪花房', status: 'running' }))
      .toBe('情绪记录 2 条，最近一次「今天很松快」')
  })

  it('心锚统计已完成数', () => {
    reset()
    db.anchors = [{ id: 'a1', done: true }, { id: 'a2', done: false }]
    expect(runSubTask({ id: 'a', domain: 'anchor', room: '逐日心锚', status: 'running' }))
      .toBe('心锚 2 个，已完成 1 个')
  })

  it('取数抛错时给出可读兜底，不让整条调令挂掉', () => {
    reset()
    db.notes = {
      get length() {
        throw new Error('boom')
      },
    } as any
    expect(runSubTask({ id: 'a', domain: 'note', room: '思绪书房', status: 'running' }))
      .toBe('该领域暂时读不到数据')
    reset()
  })
})

describe('summarizeSubTasks · 汇总层', () => {
  it('一个都没查完 → 老实说没查到（不编总结）', () => {
    const subs: CommandSubTask[] = [
      { id: 'a', domain: 'note', room: '思绪书房', status: 'running' },
      { id: 'b', domain: 'ledger', room: '劳酬', status: 'running' },
    ]
    expect(summarizeSubTasks(subs)).toBe('几位幕僚都还没查到东西。')
  })

  it('带幕僚名时汇总里写明「谁在哪个房间查到什么」（蓝图648）', () => {
    const subs: CommandSubTask[] = [
      { id: 'a', domain: 'note', room: '思绪书房', status: 'done', result: '笔记 3 篇', advisorName: '砚生' },
      { id: 'b', domain: 'ledger', room: '劳酬', status: 'done', result: '账目 2 笔', advisorName: '青账' },
    ]
    const s = summarizeSubTasks(subs)
    expect(s).toContain('砚生在思绪书房查到：笔记 3 篇')
    expect(s).toContain('青账在劳酬查到：账目 2 笔')
    expect(s.startsWith('已分头查过——')).toBe(true)
  })

  it('无幕僚名（协调关闭 / 无人可派）时只报房间，不硬塞名字', () => {
    const subs: CommandSubTask[] = [
      { id: 'a', domain: 'note', room: '思绪书房', status: 'done', result: '笔记 1 篇' },
    ]
    const s = summarizeSubTasks(subs)
    expect(s).toContain('思绪书房：笔记 1 篇')
    expect(s).not.toContain('在思绪书房查到')
  })

  it('只汇总已完成的子任务，未完成的不出现', () => {
    const subs: CommandSubTask[] = [
      { id: 'a', domain: 'note', room: '思绪书房', status: 'done', result: '笔记 1 篇' },
      { id: 'b', domain: 'ledger', room: '劳酬', status: 'running' },
    ]
    const s = summarizeSubTasks(subs)
    expect(s).toContain('笔记 1 篇')
    expect(s).not.toContain('劳酬')
  })
})

describe('DOMAIN_TASK_TYPE · 派单键', () => {
  it('每个域都有派单键（否则 dispatchAvatar 拿到 undefined 会退化成随机派人）', () => {
    for (const domain of Object.keys(DOMAIN_ROOM_LABEL) as (keyof typeof DOMAIN_TASK_TYPE)[]) {
      expect(typeof DOMAIN_TASK_TYPE[domain]).toBe('string')
      expect(DOMAIN_TASK_TYPE[domain].length).toBeGreaterThan(0)
    }
  })

  it('关键域映射到对的任务类型（账本→finance 而非 general）', () => {
    expect(DOMAIN_TASK_TYPE.ledger).toBe('finance')
    expect(DOMAIN_TASK_TYPE.session).toBe('focus')
    expect(DOMAIN_TASK_TYPE.emotion).toBe('emotion')
  })
})
