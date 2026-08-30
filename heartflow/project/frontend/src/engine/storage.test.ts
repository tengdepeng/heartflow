// ============================================================
// storage 单元测试
// ============================================================
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import type { FocusSession, TimeCrystal, JadeBeadCarrier, Constitution, AdvisorProfile, AppConfig, EmotionRecord, Note, LedgerRecord } from '../types'
import { DEFAULT_CONFIG, DEFAULT_ASTROLABE_CONFIG, DEFAULT_LIFECYCLE_CONFIG, DEFAULT_ADVISOR_CONFIG } from './storage/core'

// ---- localStorage mock ----
const STORAGE_KEY = 'heartflow:storage'

function createMockStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    _getStore: () => store,
    _setStore: (s: Record<string, string>) => { store = s },
  }
}

let mockLocalStorage: ReturnType<typeof createMockStorage>

/** 每个测试前重置缓存，保证 _schemaCache 干净 */
async function freshStorage() {
  mockLocalStorage = createMockStorage()
  ;(globalThis as any).localStorage = mockLocalStorage
  Object.defineProperty(globalThis, 'window', {
    value: { matchMedia: () => ({ matches: false }) },
    writable: true, configurable: true,
  })
  vi.resetModules()
  const { storage, invalidateCache } = await import('./storage')
  invalidateCache()
  return storage
}

afterEach(() => {
  delete (globalThis as any).localStorage
  delete (globalThis as any).window
})

// ---- 辅助工厂 ----
function makeSession(overrides?: Partial<FocusSession>): FocusSession {
  return {
    id: 'sess-1',
    status: 'idle',
    mode: 'focus',
    plannedDuration: 1500000,
    elapsed: 0,
    startedAt: null,
    pausedDuration: 0,
    pausedAt: null,
    completedAt: null,
    tags: [],
    note: '',
    carrierId: null,
    ...overrides,
  }
}

function makeCrystal(overrides?: Partial<TimeCrystal>): TimeCrystal {
  return {
    id: 'cry-1',
    sessionId: 'sess-1',
    color: '#ff6b6b',
    intensity: 0.8,
    createdAt: new Date().toISOString(),
    shape: 'sphere',
    tags: [],
    insight: null,
    ...overrides,
  }
}

function makeCarrier(overrides?: Partial<JadeBeadCarrier>): JadeBeadCarrier {
  return {
    id: 'carrier-1',
    name: '测试载体',
    type: 'jade-bead',
    beadCount: 0,
    maxBeads: 108,
    segment: 1,
    colors: { primary: '#1a1a2e', secondary: '#16213e', accent: '#0f3460' },
    active: true,
    advisorId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    lifecycleStage: 'newborn',
    lastUsedAt: null,
    usageCount: 0,
    inheritedTo: null,
    inheritedFrom: null,
    ...overrides,
  }
}

