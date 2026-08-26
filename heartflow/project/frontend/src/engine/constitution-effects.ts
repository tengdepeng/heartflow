// ============================================================
// 心流工坊 · 宪法效果定义
// 每条弹性规则对应一个或多个产品行为效果
// 当规则启用时，自动应用效果；禁用时，恢复默认行为
// ============================================================

import type { MutableRule } from '../types'

// ---- 效果类型 ----

/** 效果作用目标 */
export type EffectTarget =
  | 'advisor:enabled'           // 幕僚主动问候/推送
  | 'advisor:personification'   // 幕僚拟人化表达
  | 'advisor:forbidden-patterns'// 幕僚文案中立性检测
  | 'advisor:comparative'       // 幕僚比较性文案检测
  | 'timer:auto-start'          // 计时器默认自动开始
  | 'timer:pause-interval'      // 暂停间隔（允许操作间暂停）
  | 'haptic:feedback'           // 触觉反馈
  | 'ui:particle-density'       // 粒子密度
  | 'ui:notification'           // 界面通知/提示
  | 'ui:animate-speed'          // 动画速度
  | 'ui:empty-space'            // 空白余量
  | 'ui:silence'               // 静默留白
  | 'ui:breathing-speed'        // 呼吸动画速度
  | 'sanctuary:enable'          // 安全岛功能
  | 'sanctuary:auto-exit'       // 安全岛自动退出
  | 'data:auto-archive'         // 自动归档
  | 'data:cleanup'              // 数据清理
  | 'data:unfinished'           // 未完成状态保留
  | 'behavior:tracking'         // 行为追踪
  | 'behavior:reminder'         // 行为提醒
  | 'emotion:visualization'     // 情绪可视化
  | 'emotion:neutral'           // 情绪中性呈现
  | 'relation:auto-analyze'     // 关系自动分析
  | 'relation:unbounded'        // 关系留白
  | 'note:auto-categorize'      // 笔记自动分类
  | 'note:fragment'             // 片段记录
  | 'stats:comparison'          // 统计比较性展示
  | 'stats:show-panel'          // 统计面板显示
  | 'gesture:enable'            // 手势导航
  | 'gesture:haptic'            // 手势触觉反馈
  | 'focus:auto-start'          // 专注自动开始
  | 'focus:interrupt'           // 允许中断
  | 'focus:return'              // 返回入口
  | 'scene:transition'          // 场景切换
  | 'scene:preset'              // 场景预设
  | 'share:local-only'          // 分享仅本地/P2P（不经官方服务器）
  | 'seed:inherit'              // 时间种子·遗传
  | 'seed:scope'                // 时间种子·传递范围
  | 'seed:revoke'               // 时间种子·收回
  | 'scene:night-dim'           // 夜静调暗
  | 'scene:sabbath'             // 数字安息日
  | 'advisor:long-dormancy'     // 长眠守护

/** 效果类型 */
export type EffectType = 'enable' | 'disable' | 'reduce' | 'increase' | 'set'

/** 宪法效果定义 */
export interface ConstitutionEffect {
  /** 关联的规则 ID */
  ruleId: string
  /** 效果目标 */
  target: EffectTarget
  /** 效果类型 */
  type: EffectType
  /** 效果值（可选） */
  value?: number | string | boolean
  /** 效果描述（用户可见） */
  description: string
  /** 效果影响范围描述 */
  scope: string
}

// ---- 默认效果映射 ----
// 每条弹性规则生效时对应的产品行为效果
// 规则的"开启"意味着这些效果被应用

