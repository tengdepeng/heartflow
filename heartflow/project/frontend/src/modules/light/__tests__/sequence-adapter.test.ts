// ============================================================
// 留光阁 · 冥想序列播放器适配层 单元测试（INCR-462 · T2）
// ============================================================
// 为什么这个文件必须存在：MeditationSequenceStep（序列步骤）与 MeditationStep
// （引导脚本步骤 / 播放器消费结构）**字段名、单位、取值域三者全不同**
//（type↔phase、分钟↔秒、8 个技法↔5 个阶段）。
// 若换算写错，症状是「图标查不到」+「倒计时差 60 倍」——**都是能render 出来的静默错误**，
// 没有测试就会一直绿。而本层是纯函数，断言可以写到字面量级精确。
//
// 本文件是**同步**的（不碰 storage / 不需要 mock），因为适配层刻意设计为
// 无副作用纯数据转换：不 import storage、不读时钟、不写任何全局。
// 落盘与真实播放流程的断言在 components/__tests__/MeditationSequencePlayer.test.ts。
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  SEQUENCE_TYPE_PHASE,
  FALLBACK_PLAYER_PHASE,
  SECONDS_PER_MINUTE,
  phaseForMeditationType,
  toPlayerStep,
  toPlayerSteps,
  sequenceTotalMinutes,
} from '../sequence-adapter'
import { MEDITATION_TYPE_META, type MeditationType } from '../types'
import { MEDITATION_SEQUENCES, type MeditationSequence, type MeditationSequenceStep } from '../light-practice'
import { STEP_PHASE_META } from '../guided-meditation'

/** 构造一条序列步骤（字段依 light-practice.ts 的 MeditationSequenceStep） */
function makeStep(overrides: Partial<MeditationSequenceStep> = {}): MeditationSequenceStep {
  return {
    type: 'breath',
    duration: 5,
    instruction: '测试指令',
    ...overrides,
  }
}

function makeSequence(steps: MeditationSequenceStep[], overrides: Partial<MeditationSequence> = {}): MeditationSequence {
  return {
    id: 'seq-test',
    name: '测试序列',
    description: '测试用',
    steps,
    totalDuration: steps.reduce((s, x) => s + x.duration, 0),
    difficulty: 'beginner',
    useCount: 0,
    ...overrides,
  }
}

// ============================================================
// 1. 单位换算：分钟 → 秒（本任务最关键的一条，精确到字面量）
// ============================================================

describe('sequence-adapter · 单位换算（分钟 → 秒）', () => {
  it('① duration: 5（分钟）→ durationSeconds: 300（精确字面量）', () => {
    const step = toPlayerStep(makeStep({ duration: 5 }), 1)
    expect(step.durationSeconds).toBe(300)
  })

  it('① 变体：预设里出现过的每一个时长都逐个精确换算', () => {
    // 覆盖 1..15 分钟，逐一断言 x*60，不做任何容差
    for (const minutes of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15]) {
      expect(toPlayerStep(makeStep({ duration: minutes }), 1).durationSeconds).toBe(minutes * 60)
    }
  })

  it('① 变体：全部预设序列的每一步都满足 durationSeconds === duration × 60', () => {
    // 真实预设数据（4 条序列共 12 步）全量复核，不抽样
    for (const seq of MEDITATION_SEQUENCES) {
      const player = toPlayerSteps(seq)
      expect(player.length).toBe(seq.steps.length)
      for (let i = 0; i < seq.steps.length; i++) {
        expect(
          player[i].durationSeconds,
          `序列 ${seq.id} 第 ${i + 1} 步：${seq.steps[i].duration} 分钟未换算成秒`,
        ).toBe(seq.steps[i].duration * 60)
      }
    }
  })

  it('② SECONDS_PER_MINUTE 常量本身是 60（防止有人把它改成 100 后只改一半代码）', () => {
    expect(SECONDS_PER_MINUTE).toBe(60)
  })
})

// ============================================================
// 2. type → phase 映射：逐个覆盖 MeditationType 全部 8 个取值
// ============================================================

