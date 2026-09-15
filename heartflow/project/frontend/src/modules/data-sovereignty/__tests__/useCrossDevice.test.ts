// ============================================================
// 跨端接续 · 真实数据交接测试
// 验证 executeContinuity 不再是模拟动画，而是经 data-port
// 把源端全量数据真实导出、目标端经 importJSON 回写。
// 用真实 storage + localStorage stub，避开平台 mock 坑。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'

// ---- Mock localStorage（storage 是 localStorage-backed 单例） ----
vi.stubGlobal('localStorage', {
  _data: {} as Record<string, string>,
  get length() { return Object.keys((this as any)._data).length },
  key(i: number) { return Object.keys((this as any)._data)[i] ?? null },
  getItem(k: string) { return (this as any)._data[k] ?? null },
  setItem(k: string, v: string) { (this as any)._data[k] = v },
  removeItem(k: string) { delete (this as any)._data[k] },
  clear() { (this as any)._data = {} },
})

import { storage } from '../../../engine/storage'
import {
  useCrossDevice,
  buildContinuityPayload,
  applyContinuityPayload,
} from '../composables/useCrossDevice'

const CONTINUITY_KEYS = [
  'hf:continuity_devices',
  'hf:continuity_sessions',
  'hf:continuity_config',
]

// 合法续接配置（loadConfig 直接以存储值为准，无默认值合并，故需给完整对象）
const VALID_CONFIG = {
  enabled: true,
  sessionTTLMinutes: 10,
  autoDiscover: false,
  preserveState: true,
  maxHistorySessions: 20,
}

beforeEach(() => {
  for (const key of CONTINUITY_KEYS) {
    storage.setKV(key, key === 'hf:continuity_config' ? VALID_CONFIG : [])
  }
  // 清除业务数据域，确保导入前后可对比
  for (const k of ['hf:sessions', 'hf:crystals', 'hf:notes', 'hf:emotions', 'hf:anchors']) {
    storage.setKV(k, [])
  }
  localStorage.removeItem('hf:current_device_id')
})

describe('跨端接续 · 纯函数数据交接', () => {
  it('buildContinuityPayload 导出可被 data-port 解析的合法 JSON', () => {
    const json = buildContinuityPayload()
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(2)
    expect(parsed).toHaveProperty('sessions')
    expect(parsed).toHaveProperty('constitution')
  })

  it('buildContinuityPayload 携带宪法透明度账本快照（P2.2 跨端同步·守第1条）', () => {
    const json = buildContinuityPayload()
    const parsed = JSON.parse(json)
    expect(parsed.constitutionStatus).toBeTruthy()
    expect(parsed.constitutionStatus.schema).toBe('heartflow.constitution.status/v1')
    expect(parsed.constitutionStatus.items.length).toBe(45)
  })

  it('applyContinuityPayload 把源端数据真实回写到本地存储', () => {
    // 源端：先写入一条专注记录
    storage.setSessions([{ id: 's1', mode: 'focus', elapsed: 600000, startedAt: '2026-08-09T00:00:00.000Z', completedAt: '2026-08-09T00:10:00.000Z' } as any])

    // 源端封装
    const payload = buildContinuityPayload()

    // 目标端：清空后导入
    storage.setSessions([])
    expect(storage.getSessions()).toHaveLength(0)

    const counts = applyContinuityPayload(payload)
    expect(counts.sessions).toBe(1)
    expect(storage.getSessions()).toHaveLength(1)
    expect(storage.getSessions()[0].id).toBe('s1')
  })

  it('applyContinuityPayload 对非法 JSON 抛错（由调用方捕获）', () => {
    expect(() => applyContinuityPayload('{not json')).toThrow()
  })
})

describe('跨端接续 · 源端→目标端闭环', () => {
  it('createSession→pairSession→executeContinuity→recoverContinuity 完整交接数据', async () => {
    // 真实跨端时源端与目标端实例各自从同一份持久化存储（kvStore）读写；
    // 单实例即可代表"共享存储"，验证源端封装 payload → 目标端回写这一核心交接。
    const cd = useCrossDevice()

    // 源端写入一条数据并创建会话
    storage.setSessions([{ id: 'x1', mode: 'nap', elapsed: 120000, startedAt: '2026-08-09T01:00:00.000Z', completedAt: '2026-08-09T01:02:00.000Z' } as any])
    const session = cd.createSession('home-space', '/home-space')
    expect(session.status).toBe('waiting')
    expect(session.token).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)

    // 目标端用令牌配对
    const paired = cd.pairSession(session.token)
    expect(paired).not.toBeNull()
    expect(paired!.status).toBe('paired')

    // 源端执行传输（真实封装 payload 到会话）
    const ok = await cd.executeContinuity(session.sessionId)
    expect(ok).toBe(true)
    const bound = cd.sessions.value.find(s => s.sessionId === session.sessionId)!
    expect(bound.payload).toBeTruthy()

    // 目标端清空本地数据后恢复
    storage.setSessions([])
    const counts = cd.recoverContinuity(paired!.sessionId)
    expect(counts).not.toBeNull()
    expect(counts!.sessions).toBe(1)
    expect(storage.getSessions()[0].id).toBe('x1')
  })

  it('配对错误令牌返回 null', () => {
    const cd = useCrossDevice()
    cd.createSession('home-space', '/home-space')
    expect(cd.pairSession('ZZZZ-ZZZZ-ZZZZ-ZZZZ')).toBeNull()
  })

  it('过期会话不可被配对', () => {
    const cd = useCrossDevice()
    const session = cd.createSession('home-space', '/home-space')
    // 强制过期
    const s = cd.sessions.value.find(x => x.sessionId === session.sessionId)!
    s.expiresAt = Date.now() - 1000
    expect(cd.pairSession(session.token)).toBeNull()
  })
})
