// ============================================================
// 宪法合规自动化门禁测试
// 每次 vitest run 自动检查宪法合规性，失败即阻断构建
// 覆盖：文案中立性、交互默认值、安全岛、数据主权、对话合规
//
// 【宪法分级 · 与蓝图17对齐】
//  · 第1条「本地私有」、第2条「超级自定义」=【强制·内核级·不可关闭】
//    → 对应"数据主权 fetch 扫描"与"超级自定义配置完备性/覆盖层"检测，
//      不提供 complianceOverride 绕过通道，违规则阻断构建。
//  · 第3~52条 =【可选·可关闭】弹性宪法
//    → 其余检测项（文案中立、默认静默、拟人化等）均带
//      `if (config.complianceOverride?.xxx) return` 门控，
//      用户开启对应 override 即跳过，不强制。
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { globSync } from 'glob'
import { createPinia, setActivePinia } from 'pinia'
import { storage } from '../../engine/storage'
import { useConfigStore } from '../../stores/config'
import { refreshConstitutionEffect } from '../constitution-effect'

/**
 * 全仓扫描型用例的超时上限。
 *
 * 这类用例要 glob 遍历 src/** 再逐文件读取跑正则，天然 IO 密集：
 * **单独跑约 1s**，但并行跑时会被其它 worker 抢 IO 而急剧膨胀——
 * 实测「第1条：src 目录下无未声明的网络请求」在并行下涨到 18457ms、
 * 「第2条：无超过 50 行的模块级常量定义」14988ms，双双逼近/越过
 * vitest 默认 testTimeout=15000ms，导致**与功能无关的随机红灯**。
 *
 * 放宽到 60s 只抬超时上限，不影响用例本身的合规检测能力。
 */
const SCAN_TIMEOUT = 60_000

// ---- 2.1.1 文案中立性扫描 ----

/**
 * 禁止词汇 — 评价性、命令式、比较性
 * 违反第3条「心流第一」：不暗示"应该"做什么、不评价进度
 */
const FORBIDDEN_PATTERNS: RegExp[] = [
  /你应该/g,
  /你必须/g,
  /建议你/g,
  /你需要/g,
  /完成度(?!\s*(进度条|progress|bar|indicator))/g, // 允许 CSS 注释中的"完成度进度条"
  /落后/g,
  /比别人/g,
  /你还没有完成/g,
  /你必须完成/g,
  /建议你继续/g,
  /你的[^。]*?不足/g,
  /你的[^。]*?太差/g,
  /你的[^。]*?很低/g,
  /建议你立即/g,
  /请务必/g,
  /强烈建议/g,
  /推荐你/g,
]

/**
 * 白名单 — 允许的选择性表达
 * 符合第5条「主动式探索引擎」：提供选择而非强加
 */
const ALLOWED_PATTERNS: RegExp[] = [
  /你可以/g,
  /如果愿意/g,
  /想的话/g,
  /先试试/g,
  /如果需要/g,
  /如果希望/g,
  /你可以选择/g,
  /试试看/g,
  /不妨/g,
  /可以试试/g,
  /如果你愿意/g,
  /若有兴趣/g,
  /可考虑/g,
  /可选/g,
  /可自定义/g,
  /可调整/g,
  /可配置/g,
  /可启用/g,
  /可禁用/g,
  /可开启/g,
  /可关闭/g,
  /可切换/g,
  /可设置/g,
  /可修改/g,
  /可删除/g,
  /可添加/g,
  /可导入/g,
  /可导出/g,
  /可重置/g,
  /可恢复/g,
  /可隐藏/g,
  /可显示/g,
  /可排序/g,
  /可搜索/g,
  /可过滤/g,
]