describe('sequence-adapter · type → phase 映射', () => {
  it('③ MeditationType 全部 8 个取值都有映射（无一遗漏、无一为 undefined）', () => {
    // 取值域以 types.ts 的 MEDITATION_TYPE_META 键为准（不手抄一份类型名清单，
    // 那样 types.ts 以后加类型时本用例会静默过期）
    const allTypes = Object.keys(MEDITATION_TYPE_META) as MeditationType[]
    expect(allTypes.length).toBe(8)

    for (const type of allTypes) {
      const phase = phaseForMeditationType(type)
      expect(phase, `类型 ${type} 未映射到 phase`).toBeDefined()
      // 映射结果必须落在播放器阶段取值域内，且能被 STEP_PHASE_META 查到图标
      expect(['settle', 'focus', 'deepen', 'return', 'reflect']).toContain(phase)
      expect(STEP_PHASE_META[phase], `phase ${phase} 在 STEP_PHASE_META 里查不到`).toBeTruthy()
      expect(STEP_PHASE_META[phase].icon).toBeTruthy()
    }
  })

  it('④ 逐个断言每个 MeditationType 的确切映射结果（映射表本身被钉住）', () => {
    // 语义依据（为什么这样分）：
    //  · 把注意力收拢到单一对象的三种技法（呼吸 / 行走 / 持咒）+ 引导冥想
    //    （动作本身就是「跟随引导语」）→ focus 专注
    //  · 注意力向内或向外扩展的四种技法（身体扫描 / 慈心 / 静坐 / 观想）→ deepen 深入
    // 刻意不产出 settle / return / reflect：这三个阶段在引导脚本里是
    // 「开场调整姿态 / 收尾展开 / 结束回顾」的位置性阶段，语义依赖
    // 「它在脚本中的第几步」，而序列步骤没有位置语义（可任意排序、可增删），
    // 硬按序号分配等于凭空发明语义。详见 sequence-adapter.ts 注释。
    expect(SEQUENCE_TYPE_PHASE).toEqual({
      breath: 'focus',
      walking: 'focus',
      mantra: 'focus',
      guided: 'focus',
      body_scan: 'deepen',
      loving_kindness: 'deepen',
      silent: 'deepen',
      visualization: 'deepen',
    })
  })

  it('④ 变体：预设里真实出现的每个类型都按上表映射（逐条点名，不靠键数相等蒙混）', () => {
    // 预设实际用到的类型（types.ts 全集比这更多，多出来的也已在 ③ 覆盖）
    const seen = new Set<MeditationType>()
    for (const seq of MEDITATION_SEQUENCES) {
      for (const step of seq.steps) {
        seen.add(step.type)
        expect(phaseForMeditationType(step.type), `预设类型 ${step.type} 映射不符`)
          .toBe(SEQUENCE_TYPE_PHASE[step.type])
      }
    }
    // 预设应恰好用到这 5 种（breath/body_scan/visualization/silent/loving_kindness）
    expect([...seen].sort()).toEqual(
      ['body_scan', 'breath', 'loving_kindness', 'silent', 'visualization'].sort(),
    )
  })

  it('④ 变体：映射到focus 的类型，其引导脚本阶段标签为「专注」；deepen 为「深入」', () => {
    expect(STEP_PHASE_META[phaseForMeditationType('breath')].label).toBe('专注')
    expect(STEP_PHASE_META[phaseForMeditationType('body_scan')].label).toBe('深入')
  })
})

// ============================================================
// 3. 无法映射时的降级（不留未测分支）
// ============================================================

describe('sequence-adapter · 未知类型的降级', () => {
  it('⑤ 未知 type 降级到 focus，且不抛异常', () => {
    expect(phaseForMeditationType('not_a_real_type')).toBe('focus')
    expect(phaseForMeditationType('')).toBe('focus')
  })

  it('⑤ FALLBACK_PLAYER_PHASE 常量本身是 focus（防止有人改了降级目标却没改本用例）', () => {
    expect(FALLBACK_PLAYER_PHASE).toBe('focus')
    expect(phaseForMeditationType('__nope__')).toBe(FALLBACK_PLAYER_PHASE)
  })

  it('⑤ 变体：未知类型的降级结果仍能渲染出图标（STEP_PHASE_META 查得到）', () => {
    // 降级若落到一个不在 STEP_PHASE_META 里的phase，播放器会显示裸phase 字符串
    const phase = phaseForMeditationType('future_type_from_newer_version')
    expect(STEP_PHASE_META[phase]?.icon).toBeTruthy()
    expect(STEP_PHASE_META[phase]?.label).toBeTruthy()
  })

  it('⑤ 变体：真实数据污染路径——用户 kv 里的未知 type 经toPlayerStep 也能安全换算', () => {
    // sequences 走 JSON.parse(storage.getKV(...))（light-practice.ts:211），
    // kv 是用户可编辑的外部数据，未知 type 是真实可达路径而非理论分支
    const step = toPlayerStep(
      makeStep({ type: 'chakra_align' as MeditationType, duration: 3 }),
      1,
    )
    expect(step.durationSeconds).toBe(180)
    expect(step.phase).toBe('focus')
    expect(step.instruction).toBe('测试指令')
  })
})

