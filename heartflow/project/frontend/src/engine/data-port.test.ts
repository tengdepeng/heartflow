import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import type { Anchor } from '../modules/anchor/types'
import type { EmotionRecord, FocusSession, Note, TimeCrystal } from '../types'

// Directly mock storage module to avoid vi.resetModules() issues
const mockData: {
  sessions: FocusSession[]; crystals: TimeCrystal[]; notes: Note[]; emotions: EmotionRecord[]
  anchors: Anchor[]; goals: any[]; relations: any[]; ledger: any[]; carriers: any[]
  constitution: any; kvStore: Record<string, any>
} = {
  sessions: [], crystals: [], notes: [], emotions: [], anchors: [],
  goals: [], relations: [], ledger: [], carriers: [], constitution: null, kvStore: {},
}

const kvStore: Record<string, any> = {}

const mockStorage = {
  getSessions: vi.fn(() => mockData.sessions),
  getCrystals: vi.fn(() => mockData.crystals),
  getNotes: vi.fn(() => mockData.notes),
  getEmotions: vi.fn(() => mockData.emotions),
  getAnchors: vi.fn(() => mockData.anchors),
  getGoals: vi.fn(() => mockData.goals),
  getRelations: vi.fn(() => mockData.relations),
  getLedger: vi.fn(() => mockData.ledger),
  getCarriers: vi.fn(() => mockData.carriers),
  getConstitution: vi.fn(() => mockData.constitution),
  getConfig: vi.fn(() => ({ display: { statsWindowDays: 30 } })),
  getKV: vi.fn(<T>(key: string, d: T) => { const v = kvStore[key]; return v !== undefined ? v : d }),
  setKV: vi.fn((key: string, val: any) => { kvStore[key] = val }),
  setSessions: vi.fn((s: FocusSession[]) => { mockData.sessions = s }),
  setCrystals: vi.fn((c: TimeCrystal[]) => { mockData.crystals = c }),
  setNotes: vi.fn((n: Note[]) => { mockData.notes = n }),
  setEmotions: vi.fn((e: EmotionRecord[]) => { mockData.emotions = e }),
  setAnchors: vi.fn((a: Anchor[]) => { mockData.anchors = a }),
  setGoals: vi.fn((g: any[]) => { mockData.goals = g }),
  setRelations: vi.fn((r: any[]) => { mockData.relations = r }),
  setCarriers: vi.fn((c: any[]) => { mockData.carriers = c }),
  setConstitution: vi.fn((c: any) => { mockData.constitution = c }),
  addLedgerRecord: vi.fn(),
}

vi.mock('./storage', () => ({ storage: mockStorage }))

const today = new Date().toISOString().slice(0, 10)
const session: FocusSession = { id: 'session-1', status: 'completed', mode: 'focus', plannedDuration: 1, elapsed: 1, startedAt: `${today}T00:00:00.000Z`, pausedDuration: 0, pausedAt: null, completedAt: `${today}T00:01:00.000Z`, tags: [], note: '', carrierId: null }
const crystal: TimeCrystal = { id: 'crystal-1', sessionId: session.id, color: '#fff', intensity: 1, createdAt: `${today}T00:01:00.000Z`, shape: 'sphere', tags: [], insight: null }
const note: Note = { id: 'note-1', title: 'note', content: '', tags: [], createdAt: `${today}T00:00:00.000Z`, updatedAt: `${today}T00:00:00.000Z` }
const emotion: EmotionRecord = { id: 'emotion-1', type: 'calm', note: '', createdAt: `${today}T00:00:00.000Z` }
const anchor: Anchor = { id: 'anchor-1', text: 'anchor', done: false, targetDate: today, createdAt: `${today}T00:00:00.000Z`, priority: 'must', driftCount: 0 }

