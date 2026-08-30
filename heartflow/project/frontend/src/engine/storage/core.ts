// ============================================================
// 存储核心层
// 适配器模式：Platform → StorageBackend
// ============================================================

import type { StorageSchema, AppConfig, WorldShellConfig } from '../../types'
import { ref } from 'vue'
import { isTauri } from '../../utils/platform'
import { DEFAULT_GESTURE_BINDINGS } from '../../modules/gesture/defaultBindings'
import {
  encryptEnvelope,
  decryptWithPassphrase,
  decryptWithDeviceKey,
  isEncryptedPayload,
  type StorageEnvelope,
} from '../../modules/safety/storage-encryption'
import { getDeviceKey } from '../../modules/safety/device-secret'
import {
  passphrase as unlockPass,
  deviceKey as unlockDevKey,
  unlocked as unlockState,
  encryptionActive as encActive,
  setUnlockedState,
  clearUnlockedState,
  setEncryptionActive,
} from './unlock-state'

export type { StorageSchema }

const STORAGE_KEY = 'heartflow:storage'
export const SCHEMA_VERSION = 10

// ---- 存储后端接口 ----

export interface StorageBackend {
  /** 读取完整 Schema（同步，返回缓存结果） */
  load(): StorageSchema | null
  /** 写入完整 Schema（同步写缓存 + 异步持久化） */
  save(schema: StorageSchema): void
  /** 清除所有数据 */
  clear(): void
  /** 后端名称（调试用） */
  readonly name: string
  /** 异步初始化（Tauri 后端需要首次异步加载） */
  init?(): Promise<void>
  /** 等待所有挂起的持久化完成（关闭前调用，避免数据丢失） */
  flush?(): Promise<void>
  /** 读取原始持久化字符串（不解析、不解密），供启动期判断加密态 */
  peekRaw?(): string | null
}

// ---- localStorage 后端 ----

class LocalStorageBackend implements StorageBackend {
  readonly name = 'localStorage'

  load(): StorageSchema | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) as StorageSchema : null
    } catch {
      return null
    }
  }

  save(schema: StorageSchema): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schema))
    } catch (e) {
      console.error('[Storage] localStorage 写入失败:', e)
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch { /* 忽略 */ }
  }

  peekRaw(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  }

  /** localStorage 为同步写入，无需异步 flush */
  async flush(): Promise<void> { /* no-op */ }
}

// ---- Tauri 明文 JSON 文件后端（蓝图第一层：本地文件存储引擎 = 明文 JSON/Markdown，用户可直接查看编辑） ----

class PlaintextFileStorageBackend implements StorageBackend {
  readonly name = 'tauri-plaintext'

  private _cache: StorageSchema | null = null
  private _loadedData = false
  private _pendingPersist: Promise<void> | null = null
  private _rawCache: string | null = null

  load(): StorageSchema | null {
    // 有缓存返回缓存；否则触发异步加载（结果稍后落入 _cache），本次返回 null
    if (this._cache) return this._cache
    this._loadFromDisk()
    return null
  }

  async init(): Promise<void> {
    await this._loadFromDisk()
  }

  private async _loadFromDisk(): Promise<void> {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const raw: string = await invoke('cmd_load_storage')
      this._rawCache = raw
      this._cache = raw ? (JSON.parse(raw) as StorageSchema) : null
      this._loadedData = !!this._cache && Object.keys(this._cache).length > 0
    } catch {
      // 文件不存在或读取失败 → 使用默认 schema
      this._rawCache = null
      this._cache = null
      this._loadedData = false
    }
  }

  /** 返回最近一次从磁盘读取的原始字符串（含加密信封），供启动期判断加密态。 */
  peekRaw(): string | null {
    return this._rawCache
  }

  save(schema: StorageSchema): void {
    this._cache = schema
    this._loadedData = true
    // 同步更新缓存，异步持久化（持有 pending 以便 flush 等待落盘）
    this._pendingPersist = this._persist(schema)
  }

  private async _persist(schema: StorageSchema): Promise<void> {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('cmd_save_storage', { data: JSON.stringify(schema) })
    } catch (e) {
      console.error('[Storage] Tauri 明文写入失败:', e)
    }
  }

  clear(): void {
    this._cache = null
    this._loadedData = false
    this._pendingPersist = this._removeFromDisk()
  }

  private async _removeFromDisk(): Promise<void> {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('cmd_clear_storage')
    } catch { /* 忽略 */ }
  }

  /** localStorage 之外，等待挂起写入完成（关闭前调用，避免数据丢失） */
  async flush(): Promise<void> {
    if (this._pendingPersist) {
      await this._pendingPersist
      this._pendingPersist = null
    }
  }

  /** 是否已从磁盘加载到真实数据（供诊断/迁移判断） */
  hasLoadedData(): boolean {
    return this._loadedData
  }
}

