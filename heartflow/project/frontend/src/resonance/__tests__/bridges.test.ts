// ============================================================
// 共鸣协议层 · 桥接器测试
// 测试所有桥接 composable 的导出和接口
// bridges: constitution, config, timer, health, anchor, emotion,
//          style, plugin, runtime, advisor, note
// ============================================================

import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

// ============================================================
// 共享 mock：Pinia storeToRefs
// ============================================================

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store: any) => {
      const result: Record<string, any> = {}
      for (const key of Object.keys(store)) {
        if (key.startsWith('$') || key.startsWith('_')) continue
        const val = store[key]
        result[key] = val && typeof val === 'object' && 'value' in val ? val : ref(val)
      }
      return result
    },
  }
})

// ============================================================
// Mock: constitution store
// ============================================================

vi.mock('../../stores/constitution', () => ({
  useConstitutionStore: () => ({
    constitution: ref({ articles: [] }),
    immutableRules: ref([]),
    mutableRules: ref([]),
    name: ref('宪法'),
    version: ref('1.0.0'),
    preamble: ref('前言'),
    createdAt: ref('2024-01-01'),
    updatedAt: ref('2024-06-01'),
    enabledMutableCount: ref(0),
    totalMutableCount: ref(0),
    addRule: vi.fn(),
    updateRule: vi.fn(),
    removeRule: vi.fn(),
    toggleRule: vi.fn(),
    reorderRules: vi.fn(),
    renumberArticles: vi.fn(),
    canTrack: vi.fn(() => true),
    initTracking: vi.fn(),
    trackOnce: vi.fn(),
    resetTracking: vi.fn(),
    exportConstitution: vi.fn(),
    importConstitution: vi.fn(),
    resetToDefaults: vi.fn(),
    getRandomMantra: vi.fn(() => '今日咒语'),
  }),
}))

// ============================================================
// Mock: config store
// ============================================================

vi.mock('../../stores/config', () => ({
  useConfigStore: () => ({
    config: ref({ theme: 'dark', timer: { duration: 25 }, advisorEnabled: true }),
    updateTheme: vi.fn(),
    updateTimer: vi.fn(),
    updateAdvisorEnabled: vi.fn(),
    updateBackgroundMedia: vi.fn(),
    resetBackgroundMedia: vi.fn(),
    setPresetScene: vi.fn(),
    getScenePresets: vi.fn(() => []),
    saveCurrentAsPreset: vi.fn(),
    applyScenePreset: vi.fn(),
    deleteScenePreset: vi.fn(),
    renameScenePreset: vi.fn(),
    updateGestureBinding: vi.fn(),
    replaceGestureBindings: vi.fn(),
    updateStats: vi.fn(),
    updateTransitionDuration: vi.fn(),
    updateVisualization: vi.fn(),
    updateComplianceOverride: vi.fn(),
  }),
}))

// ============================================================
// Mock: timer store
// ============================================================

vi.mock('../../stores/timer', () => ({
  useTimerStore: () => ({
    session: ref({ plannedDuration: 1500000, mode: 'focus' }),
    elapsed: ref(0),
    isRunning: ref(false),
    progress: ref(0),
    display: ref('25:00'),
    isFocusing: ref(false),
    isPaused: ref(false),
    isCompleted: ref(false),
    isIdle: ref(true),
    longBreakDue: ref(false),
    todayCompletedCount: 0,
    setMode: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    finish: vi.fn(),
    interrupt: vi.fn(),
    reset: vi.fn(),
    pauseForSanctuary: vi.fn(),
    resumeFromSanctuary: vi.fn(),
  }),
}))

// ============================================================
// Mock: health store
// ============================================================

vi.mock('../../stores/health', () => ({
  useHealthStore: () => ({
    bodyLogs: ref([]),
    cycleData: ref([]),
    bodyNotes: ref([]),
    senseNotes: ref([]),
    sutraNotes: ref([]),
    meridianLogs: ref([]),
    wisdomLogs: ref([]),
    readingLogs: ref([]),
    guardHeartRateLogs: ref([]),
    thisWeekExerciseMinutes: ref(0),
    thisWeekSleepAvg: ref(0),
    addBodyLog: vi.fn(),
    persistBodyLogs: vi.fn(),
    logCycle: vi.fn(),
    persistCycle: vi.fn(),
    addBodyNote: vi.fn(),
    addSenseNote: vi.fn(),
    addSutraNote: vi.fn(),
    recordMeridianFeeling: vi.fn(),
    getMeridianFeeling: vi.fn(),
    addWisdomLog: vi.fn(),
    addReadingLog: vi.fn(),
    removeReadingLog: vi.fn(),
    persistReadingLogs: vi.fn(),
    addGuardHeartRateLog: vi.fn(),
    recentLogs: vi.fn(() => []),
  }),
}))

