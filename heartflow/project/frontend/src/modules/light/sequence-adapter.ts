// ============================================================
// 留光阁 · 冥想序列 → 播放器步骤 适配层（INCR-462）
// ============================================================
// 为什么要这一层：MeditationStudio.vue 的引导冥想播放器消费的是
// guided-meditation.ts 的 MeditationStep —— { order, instruction, durationSeconds, phase }，
// 而 light-practice.ts 的 MeditationSequenceStep 是 { type, duration, instruction, ambientSound }。
// 两类步骤**字段名、单位、取值域三者全不同**：
//   · 字段名：phase  ↔ type
//   · 单位：  durationSeconds（秒） ↔ duration（分钟）
//   · 取值域：MeditationStep['phase'] 只有 settle/focus/deepen/return/reflect 五个「冥想阶段」，
//             而 MeditationType 有八个「冥想技法」（breath/body_scan/... ），**不是一对一**。
// 直接把序列步骤喂给播放器 ⇒ 图标查不到（STEP_PHASE_META[step.phase] 为 undefined）、
// 倒计时差 60 倍。故在此集中做换算，播放器只消费本层产物。
//
// 本层是**纯函数、无副作用、不 import storage**的纯数据转换：便于用精确断言证明换算正确
// （见 src/modules/light/__tests__/sequence-adapter.test.ts）。
// ============================================================

import type { MeditationSequence, MeditationSequenceStep } from './light-practice'
import type { MeditationStep } from './guided-meditation'
import type { MeditationType } from './types'

/** 播放器的阶段类型（与引导脚本的 phase 同一取值域） */
export type PlayerPhase = MeditationStep['phase']

/**
 * MeditationType → 播放器 phase 的映射表。
 *
 * 映射依据是「这个技法在播放器里该显示成哪个阶段的图标/标签」，
 * 而非字面直译。三个未出现的 phase（settle 安顿 / return 回归 / reflect 回响）
 * **是刻意的**，理由见下方长注释。
 */
export const SEQUENCE_TYPE_PHASE: Record<MeditationType, PlayerPhase> = {
  // 三个「把注意力收拢到单一对象」的技法 → 专注
  breath: 'focus',
  walking: 'focus',
  mantra: 'focus',
  // 四个「注意力向内/向外扩展」的技法 → 深入
  body_scan: 'deepen',
  loving_kindness: 'deepen',
  silent: 'deepen',
  visualization: 'deepen',
  // guided（引导冥想）本身是「跟随引导语」的动作，与 breath 同属收拢注意力 → 专注
  guided: 'focus',
}

/**
 * 查表未命中时的降级 phase。
 *
 * MeditationType 是联合类型，静态上穷尽 ⇒ 正常数据永不走到这里。
 * 但 sequences 来自 `JSON.parse(storage.getKV(...))`（light-practice.ts:211），
 * kv 是用户可编辑/可被旧版本写入的外部数据，运行时**完全可能**出现未知 type。
 * 选 'focus'（专注）作降级而非 'settle'（安顿）：
 * settle 语义是「开场调整姿态」，对内容未知的步骤是误导；focus 语义是
 * 「把注意力放到当前对象上」，对任何未知步骤都是无断言的安全默认。
 */
export const FALLBACK_PLAYER_PHASE: PlayerPhase = 'focus'

/**
 * MeditationType → 播放器 phase（带降级）。
 * 形参放宽为 string：调用方是运行时数据，未知值必须优雅降级而非拿到 undefined。
 */
export function phaseForMeditationType(type: MeditationType | string): PlayerPhase {
  return SEQUENCE_TYPE_PHASE[type as MeditationType] ?? FALLBACK_PLAYER_PHASE
}

/** 分钟 → 秒。序列步骤的 duration 单位是分钟，播放器要秒。 */
export const SECONDS_PER_MINUTE = 60

/**
 * 单步适配：序列步骤 → 播放器步骤。
 *
 * @param order 步骤序号（从 1 开始，序列步骤本身没有 order 字段）
 */
export function toPlayerStep(step: MeditationSequenceStep, order: number): SequencePlayerStep {
  return {
    order,
    instruction: step.instruction,
    // 唯一的单位换算点：分钟 × 60 = 秒
    durationSeconds: step.duration * SECONDS_PER_MINUTE,
    phase: phaseForMeditationType(step.type),
    // 下面三个是序列步骤独有、引导脚本没有的字段，随 step 透传给播放器渲染
    sourceType: step.type,
    ambientSound: step.ambientSound,
    /** 原序列时长（分钟），供播放器显示「本步 X 分钟」而非自己再算 */
    durationMinutes: step.duration,
  }
}

/**
 * 播放器步骤 = 引导脚本的 MeditationStep + 序列步骤的三个独有字段。
 *
 * 用 extends 而非另起一个平行接口：播放器对「阶段/倒计时/指令」的消费方式
 * 与引导冥想播放器完全一致（同一份模板结构与 STEP_PHASE_META 查表），
 * 继承可保证类型层面就仍是 MeditationStep，不会在传参处被类型系统拦下。
 */
export interface SequencePlayerStep extends MeditationStep {
  /** 原始冥想技法（图标/标签走 MEDITATION_TYPE_META，比 phase 更精确） */
  sourceType: MeditationType
  /** 背景音（可选） */
  ambientSound?: string
  /** 本步时长（分钟） */
  durationMinutes: number
}

/** 整条序列适配：steps[] → 播放器步骤数组（序号从 1 连续编号） */
export function toPlayerSteps(sequence: MeditationSequence): SequencePlayerStep[] {
  return sequence.steps.map((step, i) => toPlayerStep(step, i + 1))
}

/**
 * 序列实际总时长（分钟）= 各步骤 duration 之和。
 *
 * **刻意不用 sequence.totalDuration**：那是个可被外部写坏的冗余字段
 * （loadSequences 走 JSON.parse 解析用户 kv；totalDuration 与 steps 不一致时无法自愈）。
 * 逐步求和是唯一可从 steps 复原的算法。空 steps 返回 0。
 */
export function sequenceTotalMinutes(sequence: MeditationSequence): number {
  return sequence.steps.reduce((sum, s) => sum + s.duration, 0)
}
