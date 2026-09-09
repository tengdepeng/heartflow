// ============================================================
// 心流工坊 · 宪法状态管理
// 前 2 条为不可变核心条款（本地私有、超级自定义），硬编码不可修改
//   —— 对应蓝图17 宪法分级：第1-2条【强制·内核级·不可关闭】；第3-52条【可选·可关闭】
// 第 3-52 条为弹性宪法，用户可自由开关/修改/删除
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ImmutableRule, MutableRule, Constitution } from '../types'
import { storage } from '../engine/storage'

// ---- 宪法前 2 条 · 不可变核心（蓝图原始表述，不可改动） ----
const CORE_IMMUTABLE_RULES: ImmutableRule[] = [
  {
    id: 'core-local-private',
    title: '本地私有',
    description: '所有数据仅存储于用户本地设备，不上传任何云端。用户对自己的数据拥有完全的所有权和控制权。',
    icon: '💻',
    type: 'value',
  },
  {
    id: 'core-super-custom',
    title: '超级自定义',
    description: '所有规则、界面、交互方式均可由用户自定义。没有强加的模式，只有用户选择的路径。',
    icon: '⚙️',
    type: 'value',
  },
]

// ---- 弹性宪法 · 默认条款（第 3-55 条，官方预置，用户可修改/删除） ----
// v21.3 依蓝图重排：第43/44/45条回归蓝图语义（感知的边界 / 幕僚的克制 / 遗忘的权利）；
// 原真码第43/44/45条（分享本地边界 / 禁打扰 / 禁攀比）顺延至第49/50/51条；
// 原第49/50/51条（夜静调暗 / 数字安息日 / 长眠守护）顺延至第53/54/55条。
// 用户自定义条款自第56条起。已初始化用户沿用本地持久化宪法，不受重排影响。
export const DEFAULT_ELASTIC_RULES: MutableRule[] = [
  {
    id: 'elastic-flow-first',
    title: '心流第一',
    description: '一切功能设计以维护和促进心流状态为首要目标。不打断、不推送、不干扰。工具服务于沉浸，而非相反。',
    type: 'value',
    enabled: true,
    order: 0,
    isDefault: true,
    articleNumber: 3,
  },
  {
    id: 'elastic-data-driven',
    title: '数据驱动自我探索',
    description: '所有功能围绕数据记录与自我认知展开。不提供结论，只提供洞察的原材料。用户是自己数据的解读者。',
    type: 'value',
    enabled: true,
    order: 1,
    isDefault: true,
    articleNumber: 4,
  },

  // ---- 以下为 v1.0 弹性条款（第5-42条） ----
  {
    id: 'elastic-exploration',
    title: '按需开启',
    description: '默认不主动打断当前使用过程。进入、查看与继续操作均由用户触发。',
    type: 'value',
    enabled: true,
    order: 0,
    isDefault: true,
    articleNumber: 5,
  },
  {
    id: 'elastic-belonging',
    title: '持续使用',
    description: '使用关系可随时间逐步形成，无需预设固定节奏或参与方式。',
    type: 'value',
    enabled: true,
    order: 1,
    isDefault: true,
    articleNumber: 7,
  },
  {
    id: 'elastic-faceless',
    title: '中性呈现',
    description: '界面与表达保持中性，不预设人格、身份或立场，不替用户作出解释。',
    type: 'value',
    enabled: true,
    order: 2,
    isDefault: true,
    articleNumber: 8,
  },
  {
    id: 'elastic-safety',
    title: '长期可用',
    description: '记录可保留并继续使用，不以会员、连续打卡或时效性机制作为前提。',
    type: 'value',
    enabled: true,
    order: 3,
    isDefault: true,
    articleNumber: 10,
  },
  {
    id: 'elastic-visualization',
    title: '时间/精力/情绪可视化',
    description: '时间、精力与情绪等记录可通过界面形式展示，便于查看与回顾。',
    type: 'value',
    enabled: true,
    order: 4,
    isDefault: true,
    articleNumber: 12,
  },
  {
    id: 'elastic-self-care',
    title: '自我照料',
    description: '允许保留休息、暂停与未完成状态，不将单一进度视为唯一标准。',
    type: 'value',
    enabled: true,
    order: 5,
    isDefault: true,
    articleNumber: 13,
  },
  {
    id: 'elastic-relation',
    title: '关系留白',
    description: '可为人与关系相关内容保留位置，但不预设关系结论或情感解释。',
    type: 'value',
    enabled: true,
    order: 6,
    isDefault: true,
    articleNumber: 15,
  },
  {
    id: 'elastic-sanctuary',
    title: '安静区域',
    description: '提供低干扰区域，用于减少视觉与交互刺激。',
    type: 'value',
    enabled: true,
    order: 7,
    isDefault: true,
    articleNumber: 16,
  },
  {
    id: 'elastic-eternal',
    title: '持续保留',
    description: '在本地存储条件满足时，内容可持续保留，不因短期未使用而自动失效。',
    type: 'value',
    enabled: true,
    order: 8,
    isDefault: true,
    articleNumber: 18,
  },
  {
    id: 'elastic-unfinished',
    title: '未完成状态',
    description: '允许保留未完成内容，并支持后续继续编辑或补充。',
    type: 'value',
    enabled: true,
    order: 9,
    isDefault: true,
    articleNumber: 21,
  },
  {
    id: 'elastic-scar',
    title: '变更痕迹',
    description: '可保留使用过程中的痕迹与变化记录，不将偏差或反复表述为问题定性。',
    type: 'value',
    enabled: true,
    order: 10,
    isDefault: true,
    articleNumber: 25,
  },
  {
    id: 'elastic-accompany',
    title: '不代替判断',
    description: '系统仅提供记录、呈现与操作支持，不代替用户作出判断、选择或结论。',
    type: 'value',
    enabled: true,
    order: 11,
    isDefault: true,
    articleNumber: 28,
  },
  {
    id: 'elastic-light-memory',
    title: '轻量记录',
    description: '历史内容可随时查看，默认以便于回顾的方式保留。',
    type: 'value',
    enabled: true,
    order: 12,
    isDefault: true,
    articleNumber: 33,
  },
  {
    id: 'elastic-forget',
    title: '允许中断',
    description: '不要求连续签到、持续记忆或固定频率使用。中断后可直接继续。',
    type: 'value',
    enabled: true,
    order: 13,
    isDefault: true,
    articleNumber: 34,
  },
  {
    id: 'elastic-response',
    title: '触发后响应',
    description: '交互响应以用户操作为起点，未触发时保持静默。',
    type: 'value',
    enabled: true,
    order: 14,
    isDefault: true,
    articleNumber: 35,
  },
  {
    id: 'elastic-unclear',
    title: '允许未定义',
    description: '允许保留未命名、未分类或原因不明的记录，不强制补全解释。',
    type: 'value',
    enabled: true,
    order: 15,
    isDefault: true,
    articleNumber: 39,
  },
  {
    id: 'elastic-container',
    title: '容器式呈现',
    description: '系统作为记录与查看的载体存在，不对内容含义作主动扩展。',
    type: 'value',
    enabled: true,
    order: 16,
    isDefault: true,
    articleNumber: 42,
  },
  // ---- 以下为 v1.0 补充弹性条款（第6、9、11、14、17、19、20、22、23、24、26、27、29、30、31、32、36、37、38、40、41条） ----
  {
    id: 'elastic-beginning',
    title: '重新进入',
    description: '每次进入均可从当前状态继续，无需先完成既往内容。',
    type: 'value',
    enabled: true,
    order: 17,
    isDefault: true,
    articleNumber: 6,
  },
  {
    id: 'elastic-silence',
    title: '静默留白',
    description: '允许界面与文案保留空白，不以持续输出填满每个时刻。',
    type: 'value',
    enabled: true,
    order: 18,
    isDefault: true,
    articleNumber: 9,
  },
  {
    id: 'elastic-rhythm',
    title: '使用节律',
    description: '支持快慢不一的使用节律，不以统一频率要求所有记录行为。',
    type: 'value',
    enabled: true,
    order: 19,
    isDefault: true,
    articleNumber: 11,
  },
  {
    id: 'elastic-boundary',
    title: '边界设置',
    description: '允许用户自行决定记录范围、展示范围与停止位置。',
    type: 'value',
    enabled: true,
    order: 20,
    isDefault: true,
    articleNumber: 14,
  },
  {
    id: 'elastic-patience',
    title: '延时显现',
    description: '部分内容可在后续逐步补充，不要求首次记录即形成完整说明。',
    type: 'value',
    enabled: true,
    order: 21,
    isDefault: true,
    articleNumber: 17,
  },
  {
    id: 'elastic-breath',
    title: '暂停间隔',
    description: '允许在操作之间保留暂停间隔，不以连续动作作为默认预期。',
    type: 'value',
    enabled: true,
    order: 22,
    isDefault: true,
    articleNumber: 19,
  },
  {
    id: 'elastic-wholeness',
    title: '片段记录',
    description: '单条片段可独立存在，无需先整理为完整结构。',
    type: 'value',
    enabled: true,
    order: 23,
    isDefault: true,
    articleNumber: 20,
  },
  {
    id: 'elastic-light-shadow',
    title: '多面呈现',
    description: '允许并列表达不同状态，不对状态作正负价值排序。',
    type: 'value',
    enabled: true,
    order: 24,
    isDefault: true,
    articleNumber: 22,
  },
  {
    id: 'elastic-daily-trace',
    title: '日常记录',
    description: '支持记录细小、重复或普通的日常片段。',
    type: 'value',
    enabled: true,
    order: 25,
    isDefault: true,
    articleNumber: 23,
  },
  {
    id: 'elastic-stillness',
    title: '静止状态',
    description: '允许记录暂停、停留或无明显进展的状态。',
    type: 'value',
    enabled: true,
    order: 26,
    isDefault: true,
    articleNumber: 24,
  },
  {
    id: 'elastic-flowing',
    title: '变化过程',
    description: '内容与状态可随时间变化，后续修改不会被视为前后矛盾。',
    type: 'value',
    enabled: true,
    order: 27,
    isDefault: true,
    articleNumber: 26,
  },
  {
    id: 'elastic-tiny-weight',
    title: '细微事项',
    description: '较小事项也可单独记录，不以体量大小决定是否保留。',
    type: 'value',
    enabled: true,
    order: 28,
    isDefault: true,
    articleNumber: 27,
  },
  {
    id: 'elastic-distance',
    title: '间隔保留',
    description: '允许记录与记录之间存在较长间隔，不将间隔自动解释为关系变化。',
    type: 'value',
    enabled: true,
    order: 29,
    isDefault: true,
    articleNumber: 29,
  },
  {
    id: 'elastic-ritual',
    title: '重复动作',
    description: '支持将重复出现的动作或步骤作为可追踪内容保留。',
    type: 'value',
    enabled: true,
    order: 30,
    isDefault: true,
    articleNumber: 30,
  },
  {
    id: 'elastic-acceptance',
    title: '并存状态',
    description: '允许相互并列或暂时矛盾的感受同时存在，不强制收敛为单一解释。',
    type: 'value',
    enabled: true,
    order: 31,
    isDefault: true,
    articleNumber: 31,
  },
  {
    id: 'elastic-inner-peace',
    title: '低干扰环境',
    description: '提供相对安静的使用环境，减少额外提示与信息噪声。',
    type: 'value',
    enabled: true,
    order: 32,
    isDefault: true,
    articleNumber: 32,
  },
  {
    id: 'elastic-glimmer',
    title: '最小提示',
    description: '提示信息保持克制，仅提供继续操作所需的最小信息。',
    type: 'value',
    enabled: true,
    order: 33,
    isDefault: true,
    articleNumber: 36,
  },
  {
    id: 'elastic-return',
    title: '返回入口',
    description: '中断后可从现有记录继续，不要求重新建立全部上下文。',
    type: 'value',
    enabled: true,
    order: 34,
    isDefault: true,
    articleNumber: 37,
  },
  {
    id: 'elastic-slack',
    title: '空白余量',
    description: '界面与流程中保留非任务化的空白区域，不以填满为目标。',
    type: 'value',
    enabled: true,
    order: 35,
    isDefault: true,
    articleNumber: 38,
  },
  {
    id: 'elastic-convergence',
    title: '交汇记录',
    description: '不同主题、对象或时间点的内容可在同一空间并列出现，无需统一口径。',
    type: 'value',
    enabled: true,
    order: 36,
    isDefault: true,
    articleNumber: 40,
  },
  {
    id: 'elastic-rooting',
    title: '长期积累',
    description: '支持记录长期累积形成的内容，并保留其时间层次。',
    type: 'value',
    enabled: true,
    order: 37,
    isDefault: true,
    articleNumber: 41,
  },

  // ---- 以下为 v1.0 弹性条款（第46、47、48、52条，蓝图明确列出但此前未入引擎） ----
  {
    id: 'elastic-seed-inherit',
    title: '记录的遗传',
    description: '用户可将任意一段已记录的时间投入打包为「时间种子」，主动传递给信任的人。传递非自动同步，接收方庭院里它是一枚独立的、有来源标记的切片，可种下/独立观赏/拒绝。种下后记录上同时有两圈光纹（自己与传递者）。时间种子一旦发出，发送方不可修改或撤回内容，但可删除自己记录上的原件。',
    type: 'value',
    enabled: true,
    order: 38,
    isDefault: true,
    articleNumber: 46,
  },
  {
    id: 'elastic-seed-scope',
    title: '遗传的范围',
    description: '用户可选择传递的时间投入类型（运动/游戏/观影/旅行/专注或任意组合），可选择传递全部细节或仅高亮摘要。确认发送前预览接收方将看到的内容。传递行为在守护室有完整日志，用户可随时查看传递过哪些时间种子、给谁、何时。',
    type: 'value',
    enabled: true,
    order: 39,
    isDefault: true,
    articleNumber: 47,
  },
  {
    id: 'elastic-seed-revoke',
    title: '遗传的停止',
    description: '用户可随时从接收方庭院收回自己传递的时间种子。收回后对应切片变暗为半透明不可展开标记（注明「来源已收回」），接收方衍生记录不受影响但原始种子不可再展开。发送时勾选「永久赠予」则放弃收回权，发出后不再可收回。',
    type: 'value',
    enabled: true,
    order: 40,
    isDefault: true,
    articleNumber: 48,
  },
  {
    id: 'elastic-perception-boundary',
    title: '感知的边界',
    description: '殿堂可以感知你的环境，但感知的边界由你划定。位置、光线、电量、网络状态、运动状态、时段——每一项感知都需要你逐项授权。感知数据不离开本地，不用于任何云端分析；感知层输出的不是原始数值，而是脱敏摘要。你可以在任何时候关闭任何一项感知，殿堂不会因此"变笨"——它只是少了一双眼睛，但依然是你认识的那个地方。宪法第43条，可随时关闭。',
    type: 'value',
    enabled: true,
    order: 41,
    isDefault: true,
    articleNumber: 43,
  },
  {
    id: 'elastic-advisor-restraint',
    title: '幕僚的克制',
    description: '幕僚可以陪伴你，但不能替代你。任何幕僚都不得代替用户做出决定、发送消息、执行交易、或代表用户与外部世界交互。幕僚的建议永远是"你可以考虑"，不是"你应该"；幕僚可以表达自己的看法，但必须明确标注"这是我的看法，不是事实"。用户有权在任何时候让任何幕僚沉默——不是删除，只是让它安静一会儿。宪法第44条，可随时关闭。',
    type: 'value',
    enabled: true,
    order: 42,
    isDefault: true,
    articleNumber: 44,
  },
  {
    id: 'elastic-forget-right',
    title: '遗忘的权利',
    description: '你有权遗忘，殿堂也有权替你遗忘。数据可以自然老化（超过一定时间自动变淡）、封存（手动归档，仍可查看但不会出现在日常视图中）、释放（永久删除，不可恢复）、冬眠（殿堂整体进入休眠状态，所有数据封存但保留）。遗忘不是失败——遗忘是记忆的呼吸。退出殿堂时，有六种方式：平静退出、满足退出、沉思退出、未完成退出、蜕变退出、循环退出。每一种退出方式都受到尊重，没有"正确的退出方式"。宪法第45条，可随时关闭。',
    type: 'value',
    enabled: true,
    order: 43,
    isDefault: true,
    articleNumber: 45,
  },
  {
    id: 'elastic-share-local',
    title: '分享的本地边界',
    description: '社区分享与模板交换仅经本地文件或 P2P 进行，不经官方服务器。下载内容不含个人数据，不强制云端账号。宪法第49条，可随时关闭。',
    type: 'value',
    enabled: true,
    order: 44,
    isDefault: true,
    articleNumber: 49,
  },
  {
    id: 'elastic-no-disturb',
    title: '禁打扰红线',
    description: '禁止推送、弹窗、广告、诱导打卡与制造焦虑的设计。任何插件、模板或社区内容不得包含主动打扰。宪法第50条，可随时关闭。',
    type: 'value',
    enabled: true,
    order: 45,
    isDefault: true,
    articleNumber: 50,
  },
  {
    id: 'elastic-no-comparison',
    title: '禁攀比红线',
    description: '禁用排行榜、与他人攀比、连续签到与落后提醒。成长只与用户自己比较，不与他人排名。宪法第51条，可随时关闭。',
    type: 'value',
    enabled: true,
    order: 46,
    isDefault: true,
    articleNumber: 51,
  },
  {
    id: 'elastic-silent-default',
    title: '沉默的默认',
    description: '殿堂与幕僚默认不主动：不推送、不弹窗、不红点、不主动问候。例外仅含（1）用户明确预约的提醒或年度对话；（2）人身安全守护中的紧急提醒；（3）心理安全体系光笺（仅检测持续性信号且用户在殿堂内时浮现，不弹窗不推送）；（4）镜我定音锤触发时的确认询问。所有例外由用户在守护室逐项开关，幕僚问候浮窗默认关闭、需逐幕僚逐场景授权。',
    type: 'value',
    enabled: true,
    order: 47,
    isDefault: true,
    articleNumber: 52,
  },
  {
    id: 'elastic-night-dim',
    title: '夜静调暗',
    description: '晚十点后殿堂自动调暗，幕僚不再主动说话，给夜晚留一处安静。宪法第53条，可随时关闭。',
    type: 'value',
    enabled: true,
    order: 48,
    isDefault: true,
    articleNumber: 53,
  },
  {
    id: 'elastic-digital-sabbath',
    title: '数字安息日',
    description: '每周日殿堂入口关闭，不接收任何通知，给自己一天完整的离线。宪法第54条，可随时关闭。',
    type: 'value',
    enabled: true,
    order: 49,
    isDefault: true,
    articleNumber: 54,
  },
  {
    id: 'elastic-long-dormancy',
    title: '长眠守护',
    description: '连续三月未打开殿堂，所有幕僚自然进入沉睡；重新互动即唤醒。让久未造访的伙伴安静歇着，不积攒未读。宪法第55条，可随时关闭。',
    type: 'value',
    enabled: true,
    order: 50,
    isDefault: true,
    articleNumber: 55,
  },
]