// ---- 加密装饰层（B0：整库可选加密） ----
// 包装底层明文后端：启用加密且已解锁时，整库 JSON 经 AES-GCM-256 封装为
// 双密文信封（primary=口令，device=设备兜底）落盘；未解锁时 load 返回 null
// 供上层挂起显示解锁遮罩。底层明文语义（蓝图第一层）在关闭加密时完全保留。

class EncryptedStorageBackend implements StorageBackend {
  readonly name = 'encrypted'

  constructor(private readonly inner: StorageBackend) {}

  peekRaw(): string | null {
    return this.inner.peekRaw?.() ?? null
  }

  load(): StorageSchema | null {
    const raw = this.inner.load()
    if (raw && isEncryptedPayload(raw)) {
      // 加密态：已解锁则直接返回已解密缓存；否则上层挂起等待解锁
      if (unlockState.value && _schemaCache) return _schemaCache
      return null
    }
    return raw as StorageSchema | null
  }

  save(schema: StorageSchema): void {
    if (encActive.value) {
      if (unlockState.value) {
        // 异步加密后落盘（不阻塞调用方）；失败仅记日志，不丢内存数据
        void this._persistEncrypted(schema)
      }
      // 加密态但未解锁：无密钥不可加密，明文写会破坏密文信封 → 丢弃。
      // 内存缓存（saveSchema 已保留 _schemaCache）在解锁后首次 save 会加密落盘。
      return
    }
    // 明文态：直接写底层。但须防护「启动期尚未检测到加密态 / enable 异步间隙」
    // 期间磁盘已是加密信封被明文覆盖、导致解锁态丢失。关闭加密走 getInner 直写
    // （不经此装饰层）；故只要磁盘当前为信封即跳过明文写，保留信封。
    const raw = this.inner.peekRaw?.() ?? null
    if (raw) {
      try {
        if (isEncryptedPayload(JSON.parse(raw))) return
      } catch {
        /* 非 JSON → 按明文处理 */
      }
    }
    this.inner.save(schema)
  }

  private async _persistEncrypted(schema: StorageSchema): Promise<void> {
    try {
      const env = await encryptEnvelope(
        JSON.stringify(schema),
        unlockPass.value!,
        unlockDevKey.value!,
      )
      this.inner.save(env as unknown as StorageSchema)
    } catch (e) {
      console.error('[Storage] 加密持久化失败:', e)
    }
  }

  clear(): void {
    this.inner.clear()
  }

  async init(): Promise<void> {
    await this.inner.init?.()
  }

  async flush(): Promise<void> {
    await this.inner.flush?.()
  }
}

// ---- 后端工厂（懒加载，在 initPlatform() 之后才能正确检测 Tauri） ----

let _inner: StorageBackend | null = null
let _wrapped: StorageBackend | null = null

function getInner(): StorageBackend {
  if (!_inner) {
    // 蓝图第一层要求：本地文件存储引擎为明文 JSON/Markdown，用户可直接查看编辑。
    // Tauri 下使用明文 JSON 文件后端（cmd_save_storage / cmd_load_storage）；
    // Web 环境无 Rust 文件命令，回退到 localStorage。
    _inner = isTauri() ? new PlaintextFileStorageBackend() : new LocalStorageBackend()
  }
  return _inner
}

function getBackend(): StorageBackend {
  if (!_wrapped) _wrapped = new EncryptedStorageBackend(getInner())
  return _wrapped
}

/** 内存缓存，避免高频操作反复 JSON.parse */
let _schemaCache: StorageSchema | null = null

/** 每次存储写入后递增，供 Vue 页面订阅存储变更。 */
export const storageVersion = ref(0)

/** 默认星盘配置 */
export const DEFAULT_ASTROLABE_CONFIG: AppConfig['astrolabe'] = {
  longPressDuration: 600,
  maxRecentRooms: 8,
  searchDebounce: 150,
  enableKeyboardShortcuts: true,
  summonKey: 'k',
  enableLongPress: true,
}