// ============================================================
// Mock: anchor module
// ============================================================

vi.mock('../../modules/anchor', () => ({
  useAnchor: () => ({
    anchors: ref([]),
    todayAnchors: ref([]),
    poolAnchors: ref([]),
    pending: ref([]),
    done: ref([]),
    allAnchors: ref([]),
    load: vi.fn(),
    add: vi.fn(),
    addRaw: vi.fn(),
    update: vi.fn(),
    editField: vi.fn(),
    markDone: vi.fn(),
    markUndone: vi.fn(),
    toggleDone: vi.fn(),
    remove: vi.fn(),
    setPriority: vi.fn(),
    addTag: vi.fn(),
    removeTag: vi.fn(),
    driftPending: vi.fn(),
    addToPool: vi.fn(),
    placeFromPool: vi.fn(),
    placeAllFromPool: vi.fn(),
    returnToPool: vi.fn(),
    postponeToTomorrow: vi.fn(),
    getAnchorsByScale: vi.fn(() => []),
    getAllTags: vi.fn(() => []),
    getTagTrend: vi.fn(() => []),
    getCategories: vi.fn(() => []),
  }),
}))

// ============================================================
// Mock: emotion module
// ============================================================

vi.mock('../../modules/emotion', () => ({
  useEmotionGarden: () => ({
    records: ref([]),
    counts: ref({}),
    load: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
    recent: vi.fn(() => []),
    getAmbientMood: vi.fn(() => 'neutral'),
  }),
}))

// ============================================================
// Mock: style store
// ============================================================

vi.mock('../../stores/style', () => ({
  useStyleStore: () => ({
    packs: ref([]),
    activeId: ref(null),
    activePack: ref(null),
    installedPacks: ref([]),
    init: vi.fn(),
    activate: vi.fn(),
    exportPack: vi.fn(),
    createFromBaseColor: vi.fn(),
    importPack: vi.fn(),
  }),
}))

// ============================================================
// Mock: plugin store
// ============================================================

vi.mock('../../stores/plugin', () => ({
  usePluginStore: () => ({
    plugins: ref([]),
    initialized: ref(false),
    enabledPlugins: ref([]),
    disabledPlugins: ref([]),
    officialPlugins: ref([]),
    communityPlugins: ref([]),
    experimentalPlugins: ref([]),
    init: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    toggle: vi.fn(),
    installPlugin: vi.fn(),
    uninstallPlugin: vi.fn(),
  }),
}))

// ============================================================
// Mock: advisor store
// ============================================================

vi.mock('../../stores/advisor', () => ({
  useAdvisorStore: () => ({
    messages: ref([]),
    currentBubble: ref(null),
    affinityMap: ref({}),
    interactionCountMap: ref({}),
    advisors: ref([]),
    refreshAdvisors: vi.fn(),
    getAdvisorById: vi.fn(),
    addAdvisorProfile: vi.fn(),
    updateAdvisorProfile: vi.fn(),
    removeAdvisorProfile: vi.fn(),
    getAffinityTier: vi.fn(),
    saveAffinity: vi.fn(),
    onAffinityMilestone: vi.fn(),
    getDingyinHammer: vi.fn(),
    triggerDingyinHammer: vi.fn(),
    getDingyinProgress: vi.fn(),
    getAllDingyinProgress: vi.fn(),
    getFourActs: vi.fn(),
    getFourActsProgress: vi.fn(),
    getTaskAwareness: vi.fn(),
    dispatchAvatar: vi.fn(),
    getTaskProgress: vi.fn(),
    getAnnualDialogue: vi.fn(),
    triggerAnnualDialogue: vi.fn(),
    getQuarterlyDialogue: vi.fn(),
    triggerQuarterlyDialogue: vi.fn(),
    witness: vi.fn(),
    witnessAll: vi.fn(),
    getWitnessLog: vi.fn(),
    getWitnessSummary: vi.fn(),
    clearWitnessLog: vi.fn(),
    reply: vi.fn(),
    replySync: vi.fn(),
    getConversationContext: vi.fn(),
    retireAdvisor: vi.fn(),
    unretireAdvisor: vi.fn(),
    isRetired: vi.fn(),
    getActiveAdvisors: vi.fn(),
    getRetiredAdvisors: vi.fn(),
    say: vi.fn(),
    onFocusComplete: vi.fn(),
    onVisit: vi.fn(),
    onEmotionLogged: vi.fn(),
    onNoteCreated: vi.fn(),
    onReturn: vi.fn(),
    checkReturn: vi.fn(),
    onTap: vi.fn(),
    resetDaily: vi.fn(),
    getQuickStats: vi.fn(),
    pauseForSanctuary: vi.fn(),
    resumeFromSanctuary: vi.fn(),
  }),
}))