/** 默认宪法名称 */
const CONSTITUTION_NAME = '心流宪法'
const CONSTITUTION_VERSION = '1.0.0'

/** 宪法序言 */
const CONSTITUTION_PREAMBLE =
  '心流工坊用于本地记录与整理个人状态。以下条款用于说明默认使用原则，' +
  '前两条为固定核心条款（本地私有、超级自定义），其后条款可由用户增删与调整。'

function createDefaultConstitution(): Constitution {
  return {
    version: CONSTITUTION_VERSION,
    name: CONSTITUTION_NAME,
    preamble: CONSTITUTION_PREAMBLE,
    immutableRules: [...CORE_IMMUTABLE_RULES],
    mutableRules: DEFAULT_ELASTIC_RULES.map(r => ({ ...r })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export const useConstitutionStore = defineStore('constitution', () => {
  // ---- 状态 ----
  const constitution = ref<Constitution>(loadConstitution())

  // ---- 计算属性 ----
  const immutableRules = computed(() => constitution.value.immutableRules)
  const mutableRules = computed(() => constitution.value.mutableRules)
  const name = computed(() => constitution.value.name)
  const version = computed(() => constitution.value.version)
  const preamble = computed(() => constitution.value.preamble)
  const createdAt = computed(() => constitution.value.createdAt)
  const updatedAt = computed(() => constitution.value.updatedAt)

  /** 启用的可变规则数 */
  const enabledMutableCount = computed(() =>
    constitution.value.mutableRules.filter(r => r.enabled).length
  )

  /** 可变规则总数 */
  const totalMutableCount = computed(() => constitution.value.mutableRules.length)

  // ---- 初始化/加载 ----
  function loadConstitution(): Constitution {
    const stored = storage.getConstitution()
    if (stored) {
      // 确保 immutableRules 始终是核心 4 条（覆盖旧数据）
      stored.immutableRules = [...CORE_IMMUTABLE_RULES]
      // 旧数据可能缺少 preamble
      if (!stored.preamble) {
        stored.preamble = CONSTITUTION_PREAMBLE
      }
      return stored
    }
    return createDefaultConstitution()
  }

  /** 持久化到 storage */
  function persist(): void {
    constitution.value.updatedAt = new Date().toISOString()
    storage.setConstitution(constitution.value)
  }

  // ---- 可变规则 CRUD ----

  /** 获取下一个可用条款编号（从最高 articleNumber + 1） */
  function nextArticleNumber(): number {
    const maxArticle = constitution.value.mutableRules.reduce(
      (max, r) => Math.max(max, r.articleNumber ?? 0), 2
    )
    return maxArticle + 1
  }

  /** 添加规则 */
  function addRule(rule: Omit<MutableRule, 'id' | 'order'>): void {
    const maxOrder = constitution.value.mutableRules.reduce(
      (max, r) => Math.max(max, r.order), -1
    )
    const newRule: MutableRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      order: maxOrder + 1,
      articleNumber: nextArticleNumber(),
    }
    constitution.value.mutableRules.push(newRule)
    persist()
  }

  /** 更新规则 */
  function updateRule(id: string, updates: Partial<MutableRule>): void {
    const idx = constitution.value.mutableRules.findIndex(r => r.id === id)
    if (idx === -1) return
    constitution.value.mutableRules[idx] = {
      ...constitution.value.mutableRules[idx],
      ...updates,
    }
    persist()
  }

  /** 删除规则 */
  function removeRule(id: string): void {
    constitution.value.mutableRules = constitution.value.mutableRules.filter(
      r => r.id !== id
    )
    persist()
  }

  /** 切换规则启用状态 */
  function toggleRule(id: string): void {
    const rule = constitution.value.mutableRules.find(r => r.id === id)
    if (rule) {
      rule.enabled = !rule.enabled
      persist()
    }
  }

  /** 重新排序（拖拽排序后调用） */
  function reorderRules(orderedIds: string[]): void {
    const rules = constitution.value.mutableRules
    const ruleMap = new Map(rules.map(r => [r.id, r]))
    constitution.value.mutableRules = orderedIds
      .map((id, idx) => {
        const rule = ruleMap.get(id)
        return rule ? { ...rule, order: idx } : null
      })
      .filter((r): r is MutableRule => r !== null)
    persist()
  }

  // ---- 规则追踪 ----

  /** 检查是否可追踪（behavior 或 ritual 类型） */
  function canTrack(type: string): boolean {
    return type === 'behavior' || type === 'ritual'
  }

  /** 初始化规则的追踪器 */
  function initTracking(id: string, target: number, period: 'daily' | 'weekly' | 'monthly'): void {
    const rule = constitution.value.mutableRules.find(r => r.id === id)
    if (!rule || !canTrack(rule.type)) return
    rule.tracking = {
      count: 0,
      target,
      period,
      lastReset: null,
    }
    persist()
  }

  /** 执行一次追踪（如完成一次冥想/一次仪式） */
  function trackOnce(id: string): void {
    const rule = constitution.value.mutableRules.find(r => r.id === id)
    if (!rule?.tracking) return
    // 检查是否需要重置（跨周期）
    checkReset(rule)
    rule.tracking.count = Math.min(rule.tracking.count + 1, rule.tracking.target)
    persist()
  }

  /** 重置追踪计数 */
  function resetTracking(id: string): void {
    const rule = constitution.value.mutableRules.find(r => r.id === id)
    if (!rule?.tracking) return
    rule.tracking.count = 0
    rule.tracking.lastReset = new Date().toISOString()
    persist()
  }

  /** 检查周期重置 */
  function checkReset(rule: MutableRule): void {
    if (!rule.tracking?.lastReset) return
    const last = new Date(rule.tracking.lastReset)
    const now = new Date()
    let shouldReset = false
    switch (rule.tracking.period) {
      case 'daily':
        shouldReset = last.toDateString() !== now.toDateString()
        break
      case 'weekly':
        shouldReset = getWeekNumber(last) !== getWeekNumber(now)
        break
      case 'monthly':
        shouldReset = last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear()
        break
    }
    if (shouldReset) {
      rule.tracking.count = 0
      rule.tracking.lastReset = now.toISOString()
    }
  }

  /** 重新编号所有可变规则，使 articleNumber 连贯无跳空（按 order 排序） */
  function renumberArticles(): void {
    const rules = constitution.value.mutableRules
      .slice()
      .sort((a, b) => a.order - b.order)
    rules.forEach((rule, idx) => {
      rule.articleNumber = 3 + idx
    })
    persist()
  }

  /** 导出宪法（JSON 字符串） */
  function exportConstitution(): string {
    return JSON.stringify(constitution.value, null, 2)
  }

  /** 导入宪法（从 JSON 对象） */
  function importConstitution(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false
    const d = data as Record<string, unknown>
    if (
      typeof d.version !== 'string' ||
      !Array.isArray(d.immutableRules) ||
      !Array.isArray(d.mutableRules)
    ) return false

    // 加强形状校验：逐项校验 mutableRules 元素的关键字段类型，过滤畸形元素并告警，
    // 避免畸形数据被持久化后在运行时引发静默错误（如 enabled 为字符串导致效果引擎误判开关）。
    // 不用 ruleId 白名单拒绝——用户自定义条款的 ruleId 不在默认映射中，属合法（守第2条·超级自定义）。
    const validRules: MutableRule[] = []
    const rawRules = d.mutableRules as unknown[]
    for (let i = 0; i < rawRules.length; i++) {
      const r = rawRules[i] as Record<string, unknown> | null
      if (
        r && typeof r === 'object' &&
        typeof r.id === 'string' && r.id.length > 0 &&
        typeof r.enabled === 'boolean' &&
        typeof r.type === 'string'
      ) {
        validRules.push(r as unknown as MutableRule)
      } else {
        console.warn(`[宪法] 导入跳过畸形规则 #${i}`, r)
      }
    }
    if (validRules.length === 0) return false // 无任何合法规则，整体拒绝导入

    // 确保 immutableRules 始终为核心 2 条
    d.immutableRules = [...CORE_IMMUTABLE_RULES]
    // 确保 preamble 存在
    if (!d.preamble) d.preamble = CONSTITUTION_PREAMBLE
    constitution.value = {
      ...(d as unknown as Constitution),
      mutableRules: validRules,
      createdAt: (d.createdAt as string) ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    persist()
    return true
  }

  /** 重置整个宪法为默认 */
  function resetToDefaults(): void {
    constitution.value = createDefaultConstitution()
    persist()
  }

  /** 随机返回一条宪法箴言（用于画布/专注页展示） */
  function getRandomMantra(): { text: string; source: string } {
    const pool: { text: string; source: string }[] = []
    // 收集所有启用的规则
    for (const r of constitution.value.immutableRules) {
      pool.push({ text: r.description, source: `第 ${r.icon} 条 · ${r.title}` })
    }
    for (const r of constitution.value.mutableRules) {
      if (r.enabled) {
        const article = r.articleNumber ? `第 ${r.articleNumber} 条` : '自定义规则'
        pool.push({ text: r.description, source: `${article} · ${r.title}` })
      }
    }
    return pool[Math.floor(Math.random() * pool.length)] ?? {
      text: constitution.value.preamble,
      source: '序言',
    }
  }

  return {
    // 状态
    constitution,
    // 计算属性
    immutableRules,
    mutableRules,
    name,
    version,
    preamble,
    createdAt,
    updatedAt,
    enabledMutableCount,
    totalMutableCount,
    // 方法
    addRule,
    updateRule,
    removeRule,
    toggleRule,
    reorderRules,
    renumberArticles,
    canTrack,
    initTracking,
    trackOnce,
    resetTracking,
    exportConstitution,
    importConstitution,
    resetToDefaults,
    getRandomMantra,
  }
})

// ---- 辅助函数 ----

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