/** 默认生命周期配置 */
export const DEFAULT_LIFECYCLE_CONFIG: AppConfig['lifecycle'] = {
  autoProgression: true,
  growingThreshold: 0.25,
  matureThreshold: 0.75,
  agingDays: 30,
  inheritRatio: 0.3,
  segments: 3,
}

/** 默认幕僚顾问配置 */
export const DEFAULT_ADVISOR_CONFIG: AppConfig['advisor'] = {
  dingyinThresholds: {
    focus_complete: [5, 10, 25, 50, 100],
    emotion_logged: [10, 25, 50, 100],
    note_created: [5, 10, 25, 50],
  },
  rateLimitInterval: 30000,
  dailyResponseLimit: 20,
  bubbleDuration: 8000,
  witnessLogMax: 500,
  witnessLogDefaultLimit: 50,
  messageStorageLimit: 50,
  affinityMax: 100,
  affinityIncrements: {
    focus_complete: 2,
    focus_milestone: 3,
    emotion_logged: 1.5,
    click: 0.5,
    daily_reset: 0.5,
    late_night: 0.5,
    return: 1,
    note_created: 1,
    affinity_milestone: 0,
  },
  // 用户可自建幕僚上限。6 类固定幕僚（preset-*）不计入此额度，
  // 故留出余量：默认 6 个固定 + 至少 1 个用户位（实际计数时排除 preset-*）。
  maxAdvisors: 7,
}

/** 默认匠庐配置 */
export const DEFAULT_CRAFT_CONFIG: AppConfig['craft'] = {
  recentLimit: 5,
  tagDisplayCount: 3,
  messageTimeout: 3000,
}

/** 默认配置 */
/** 世界壳（三层空间）默认配置 */
const DEFAULT_WORLDSHELL_CONFIG: WorldShellConfig = {
  activeShell: 'courtyard',
  surfaceState: 'screen',
  shellConfig: { starsMode: '2d', courtyardMode: '2d', courtyard3d: false },
  floatingLayers: [],
  switchTrigger: { key: 'long-press', longPressMs: 1500 },
}

export const DEFAULT_CONFIG: AppConfig = {
  theme: 'dark',
  activeStylePack: 'default-gravity',
  timer: {
    defaultDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    autoStart: false,
  },
  interaction: {
    keyboardShortcuts: true,
    hapticFeedback: false,
    soundEnabled: true,
  },
  locale: 'zh-CN',
  advisorEnabled: false,
  /** 三级操作模式：默认静默执行，对齐宪法"默认静默" */
  operationMode: 'silent',
  advisorResetDate: null,
  lastVisitDate: null,
  transitionDuration: 350,
  background: {
    type: 'default',
    presetScene: 'none',
    dataUrl: null,
    mimeType: null,
    fileName: null,
    updatedAt: null,
    muted: true,
  },
  gestures: {
    bindings: { ...DEFAULT_GESTURE_BINDINGS },
    sampleInterval: 50,
    longPressThreshold: 1500,
    minMoveDistance: 10,
  },
  stats: {
    showPanel: true,
    showTrendChart: true,
    dailyGoal: 120,
    weeklyGoal: 600,
  },
  astrolabe: { ...DEFAULT_ASTROLABE_CONFIG },
  lifecycle: { ...DEFAULT_LIFECYCLE_CONFIG },
  advisor: { ...DEFAULT_ADVISOR_CONFIG },
  health: {
    exerciseTarget: 150,
    sleepTarget: 7,
    sleepMinThreshold: 6,
    sleepCriticalThreshold: 5,
    sleepExcellentThreshold: 7.5,
  },
  worklog: {
    overtimeRate: 1.5,
    nightRate: 1.3,
    defaultStart: '09:00',
    defaultEnd: '18:00',
    trendDays: 30,
    trendMonths: 6,
    recentShiftLimit: 15,
  },
  display: {
    trendNoteCount: 20,
    titleTruncateLength: 8,
    excerptTruncateLength: 80,
    tagDisplayCount: 2,
    statsWindowDays: 30,
    searchResultLimit: 10,
    dreamStorageLimit: 100,
    cleanupThresholdDays: 30,
    moveTrajectoryCount: 20,
    healthRecentSleepCount: 14,
    healthRecentExerciseCount: 30,
    healthRecentMealCount: 5,
    noteMaxLength: 100,
    uploadImageMaxBytes: 2 * 1024 * 1024,
    uploadVideoMaxBytes: 4 * 1024 * 1024,
  },
  visualization: {
    activeMetaphor: 'light',
    builtinPaletteId: 'default',
    customPalette: null,
  },
  sanctuaryExitDuration: 3000,
  automationHistoryLimit: 100,
  craft: { ...DEFAULT_CRAFT_CONFIG },
  ai: {
    enabled: false,
    activeProviderId: 'default',
    providers: {
      default: {
        type: 'openai',
        name: 'OpenAI',
        // 宪法第1条（本地私有）：默认不预设云端地址，开箱即零外部调用（fail-closed）。
        // 启用 AI 前需用户显式配置 baseUrl（本地模型或自有网关）。
        baseUrl: '',
        apiKey: '',
        model: {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 1024,
          contextWindow: 8192,
          topP: 0.9,
          frequencyPenalty: 0.3,
          presencePenalty: 0.3,
        },
        timeout: 30000,
        maxRetries: 2,
        retryDelay: 1000,
      },
    },
    memory: {
      maxRounds: 10,
      enableSummarization: true,
      summaryThreshold: 8,
      preserveSystemPrompt: true,
    },
    streamEnabled: false,
    debugMode: false,
  },
  /** 宪法合规覆盖层：默认全部 false（遵守宪法默认值） */
  complianceOverride: {
    forbiddenPatterns: false,
    advisorEnabled: false,
    comparativePhrases: false,
    personification: false,
    autoStartOverwrite: false,
    hapticFeedbackOverwrite: false,
    dataDriven: false,
    notificationBlocked: true,
    allowExternalAI: false,
  },
  /** 用户显式操作过的合规覆盖字段（持久化，优先级高于引擎推导） */
  overrideUserTouched: [],
  /** 应用品牌图标（app 自身 logo）；null = 默认 ✦ */
  appBrandIcon: null,
  /** 世界壳（三层空间）配置单一真源 */
  worldShell: structuredClone(DEFAULT_WORLDSHELL_CONFIG),
}