describe('data-port', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { __TAURI__: undefined })
    vi.stubGlobal('document', { createElement: vi.fn(() => ({})), body: { appendChild: vi.fn() } })
  })

  afterEach(() => {
    mockData.sessions = []; mockData.crystals = []; mockData.notes = []; mockData.emotions = []
    mockData.anchors = []; mockData.goals = []; mockData.relations = []; mockData.ledger = []
    mockData.carriers = []; mockData.constitution = null
    Object.keys(kvStore).forEach(k => delete kvStore[k])
    vi.unstubAllGlobals()
  })

  it('导入并导出全部五类数据', async () => {
    const { importJSON, exportAllJSON } = await import('./data-port')
    importJSON(JSON.stringify({ sessions: [session], crystals: [crystal], notes: [note], emotions: [emotion], anchors: [anchor] }))
    const exported = JSON.parse(exportAllJSON())
    expect(exported).toMatchObject({ sessions: [session], crystals: [crystal], notes: [note], emotions: [emotion], anchors: [anchor] })
  })

  it('重复导入按 ID 幂等合并且保留既有数据', async () => {
    const { importJSON } = await import('./data-port')
    const payload = JSON.stringify({ sessions: [session, session], crystals: [crystal], notes: [note], emotions: [emotion], anchors: [anchor] })
    expect(importJSON(payload)).toEqual({ sessions: 1, crystals: 1, notes: 1, emotions: 1, anchors: 1, goals: 0, ledger: 0, relations: 0, carriers: 0, constitution: 0 })
    expect(importJSON(payload)).toEqual({ sessions: 0, crystals: 0, notes: 0, emotions: 0, anchors: 0, goals: 0, ledger: 0, relations: 0, carriers: 0, constitution: 0 })
    expect(mockData.sessions).toEqual([session])
    expect(mockData.crystals).toEqual([crystal])
    expect(mockData.notes).toEqual([note])
    expect(mockData.emotions).toEqual([emotion])
    expect(mockData.anchors).toEqual([anchor])
  })

  it('兼容不含新增字段的旧导入包', async () => {
    const { importJSON } = await import('./data-port')
    expect(importJSON(JSON.stringify({ sessions: [session], notes: [note], emotions: [emotion] }))).toEqual({ sessions: 1, crystals: 0, notes: 1, emotions: 1, anchors: 0, goals: 0, ledger: 0, relations: 0, carriers: 0, constitution: 0 })
  })

  it('非法 JSON 不会改动任何既有数据', async () => {
    const { importJSON } = await import('./data-port')
    importJSON(JSON.stringify({ sessions: [session], crystals: [crystal], notes: [note], emotions: [emotion], anchors: [anchor] }))
    const before = {
      sessions: [...mockData.sessions], crystals: [...mockData.crystals], notes: [...mockData.notes],
      emotions: [...mockData.emotions], anchors: [...mockData.anchors],
    }

    expect(() => importJSON('{not valid json')).toThrow(SyntaxError)
    expect({
      sessions: mockData.sessions, crystals: mockData.crystals, notes: mockData.notes,
      emotions: mockData.emotions, anchors: mockData.anchors,
    }).toEqual(before)
  })

  it('exportTimelineMarkdown 生成 Markdown 时间线', async () => {
    const { exportTimelineMarkdown } = await import('./data-port')
    mockData.sessions.push(session)
    const result = exportTimelineMarkdown()
    expect(result).toContain('#')
    expect(result).toContain('专注')
  })

  it('exportData 返回结构化 JSON 字符串', async () => {
    const { exportData } = await import('./data-port')
    mockData.sessions.push(session)
    mockData.crystals.push(crystal)
    mockData.notes.push(note)
    mockData.emotions.push(emotion)
    mockData.anchors.push(anchor)
    const result = exportData('json')
    expect(typeof result).toBe('string')
    const parsed = JSON.parse(result)
    expect(parsed.sessions).toHaveLength(1)
    expect(parsed.crystals).toHaveLength(1)
    expect(parsed.notes).toHaveLength(1)
    expect(parsed.emotions).toHaveLength(1)
    expect(parsed.anchors).toHaveLength(1)
    expect(parsed.exportedAt).toBeTruthy()
    expect(parsed.version).toBe(2)
  })

  it('importData 导入结构化数据', async () => {
    const { importData, exportData } = await import('./data-port')
    mockData.sessions.push(session)
    const exported = exportData('json')
    // 清空后导入
    mockData.sessions = []
    const result = importData(exported, 'json')
    expect(result).toMatchObject({ sessions: 1, crystals: 0, notes: 0, emotions: 0, anchors: 0, goals: 0, ledger: 0, relations: 0, carriers: 0, constitution: 0 })
  })

  it('exportAllJSON 返回完整 JSON 字符串', async () => {
    const { exportAllJSON } = await import('./data-port')
    mockData.sessions.push(session)
    const result = exportAllJSON()
    const parsed = JSON.parse(result)
    expect(parsed.sessions).toHaveLength(1)
  })

  // ---- 增量导出测试 ----

  it('exportIncrementalJSON 只导出截止时间后的数据', async () => {
    const { exportIncrementalJSON } = await import('./data-port')
    const oldSession = { ...session, id: 'old', startedAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:01:00.000Z' }
    const newSession = { ...session, id: 'new', startedAt: '2026-07-15T00:00:00.000Z', completedAt: '2026-07-15T00:01:00.000Z' }
    const oldNote = { ...note, id: 'old-note', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
    const newNote = { ...note, id: 'new-note', createdAt: '2026-07-15T00:00:00.000Z', updatedAt: '2026-07-15T00:00:00.000Z' }
    mockData.sessions.push(oldSession, newSession)
    mockData.notes.push(oldNote, newNote)

    const result = JSON.parse(exportIncrementalJSON('2026-06-01T00:00:00.000Z'))
    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0].id).toBe('new')
    expect(result.notes).toHaveLength(1)
    expect(result.notes[0].id).toBe('new-note')
  })

  it('exportIncrementalJSON 无 since 参数时使用 lastExportTime', async () => {
    const { exportIncrementalJSON, setLastExportTime } = await import('./data-port')
    setLastExportTime('2026-06-15T00:00:00.000Z')
    const oldSession = { ...session, id: 'old', startedAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:01:00.000Z' }
    const newSession = { ...session, id: 'new', startedAt: '2026-07-15T00:00:00.000Z', completedAt: '2026-07-15T00:01:00.000Z' }
    mockData.sessions.push(oldSession, newSession)

    const result = JSON.parse(exportIncrementalJSON())
    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0].id).toBe('new')
  })

  it('getLastExportTime / setLastExportTime 读写持久化', async () => {
    const { getLastExportTime, setLastExportTime } = await import('./data-port')
    expect(getLastExportTime()).toBeNull()
    setLastExportTime('2026-07-20T12:00:00.000Z')
    expect(getLastExportTime()).toBe('2026-07-20T12:00:00.000Z')
  })

  it('exportIncrementalData 支持格式转换', async () => {
    const { exportIncrementalData } = await import('./data-port')
    mockData.sessions.push(session)
    const result = exportIncrementalData('2026-01-01T00:00:00.000Z', 'json')
    const parsed = JSON.parse(result)
    expect(parsed.sessions).toHaveLength(1)
  })

  // ---- 社区分享格式测试 ----

  it('exportCommunityShare 生成完整分享包', async () => {
    const { exportCommunityShare } = await import('./data-port')
    mockData.sessions.push(session)
    mockData.notes.push(note)

    const result = JSON.parse(exportCommunityShare({
      author: '测试用户',
      title: '我的专注周报',
      description: '一周专注数据分享',
      tags: ['专注', '周报'],
      version: '1.0.0',
    }))
    expect(result.formatVersion).toBe(2)
    expect(result.meta.author).toBe('测试用户')
    expect(result.meta.title).toBe('我的专注周报')
    expect(result.meta.tags).toEqual(['专注', '周报'])
    expect(result.payload.sessions).toHaveLength(1)
    expect(result.payload.notes).toHaveLength(1)
  })

  it('exportCommunityShare 支持指定域', async () => {
    const { exportCommunityShare } = await import('./data-port')
    mockData.sessions.push(session)
    mockData.notes.push(note)

    const result = JSON.parse(exportCommunityShare({
      author: '测试',
      title: '仅专注',
      description: '',
      tags: [],
      version: '1.0.0',
    }, ['sessions']))
    expect(result.payload.sessions).toHaveLength(1)
    expect(result.payload.notes).toBeUndefined()
  })

  it('importCommunityShare 导入有效分享包', async () => {
    const { exportCommunityShare, importCommunityShare } = await import('./data-port')
    mockData.sessions.push(session)

    const json = exportCommunityShare({
      author: 'A', title: 'T', description: 'D', tags: [], version: '1.0.0',
    })
    // 清空 sessions 以验证导入能正确新增
    mockData.sessions = []
    const result = importCommunityShare(json)
    expect(result).not.toBeNull()
    expect(result!.meta.author).toBe('A')
    expect(result!.meta.title).toBe('T')
    expect(result!.counts.sessions).toBe(1)
  })

  it('importCommunityShare 无效格式返回 null', async () => {
    const { importCommunityShare } = await import('./data-port')
    expect(importCommunityShare('{}')).toBeNull()
    expect(importCommunityShare(JSON.stringify({ formatVersion: 2 }))).toBeNull()
    expect(importCommunityShare(JSON.stringify({ formatVersion: 1, meta: {}, payload: {} }))).toBeNull()
    expect(importCommunityShare('invalid')).toBeNull()
  })
})