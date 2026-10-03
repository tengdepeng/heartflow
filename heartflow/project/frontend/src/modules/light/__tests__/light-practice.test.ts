// ============================================================
// 留光阁 · 修习实践引擎 单元测试（INCR-458）
// 覆盖useLightPractice 的预设加载（loadSequences）与使用副作用（useSequence）。
//
// 为什么需要这个文件：此前 useSequence / loadSequences / useCount 这条引擎路径
// 在 light/__tests__ 下从未被直接测过（三个既有测试文件零命中），
// 于是「loadSequences 兜底只做数组浅拷贝 → useSequence 的 useCount++ 经 reactive
// 代理写穿模块级常量 MEDITATION_SEQUENCES」这一缺陷才能长期潜伏。
// 用例 ① 即该缺陷的核心回归闸门。
//
// 存储走 createMockStorage + invalidateCache + 动态 import（同 photo-diary /
// MeditationSequencePanel），因为引擎在 setup 期同步读 localStorage，
// 必须在实例化前把localStorage 换掉。
//
// ⚠️ 关键：MEDITATION_SEQUENCES 必须从**动态 import 出来的同一个模块实例**取，
// 不能文件顶部静态 import —— 静态 import 会拿到被 vi.resetModules() 丢弃的旧实例，
// 预设常量与引擎实际使用的不是同一批对象，断言 ① 会变成永远为真的空测。
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const PRACTICE_KEY = 'hf:light:practice'
const CLARITY_KEY = 'hf:light:clarity'
const POINTS_KEY = 'hf:light:points'

/**
 * 装载被测引擎模块。
 * @param kv 预置 kvStore（用于制造「用户已有落盘数据」与「数据损坏」两条真实分支）
 */
async function loadEngine(kv: Record<string, unknown> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem(
    'heartflow:storage',
    JSON.stringify({ version: 10, kvStore: kv, sessions: [], crystals: [] }),
  )
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  // 预设常量与引擎取自同一次import，保证引用/写入是同一批对象
  return await import('../light-practice')
}

/** 构造合法的 MeditationRecord（字段依types.ts 的 MeditationRecord 接口） */
function makeRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'med-001',
    type: 'breath',
    duration: 12,
    stateBefore: 'anxious',
    stateAfter: 'calm',
    date: '2026-10-03',
    timestamp: '2026-10-03T08:00:00.000Z',
    ...overrides,
  } as any
}

/** 读回真实落盘数据（证明引擎副作用真的发生了，而非仅改内存） */
function readKv(storageMock: Record<string, any>, key: string) {
  const raw = storageMock.getItem('heartflow:storage')
  return raw ? JSON.parse(raw).kvStore?.[key] : undefined
}

// ============================================================
// 1. 预设不被写穿（INCR-458 核心回归）
// ============================================================