// ============================================================
// Mock: note module
// ============================================================

vi.mock('../../modules/note', () => ({
  useNote: () => ({
    allNotes: ref([]),
    allStickyNotes: ref([]),
    boardNotes: ref([]),
    noteCount: ref(0),
    archivedNotes: ref([]),
    deletedNotes: ref([]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    hardRemove: vi.fn(),
    restore: vi.fn(),
    clearTrash: vi.fn(),
    searchNotes: vi.fn(() => []),
    getRecentNotes: vi.fn(() => []),
    getNotesByTag: vi.fn(() => []),
    getNoteById: vi.fn(),
    getStickyById: vi.fn(),
    updateStickyPosition: vi.fn(),
    updateStickyMode: vi.fn(),
    togglePin: vi.fn(),
    updateStickyColor: vi.fn(),
    moveToSticky: vi.fn(),
    moveToBoard: vi.fn(),
    load: vi.fn(),
  }),
}))

// ============================================================
// 导入桥接模块
// ============================================================

import { useConstitution } from '../bridges/constitution'
import { useConfig } from '../bridges/config'
import { useTimer } from '../bridges/timer'
import { useHealth } from '../bridges/health'
import { useAnchorBridge } from '../bridges/anchor'
import { useEmotion } from '../bridges/emotion'
import { useStyle } from '../bridges/style'
import { usePlugin } from '../bridges/plugin'
import { useAdvisor } from '../bridges/advisor'
import { useNoteBridge } from '../bridges/note'

// ============================================================
// Constitution 桥接测试
// ============================================================

describe('Constitution 桥接', () => {
  it('应导出 useConstitution composable 函数', () => {
    expect(typeof useConstitution).toBe('function')
  })

  it('应返回响应式状态属性', () => {
    const bridge = useConstitution()
    expect(bridge).toBeDefined()
    expect(bridge.constitution).toBeDefined()
    expect(bridge.immutableRules).toBeDefined()
    expect(bridge.mutableRules).toBeDefined()
    expect(bridge.name).toBeDefined()
    expect(bridge.version).toBeDefined()
    expect(bridge.preamble).toBeDefined()
    expect(bridge.createdAt).toBeDefined()
    expect(bridge.updatedAt).toBeDefined()
    expect(bridge.enabledMutableCount).toBeDefined()
    expect(bridge.totalMutableCount).toBeDefined()
  })

  it('应返回 CRUD 方法', () => {
    const bridge = useConstitution()
    expect(typeof bridge.addRule).toBe('function')
    expect(typeof bridge.updateRule).toBe('function')
    expect(typeof bridge.removeRule).toBe('function')
    expect(typeof bridge.toggleRule).toBe('function')
    expect(typeof bridge.reorderRules).toBe('function')
    expect(typeof bridge.renumberArticles).toBe('function')
  })

  it('应返回追踪方法', () => {
    const bridge = useConstitution()
    expect(typeof bridge.canTrack).toBe('function')
    expect(typeof bridge.initTracking).toBe('function')
    expect(typeof bridge.trackOnce).toBe('function')
    expect(typeof bridge.resetTracking).toBe('function')
  })

  it('应返回导入导出方法', () => {
    const bridge = useConstitution()
    expect(typeof bridge.exportConstitution).toBe('function')
    expect(typeof bridge.importConstitution).toBe('function')
    expect(typeof bridge.resetToDefaults).toBe('function')
    expect(typeof bridge.getRandomMantra).toBe('function')
  })
})

// ============================================================
// Config 桥接测试
// ============================================================

describe('Config 桥接', () => {
  it('应导出 useConfig composable 函数', () => {
    expect(typeof useConfig).toBe('function')
  })

  it('应返回 config 状态', () => {
    const bridge = useConfig()
    expect(bridge.config).toBeDefined()
  })

  it('应返回主题/显示方法', () => {
    const bridge = useConfig()
    expect(typeof bridge.updateTheme).toBe('function')
    expect(typeof bridge.updateTimer).toBe('function')
    expect(typeof bridge.updateAdvisorEnabled).toBe('function')
  })

  it('应返回背景方法', () => {
    const bridge = useConfig()
    expect(typeof bridge.updateBackgroundMedia).toBe('function')
    expect(typeof bridge.resetBackgroundMedia).toBe('function')
    expect(typeof bridge.setPresetScene).toBe('function')
  })

  it('应返回场景预设方法', () => {
    const bridge = useConfig()
    expect(typeof bridge.getScenePresets).toBe('function')
    expect(typeof bridge.saveCurrentAsPreset).toBe('function')
    expect(typeof bridge.applyScenePreset).toBe('function')
    expect(typeof bridge.deleteScenePreset).toBe('function')
    expect(typeof bridge.renameScenePreset).toBe('function')
  })

  it('应返回手势方法', () => {
    const bridge = useConfig()
    expect(typeof bridge.updateGestureBinding).toBe('function')
    expect(typeof bridge.replaceGestureBindings).toBe('function')
  })
})

// ============================================================
// Timer 桥接测试
// ============================================================

describe('Timer 桥接', () => {
  it('应导出 useTimer composable 函数', () => {
    expect(typeof useTimer).toBe('function')
  })

  it('应返回响应式定时器状态', () => {
    const bridge = useTimer()
    expect(bridge.session).toBeDefined()
    expect(bridge.elapsed).toBeDefined()
    expect(bridge.isRunning).toBeDefined()
    expect(bridge.progress).toBeDefined()
    expect(bridge.display).toBeDefined()
    expect(bridge.isFocusing).toBeDefined()
    expect(bridge.isPaused).toBeDefined()
    expect(bridge.isCompleted).toBeDefined()
    expect(bridge.isIdle).toBeDefined()
    expect(bridge.longBreakDue).toBeDefined()
    expect(bridge.remainingSeconds).toBeDefined()
  })

  it('应返回 todayCompletedCount getter', () => {
    const bridge = useTimer()
    expect(typeof bridge.todayCompletedCount).toBe('number')
  })

  it('应返回控制方法', () => {
    const bridge = useTimer()
    expect(typeof bridge.setMode).toBe('function')
    expect(typeof bridge.start).toBe('function')
    expect(typeof bridge.pause).toBe('function')
    expect(typeof bridge.resume).toBe('function')
    expect(typeof bridge.finish).toBe('function')
    expect(typeof bridge.interrupt).toBe('function')
    expect(typeof bridge.reset).toBe('function')
    expect(typeof bridge.pauseForSanctuary).toBe('function')
    expect(typeof bridge.resumeFromSanctuary).toBe('function')
  })
})

// ============================================================
// Health 桥接测试
// ============================================================

describe('Health 桥接', () => {
  it('应导出 useHealth composable 函数', () => {
    expect(typeof useHealth).toBe('function')
  })

  it('应返回响应式健康数据', () => {
    const bridge = useHealth()
    expect(bridge.bodyLogs).toBeDefined()
    expect(bridge.cycleData).toBeDefined()
    expect(bridge.bodyNotes).toBeDefined()
    expect(bridge.senseNotes).toBeDefined()
    expect(bridge.sutraNotes).toBeDefined()
    expect(bridge.meridianLogs).toBeDefined()
    expect(bridge.wisdomLogs).toBeDefined()
    expect(bridge.readingLogs).toBeDefined()
    expect(bridge.guardHeartRateLogs).toBeDefined()
    expect(bridge.thisWeekExerciseMinutes).toBeDefined()
    expect(bridge.thisWeekSleepAvg).toBeDefined()
  })

  it('应返回身体日志方法', () => {
    const bridge = useHealth()
    expect(typeof bridge.addBodyLog).toBe('function')
    expect(typeof bridge.persistBodyLogs).toBe('function')
  })

  it('应返回经络方法', () => {
    const bridge = useHealth()
    expect(typeof bridge.recordMeridianFeeling).toBe('function')
    expect(typeof bridge.getMeridianFeeling).toBe('function')
  })
})

// ============================================================
// Anchor 桥接测试
// ============================================================

describe('Anchor 桥接', () => {
  it('应导出 useAnchorBridge composable 函数', () => {
    expect(typeof useAnchorBridge).toBe('function')
  })

  it('应返回响应式心锚数据', () => {
    const bridge = useAnchorBridge()
    expect(bridge.anchors).toBeDefined()
    expect(bridge.todayAnchors).toBeDefined()
    expect(bridge.poolAnchors).toBeDefined()
    expect(bridge.pending).toBeDefined()
    expect(bridge.done).toBeDefined()
    expect(bridge.allAnchors).toBeDefined()
  })

  it('应返回操作方法', () => {
    const bridge = useAnchorBridge()
    expect(typeof bridge.load).toBe('function')
    expect(typeof bridge.add).toBe('function')
    expect(typeof bridge.addRaw).toBe('function')
    expect(typeof bridge.update).toBe('function')
    expect(typeof bridge.editField).toBe('function')
    expect(typeof bridge.markDone).toBe('function')
    expect(typeof bridge.markUndone).toBe('function')
    expect(typeof bridge.toggleDone).toBe('function')
    expect(typeof bridge.remove).toBe('function')
  })

  it('应返回池操作方法', () => {
    const bridge = useAnchorBridge()
    expect(typeof bridge.addToPool).toBe('function')
    expect(typeof bridge.placeFromPool).toBe('function')
    expect(typeof bridge.placeAllFromPool).toBe('function')
    expect(typeof bridge.returnToPool).toBe('function')
    expect(typeof bridge.postponeToTomorrow).toBe('function')
  })

  it('应返回查询方法', () => {
    const bridge = useAnchorBridge()
    expect(typeof bridge.getAnchorsByScale).toBe('function')
    expect(typeof bridge.getAllTags).toBe('function')
    expect(typeof bridge.getTagTrend).toBe('function')
    expect(typeof bridge.getCategories).toBe('function')
  })
})

// ============================================================
// Emotion 桥接测试
// ============================================================

describe('Emotion 桥接', () => {
  it('应导出 useEmotion composable 函数', () => {
    expect(typeof useEmotion).toBe('function')
  })

  it('应返回响应式情绪数据', () => {
    const bridge = useEmotion()
    expect(bridge.records).toBeDefined()
    expect(bridge.counts).toBeDefined()
  })

  it('应返回情绪操作方法', () => {
    const bridge = useEmotion()
    expect(typeof bridge.load).toBe('function')
    expect(typeof bridge.add).toBe('function')
    expect(typeof bridge.remove).toBe('function')
    expect(typeof bridge.update).toBe('function')
    expect(typeof bridge.recent).toBe('function')
    expect(typeof bridge.getAmbientMood).toBe('function')
  })
})

// ============================================================
// Style 桥接测试
// ============================================================

describe('Style 桥接', () => {
  it('应导出 useStyle composable 函数', () => {
    expect(typeof useStyle).toBe('function')
  })

  it('应返回响应式风格数据', () => {
    const bridge = useStyle()
    expect(bridge.packs).toBeDefined()
    expect(bridge.activeId).toBeDefined()
    expect(bridge.activePack).toBeDefined()
    expect(bridge.installedPacks).toBeDefined()
  })

  it('应返回风格操作方法', () => {
    const bridge = useStyle()
    expect(typeof bridge.init).toBe('function')
    expect(typeof bridge.activate).toBe('function')
    expect(typeof bridge.exportPack).toBe('function')
    expect(typeof bridge.createFromBaseColor).toBe('function')
    expect(typeof bridge.importPack).toBe('function')
  })
})

// ============================================================
// Plugin 桥接测试
// ============================================================

describe('Plugin 桥接', () => {
  it('应导出 usePlugin composable 函数', () => {
    expect(typeof usePlugin).toBe('function')
  })

  it('应返回响应式插件数据', () => {
    const bridge = usePlugin()
    expect(bridge.plugins).toBeDefined()
    expect(bridge.initialized).toBeDefined()
    expect(bridge.enabledPlugins).toBeDefined()
    expect(bridge.disabledPlugins).toBeDefined()
    expect(bridge.officialPlugins).toBeDefined()
    expect(bridge.communityPlugins).toBeDefined()
    expect(bridge.experimentalPlugins).toBeDefined()
  })

  it('应返回插件管理方法', () => {
    const bridge = usePlugin()
    expect(typeof bridge.init).toBe('function')
    expect(typeof bridge.enable).toBe('function')
    expect(typeof bridge.disable).toBe('function')
    expect(typeof bridge.toggle).toBe('function')
    expect(typeof bridge.installPlugin).toBe('function')
    expect(typeof bridge.uninstallPlugin).toBe('function')
  })
})

// ============================================================
// Advisor 桥接测试
// ============================================================

describe('Advisor 桥接', () => {
  it('应导出 useAdvisor composable 函数', () => {
    expect(typeof useAdvisor).toBe('function')
  })

  it('应返回响应式幕僚数据', () => {
    const bridge = useAdvisor()
    expect(bridge.messages).toBeDefined()
    expect(bridge.currentBubble).toBeDefined()
    expect(bridge.affinityMap).toBeDefined()
    expect(bridge.interactionCountMap).toBeDefined()
    expect(bridge.advisors).toBeDefined()
  })

  it('应返回幕僚 CRUD 方法', () => {
    const bridge = useAdvisor()
    expect(typeof bridge.refreshAdvisors).toBe('function')
    expect(typeof bridge.getAdvisorById).toBe('function')
    expect(typeof bridge.addAdvisorProfile).toBe('function')
    expect(typeof bridge.updateAdvisorProfile).toBe('function')
    expect(typeof bridge.removeAdvisorProfile).toBe('function')
  })

  it('应返回定音锤方法', () => {
    const bridge = useAdvisor()
    expect(typeof bridge.getDingyinHammer).toBe('function')
    expect(typeof bridge.triggerDingyinHammer).toBe('function')
    expect(typeof bridge.getDingyinProgress).toBe('function')
    expect(typeof bridge.getAllDingyinProgress).toBe('function')
    expect(typeof bridge.getFourActs).toBe('function')
    expect(typeof bridge.getFourActsProgress).toBe('function')
  })
})

// ============================================================
// Note 桥接测试
// ============================================================

describe('Note 桥接', () => {
  it('应导出 useNoteBridge composable 函数', () => {
    expect(typeof useNoteBridge).toBe('function')
  })

  it('应返回响应式笔记数据', () => {
    const bridge = useNoteBridge()
    expect(bridge.allNotes).toBeDefined()
    expect(bridge.allStickyNotes).toBeDefined()
    expect(bridge.boardNotes).toBeDefined()
    expect(bridge.noteCount).toBeDefined()
    expect(bridge.archivedNotes).toBeDefined()
    expect(bridge.deletedNotes).toBeDefined()
  })

  it('应返回 CRUD 方法', () => {
    const bridge = useNoteBridge()
    expect(typeof bridge.create).toBe('function')
    expect(typeof bridge.update).toBe('function')
    expect(typeof bridge.remove).toBe('function')
    expect(typeof bridge.hardRemove).toBe('function')
    expect(typeof bridge.restore).toBe('function')
    expect(typeof bridge.clearTrash).toBe('function')
  })

  it('应返回查询方法', () => {
    const bridge = useNoteBridge()
    expect(typeof bridge.searchNotes).toBe('function')
    expect(typeof bridge.getRecentNotes).toBe('function')
    expect(typeof bridge.getNotesByTag).toBe('function')
    expect(typeof bridge.getNoteById).toBe('function')
    expect(typeof bridge.getStickyById).toBe('function')
  })

  it('应返回便签操作方法', () => {
    const bridge = useNoteBridge()
    expect(typeof bridge.updateStickyPosition).toBe('function')
    expect(typeof bridge.updateStickyMode).toBe('function')
    expect(typeof bridge.togglePin).toBe('function')
    expect(typeof bridge.updateStickyColor).toBe('function')
    expect(typeof bridge.moveToSticky).toBe('function')
    expect(typeof bridge.moveToBoard).toBe('function')
  })

  it('应返回 load 方法', () => {
    const bridge = useNoteBridge()
    expect(typeof bridge.load).toBe('function')
  })
})