/** 默认存储结构 */
function createDefaultSchema(): StorageSchema {
  return {
    version: SCHEMA_VERSION,
    sessions: [],
    crystals: [],
    carriers: [],
    constitution: null,
    advisors: [],
    config: structuredClone(DEFAULT_CONFIG),
    emotions: [],
    notes: [],
    anchors: [],
    goals: [],
    relations: [],
    advisorMessages: [],
    ledger: [],
    tagCategories: [],
    scenePresets: [],
    kvStore: {},
  }
}

/**
 * 无条件规范化嵌套配置默认值（complianceOverride / craft）。
 * 保证任何版本的存量数据都补齐最新嵌套字段，维持 fail-closed 默认（如 allowExternalAI 缺省即 false）。
 * 存量用户值优先，缺失键回落到 DEFAULT_*，因此幂等且安全。
 */
function ensureConfigDefaults(config: AppConfig): void {
  // 世界壳配置：存量数据（旧版本）可能缺 worldShell 切片，按默认值深度补全，幂等安全。
  config.worldShell = {
    ...DEFAULT_WORLDSHELL_CONFIG,
    ...(config as any).worldShell,
  }
  config.complianceOverride = {
    ...DEFAULT_CONFIG.complianceOverride,
    ...(config as any).complianceOverride,
  }
  config.craft = {
    ...DEFAULT_CRAFT_CONFIG,
    ...(config as any).craft,
  }
}