export const DEFAULT_EFFECT_MAP: ConstitutionEffect[] = [
  // === 心流第一 ===
  {
    ruleId: 'elastic-flow-first',
    target: 'advisor:enabled',
    type: 'disable',
    description: '幕僚不主动打扰，保持心流沉浸',
    scope: '幕僚不再主动问候或推送消息',
  },
  {
    ruleId: 'elastic-flow-first',
    target: 'ui:notification',
    type: 'reduce',
    value: 0.3,
    description: '减少界面通知，降低干扰',
    scope: '系统通知频率降低至 30%',
  },

  // === 数据驱动自我探索 ===
  {
    ruleId: 'elastic-data-driven',
    target: 'stats:show-panel',
    type: 'enable',
    description: '数据显示面板默认开启',
    scope: '统计数据面板自动显示',
  },
  {
    ruleId: 'elastic-data-driven',
    target: 'emotion:visualization',
    type: 'enable',
    description: '情绪数据可视化展示',
    scope: '情绪记录以可视化图表呈现',
  },

  // === 按需开启 ===
  {
    ruleId: 'elastic-exploration',
    target: 'timer:auto-start',
    type: 'disable',
    description: '计时器不自动开始，等待用户触发',
    scope: '计时器默认处于待命状态',
  },
  {
    ruleId: 'elastic-exploration',
    target: 'focus:auto-start',
    type: 'disable',
    description: '专注模式不自动启动',
    scope: '专注需要用户手动开始',
  },
  // === 按需开启（第5条·无推送） ===
  {
    ruleId: 'elastic-exploration',
    target: 'ui:notification',
    type: 'disable',
    description: '禁止主动推送系统通知（无推送/无弹窗/无红点）',
    scope: '不调用浏览器/桌面 OS 通知，仅保留应用内极淡提示',
  },
  {
    ruleId: 'elastic-exploration',
    target: 'gesture:enable',
    type: 'enable',
    description: '手势导航可用（用户主动画圈/滑动触发界面操作）',
    scope: '用户可通过手势在界面间导航；关闭后回退为点按交互',
  },
  {
    ruleId: 'elastic-exploration',
    target: 'haptic:feedback',
    type: 'disable',
    description: '触觉反馈默认关闭（守第5条·无推送/无默认触觉；用户可主动开启）',
    scope: '默认不附带触觉反馈；用户于设置中显式开启后方可使用',
  },

  // === 持续使用 ===
  {
    ruleId: 'elastic-belonging',
    target: 'data:auto-archive',
    type: 'disable',
    description: '不自动归档旧数据',
    scope: '所有数据持续保留，不自动归档',
  },

  // === 中性呈现 ===
  {
    ruleId: 'elastic-faceless',
    target: 'advisor:forbidden-patterns',
    type: 'enable',
    description: '启用文案中立性检测',
    scope: '禁止评价性、指令性文案',
  },
  {
    ruleId: 'elastic-faceless',
    target: 'advisor:comparative',
    type: 'enable',
    description: '启用比较性文案检测（禁攀比/比较性表达）',
    scope: '幕僚文案禁止比较、评判式表达，保持中立',
  },
  {
    ruleId: 'elastic-faceless',
    target: 'advisor:personification',
    type: 'enable',
    description: '启用拟人化表达约束（无脸人）',
    scope: '幕僚不拟人化呈现，保持无脸人设定',
  },
  {
    ruleId: 'elastic-faceless',
    target: 'emotion:neutral',
    type: 'enable',
    description: '情绪中性呈现，不做价值判断',
    scope: '情绪记录不附带正负评价',
  },

  // === 长期可用 ===
  {
    ruleId: 'elastic-safety',
    target: 'data:cleanup',
    type: 'disable',
    description: '不自动清理历史数据',
    scope: '所有历史记录长期保留',
  },

  // === 时间/精力/情绪可视化 ===
  {
    ruleId: 'elastic-visualization',
    target: 'stats:show-panel',
    type: 'enable',
    description: '时间/精力/情绪数据可视化',
    scope: '统计面板显示时间、精力、情绪趋势',
  },

  // === 自我照料 ===
  {
    ruleId: 'elastic-self-care',
    target: 'data:unfinished',
    type: 'enable',
    description: '允许保留未完成状态',
    scope: '未完成的内容可保留，不强制终结',
  },
  {
    ruleId: 'elastic-self-care',
    target: 'focus:interrupt',
    type: 'enable',
    description: '允许专注过程中中断',
    scope: '专注可随时暂停或中断',
  },

  // === 关系留白 ===
  {
    ruleId: 'elastic-relation',
    target: 'relation:unbounded',
    type: 'enable',
    description: '关系记录不预设结论',
    scope: '关系内容仅记录，不做自动分析',
  },
  {
    ruleId: 'elastic-relation',
    target: 'relation:auto-analyze',
    type: 'disable',
    description: '不自动分析关系模式',
    scope: '关系数据保持原始记录状态',
  },

  // === 安静区域 ===
  {
    ruleId: 'elastic-sanctuary',
    target: 'sanctuary:enable',
    type: 'enable',
    description: '安全岛功能可用',
    scope: '可通过五击进入安全岛模式',
  },
  {
    ruleId: 'elastic-sanctuary',
    target: 'ui:particle-density',
    type: 'reduce',
    value: 0.5,
    description: '降低界面粒子密度，减少视觉刺激',
    scope: '粒子动画密度降低至 50%',
  },

  // === 持续保留 ===
  {
    ruleId: 'elastic-eternal',
    target: 'data:auto-archive',
    type: 'disable',
    description: '数据不自动归档',
    scope: '所有内容持续保留在当前位置',
  },

  // === 未完成状态 ===
  {
    ruleId: 'elastic-unfinished',
    target: 'data:unfinished',
    type: 'enable',
    description: '未完成内容可继续编辑',
    scope: '未完成的状态保留并可后续补充',
  },

  // === 变更痕迹 ===
  {
    ruleId: 'elastic-scar',
    target: 'data:auto-archive',
    type: 'disable',
    description: '变更痕迹不被自动归档',
    scope: '所有修改痕迹保留可见',
  },

  // === 不代替判断 ===
  {
    ruleId: 'elastic-accompany',
    target: 'advisor:forbidden-patterns',
    type: 'enable',
    description: '幕僚不代替用户做判断',
    scope: '幕僚仅提供记录和支持，不做结论',
  },
  {
    ruleId: 'elastic-accompany',
    target: 'relation:auto-analyze',
    type: 'disable',
    description: '不自动分析关系',
    scope: '关系数据保持原始状态',
  },

  // === 轻量记录 ===
  {
    ruleId: 'elastic-light-memory',
    target: 'note:fragment',
    type: 'enable',
    description: '支持片段式记录',
    scope: '笔记可保持片段形式，无需整理为完整结构',
  },

  // === 允许中断 ===
  {
    ruleId: 'elastic-forget',
    target: 'focus:interrupt',
    type: 'enable',
    description: '允许随时中断专注',
    scope: '专注状态可随时中断而不受惩罚',
  },
  {
    ruleId: 'elastic-forget',
    target: 'focus:return',
    type: 'enable',
    description: '中断后可从当前位置继续',
    scope: '中断后返回时保留上下文',
  },

  // === 触发后响应 ===
  {
    ruleId: 'elastic-response',
    target: 'advisor:enabled',
    type: 'disable',
    description: '幕僚默认静默，用户触发后响应',
    scope: '幕僚不主动发起对话',
  },
  {
    ruleId: 'elastic-response',
    target: 'ui:notification',
    type: 'reduce',
    value: 0.2,
    description: '通知仅由用户操作触发',
    scope: '系统通知频率降低至 20%',
  },

  // === 允许未定义 ===
  {
    ruleId: 'elastic-unclear',
    target: 'note:auto-categorize',
    type: 'disable',
    description: '笔记不自动分类',
    scope: '笔记保持原始状态，不强制归类',
  },

  // === 容器式呈现 ===
  {
    ruleId: 'elastic-container',
    target: 'advisor:forbidden-patterns',
    type: 'enable',
    description: '幕僚仅作为容器呈现内容',
    scope: '幕僚不主动扩展内容含义',
  },

  // === 重新进入 ===
  {
    ruleId: 'elastic-beginning',
    target: 'focus:return',
    type: 'enable',
    description: '重新进入时保留当前状态',
    scope: '每次进入从上一次状态继续',
  },

  // === 静默留白 ===
  {
    ruleId: 'elastic-silence',
    target: 'ui:silence',
    type: 'enable',
    description: '界面保留空白区域',
    scope: '界面不持续输出内容，保留静默空间',
  },
  {
    ruleId: 'elastic-silence',
    target: 'ui:notification',
    type: 'reduce',
    value: 0.1,
    description: '大幅减少通知提示',
    scope: '系统通知频率降低至 10%',
  },

  // === 使用节律 ===
  {
    ruleId: 'elastic-rhythm',
    target: 'behavior:reminder',
    type: 'disable',
    description: '不强制提醒使用节律',
    scope: '不按固定频率提醒用户使用',
  },
  {
    ruleId: 'elastic-rhythm',
    target: 'ui:animate-speed',
    type: 'reduce',
    value: 0.9,
    description: '界面动画节奏放缓',
    scope: '全局过渡与微动画速度降至 90%，更从容',
  },

  // === 边界设置 ===
  {
    ruleId: 'elastic-boundary',
    target: 'emotion:visualization',
    type: 'enable',
    description: '情绪可视化范围可由用户设定',
    scope: '用户可自定义情绪数据的展示范围',
  },

  // === 延时显现 ===
  {
    ruleId: 'elastic-patience',
    target: 'data:unfinished',
    type: 'enable',
    description: '内容可延时补充完善',
    scope: '不要求首次记录即完整',
  },

  // === 暂停间隔 ===
  {
    ruleId: 'elastic-breath',
    target: 'timer:pause-interval',
    type: 'enable',
    description: '允许操作间暂停间隔',
    scope: '专注之间可保留暂停间隔',
  },
  {
    ruleId: 'elastic-breath',
    target: 'ui:breathing-speed',
    type: 'set',
    value: 0.8,
    description: '呼吸动画速度减缓',
    scope: '界面呼吸动画节奏放缓',
  },

  // === 片段记录 ===
  {
    ruleId: 'elastic-wholeness',
    target: 'note:fragment',
    type: 'enable',
    description: '支持片段式独立记录',
    scope: '笔记片段可独立存在',
  },

  // === 多面呈现 ===
  {
    ruleId: 'elastic-light-shadow',
    target: 'emotion:neutral',
    type: 'enable',
    description: '多面情绪中性呈现',
    scope: '不同情绪并列展示，不做价值排序',
  },

  // === 日常记录 ===
  {
    ruleId: 'elastic-daily-trace',
    target: 'note:fragment',
    type: 'enable',
    description: '支持细小日常记录',
    scope: '细小日常片段可单独记录',
  },

  // === 静止状态 ===
  {
    ruleId: 'elastic-stillness',
    target: 'data:unfinished',
    type: 'enable',
    description: '允许记录静止状态',
    scope: '无进展的状态也可保留记录',
  },

  // === 变化过程 ===
  {
    ruleId: 'elastic-flowing',
    target: 'data:auto-archive',
    type: 'disable',
    description: '变化过程不被归档',
    scope: '内容变化过程完整保留',
  },

  // === 细微事项 ===
  {
    ruleId: 'elastic-tiny-weight',
    target: 'note:fragment',
    type: 'enable',
    description: '支持细微事项独立记录',
    scope: '不论体量大小均可记录',
  },

  // === 间隔保留 ===
  {
    ruleId: 'elastic-distance',
    target: 'data:auto-archive',
    type: 'disable',
    description: '间隔内容不被自动归档',
    scope: '记录间存在较长间隔也可保留',
  },
  {
    ruleId: 'elastic-distance',
    target: 'behavior:reminder',
    type: 'disable',
    description: '不因间隔提醒用户',
    scope: '长时间未使用也不提醒',
  },

  // === 重复动作 ===
  {
    ruleId: 'elastic-ritual',
    target: 'behavior:tracking',
    type: 'enable',
    description: '支持重复动作追踪',
    scope: '重复动作可被追踪记录',
  },

  // === 并存状态 ===
  {
    ruleId: 'elastic-acceptance',
    target: 'emotion:neutral',
    type: 'enable',
    description: '矛盾情绪可并存呈现',
    scope: '相互矛盾的感受可同时存在',
  },

  // === 低干扰环境 ===
  {
    ruleId: 'elastic-inner-peace',
    target: 'ui:particle-density',
    type: 'reduce',
    value: 0.4,
    description: '大幅降低粒子密度',
    scope: '界面粒子动画密度降低至 40%',
  },
  {
    ruleId: 'elastic-inner-peace',
    target: 'ui:notification',
    type: 'reduce',
    value: 0.15,
    description: '减少通知提示',
    scope: '系统通知频率降低至 15%',
  },

  // === 最小提示 ===
  {
    ruleId: 'elastic-glimmer',
    target: 'ui:notification',
    type: 'reduce',
    value: 0.2,
    description: '提示保持最小化',
    scope: '仅提供操作所需的最小信息',
  },

  // === 返回入口 ===
  {
    ruleId: 'elastic-return',
    target: 'focus:return',
    type: 'enable',
    description: '中断后提供返回入口',
    scope: '中断后可从现有记录继续',
  },

  // === 空白余量 ===
  {
    ruleId: 'elastic-slack',
    target: 'ui:empty-space',
    type: 'enable',
    description: '界面保留空白余量',
    scope: '界面中保留非任务化空白区域',
  },
  {
    ruleId: 'elastic-slack',
    target: 'ui:silence',
    type: 'enable',
    description: '保留空白静默区域',
    scope: '不以填满界面为目标',
  },

  // === 交汇记录 ===
  {
    ruleId: 'elastic-convergence',
    target: 'note:fragment',
    type: 'enable',
    description: '不同主题内容可并列呈现',
    scope: '不同主题的记录可在同一空间并列',
  },

  // === 长期积累 ===
  {
    ruleId: 'elastic-rooting',
    target: 'data:auto-archive',
    type: 'disable',
    description: '长期积累数据不被归档',
    scope: '长期积累的内容保留时间层次',
  },

  // === 沉默的默认（第52条） ===
  // 与第5条(ui:notification disable)叠加，显性化「默认不主动」：无推送/弹窗/红点。
  // 例外（年度对话/安全提醒/光笺/定音锤确认）由对应模块在守护室逐项开关，不在此处放开。
  {
    ruleId: 'elastic-silent-default',
    target: 'ui:notification',
    type: 'disable',
    description: '殿堂与幕僚默认不主动推送、弹窗、红点',
    scope: 'OS 级与应用内主动通知默认关闭，仅保留用户预约/守护室逐项开启的例外',
  },

  // === 第43条 分享的本地边界 ===
  {
    ruleId: 'elastic-share-local',
    target: 'share:local-only',
    type: 'enable',
    description: '社区分享/模板交换仅经本地文件或 P2P，不经官方服务器',
    scope: '社区内容交换不触云，不强制云端账号；下载内容不含个人数据',
  },

  // === 第44条 禁打扰红线 ===
  {
    ruleId: 'elastic-no-disturb',
    target: 'ui:notification',
    type: 'disable',
    description: '禁止推送/弹窗/广告/诱导打卡/制造焦虑',
    scope: '任何插件/模板/社区内容不得包含主动打扰设计（与第5/52条叠加）',
  },

  // === 第45条 禁攀比红线 ===
  {
    ruleId: 'elastic-no-comparison',
    target: 'stats:comparison',
    type: 'disable',
    description: '禁用排行榜/攀比/连续签到/落后提醒',
    scope: '成长只与用户自己比较，不与他人排名',
  },

  // === 第46条 时间种子的遗传 ===
  {
    ruleId: 'elastic-seed-inherit',
    target: 'seed:inherit',
    type: 'enable',
    description: '可将时间投入打包为时间种子主动传递',
    scope: '传递非自动同步，接收方庭院里为有来源标记的切片（可种下/观赏/拒绝）',
  },

  // === 第47条 遗传的范围 ===
  {
    ruleId: 'elastic-seed-scope',
    target: 'seed:scope',
    type: 'enable',
    description: '可选传递类型与细节范围，发送前预览',
    scope: '守护室有完整传递日志，可随时查看传递给谁、何时',
  },

  // === 第48条 遗传的停止 ===
  {
    ruleId: 'elastic-seed-revoke',
    target: 'seed:revoke',
    type: 'enable',
    description: '可随时收回已传递的时间种子',
    scope: '收回后切片变暗为半透明不可展开标记（注明来源已收回）',
  },

  // === 第49条 夜静调暗 ===
  {
    ruleId: 'elastic-night-dim',
    target: 'scene:night-dim',
    type: 'enable',
    description: '晚十点后殿堂自动调暗、幕僚不再主动说话',
    scope: '每日夜间节律性降刺激',
  },
  {
    ruleId: 'elastic-night-dim',
    target: 'scene:transition',
    type: 'reduce',
    value: 0.7,
    description: '夜间场景切换放缓（更柔和的过渡）',
    scope: '夜静模式下场景过渡时长降低至 70%，营造安静节律',
  },

  // === 第50条 数字安息日 ===
  {
    ruleId: 'elastic-digital-sabbath',
    target: 'scene:sabbath',
    type: 'enable',
    description: '每周日殿堂入口关闭，不接收任何通知',
    scope: '周期性数字断联',
  },

  // === 第51条 长眠守护 ===
  {
    ruleId: 'elastic-long-dormancy',
    target: 'advisor:long-dormancy',
    type: 'enable',
    description: '连续三月未打开殿堂，所有幕僚进入沉睡',
    scope: '长期不活跃后的安静收束',
  },
]