describe('light-practice · 预设常量不被写穿（INCR-458）', () => {
  it('① useSequence 后模块级预设 MEDITATION_SEQUENCES 的 useCount 保持不变', async () => {
    const { useLightPractice, MEDITATION_SEQUENCES } = await loadEngine()
    const target = MEDITATION_SEQUENCES[0]
    const presetId = target.id

    // 前置条件：预设使用次数为 0。基准写成字面量 0 而非 target.useCount + N ——
    // 若基准读自身属性，就会随被测行为漂移，得出误导性结论。
    expect(target.useCount, '预设初始 useCount 应为 0').toBe(0)

    const practice = useLightPractice()
    // 兜底分支返回的应是预设（useCount 全为 0）
    expect(practice.sequences.value.length).toBe(MEDITATION_SEQUENCES.length)
    expect(practice.sequences.value[0].useCount).toBe(0)

    expect(practice.useSequence(presetId, makeRecord())).toBe(true)

    // 核心断言：预设常量本身没有被写穿（修复前此处为 1）
    expect(
      MEDITATION_SEQUENCES.find(s => s.id === presetId)!.useCount,
      '预设常量被 useSequence 写穿（loadSequences 只做了数组浅拷贝）',
    ).toBe(0)
    // 全部预设逐条复核，避免只挡住第一个元素
    for (const seq of MEDITATION_SEQUENCES) {
      expect(seq.useCount, `预设 ${seq.id} 的 useCount 被污染`).toBe(0)
    }
  })

  it('① 变体：addStepToSequence 的 steps.push 同样不得写穿预设的 steps 数组', async () => {
    const { useLightPractice, MEDITATION_SEQUENCES } = await loadEngine()
    const target = MEDITATION_SEQUENCES[0]
    const presetStepsLen = target.steps.length

    const practice = useLightPractice()
    expect(practice.addStepToSequence(target.id, {
      type: 'mantra',
      duration: 4,
      instruction: '测试追加的步骤',
    })).toBe(true)

    // 实例内确实追加了
    expect(practice.sequences.value[0].steps.length).toBe(presetStepsLen + 1)
    // 但预设的 steps 数组长度不变（push 未穿透到模块级常量）
    expect(
      MEDITATION_SEQUENCES[0].steps.length,
      '预设 steps 数组被 addStepToSequence 写穿',
    ).toBe(presetStepsLen)
  })

  it('⑤ 跨实例：A 实例的写入不污染预设常量，也不影响 B 实例', async () => {
    const { useLightPractice, MEDITATION_SEQUENCES } = await loadEngine()
    const presetId = MEDITATION_SEQUENCES[1].id

    const a = useLightPractice()
    const b = useLightPractice()

    // 两个实例各自持有独立的 sequences ref 与独立副本
    expect(a.sequences).not.toBe(b.sequences)
    expect(a.sequences.value[0]).not.toBe(MEDITATION_SEQUENCES[0])
    expect(b.sequences.value[0]).not.toBe(MEDITATION_SEQUENCES[0])
    expect(a.sequences.value[0]).not.toBe(b.sequences.value[0])

    expect(a.useSequence(presetId, makeRecord({ id: 'med-a' }))).toBe(true)

    // 预设常量仍未被写穿
    expect(MEDITATION_SEQUENCES.find(s => s.id === presetId)!.useCount).toBe(0)
    // B 实例读到的是自己那份副本，仍为 0
    expect(b.sequences.value.find(s => s.id === presetId)!.useCount).toBe(0)
  })
})

// ============================================================
// 2. loadSequences 兜底分支（经 useLightPractice().sequences 观察，
//    因loadSequences 是模块私有、未export）
// ============================================================

describe('light-practice · loadSequences 兜底分支', () => {
  it('② kv 为空串时返回预设序列，且返回的是独立副本（引用不等）', async () => {
    const { useLightPractice, MEDITATION_SEQUENCES } = await loadEngine()
    const practice = useLightPractice()
    const result = practice.sequences.value

    // 内容与预设一致
    expect(result.length).toBe(MEDITATION_SEQUENCES.length)
    expect(result.map(s => s.id)).toEqual(MEDITATION_SEQUENCES.map(s => s.id))
    // 关键：数组与元素都不是预设本身（浅拷贝会在这里露馅）
    expect(result).not.toBe(MEDITATION_SEQUENCES)
    expect(result[0]).not.toBe(MEDITATION_SEQUENCES[0])
    // 嵌套的 steps 数组同样必须是独立副本
    expect(result[0].steps).not.toBe(MEDITATION_SEQUENCES[0].steps)
    expect(result[0].steps[0]).not.toBe(MEDITATION_SEQUENCES[0].steps[0])
  })

  it('② 变体：向实例副本写入不影响预设的深层字段', async () => {
    const { useLightPractice, MEDITATION_SEQUENCES } = await loadEngine()
    const practice = useLightPractice()

    practice.sequences.value[0].steps.push({
      type: 'walking',
      duration: 2,
      instruction: '就地追加',
    })
    practice.sequences.value[0].totalDuration = 999

    expect(MEDITATION_SEQUENCES[0].steps.length).toBe(3)
    expect(MEDITATION_SEQUENCES[0].totalDuration).toBe(11)
  })

  it('③ kv 为合法 JSON 时返回解析结果（用户数据优先于预设）', async () => {
    const saved = [
      { id: 'seq-custom', name: '我的序列', description: '自建', steps: [], totalDuration: 0, difficulty: 'beginner', useCount: 7 },
    ]
    const { useLightPractice, MEDITATION_SEQUENCES } = await loadEngine({
      [PRACTICE_KEY]: JSON.stringify(saved),
    })
    const result = useLightPractice().sequences.value

    expect(result).toEqual(saved)
    expect(result[0].useCount).toBe(7)
    // 走解析分支时不会碰预设常量
    expect(MEDITATION_SEQUENCES[0].useCount).toBe(0)
  })

  it('③ 变体：kv 为非法 JSON 时走 catch 兜底且不抛', async () => {
    const { useLightPractice, MEDITATION_SEQUENCES } = await loadEngine({
      [PRACTICE_KEY]: '{ 这不是合法 JSON',
    })
    let practice!: ReturnType<typeof useLightPractice>
    expect(() => { practice = useLightPractice() }).not.toThrow()

    expect(practice.sequences.value.map(s => s.id)).toEqual(MEDITATION_SEQUENCES.map(s => s.id))
    // catch 分支同样必须给独立副本，不能退回浅拷贝
    expect(practice.sequences.value[0]).not.toBe(MEDITATION_SEQUENCES[0])
  })

  it('③ 变体：用户落盘空数组时 sequences 为空（面板据此渲染空态）', async () => {
    const { useLightPractice } = await loadEngine({ [PRACTICE_KEY]: JSON.stringify([]) })
    expect(useLightPractice().sequences.value).toEqual([])
  })
})