// ============================================================
// 4. 整条序列适配（序号 / 字段透传 / 总时长）
// ============================================================

describe('sequence-adapter · 整条序列适配', () => {
  it('⑥ order 从 1 开始连续编号（序列步骤本身没有 order 字段）', () => {
    const player = toPlayerSteps(makeSequence([
      makeStep({ duration: 1 }), makeStep({ duration: 2 }), makeStep({ duration: 3 }),
    ]))
    expect(player.map(s => s.order)).toEqual([1, 2, 3])
  })

  it('⑥ 变体：instruction 原样透传（不被适配层改写）', () => {
    const player = toPlayerSteps(makeSequence([
      makeStep({ instruction: '第一句' }), makeStep({ instruction: '第二句' }),
    ]))
    expect(player.map(s => s.instruction)).toEqual(['第一句', '第二句'])
  })

  it('⑦ 序列步骤独有字段被透传：sourceType / ambientSound / durationMinutes', () => {
    // ambientSound 是序列步骤独有、引导脚本没有的字段，丢掉就等于静默吞掉数据
    const player = toPlayerSteps(makeSequence([
      makeStep({ type: 'mantra', duration: 4, ambientSound: '钟磬' }),
    ]))
    expect(player[0].sourceType).toBe('mantra')
    expect(player[0].ambientSound).toBe('钟磬')
    expect(player[0].durationMinutes).toBe(4)
  })

  it('⑦ 变体：没有 ambientSound 时该字段为 undefined（而非空串，v-if 才能正确隐藏）', () => {
    const player = toPlayerSteps(makeSequence([makeStep()]))
    expect(player[0].ambientSound).toBeUndefined()
  })

  it('⑦ 变体：产出对象同时满足 MeditationStep 形状（extends 生效，phase/durationSeconds/instruction/order 齐备）', () => {
    const player = toPlayerSteps(makeSequence([makeStep({ type: 'walking', duration: 6 })]))
    expect(player[0]).toMatchObject({
      order: 1,
      instruction: '测试指令',
      durationSeconds: 360,
      phase: 'focus',
    })
  })

  it('⑧ 空步骤序列产出空数组（不抛）', () => {
    expect(toPlayerSteps(makeSequence([]))).toEqual([])
  })

  it('⑧ 变体：空序列的总时长为 0', () => {
    expect(sequenceTotalMinutes(makeSequence([]))).toBe(0)
  })
})

// ============================================================
// 5. 总时长：刻意不用 sequence.totalDuration
// ============================================================

describe('sequence-adapter · sequenceTotalMinutes', () => {
  it('⑨ 按各步 duration 求和', () => {
    // 晨间唤醒：3+5+3 = 11
    expect(sequenceTotalMinutes(MEDITATION_SEQUENCES[0])).toBe(11)
    // 深度洞察：5+10+10 = 25
    expect(sequenceTotalMinutes(MEDITATION_SEQUENCES[3])).toBe(25)
  })

  it('⑨ 变体：totalDuration 被写坏时以 steps 求和为准（可从 steps 复原的唯一定义）', () => {
    // totalDuration 是可被用户 kv / 外部写坏的冗余字段；
    // 若实现改成读totalDuration，本例即转红
    const seq = makeSequence([
      makeStep({ duration: 2 }), makeStep({ duration: 3 }),
    ], { totalDuration: 999 })
    expect(seq.totalDuration).toBe(999)
    expect(sequenceTotalMinutes(seq)).toBe(5)
  })

  it('⑨ 变体：全部预设的求和结果与预设声明的 totalDuration 一致（当前数据自洽）', () => {
    // 若某天预设数据不再自洽，这条会红并指出是哪条序列 —— 那时该修预设或明确取舍，
    // 而不是让两个字段继续各说各话
    for (const seq of MEDITATION_SEQUENCES) {
      expect(sequenceTotalMinutes(seq), `序列 ${seq.id} 的 steps 求和与 totalDuration 不一致`)
        .toBe(seq.totalDuration)
    }
  })
})