// ---- 效果查询 ----

/** 获取指定规则的所有效果 */
export function getEffectsByRuleId(ruleId: string): ConstitutionEffect[] {
  return DEFAULT_EFFECT_MAP.filter(e => e.ruleId === ruleId)
}

/** 获取指定目标的所有相关效果 */
export function getEffectsByTarget(target: EffectTarget): ConstitutionEffect[] {
  return DEFAULT_EFFECT_MAP.filter(e => e.target === target)
}

/** 获取所有启用的规则对应的效果列表 */
export function getActiveEffects(rules: MutableRule[]): ConstitutionEffect[] {
  const enabledIds = new Set(rules.filter(r => r.enabled).map(r => r.id))
  return DEFAULT_EFFECT_MAP.filter(e => enabledIds.has(e.ruleId))
}

/** 获取所有禁用的规则对应的效果列表 */
export function getInactiveEffects(rules: MutableRule[]): ConstitutionEffect[] {
  const disabledIds = new Set(rules.filter(r => !r.enabled).map(r => r.id))
  return DEFAULT_EFFECT_MAP.filter(e => disabledIds.has(e.ruleId))
}

/** 按目标分组效果 */
export function groupEffectsByTarget(effects: ConstitutionEffect[]): Map<EffectTarget, ConstitutionEffect[]> {
  const map = new Map<EffectTarget, ConstitutionEffect[]>()
  for (const effect of effects) {
    const list = map.get(effect.target) ?? []
    list.push(effect)
    map.set(effect.target, list)
  }
  return map
}