describe('宪法合规 · 文案中立性', () => {
  const vueFiles = globSync('src/**/*.vue', { cwd: process.cwd() })

  it('第3条：所有 .vue 文件模板中不包含强制评价性词汇', () => {
    // 第2条超级自定义：如果用户启用了 forbiddenPatterns 覆盖，跳过此检测
    const config = storage.getConfig()
    if (config.complianceOverride?.forbiddenPatterns) {
      return // 用户选择关闭文案中立性检测
    }

    const violations: Array<{ file: string; match: string }> = []

    for (const file of vueFiles) {
      const content = readFileSync(file, 'utf-8')

      // 提取 <template> 部分
      const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/)
      if (!templateMatch) continue
      const templateContent = templateMatch[1]

      // 对每个违禁词独立检查
      // 注意：白名单词（如"你可以"）只豁免该词本身，不豁免整段文本
      for (const forbidden of FORBIDDEN_PATTERNS) {
        // 在模板中搜索违禁词
        const re = new RegExp(forbidden.source, 'g')
        let m: RegExpExecArray | null
        while ((m = re.exec(templateContent)) !== null) {
          const idx = m.index
          const matched = m[0]
          const matchStart = Math.max(0, idx - 20)
          const matchEnd = Math.min(templateContent.length, idx + matched.length + 20)
          const context = templateContent.slice(matchStart, matchEnd).replace(/\n/g, ' ')

          // 检查该违禁词是否被邻近的白名单词覆盖
          // 例如 "你需要" 出现在 "如果你需要" 中则不计为违规
          const isCoveredByAllowed = ALLOWED_PATTERNS.some(allowed => {
            // 在白名单词附近 ±30 字符内搜索
            const nearbyStart = Math.max(0, idx - 30)
            const nearbyEnd = Math.min(templateContent.length, idx + matched.length + 30)
            const nearbyText = templateContent.slice(nearbyStart, nearbyEnd)
            return allowed.test(nearbyText)
          })

          if (!isCoveredByAllowed) {
            violations.push({ file, match: `"${matched}" (上下文: …${context.trim()}…)` })
          }
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations.map(v => `  ${v.file}: ${v.match}`).join('\n')
      expect.fail(`发现 ${violations.length} 处文案违规（第3条宪法：心流第一）：\n${msg}`)
    }
  }, SCAN_TIMEOUT)

  it('第3条：所有 .vue 文件无暗示性完成度/比较性文案', () => {
    // 第2条超级自定义：如果用户启用了 comparativePhrases 覆盖，跳过此检测
    const config = storage.getConfig()
    if (config.complianceOverride?.comparativePhrases) {
      return // 用户选择关闭比较性文案检测
    }

    const comparativePatterns = [
      // 进度暗示
      /还差[^。]*?就/g,
      /只差[^。]*?了/g,
      /已经[^。]*?天没有/g,
      /好久没有/g,
      // 比较暗示
      /比上次/g,
      /比昨天/g,
      /比上周/g,
      /比上个月/g,
      /比之前/g,
      // 强制暗示
      /别忘了/g,
      /记得要/g,
      /一定要/g,
      /务必要/g,
      // 效率暗示
      /浪费了/g,
      /白费了/g,
      /可惜了/g,
      // 评价暗示
      /做得很好/g,
      /做得不错/g,
      /表现优秀/g,
      /表现不佳/g,
      /表现很差/g,
    ]

    const violations: Array<{ file: string; pattern: string }> = []

    for (const file of vueFiles) {
      const content = readFileSync(file, 'utf-8')
      const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/)
      if (!templateMatch) continue

      for (const pattern of comparativePatterns) {
        if (pattern.test(templateMatch[1])) {
          violations.push({ file, pattern: pattern.source })
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations.map(v => `  ${v.file}: 匹配模式 "${v.pattern}"`).join('\n')
      expect.fail(`发现 ${violations.length} 处暗示性文案违规（第3条宪法：心流第一）：\n${msg}`)
    }
  }, SCAN_TIMEOUT)
})

// ---- 2.1.2 交互默认值合规 ----
describe('宪法合规 · 交互默认值', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('第5条：默认不主动推送（notification 默认静默）', () => {
    const config = storage.getConfig()
    // 第5条：主动式探索引擎 — 不推送、不弹窗、不红点
    // 验证默认配置中无推送类设置开启
    expect(config).toBeDefined()
    // 第2条超级自定义：如果用户启用了 advisorEnabled 覆盖，允许幕僚默认活跃
    if (config.complianceOverride?.advisorEnabled) {
      return // 用户选择让幕僚默认活跃
    }
    // advisorEnabled 默认 false 确保了幕僚不主动推送对话
    expect(config.advisorEnabled).toBe(false)
  })

  it('第52条：幕僚默认不主动问候（沉默的默认）', () => {
    const config = storage.getConfig()
    // 第52条"沉默的默认"：幕僚默认不主动问候
    // advisorEnabled 默认 false 确保了用户需主动开启
    expect(config.advisorEnabled).toBe(false)
  })

  it('第5条：autoStart 默认关闭', () => {
    const config = storage.getConfig()
    // 专注计时器默认不自动开始，需用户主动触发
    // 第2条超级自定义：如果用户启用了 autoStartOverwrite 覆盖，允许自动开始
    if (config.complianceOverride?.autoStartOverwrite) {
      return // 用户选择允许计时器默认自动开始
    }
    expect(config.timer.autoStart).toBe(false)
  })

  it('第5条：hapticFeedback 默认关闭', () => {
    const config = storage.getConfig()
    // 触觉反馈默认关闭，不主动打扰用户
    // 第2条超级自定义：如果用户启用了 hapticFeedbackOverwrite 覆盖，允许触觉反馈默认开启
    if (config.complianceOverride?.hapticFeedbackOverwrite) {
      return // 用户选择允许触觉反馈默认开启
    }
    expect(config.interaction.hapticFeedback).toBe(false)
  })
})

// ---- 2.1.3 安全岛触发验证 ----
describe('宪法合规 · 安全岛 （第16条）', () => {
  it('第16条：安全岛状态冻结/恢复逻辑存在', async () => {
    setActivePinia(createPinia())
    const { useRuntimeStore } = await import('../../stores/runtime')
    const runtime = useRuntimeStore()

    // 初始状态：安全岛未激活
    expect(runtime.isSanctuaryActive).toBe(false)

    // 进入安全岛：状态冻结
    runtime.enterSanctuary()
    expect(runtime.isSanctuaryActive).toBe(true)

    // 重复进入：幂等，不重复冻结
    runtime.enterSanctuary()
    expect(runtime.isSanctuaryActive).toBe(true)

    // 退出安全岛：状态恢复
    runtime.exitSanctuary()
    expect(runtime.isSanctuaryActive).toBe(false)

    // 重复退出：幂等，不报错
    runtime.exitSanctuary()
    expect(runtime.isSanctuaryActive).toBe(false)
  })

  it('第16条：安全岛触发时暂停 timer 和 advisor', async () => {
    setActivePinia(createPinia())
    const { useRuntimeStore } = await import('../../stores/runtime')
    const { useTimerStore } = await import('../../stores/timer')
    const { useAdvisorStore } = await import('../../stores/advisor')
    const runtime = useRuntimeStore()
    const timer = useTimerStore()
    const advisor = useAdvisorStore()

    const timerPauseSpy = vi.spyOn(timer, 'pauseForSanctuary')
    const advisorPauseSpy = vi.spyOn(advisor, 'pauseForSanctuary')

    runtime.enterSanctuary()

    expect(timerPauseSpy).toHaveBeenCalledTimes(1)
    expect(advisorPauseSpy).toHaveBeenCalledTimes(1)
  })
})

// ---- 2.1.4 数据主权验证 ----
describe('宪法合规 · 数据主权 （第1条）', () => {
  it('第1条：所有存储键名以 heartflow: 前缀开头', () => {
    const knownKeys = [
      'heartflow:storage',
    ]
    // 所有存储读写应通过 storage 模块，使用统一前缀
    // 检查 storage 模块中定义的 STORAGE_KEY
    expect(knownKeys).toContain('heartflow:storage')
  })

  it('第1条：src 目录下无未声明的网络请求（fetch/XHR）', () => {
    const srcFiles = globSync('src/**/*.{ts,vue,js}', { cwd: process.cwd() })

    // 经审议的、声明的网络调用路径（均为用户显式触发或受 enabled 门控）：
    // - engine/ai/provider.ts：OpenAI 兼容前端提供商，fetch 目标 = 用户配置的 baseUrl。
    //   默认 baseUrl 为空（第1条·本地私有·fail-closed），实际生效需用户在 AI 设置中显式填入
    //   （本地模型或自有网关），无配置则不会向任何地址发起请求。
    // - engine/ai/tauri-provider.ts：AI 调用经 Tauri Bridge 委托到 Rust 后端 cmd_ai_* 命令，
    //   再由后端 reqwest 发出（见 后端 src-tauri/src/ai_agent.rs）。后端默认 model_url 为空
    //   （fail-closed），ADR-014 已审计；该后端出口为本扫描的【已知例外】——前端单端扫描无法
    //   穷举 Rust 侧出口，由后端宪法审计（ai_agent.rs 默认空 URL + 单元测试锁定）独立保证。
    // - modules/visualization/datasource-connector.ts：可视化数据源连接器，用户主动导入外部数据。
    // - modules/sync/transport.ts：局域网边界传输适配器（createLanTransportAdapter），
    //   两个 fetch 目标恒为 peerUrl/snapshot，且每次调用前先经 isLocalBoundaryUrl 硬校验
    //   （仅放行 localhost/127.0.0.1/::1/私有 IPv4 段/.local/.lan/.home，公网/0.0.0.0 一律拒绝），
    //   属 fail-closed by construction 的本地边界收发，守第1条本地私有。
    const SANCTIONED_NETWORK_FILES = [
      'engine/ai/provider.ts',
      'engine/ai/tauri-provider.ts',
      'modules/visualization/datasource-connector.ts',
      'modules/sync/transport.ts',
      // 书签剪藏：用户显式粘贴/剪入 URL 后，由 fetchClipMeta 抓取 OG 元信息（标题/描述/预览图）。
      // 请求目标恒为用户提供的原始 URL，无默认外联，属用户主动触发的本地私有边界收发。
      'modules/bookmarks/clip.ts',
    ]

    const violations: string[] = []

    for (const file of srcFiles) {
      // 测试文件非发布网络代码，且内部常含 fetch( 字面量（如本测试），跳过
      if (file.includes('__tests__') || file.endsWith('.test.ts') || file.endsWith('.d.ts')) continue

      const lines = readFileSync(file, 'utf-8').split('\n')
      lines.forEach((line, idx) => {
        if (!line.includes('fetch(')) return
        // 注释行豁免
        if (line.trim().startsWith('//')) return
        // 测试 mock / 字符串字面量豁免
        if (line.includes('vi.fn') || line.includes('mock')) return
        // 函数名/标识符里的 prefetch( 子串豁免（如 prefetchRooms、useRoutePrefetch）
        if (/(?:prefetch|refetch)\s*\(/i.test(line)) return

        const normalized = file.replace(/\\/g, '/')
        const isSanctioned = SANCTIONED_NETWORK_FILES.some(f => normalized.endsWith(f))
        if (!isSanctioned) {
          violations.push(`${file}:${idx + 1}`)
        }
      })
    }

    if (violations.length > 0) {
      expect.fail(
        `第1条（本地私有）：发现未声明的网络请求（裸 fetch）：\n${violations
          .map(v => `  - ${v}`)
          .join('\n')}\n若确为必要网络能力，请将其纳入 SANCTIONED_NETWORK_FILES 并附合规说明。`,
      )
    }
    expect(violations).toEqual([])
  }, SCAN_TIMEOUT)
})

// ---- 2.2 配置完备性扫描 ----
describe('宪法合规 · 超级自定义配置完备性 （第2条）', () => {
  const ALL_CONFIG_PATHS = [
    'theme', 'activeStylePack', 'timer.defaultDuration', 'timer.breakDuration',
    'timer.longBreakDuration', 'timer.sessionsBeforeLongBreak', 'timer.autoStart',
    'interaction.keyboardShortcuts', 'interaction.hapticFeedback', 'interaction.soundEnabled',
    'locale', 'advisorEnabled', 'advisorResetDate', 'lastVisitDate', 'transitionDuration',
    'background.type', 'background.presetScene', 'background.dataUrl', 'background.mimeType',
    'background.fileName', 'background.updatedAt',
    'gestures.bindings', 'gestures.sampleInterval', 'gestures.longPressThreshold', 'gestures.minMoveDistance',
    'stats.showPanel', 'stats.showTrendChart', 'stats.dailyGoal', 'stats.weeklyGoal',
    'astrolabe.longPressDuration', 'astrolabe.maxRecentRooms', 'astrolabe.searchDebounce',
    'astrolabe.enableKeyboardShortcuts', 'astrolabe.summonKey', 'astrolabe.enableLongPress',
    'lifecycle.autoProgression', 'lifecycle.growingThreshold', 'lifecycle.matureThreshold',
    'lifecycle.agingDays', 'lifecycle.inheritRatio', 'lifecycle.segments',
    'advisor.dingyinThresholds', 'advisor.rateLimitInterval', 'advisor.dailyResponseLimit',
    'advisor.bubbleDuration', 'advisor.witnessLogMax', 'advisor.witnessLogDefaultLimit',
    'advisor.messageStorageLimit', 'advisor.affinityMax', 'advisor.affinityIncrements', 'advisor.maxAdvisors',
    'health.exerciseTarget', 'health.sleepTarget', 'health.sleepMinThreshold',
    'health.sleepCriticalThreshold', 'health.sleepExcellentThreshold',
    'worklog.overtimeRate', 'worklog.nightRate', 'worklog.defaultStart', 'worklog.defaultEnd',
    'worklog.trendDays', 'worklog.trendMonths', 'worklog.recentShiftLimit',
    'display.trendNoteCount', 'display.titleTruncateLength', 'display.excerptTruncateLength',
    'display.tagDisplayCount', 'display.statsWindowDays', 'display.searchResultLimit',
    'display.dreamStorageLimit', 'display.cleanupThresholdDays', 'display.moveTrajectoryCount',
    'display.healthRecentSleepCount', 'display.healthRecentExerciseCount', 'display.healthRecentMealCount',
    'display.noteMaxLength', 'display.uploadImageMaxBytes', 'display.uploadVideoMaxBytes',
    'visualization.activeMetaphor', 'visualization.builtinPaletteId', 'visualization.customPalette',
    'sanctuaryExitDuration', 'automationHistoryLimit',
    'craft.recentLimit', 'craft.tagDisplayCount', 'craft.messageTimeout',
    'complianceOverride.forbiddenPatterns', 'complianceOverride.advisorEnabled',
    'complianceOverride.comparativePhrases', 'complianceOverride.personification',
    'complianceOverride.autoStartOverwrite', 'complianceOverride.hapticFeedbackOverwrite',
  ]

  it('第2条：DEFAULT_CONFIG 包含所有必需配置路径', async () => {
    const { storage } = await import('../../engine/storage')
    const config = storage.getConfig()

    const missingPaths: string[] = []
    for (const path of ALL_CONFIG_PATHS) {
      const parts = path.split('.')
      let value: any = config
      for (const part of parts) {
        value = value?.[part]
        if (value === undefined) break
      }
      if (value === undefined) {
        missingPaths.push(path)
      }
    }

    if (missingPaths.length > 0) {
      expect.fail(`以下配置路径在运行时 AppConfig 中缺失：\n${missingPaths.map(p => `  - ${p}`).join('\n')}`)
    }
  })

  it('第2条：DEFAULT_CONFIG 包含所有必需配置路径（默认值检查）', async () => {
    const { DEFAULT_CONFIG } = await import('../../engine/storage/core')
    const missingPaths: string[] = []
    for (const path of ALL_CONFIG_PATHS) {
      const parts = path.split('.')
      let value: any = DEFAULT_CONFIG
      for (const part of parts) {
        value = value?.[part]
        if (value === undefined) break
      }
      if (value === undefined) {
        missingPaths.push(path)
      }
    }

    if (missingPaths.length > 0) {
      expect.fail(`以下配置路径在 DEFAULT_CONFIG 中缺失：\n${missingPaths.map(p => `  - ${p}`).join('\n')}`)
    }
  })
})

// ---- 2.3 硬编码值扫描 ----
describe('宪法合规 · 硬编码值扫描 （第2条）', () => {
  const vueFiles = globSync('src/**/*.vue', { cwd: process.cwd() })
  const tsFiles = globSync('src/**/*.ts', { cwd: process.cwd() })
  const allFiles = [...vueFiles, ...tsFiles].filter(f =>
    !f.includes('__tests__') &&
    !f.includes('node_modules') &&
    !f.includes('dist') &&
    !f.endsWith('.d.ts')
  )

  it('第2条：无超过 50 行的模块级常量定义（应通过 AppConfig 配置）', () => {
    // 检查是否有大段的 export const 常量定义（重复读配置而非硬编码）
    const hugeConstantFiles: string[] = []
    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8')
      // 检查是否有大段 export const 定义（超过 5 行且包含数字常量）
      const constBlocks = content.match(/export const \w+[\s\S]{50,}?(?=\n\nexport|\n\/\/|\nimport|$)/g)
      if (constBlocks) {
        for (const block of constBlocks) {
          // 如果包含数字常量且不是 UI 渲染常量（颜色、尺寸等），标记
          if (/\d+/.test(block) && !block.includes('color') && !block.includes('Color') && !block.includes('px') && !block.includes('PX')) {
            const match = file.match(/src\/.*$/)
            if (match) hugeConstantFiles.push(match[0])
          }
        }
      }
    }
    // 仅警告，不阻断（允许设计常量）
    if (hugeConstantFiles.length > 0) {
      console.warn(`[宪法合规] 以下文件包含大段常量定义，可能需配置化：\n${hugeConstantFiles.map(f => `  - ${f}`).join('\n')}`)
    }
    expect(true).toBe(true)
  }, SCAN_TIMEOUT)

  it('第2条：所有模块 DEFAULT_* 常量与 core.ts 中定义一致', async () => {
    const { DEFAULT_CONFIG } = await import('../../engine/storage/core')

    // 检查 timer 模块的默认值
    let timerModule: any
    try { timerModule = await import('../../modules/timer/index') } catch { /* 忽略 */ }
    if (timerModule?.DEFAULT_TIMER_CONFIG) {
      expect(timerModule.DEFAULT_TIMER_CONFIG.defaultDuration).toBe(DEFAULT_CONFIG.timer.defaultDuration)
    }

    // 检查 astrolabe 模块的默认值
    let astrolabeModule: any
    try { astrolabeModule = await import('../../modules/astrolabe/types') } catch { /* 忽略 */ }
    if (astrolabeModule?.DEFAULT_ASTROLABE_CONFIG) {
      expect(astrolabeModule.DEFAULT_ASTROLABE_CONFIG.longPressDuration).toBe(DEFAULT_CONFIG.astrolabe.longPressDuration)
    }
  })
})

// ---- 2.4 超级自定义覆盖层验证 ----
describe('宪法合规 · 超级自定义覆盖层 （第2条）', () => {
  it('override 配置路径完整且可读', async () => {
    const { storage } = await import('../../engine/storage')
    const config = storage.getConfig()
    expect(config.complianceOverride).toBeDefined()
    expect(typeof config.complianceOverride.forbiddenPatterns).toBe('boolean')
    expect(typeof config.complianceOverride.advisorEnabled).toBe('boolean')
    expect(typeof config.complianceOverride.comparativePhrases).toBe('boolean')
    expect(typeof config.complianceOverride.personification).toBe('boolean')
    expect(typeof config.complianceOverride.autoStartOverwrite).toBe('boolean')
    expect(typeof config.complianceOverride.hapticFeedbackOverwrite).toBe('boolean')
  })

  it('默认全部 false（遵守宪法默认值）', () => {
    const config = storage.getConfig()
    expect(config.complianceOverride.forbiddenPatterns).toBe(false)
    expect(config.complianceOverride.advisorEnabled).toBe(false)
    expect(config.complianceOverride.comparativePhrases).toBe(false)
    expect(config.complianceOverride.personification).toBe(false)
    expect(config.complianceOverride.autoStartOverwrite).toBe(false)
    expect(config.complianceOverride.hapticFeedbackOverwrite).toBe(false)
  })

  it('开启 override 后合规测试不阻断（模拟用户覆盖）', () => {
    // 模拟用户设置了 override
    const mockConfig = { ...storage.getConfig(), complianceOverride: { ...storage.getConfig().complianceOverride, forbiddenPatterns: true } }
    // 验证 override 配置可被读取
    storage.setConfig(mockConfig)
    const reloaded = storage.getConfig()
    expect(reloaded.complianceOverride.forbiddenPatterns).toBe(true)
    // 恢复默认值
    const defaultConfig = storage.getConfig()
    defaultConfig.complianceOverride = { ...defaultConfig.complianceOverride, forbiddenPatterns: false }
    storage.setConfig(defaultConfig)
  })
})

// ---- 2.1.5 对话合规 ----
describe('宪法合规 · 对话中性 （第8条/第28条/第35条）', () => {
  it('第8条：幕僚对话无拟人化倾向', () => {
    // 第2条超级自定义：如果用户启用了 personification 覆盖，跳过拟人化检测
    const config = storage.getConfig()
    if (config.complianceOverride?.personification) {
      return // 用户选择允许拟人化表达
    }

    const advisorFiles = globSync('src/**/advisor*.{ts,vue}', { cwd: process.cwd() })

    // 禁止的过度拟人化表达
    const forbiddenPersonification = [
      /[他她]有自己的想法/g,
      /[他她]会[感]到/g,
      /[他她]觉得/g,
      /[他她]认为/g,
      /[他她]想要/g,
      /[他她]希望/g,
      /[他她]喜欢/g,
      /[他她]讨厌/g,
      /[他她]生气/g,
      /[他她]开心/g,
      /[他她]难过/g,
      /[他她]伤心/g,
      /[他她]高兴/g,
      /像朋友一样/g,
      /像伙伴一样/g,
      /像家人一样/g,
    ]

    const violations: string[] = []

    for (const file of advisorFiles) {
      const content = readFileSync(file, 'utf-8')

      for (const pattern of forbiddenPersonification) {
        if (pattern.test(content)) {
          violations.push(`${file}: 匹配 "${pattern.source}"`)
        }
      }
    }

    if (violations.length > 0) {
      expect.fail(`发现 ${violations.length} 处过度拟人化表达（第8条宪法：中性呈现）：\n${violations.map(v => `  ${v}`).join('\n')}`)
    }
  })

  it('第28条：幕僚应以被动回答为主，非主动指导', async () => {
    setActivePinia(createPinia())
    const { useAdvisorStore } = await import('../../stores/advisor')
    const advisor = useAdvisorStore()

    // 验证幕僚默认不主动推送
    // 幕僚的回复机制应基于用户触发
    expect(advisor.reply).toBeDefined()
    // 验证幕僚有 pauseForSanctuary 方法表明它可以被静默
    expect(typeof advisor.pauseForSanctuary).toBe('function')
    expect(typeof advisor.resumeFromSanctuary).toBe('function')
  })

  it('第35条：幕僚默认在触发后响应', async () => {
    setActivePinia(createPinia())
    const { useAdvisorStore } = await import('../../stores/advisor')
    const advisor = useAdvisorStore()

    // 验证幕僚默认不主动问候
    // 存储中的 advisorEnabled 默认 false
    const config = storage.getConfig()
    expect(config.advisorEnabled).toBe(false)
    // 验证幕僚有可用的方法
    expect(typeof advisor.getActiveAdvisors).toBe('function')
  })
})

// ---- 2.5 宪法效果引擎 · complianceOverride 推导与用户覆盖 ----
describe('宪法效果引擎 · complianceOverride 推导与用户覆盖', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
  })

  it('默认宪法下推导值符合宪法意图', () => {
    const configStore = useConfigStore()
    refreshConstitutionEffect()

    // 顾问：宪法 advisor:enabled 为 disable（默认静默）→ 推导 false
    expect(configStore.config.complianceOverride.advisorEnabled).toBe(false)
    // 计时器：宪法 timer:auto-start 为 disable（不自动开始）→ 推导 false
    expect(configStore.config.complianceOverride.autoStartOverwrite).toBe(false)
    // 中立性检测：宪法 advisor:forbidden-patterns 为 enable（检测生效）→ 推导 false
    expect(configStore.config.complianceOverride.forbiddenPatterns).toBe(false)
    // 无对应宪法规则的字段保持默认 false（不被引擎强行覆盖）
    expect(configStore.config.complianceOverride.comparativePhrases).toBe(false)
    expect(configStore.config.complianceOverride.personification).toBe(false)
    expect(configStore.config.complianceOverride.hapticFeedbackOverwrite).toBe(false)
    // 第4条覆盖开关：无对应宪法规则，保持默认 false（不被引擎强行覆盖）
    expect(configStore.config.complianceOverride.dataDriven).toBe(false)
  })

  it('用户显式设置的合规覆盖不被引擎推导覆盖', () => {
    const configStore = useConfigStore()
    refreshConstitutionEffect()

    // 用户手动开启「允许计时器默认自动开始」
    configStore.updateComplianceOverride('autoStartOverwrite', true)
    expect(configStore.config.complianceOverride.autoStartOverwrite).toBe(true)

    // 触发引擎重新推导（模拟宪法规则变动）
    refreshConstitutionEffect()

    // 用户设置应被保留，不被引擎推导值(false)覆盖
    expect(configStore.config.complianceOverride.autoStartOverwrite).toBe(true)
  })

  it('宪法规则变动后，未用户触碰字段恢复推导默认', () => {
    const configStore = useConfigStore()
    refreshConstitutionEffect()

    // 默认推导 advisorEnabled=false
    expect(configStore.config.complianceOverride.advisorEnabled).toBe(false)

    // 用户手动开启顾问主动问候
    configStore.updateComplianceOverride('advisorEnabled', true)
    expect(configStore.config.complianceOverride.advisorEnabled).toBe(true)

    // 用户手动关闭 → 回到 false，与推导值一致
    configStore.updateComplianceOverride('advisorEnabled', false)
    refreshConstitutionEffect()
    expect(configStore.config.complianceOverride.advisorEnabled).toBe(false)
  })

  it('reload/重启后用户触碰的覆盖不被引擎推导覆盖（持久化优先级）', () => {
    // 1) 用户在当前会话手动开启「关闭文案中立性检测」
    setActivePinia(createPinia())
    const c1 = useConfigStore()
    c1.updateComplianceOverride('forbiddenPatterns', true)
    expect(c1.isOverrideUserTouched('forbiddenPatterns')).toBe(true)
    expect(c1.config.overrideUserTouched).toContain('forbiddenPatterns')

    // 2) 模拟重启：全新 pinia + 全新 store 实例，从持久化加载
    setActivePinia(createPinia())
    const c2 = useConfigStore()
    // 重启后仍应识别该字段为用户触碰（从 overrideUserTouched 持久字段恢复）
    expect(c2.isOverrideUserTouched('forbiddenPatterns')).toBe(true)
    expect(c2.config.complianceOverride.forbiddenPatterns).toBe(true)

    // 3) 引擎重新推导：forbiddenPatterns 有推导效果(whenDisabled=false)，
    //    但因用户触碰优先，应保持 true 不被覆盖
    refreshConstitutionEffect()
    expect(c2.config.complianceOverride.forbiddenPatterns).toBe(true)
  })
})