/** 版本迁移 */
function migrate(data: Partial<StorageSchema>): StorageSchema {
  let schema = { ...createDefaultSchema(), ...data }

  // 合并配置（属性级），确保旧存储合入新字段（如 advisorResetDate、astrolabe、lifecycle、advisor）
  const oldConfig = data.config || {} as AppConfig
  schema.config = {
    ...DEFAULT_CONFIG,
    ...oldConfig,
    gestures: {
      ...DEFAULT_CONFIG.gestures,
      ...oldConfig.gestures,
      bindings: {
        ...DEFAULT_GESTURE_BINDINGS,
        ...oldConfig.gestures?.bindings,
      },
    },
    astrolabe: {
      ...DEFAULT_ASTROLABE_CONFIG,
      ...oldConfig.astrolabe,
    },
    lifecycle: {
      ...DEFAULT_LIFECYCLE_CONFIG,
      ...oldConfig.lifecycle,
    },
    advisor: {
      ...DEFAULT_ADVISOR_CONFIG,
      ...oldConfig.advisor,
      dingyinThresholds: {
        ...DEFAULT_ADVISOR_CONFIG.dingyinThresholds,
        ...oldConfig.advisor?.dingyinThresholds,
      },
    },
  }

  // v1 → v2: 移除结晶数据中的 position 字段
  if ((data.version ?? 0) < 2 && schema.crystals) {
    schema.crystals = schema.crystals.map(c => {
      const { position, ...rest } = c as any
      return rest
    })
  }

  if ((data.version ?? 0) < 3) {
    schema.config.gestures = {
      ...DEFAULT_CONFIG.gestures,
      ...schema.config.gestures,
      bindings: {
        ...DEFAULT_GESTURE_BINDINGS,
        ...schema.config.gestures?.bindings,
      },
    }
  }

  if ((data.version ?? 0) < 4) {
    schema.config.background = {
      ...DEFAULT_CONFIG.background,
      ...schema.config.background,
    }
  }

  if ((data.version ?? 0) < 5) {
    schema.config.transitionDuration = DEFAULT_CONFIG.transitionDuration
  }

  if ((data.version ?? 0) < 7) {
    schema.scenePresets = []
  }

  if ((data.version ?? 0) < 8) {
    schema.config.visualization = {
      activeMetaphor: 'light',
      builtinPaletteId: 'gold',
      customPalette: null,
    }
  }

  if ((data.version ?? 0) < 9) {
    // 新增字段由 DEFAULT_CONFIG 合并自动补齐
    schema.config.gestures = {
      ...DEFAULT_CONFIG.gestures,
      ...schema.config.gestures,
      bindings: {
        ...DEFAULT_GESTURE_BINDINGS,
        ...schema.config.gestures?.bindings,
      },
    }
    schema.config.display = {
      ...DEFAULT_CONFIG.display,
      ...schema.config.display,
    }
    schema.config.advisor = {
      ...DEFAULT_ADVISOR_CONFIG,
      ...schema.config.advisor,
      dingyinThresholds: {
        ...DEFAULT_ADVISOR_CONFIG.dingyinThresholds,
        ...schema.config.advisor?.dingyinThresholds,
      },
    }
    schema.config.lifecycle = {
      ...DEFAULT_LIFECYCLE_CONFIG,
      ...schema.config.lifecycle,
    }
    schema.config.sanctuaryExitDuration = DEFAULT_CONFIG.sanctuaryExitDuration
    schema.config.automationHistoryLimit = DEFAULT_CONFIG.automationHistoryLimit
  }

  // 确保合规覆盖层与 craft 配置补齐最新嵌套字段（含 allowExternalAI 等 fail-closed 默认），
  // 无条件执行，覆盖已等于 SCHEMA_VERSION 但未经历迁移的存量数据。
  ensureConfigDefaults(schema.config)

  schema.version = SCHEMA_VERSION
  return schema as StorageSchema
}

/**
 * 把原始（可能旧版本）schema 规范化为当前版本的可信 schema。
 * loadSchema 与解锁流程共用，保证解密出的明文（可能是旧版本密文）也经历迁移。
 */
function hydrate(raw: Partial<StorageSchema>): StorageSchema {
  if (raw.version !== SCHEMA_VERSION) {
    return migrate(raw)
  }
  // 版本已匹配但仍需补齐最新嵌套字段（如 allowExternalAI），维持 fail-closed 默认。
  if (!raw.config) raw.config = createDefaultSchema().config
  ensureConfigDefaults(raw.config)
  return raw as StorageSchema
}

/** 读取全部存储 */
export function loadSchema(): StorageSchema {
  if (_schemaCache) return _schemaCache

  const raw = getBackend().load()
  if (!raw) {
    // 加密态未解锁：不缓存空默认 schema，避免解锁前界面误用空库
    if (encActive.value && !unlockState.value) return createDefaultSchema()
    _schemaCache = createDefaultSchema()
    return _schemaCache
  }

  _schemaCache = hydrate(raw)
  return _schemaCache
}

/** 写入全部存储 */
export function saveSchema(schema: StorageSchema): void {
  getBackend().save(schema)
  // 加密态：内存保留解密 schema（load 同步返回，避免重复异步解密）
  if (encActive.value) {
    _schemaCache = schema
  } else {
    _schemaCache = null
  }
  storageVersion.value++
}

/** 强制刷新缓存 */
export function invalidateCache(): void {
  _schemaCache = null
}

/** 获取当前物理存储后端名称（localStorage / tauri-plaintext）。
 *  加密层是转换装饰，不在此反映；加密态由 encActive 单独表达。 */