function makeConstitution(overrides?: Partial<Constitution>): Constitution {
  return {
    version: '1.0',
    name: '测试宪法',
    preamble: '测试序言',
    immutableRules: [],
    mutableRules: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeAdvisor(overrides?: Partial<AdvisorProfile>): AdvisorProfile {
  return {
    id: 'adv-1',
    name: '测试幕僚',
    role: 'hermit',
    personality: 'steady',
    state: 'slumber',
    affinity: 0,
    level: 1,
    totalInteractions: 0,
    createdAt: new Date().toISOString(),
    lastActiveAt: null,
    unlocked: true,
    ...overrides,
  }
}

function makeEmotion(overrides?: Partial<EmotionRecord>): EmotionRecord {
  return {
    id: 'emo-1',
    type: 'happy',
    note: '',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeNote(overrides?: Partial<Note>): Note {
  return {
    id: 'note-1',
    title: '测试笔记',
    content: '测试内容',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeLedgerRecord(overrides?: Partial<LedgerRecord>): LedgerRecord {
  return {
    id: 'ledger-1',
    type: 'income',
    category: 'salary',
    amount: 10000,
    note: '测试账目',
    at: new Date().toISOString(),
    ...overrides,
  }
}

// ============================================================
describe('storage 模块 · 默认值', () => {
  it('getConfig 应返回默认配置', async () => {
    const storage = await freshStorage()
    const config = storage.getConfig()
    expect(config.theme).toBe('dark')
    expect(config.timer.defaultDuration).toBe(25)
    expect(config.activeStylePack).toBe('default-gravity')
    expect(config.locale).toBe('zh-CN')
    expect(config.background.type).toBe('default')
  }, 15000)

  it('getSessions 应返回空数组', async () => {
    const storage = await freshStorage()
    expect(storage.getSessions()).toEqual([])
  })

  it('getCrystals 应返回空数组', async () => {
    const storage = await freshStorage()
    expect(storage.getCrystals()).toEqual([])
  })

  it('getCarriers 应返回空数组', async () => {
    const storage = await freshStorage()
    expect(storage.getCarriers()).toEqual([])
  })

  it('getConstitution 应返回 null', async () => {
    const storage = await freshStorage()
    expect(storage.getConstitution()).toBeNull()
  })

  it('getAdvisors 应返回空数组', async () => {
    const storage = await freshStorage()
    expect(storage.getAdvisors()).toEqual([])
  })

  it('getEmotions 应返回空数组', async () => {
    const storage = await freshStorage()
    expect(storage.getEmotions()).toEqual([])
  })

  it('getNotes 应返回空数组', async () => {
    const storage = await freshStorage()
    expect(storage.getNotes()).toEqual([])
  })

  it('getActiveStylePack 首次应返回默认值', async () => {
    const storage = await freshStorage()
    // 默认配置中 activeStylePack 为 'default-gravity'
    expect(storage.getActiveStylePack()).toBe('default-gravity')
  })

  it('getPluginRegistry 应返回空对象', async () => {
    const storage = await freshStorage()
    expect(storage.getPluginRegistry()).toEqual({})
  })
})

// ============================================================
describe('storage 模块 · Config 读写', () => {
  it('setConfig 后 getConfig 应返回更新后的配置', async () => {
    const storage = await freshStorage()
    const newConfig: AppConfig = {
      theme: 'light',
      activeStylePack: 'custom-pack',
      timer: { defaultDuration: 50, breakDuration: 10, longBreakDuration: 30, sessionsBeforeLongBreak: 2, autoStart: true },
      interaction: { keyboardShortcuts: false, hapticFeedback: true, soundEnabled: false },
      locale: 'en-US',
      advisorEnabled: true,
      advisorResetDate: null,
      lastVisitDate: null,
      background: {
        type: 'image',
        presetScene: 'none',
        dataUrl: 'data:image/png;base64,abc',
        mimeType: 'image/png',
        fileName: 'calm.png',
        updatedAt: '2026-07-15T00:00:00.000Z',
      },
      gestures: { ...DEFAULT_CONFIG.gestures },
      transitionDuration: 350,
      stats: { showPanel: true, showTrendChart: true, dailyGoal: 120, weeklyGoal: 600 },
      astrolabe: { ...DEFAULT_ASTROLABE_CONFIG },
      lifecycle: { ...DEFAULT_LIFECYCLE_CONFIG },
      advisor: { ...DEFAULT_ADVISOR_CONFIG },
      health: { exerciseTarget: 150, sleepTarget: 7, sleepMinThreshold: 6, sleepCriticalThreshold: 5, sleepExcellentThreshold: 7.5 },
      worklog: { overtimeRate: 1.5, nightRate: 1.3, defaultStart: '09:00', defaultEnd: '18:00', trendDays: 30, trendMonths: 6, recentShiftLimit: 15 },
      display: { ...DEFAULT_CONFIG.display },
      visualization: { ...DEFAULT_CONFIG.visualization },
      sanctuaryExitDuration: DEFAULT_CONFIG.sanctuaryExitDuration,
      automationHistoryLimit: DEFAULT_CONFIG.automationHistoryLimit,
      craft: { ...DEFAULT_CONFIG.craft },
      ai: { ...DEFAULT_CONFIG.ai },
      complianceOverride: {
        forbiddenPatterns: false,
        notificationBlocked: true,
        advisorEnabled: false,
        comparativePhrases: false,
        personification: false,
        autoStartOverwrite: false,
        hapticFeedbackOverwrite: false,
        dataDriven: false,
        allowExternalAI: false,
      },
      operationMode: DEFAULT_CONFIG.operationMode,
      appBrandIcon: null,
      worldShell: structuredClone(DEFAULT_CONFIG.worldShell),
      overrideUserTouched: [],
    }
    storage.setConfig(newConfig)
    expect(storage.getConfig()).toEqual(newConfig)
  })

  it('setConfig 应持久化到 localStorage', async () => {
    const storage = await freshStorage()
    const newConfig: AppConfig = {
      theme: 'system',
      activeStylePack: 'test',
      timer: { defaultDuration: 15, breakDuration: 5, longBreakDuration: 20, sessionsBeforeLongBreak: 6, autoStart: false },
      interaction: { keyboardShortcuts: true, hapticFeedback: false, soundEnabled: true },
      locale: 'ja-JP',
      advisorEnabled: true,
      advisorResetDate: null,
      lastVisitDate: null,
      background: {
        type: 'video',
        presetScene: 'none',
        dataUrl: 'data:video/mp4;base64,abc',
        mimeType: 'video/mp4',
        fileName: 'night.mp4',
        updatedAt: '2026-07-15T00:00:00.000Z',
      },
      gestures: { ...DEFAULT_CONFIG.gestures },
      transitionDuration: 350,
      stats: { showPanel: true, showTrendChart: true, dailyGoal: 120, weeklyGoal: 600 },
      astrolabe: { ...DEFAULT_ASTROLABE_CONFIG },
      lifecycle: { ...DEFAULT_LIFECYCLE_CONFIG },
      advisor: { ...DEFAULT_ADVISOR_CONFIG },
      health: { exerciseTarget: 150, sleepTarget: 7, sleepMinThreshold: 6, sleepCriticalThreshold: 5, sleepExcellentThreshold: 7.5 },
      worklog: { overtimeRate: 1.5, nightRate: 1.3, defaultStart: '09:00', defaultEnd: '18:00', trendDays: 30, trendMonths: 6, recentShiftLimit: 15 },
      display: { ...DEFAULT_CONFIG.display },
      visualization: { ...DEFAULT_CONFIG.visualization },
      sanctuaryExitDuration: DEFAULT_CONFIG.sanctuaryExitDuration,
      automationHistoryLimit: DEFAULT_CONFIG.automationHistoryLimit,
      craft: { ...DEFAULT_CONFIG.craft },
      ai: { ...DEFAULT_CONFIG.ai },
      complianceOverride: {
        forbiddenPatterns: false,
        notificationBlocked: true,
        advisorEnabled: false,
        comparativePhrases: false,
        personification: false,
        autoStartOverwrite: false,
        hapticFeedbackOverwrite: false,
        dataDriven: false,
        allowExternalAI: false,
      },
      operationMode: DEFAULT_CONFIG.operationMode,
      appBrandIcon: null,
      worldShell: structuredClone(DEFAULT_CONFIG.worldShell),
      overrideUserTouched: [],
    }
    storage.setConfig(newConfig)
    const saved = JSON.parse(mockLocalStorage.getItem(STORAGE_KEY)!)
    expect(saved.config).toEqual(newConfig)
  })
})

// ============================================================
describe('storage 模块 · Session 读写', () => {
  it('addSession 应追加一条记录', async () => {
    const storage = await freshStorage()
    storage.addSession(makeSession())
    expect(storage.getSessions()).toHaveLength(1)
    expect(storage.getSessions()[0].id).toBe('sess-1')
  })

  it('addSession 应支持多条记录', async () => {
    const storage = await freshStorage()
    storage.addSession(makeSession({ id: 's1' }))
    storage.addSession(makeSession({ id: 's2' }))
    expect(storage.getSessions()).toHaveLength(2)
  })

  it('updateSession 应更新指定字段', async () => {
    const storage = await freshStorage()
    const s = makeSession({ id: 'sess-update' })
    storage.addSession(s)
    storage.updateSession('sess-update', { status: 'completed', completedAt: '2025-01-01T00:00:00Z' })
    const updated = storage.getSessions().find(x => x.id === 'sess-update')
    expect(updated?.status).toBe('completed')
    expect(updated?.completedAt).toBe('2025-01-01T00:00:00Z')
    // 未更新的字段应保留
    expect(updated?.mode).toBe('focus')
  })

  it('updateSession 对不存在的 id 应静默忽略', async () => {
    const storage = await freshStorage()
    expect(() => storage.updateSession('nonexistent', { status: 'completed' })).not.toThrow()
  })
})

// ============================================================
describe('storage 模块 · TimeCrystal 读写', () => {
  it('addCrystal 应追加一条结晶', async () => {
    const storage = await freshStorage()
    storage.addCrystal(makeCrystal())
    expect(storage.getCrystals()).toHaveLength(1)
    expect(storage.getCrystals()[0].id).toBe('cry-1')
  })

  it('addCrystal 应支持多条结晶', async () => {
    const storage = await freshStorage()
    storage.addCrystal(makeCrystal({ id: 'c1' }))
    storage.addCrystal(makeCrystal({ id: 'c2' }))
    expect(storage.getCrystals()).toHaveLength(2)
  })
})

// ============================================================
describe('storage 模块 · JadeBeadCarrier 读写', () => {
  it('setCarriers 应覆盖载体列表', async () => {
    const storage = await freshStorage()
    const carriers = [makeCarrier({ id: 'c1' }), makeCarrier({ id: 'c2' })]
    storage.setCarriers(carriers)
    expect(storage.getCarriers()).toHaveLength(2)
    expect(storage.getCarriers()[0].id).toBe('c1')
  })

  it('setCarriers 应替换全部记录', async () => {
    const storage = await freshStorage()
    storage.setCarriers([makeCarrier({ id: 'c1' })])
    storage.setCarriers([makeCarrier({ id: 'c2' })])
    expect(storage.getCarriers()).toHaveLength(1)
    expect(storage.getCarriers()[0].id).toBe('c2')
  })
})

// ============================================================
describe('storage 模块 · Constitution 读写', () => {
  it('setConstitution 后 getConstitution 应返回保存的宪法', async () => {
    const storage = await freshStorage()
    storage.setConstitution(makeConstitution({ name: '我的宪法' }))
    expect(storage.getConstitution()?.name).toBe('我的宪法')
  })

  it('setConstitution 应覆盖之前的值', async () => {
    const storage = await freshStorage()
    storage.setConstitution(makeConstitution({ name: '旧宪法' }))
    storage.setConstitution(makeConstitution({ name: '新宪法' }))
    expect(storage.getConstitution()?.name).toBe('新宪法')
  })
})

// ============================================================
describe('storage 模块 · Advisor 读写', () => {
  it('setAdvisors 后 getAdvisors 应返回列表', async () => {
    const storage = await freshStorage()
    storage.setAdvisors([makeAdvisor({ id: 'a1' }), makeAdvisor({ id: 'a2' })])
    expect(storage.getAdvisors()).toHaveLength(2)
  })

  it('setAdvisors 应替换全部记录', async () => {
    const storage = await freshStorage()
    storage.setAdvisors([makeAdvisor({ id: 'a1' })])
    storage.setAdvisors([makeAdvisor({ id: 'a2' })])
    expect(storage.getAdvisors()).toHaveLength(1)
  })
})

// ============================================================
describe('storage 模块 · EmotionRecord 读写', () => {
  it('setEmotions 后 getEmotions 应返回相同数据', async () => {
    const storage = await freshStorage()
    const emotions = [makeEmotion({ id: 'e1', type: 'calm' }), makeEmotion({ id: 'e2', type: 'anxious' })]
    storage.setEmotions(emotions)
    expect(storage.getEmotions()).toEqual(emotions)
  })

  it('setEmotions 应替换全部数据', async () => {
    const storage = await freshStorage()
    storage.setEmotions([makeEmotion({ id: 'e1' })])
    storage.setEmotions([makeEmotion({ id: 'e2' })])
    expect(storage.getEmotions()).toHaveLength(1)
  })
})

// ============================================================
describe('storage 模块 · Note 读写', () => {
  it('setNotes 后 getNotes 应返回相同数据', async () => {
    const storage = await freshStorage()
    const notes = [makeNote({ id: 'n1', title: 'A' }), makeNote({ id: 'n2', title: 'B' })]
    storage.setNotes(notes)
    expect(storage.getNotes()).toEqual(notes)
  })

  it('setNotes 应替换全部数据', async () => {
    const storage = await freshStorage()
    storage.setNotes([makeNote({ id: 'n1' })])
    storage.setNotes([makeNote({ id: 'n2' })])
    expect(storage.getNotes()).toHaveLength(1)
  })
})

// ============================================================
describe('storage 模块 · ActiveStylePack 读写', () => {
  it('setActiveStylePack 后 getActiveStylePack 应返回保存的 ID', async () => {
    const storage = await freshStorage()
    storage.setActiveStylePack('my-style')
    expect(storage.getActiveStylePack()).toBe('my-style')
  })

  it('setActiveStylePack 应覆盖之前的值', async () => {
    const storage = await freshStorage()
    storage.setActiveStylePack('old')
    storage.setActiveStylePack('new')
    expect(storage.getActiveStylePack()).toBe('new')
  })
})

// ============================================================
describe('storage 模块 · PluginRegistry 读写', () => {
  it('setPluginRegistry 后 getPluginRegistry 应返回保存的数据', async () => {
    const storage = await freshStorage()
    const registry = { 'plugin-a': { enabled: true, permissions: ['read'] } }
    storage.setPluginRegistry(registry)
    expect(storage.getPluginRegistry()).toEqual(registry)
  })

  it('setPluginRegistry 应替换全部数据', async () => {
    const storage = await freshStorage()
    storage.setPluginRegistry({ 'p1': { enabled: true, permissions: [] } })
    storage.setPluginRegistry({ 'p2': { enabled: false, permissions: ['write'] } })
    expect(storage.getPluginRegistry()).toEqual({ 'p2': { enabled: false, permissions: ['write'] } })
  })
})

// ============================================================
describe('storage 模块 · 混合操作', () => {
  it('多种数据类型共存时读写互不干扰', async () => {
    const storage = await freshStorage()
    storage.addSession(makeSession({ id: 's1' }))
    storage.addCrystal(makeCrystal({ id: 'c1' }))
    storage.setCarriers([makeCarrier({ id: 'car1' })])
    storage.setConstitution(makeConstitution({ name: '宪法' }))
    storage.setAdvisors([makeAdvisor({ id: 'a1' })])
    storage.setEmotions([makeEmotion({ id: 'e1' })])
    storage.setNotes([makeNote({ id: 'n1' })])

    expect(storage.getSessions()).toHaveLength(1)
    expect(storage.getCrystals()).toHaveLength(1)
    expect(storage.getCarriers()).toHaveLength(1)
    expect(storage.getConstitution()?.name).toBe('宪法')
    expect(storage.getAdvisors()).toHaveLength(1)
    expect(storage.getEmotions()).toHaveLength(1)
    expect(storage.getNotes()).toHaveLength(1)
  })
})

// ============================================================
describe('storage 模块 · 持久化', () => {
  it('写入操作应调用 localStorage.setItem', async () => {
    const storage = await freshStorage()
    storage.addSession(makeSession())
    expect(mockLocalStorage.setItem).toHaveBeenCalled()
  })

  it('首次读取应调用 localStorage.getItem', async () => {
    const storage = await freshStorage()
    storage.getConfig()
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY)
  })
})

// ============================================================
describe('storage 模块 · clear', () => {
  it('clear 应移除 localStorage 中的数据并重置缓存', async () => {
    const storage = await freshStorage()
    storage.addSession(makeSession())
    storage.setActiveStylePack('test')
    storage.clear()
    // clear 后应返回默认值（缓存已重置）
    expect(storage.getSessions()).toEqual([])
    expect(storage.getActiveStylePack()).toBe('default-gravity')
    expect(storage.getConfig().theme).toBe('dark')
  })

  it('clear 后 localStorage 应无数据', async () => {
    const storage = await freshStorage()
    storage.addSession(makeSession())
    storage.clear()
    expect(mockLocalStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

// ============================================================
describe('storage 模块 · 错误处理', () => {
  it('localStorage 数据损坏时应返回默认值', async () => {
    const storage = await freshStorage()
    mockLocalStorage._setStore({ [STORAGE_KEY]: 'invalid json!!!' })
    expect(storage.getConfig().theme).toBe('dark')
    expect(storage.getSessions()).toEqual([])
  })

  it('localStorage.setItem 失败时应静默捕获', async () => {
    const storage = await freshStorage()
    mockLocalStorage.setItem = vi.fn(() => { throw new Error('QuotaExceededError') })
    expect(() => storage.addSession(makeSession())).not.toThrow()
  })
})

// ============================================================
describe('storage 模块 · 版本迁移', () => {
  it('旧版本数据应被迁移到当前版本并移除 position', async () => {
    const storage = await freshStorage()
    // 模拟 v1 数据结构
    const oldData = {
      version: 1,
      sessions: [],
      crystals: [{
        id: 'c1',
        sessionId: 's1',
        color: '#fff',
        intensity: 0.5,
        createdAt: '2025-01-01T00:00:00Z',
        shape: 'sphere' as const,
        tags: [],
        insight: null,
        position: { x: 0, y: 0 },
      }],
      carriers: [],
      constitution: null,
      advisors: [],
      config: {
        theme: 'dark',
        activeStylePack: 'default-gravity',
        timer: { defaultDuration: 25, breakDuration: 5, longBreakDuration: 15, sessionsBeforeLongBreak: 4, autoStart: false },
        interaction: { keyboardShortcuts: true, hapticFeedback: false, soundEnabled: true },
        locale: 'zh-CN',
      },
      emotions: [],
      notes: [],
    }
    mockLocalStorage._setStore({ [STORAGE_KEY]: JSON.stringify(oldData) })

    const crystals = storage.getCrystals()
    expect(crystals).toHaveLength(1)
    // position 字段应被迁移移除
    expect((crystals[0] as any).position).toBeUndefined()
  })

  it('旧配置缺少新字段时应合并默认值', async () => {
    const storage = await freshStorage()
    // 旧数据不含 advisorEnabled / advisorResetDate / lastVisitDate
    const oldData = {
      version: 1,
      sessions: [],
      crystals: [],
      carriers: [],
      constitution: null,
      advisors: [],
      config: {
        theme: 'light',
        activeStylePack: 'ocean',
        timer: { defaultDuration: 30, breakDuration: 10, longBreakDuration: 20, sessionsBeforeLongBreak: 3, autoStart: true },
        interaction: { keyboardShortcuts: false, hapticFeedback: true, soundEnabled: false },
        locale: 'en-US',
      },
      emotions: [],
      notes: [],
      anchors: [],
      goals: [],
      relations: [],
      advisorMessages: [],
    }
    mockLocalStorage._setStore({ [STORAGE_KEY]: JSON.stringify(oldData) })

    const config = storage.getConfig()
    // 旧数据已有的值应保留
    expect(config.theme).toBe('light')
    expect(config.activeStylePack).toBe('ocean')
    expect(config.locale).toBe('en-US')
    // 旧数据缺失的新字段应补上默认值
    expect(config.advisorEnabled).toBe(false)
    expect(config.advisorResetDate).toBeNull()
    expect(config.lastVisitDate).toBeNull()
  })

  it('旧配置完全缺失时应回退全部默认配置', async () => {
    const storage = await freshStorage()
    const oldData = {
      version: 1,
      sessions: [],
      crystals: [],
      carriers: [],
      constitution: null,
      advisors: [],
      // config 字段完全缺失
      emotions: [],
      notes: [],
      anchors: [],
      goals: [],
      relations: [],
      advisorMessages: [],
    }
    mockLocalStorage._setStore({ [STORAGE_KEY]: JSON.stringify(oldData) })

    const config = storage.getConfig()
    expect(config.theme).toBe('dark')
    expect(config.activeStylePack).toBe('default-gravity')
    expect(config.timer.defaultDuration).toBe(25)
    expect(config.advisorEnabled).toBe(false)
    expect(config.advisorResetDate).toBeNull()
    expect(config.lastVisitDate).toBeNull()
    expect(config.locale).toBe('zh-CN')
  })

  it('用户自定义配置值在迁移中不被覆盖', async () => {
    const storage = await freshStorage()
    const oldData = {
      version: 1,
      sessions: [],
      crystals: [],
      carriers: [],
      constitution: null,
      advisors: [],
      config: {
        theme: 'custom-dark',
        activeStylePack: 'my-pack',
        locale: 'ja-JP',
        advisorEnabled: false,  // 用户明确关闭
      },
      emotions: [],
      notes: [],
      anchors: [],
      goals: [],
      relations: [],
      advisorMessages: [],
    }
    mockLocalStorage._setStore({ [STORAGE_KEY]: JSON.stringify(oldData) })

    const config = storage.getConfig()
    // 用户设置的值应保留
    expect(config.theme).toBe('custom-dark')
    expect(config.activeStylePack).toBe('my-pack')
    expect(config.locale).toBe('ja-JP')
    expect(config.advisorEnabled).toBe(false)
    // 未提供的字段应取默认值
    expect(config.advisorResetDate).toBeNull()
    expect(config.lastVisitDate).toBeNull()
    expect(config.timer.defaultDuration).toBe(25)
  })
})

// ============================================================
describe('storage 模块 · 内部缓存', () => {
  it('重复读取不应重复调用 localStorage.getItem', async () => {
    const storage = await freshStorage()
    // 首次调用触发加载
    storage.getConfig()
    expect(mockLocalStorage.getItem).toHaveBeenCalledTimes(1)

    // 后续读取走缓存
    storage.getConfig()
    storage.getSessions()
    storage.getCrystals()
    expect(mockLocalStorage.getItem).toHaveBeenCalledTimes(1)
  })

  it('写入操作后应重新读取 localStorage', async () => {
    const storage = await freshStorage()
    storage.getConfig() // 缓存命中
    mockLocalStorage.getItem.mockClear()

    storage.addSession(makeSession())
    // 写入后缓存失效，下次读取应重新加载
    mockLocalStorage.getItem.mockClear()
    storage.getSessions()
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY)
  })
})

// ============================================================
describe('storage 模块 · 响应式变更通知', () => {
  it('每次写入和清空都会递增存储版本', async () => {
    await freshStorage()
    const { storage, storageVersion } = await import('./storage')
    const initial = storageVersion.value
    storage.addSession(makeSession())
    expect(storageVersion.value).toBe(initial + 1)
    storage.clear()
    expect(storageVersion.value).toBe(initial + 2)
  })
})

// ============================================================
describe('storage 模块 · Ledger 读写', () => {
  it('getLedger 默认返回空数组', async () => {
    const storage = await freshStorage()
    expect(storage.getLedger()).toEqual([])
  })

  it('addLedgerRecord 应追加一条记录', async () => {
    const storage = await freshStorage()
    const r = makeLedgerRecord()
    storage.addLedgerRecord(r)
    expect(storage.getLedger()).toHaveLength(1)
    expect(storage.getLedger()[0].id).toBe('ledger-1')
  })

  it('addLedgerRecord 可追加多条', async () => {
    const storage = await freshStorage()
    storage.addLedgerRecord(makeLedgerRecord({ id: 'a' }))
    storage.addLedgerRecord(makeLedgerRecord({ id: 'b' }))
    expect(storage.getLedger()).toHaveLength(2)
  })

  it('removeLedgerRecord 应按 id 删除', async () => {
    const storage = await freshStorage()
    storage.addLedgerRecord(makeLedgerRecord({ id: 'r1' }))
    storage.addLedgerRecord(makeLedgerRecord({ id: 'r2' }))
    storage.removeLedgerRecord('r1')
    expect(storage.getLedger()).toHaveLength(1)
    expect(storage.getLedger()[0].id).toBe('r2')
  })

  it('removeLedgerRecord 删除不存在的 id 应静默', async () => {
    const storage = await freshStorage()
    expect(() => storage.removeLedgerRecord('nonexistent')).not.toThrow()
  })

  it('写入后应从 localStorage 持久化', async () => {
    const storage = await freshStorage()
    storage.addLedgerRecord(makeLedgerRecord())
    storage.addLedgerRecord(makeLedgerRecord({ id: 'r2' }))
    const saved = JSON.parse(mockLocalStorage._getStore()[STORAGE_KEY])
    expect(saved.ledger).toHaveLength(2)
  })
})

// ============================================================
describe('storage 模块 · initStorage / 后端', () => {
  beforeEach(() => {
    mockLocalStorage = createMockStorage()
    ;(globalThis as any).localStorage = mockLocalStorage
    vi.resetModules()
  })

  it('getStorageBackend 应返回后端名称', async () => {
    // 默认无 Tauri 环境 → localStorage
    const { getStorageBackend } = await import('./storage')
    expect(getStorageBackend()).toBe('localStorage')
  })

  it('initStorage 应初始化缓存（预热）', async () => {
    const { initStorage, storage: s } = await import('./storage')
    await initStorage()
    // 预热后读取应走缓存
    expect(s.getConfig().theme).toBe('dark')
  })

  it('initStorage 后 invalidateCache 应清除缓存', async () => {
    const { initStorage, invalidateCache, storage: s } = await import('./storage')
    await initStorage()
    s.getConfig() // 缓存命中
    invalidateCache()
    // 缓存清除后再次读取应调用 localStorage
    mockLocalStorage.getItem.mockClear()
    s.getConfig()
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY)
  })
})