// ---- 运行时生效判定 ----

/**
 * 已接入运行时效果的目标集合：被运行时逻辑门控、complianceOverride 或 CSS 变量实际消费。
 * 仅这些目标在被规则启用时真正改变产品行为；其余 EffectTarget 虽被声明，
 * 但当前没有组件 / override 读取，属「声明式」——开关不改变运行时。
 *
 * 该集合是「宪法之实」诚实度的单一事实源：宪法编辑器据此给每条条款标
 * 「生效中 / 声明式·不影响运行时」，避免用户误以为所有开关都会改变产品。
 */
export const CONSUMED_TARGETS: ReadonlySet<EffectTarget> = new Set<EffectTarget>([
  'advisor:enabled',
  'advisor:forbidden-patterns',
  'advisor:comparative',
  'advisor:personification',
  'timer:auto-start',
  'focus:auto-start',
  'haptic:feedback',
  'ui:notification',
  'ui:particle-density',
  'ui:animate-speed',
  'ui:breathing-speed',
  'scene:transition',
  'ui:empty-space',
  'ui:silence',
  // 注意：sanctuary:enable 不在 CONSUMED_TARGETS 中。桌面静默覆盖（useDesktopSilentOverlay）
  // 直接读取 elastic-sanctuary 规则（useRuleEnabled('elastic-sanctuary')），而非经由
  // isTargetActive('sanctuary:enable') 效果目标系统；本集合仅登记「经 isTargetActive 消费的
  // 效果目标」。故 sanctuary:enable 在账本中保持声明式（consumed:false），与
  // effect-consumer-map 的诚实分类一致——移除该残留条目以修复账本/引擎一致性误标。
  'scene:night-dim',
  'scene:sabbath',
  'advisor:long-dormancy',
  'seed:inherit',
  'seed:scope',
  'seed:revoke',
  'share:local-only',
  'gesture:enable',
  'stats:show-panel',
  'emotion:visualization',
  'relation:auto-analyze',
  'behavior:reminder',
  // data:auto-archive：任务②落地——自动归档引擎（modules/archive/auto-archive.ts）
  // 经 isTargetActive 运行时门控；默认由 elastic-eternal disable 规则关闭，零动作。
  // 归入真实消费集，与 effect-consumer-map 的 module-gate 分类保持一致（反漂移同源）。
  'data:auto-archive',
  // data:cleanup：任务② B 类样板——手动数据整理（modules/data-sovereignty/manual-cleanup.ts）
  // 经 isTargetActive 运行时门控；默认由 elastic-safety disable 规则关闭，入口不渲染。
  // 归入真实消费集，与 effect-consumer-map 的 module-gate 分类保持一致（反漂移同源）。
  'data:cleanup',
  // emotion:neutral：任务②落地——情绪中性呈现（views/EmotionGarden.vue 根 ambient 类
  // 经 isTargetActive 运行时门控）；默认关闭→保持氛围辉光。归入真实消费集，与
  // effect-consumer-map 的 composable 分类保持一致（反漂移同源）。
  'emotion:neutral',
])

/** 规则是否对运行时产生可见效果（其效果目标中至少有一个已被消费） */
export function ruleHasRuntimeEffect(ruleId: string): boolean {
  return DEFAULT_EFFECT_MAP.some(e => e.ruleId === ruleId && CONSUMED_TARGETS.has(e.target))
}