// ============================================================
// 3. useSequence 正常副作用
// ============================================================

describe('light-practice · useSequence 副作用', () => {
  it('④ useCount 递增、落盘 hf:light:practice、返回 true', async () => {
    const { useLightPractice, MEDITATION_SEQUENCES } = await loadEngine()
    const practice = useLightPractice()
    const presetId = MEDITATION_SEQUENCES[0].id

    expect(practice.useSequence(presetId, makeRecord())).toBe(true)

    // 实例内useCount 由 0 递增为 1
    expect(practice.sequences.value.find(s => s.id === presetId)!.useCount).toBe(1)

    // 真实落盘（键此前不存在，故其出现只能来自 useSequence → saveSequences）
    const rawSequences = readKv((globalThis as any).localStorage, PRACTICE_KEY)
    expect(rawSequences, 'useSequence 未被调用：hf:light:practice 未落盘').toBeTruthy()
    const saved = (JSON.parse(rawSequences) as any[]).find(s => s.id === presetId)
    expect(saved.useCount).toBe(1)
    // 落盘内容完整（深拷贝没有丢字段）
    expect(saved.steps.length).toBe(MEDITATION_SEQUENCES[0].steps.length)
    expect(saved.difficulty).toBe(MEDITATION_SEQUENCES[0].difficulty)
  })

  it('④ 澄明追踪被更新：总时长累加并落盘 hf:light:clarity', async () => {
    const { useLightPractice, MEDITATION_SEQUENCES } = await loadEngine()
    const practice = useLightPractice()

    expect(practice.clarityTracker.value.totalMinutes).toBe(0)
    practice.useSequence(MEDITATION_SEQUENCES[0].id, makeRecord({ duration: 12 }))

    expect(practice.clarityTracker.value.totalMinutes).toBe(12)
    const rawClarity = readKv((globalThis as any).localStorage, CLARITY_KEY)
    expect(rawClarity, 'useSequence 未被调用：hf:light:clarity 未落盘').toBeTruthy()
    expect(JSON.parse(rawClarity).totalMinutes).toBe(12)
  })

  it('④ 多次使用同一序列 useCount 累加到 2（实例副本持续生效）', async () => {
    const { useLightPractice, MEDITATION_SEQUENCES } = await loadEngine()
    const practice = useLightPractice()
    const presetId = MEDITATION_SEQUENCES[0].id

    practice.useSequence(presetId, makeRecord({ id: 'med-1' }))
    practice.useSequence(presetId, makeRecord({ id: 'med-2' }))

    expect(practice.sequences.value.find(s => s.id === presetId)!.useCount).toBe(2)
    // 预设常量始终为 0
    expect(MEDITATION_SEQUENCES[0].useCount).toBe(0)
  })

  it('④ 传不存在的 id 返回 false 且不产生任何副作用', async () => {
    const { useLightPractice } = await loadEngine()
    const practice = useLightPractice()

    expect(practice.useSequence('seq-does-not-exist', makeRecord())).toBe(false)
    // 未落盘 practice key，且澄明时长未被计入
    expect(readKv((globalThis as any).localStorage, PRACTICE_KEY)).toBeUndefined()
    expect(practice.clarityTracker.value.totalMinutes).toBe(0)
  })

  it('④ 光点列表初始为空（loadLightPoints 走 JSON.parse 分支，未被本次改动影响）', async () => {
    const { useLightPractice } = await loadEngine()
    expect(useLightPractice().lightPoints.value).toEqual([])
    expect(readKv((globalThis as any).localStorage, POINTS_KEY)).toBeUndefined()
  })
})