export function getStorageBackend(): string {
  return getInner().name
}

/** 等待所有挂起的持久化完成（应用关闭前调用，避免异步写入丢失） */
export async function flushStorage(): Promise<void> {
  const b = getBackend()
  if (b.flush) await b.flush()
}

/** 初始化存储（应用启动时调用） */
export async function initStorage(): Promise<void> {
  const backend = getBackend()
  // 先预热底层，填 _rawCache（含原始磁盘字符串）
  await backend.init?.()
  // 启动期判断：若磁盘已是加密信封，挂起加载、等待解锁（不读入明文）
  const raw = backend.peekRaw?.() ?? null
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (isEncryptedPayload(parsed)) {
        // 启动期检测到加密信封：挂起加载、等待解锁（不读入明文）
        setEncryptionActive(true)
        _schemaCache = null
        return
      }
    } catch {
      /* 非 JSON → 按明文默认处理 */
    }
  }
  // 明文态：正常加载并预热缓存
  loadSchema()
}

/** 清除所有数据（重置缓存 + 后端存储） */
export function clearAll(): void {
  _schemaCache = null
  getBackend().clear()
  storageVersion.value++
}

// ============================================================
// B0 加密存储编排（口令优先 + 设备绑定兜底）
// ============================================================

/** 读取磁盘信封（不解密）。非加密或无数据返回 null。 */
function readEnvelope(): StorageEnvelope | null {
  const raw = getBackend().peekRaw?.() ?? null
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    return isEncryptedPayload(p) ? p : null
  } catch {
    return null
  }
}

/** 用口令解锁（仅验证 primary 密文，失败不回退设备——这是「输入口令」场景）。 */
export async function unlockWithPassphrase(pw: string): Promise<boolean> {
  const env = readEnvelope()
  if (!env) return false
  try {
    const plaintext = await decryptWithPassphrase(env.primary, pw)
    _schemaCache = hydrate(JSON.parse(plaintext))
    const devKey = await getDeviceKey()
    setUnlockedState({ passphrase: pw, deviceKey: devKey, encryptionActive: true })
    storageVersion.value++
    return true
  } catch {
    return false
  }
}

/** 用本机设备密钥解锁（兜底：主人忘记口令时仍可恢复，避免死锁）。 */
export async function unlockWithDevice(): Promise<boolean> {
  const env = readEnvelope()
  if (!env) return false
  const devKey = await getDeviceKey()
  try {
    const plaintext = await decryptWithDeviceKey(env.device, devKey)
    _schemaCache = hydrate(JSON.parse(plaintext))
    setUnlockedState({ passphrase: null, deviceKey: devKey, encryptionActive: true })
    storageVersion.value++
    return true
  } catch {
    return false
  }
}

/** 启用加密：把当前明文 schema 用新口令 + 设备密钥封装为信封落盘。 */
export async function enableEncryption(pw: string): Promise<void> {
  const schema = loadSchema() // 当前明文/默认
  const devKey = await getDeviceKey()
  const env = await encryptEnvelope(JSON.stringify(schema), pw, devKey)
  getInner().save(env as unknown as StorageSchema) // 直接写底层信封，绕过加密装饰
  setEncryptionActive(true)
  setUnlockedState({ passphrase: pw, deviceKey: devKey, encryptionActive: true })
  _schemaCache = schema
  storageVersion.value++
}

/** 关闭加密：把当前解密 schema 明文写回，清空内存密钥。 */
export async function disableEncryption(): Promise<void> {
  const schema = loadSchema() // 当前解密 schema
  getInner().save(schema) // 明文写回
  setEncryptionActive(false)
  clearUnlockedState()
  _schemaCache = schema
  storageVersion.value++
}

/** 修改口令：验证旧口令后，用新口令重加密 primary（device 密文保持不变）。 */
export async function changePassphrase(oldPw: string, newPw: string): Promise<boolean> {
  const env = readEnvelope()
  if (!env) return false
  try {
    const plaintext = await decryptWithPassphrase(env.primary, oldPw)
    const devKey = await getDeviceKey()
    const newEnv = await encryptEnvelope(plaintext, newPw, devKey)
    getInner().save(newEnv as unknown as StorageSchema)
    setUnlockedState({ passphrase: newPw, deviceKey: devKey, encryptionActive: true })
    return true
  } catch {
    return false
  }
}

/** 启动期是否需要解锁遮罩。 */
export function isUnlockRequired(): boolean {
  return encActive.value && !unlockState.value
}
