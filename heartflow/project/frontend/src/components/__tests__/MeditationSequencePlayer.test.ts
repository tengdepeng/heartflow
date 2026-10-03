// ============================================================
// MeditationSequencePlayer 组件测试 —— 冥想序列真播放器（INCR-462 · T2）
// ============================================================
// 测什么：把INCR-457 那个「点一下就记一次」的假启动，改成真播放器之后的**落盘语义**：
//   · 进入播放态但未播完 ⇒ useSequence 一次都不许被调用（反向断言，本任务核心）
//   · 走完全部 N 步⇒ 调useSequence 一次，且真实落盘（useCount 0→1 / 澄明时长 / 冥想记录）
//   · 中途退出 ⇒ 不落盘
//
// 真实引擎全链路：直引light-practice 引擎与其内置预设，不 mock 引擎。
// 存储走 createMockStorage + invalidateCache + 动态 import（同INCR-457 面板测试），
// 因为引擎在 setup 期同步读 localStorage，必须在挂组件前换掉。
//
// ⚠️ useCount 基准一律用**字面量**（toBe(1)）而非 target.useCount + 1：
// target 是可能被写穿的同一对象，基准读自身属性会随被测行为漂移。
// 每条落盘断言前先 `expect(rawKv, '...').toBeTruthy()` 再 JSON.parse，
// 避免 useSequence 未被调用时 JSON.parse(undefined) 抛 SyntaxError掩盖真正失败原因。
//
// 定时器：用 vi.useFakeTimers()逐秒推进，不 sleep 真实时间
// （预设步骤 3~10 分钟 = 180~600 秒，真等会让测试跑到分钟级）。
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const PRACTICE_KEY = 'hf:light:practice'
const CLARITY_KEY = 'hf:light:clarity'
const MEDITATIONS_KEY = 'hf:light:meditations'

/** 推进 fake timer n 秒（播放器每秒减1） */
async function tick(wrapper: any, seconds: number) {
  await vi.advanceTimersByTimeAsync(seconds * 1000)
  await wrapper.vm.$nextTick()
}

/**
 * 挂载面板（真播放器由面板挂载，播放/落盘的跨组件契约在这里验证）。
 * @param kv 预置 kvStore
 */
async function mountPanel(kv: Record<string, unknown> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem(
    'heartflow:storage',
    JSON.stringify({ version: 10, kvStore: kv, sessions: [], crystals: [] }),
  )
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../MeditationSequencePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  // 预设序列从**动态 import 的同一模块实例**取，避免 vi.resetModules 造成两批对象
  const { MEDITATION_SEQUENCES } = await import('../../modules/light')
  return { wrapper, storageMock, seq: MEDITATION_SEQUENCES[0] }
}

/** 读回真实落盘数据 */
function readKv(storageMock: Record<string, any>, key: string) {
  const raw = storageMock.getItem('heartflow:storage')
  return raw ? JSON.parse(raw).kvStore?.[key] : undefined
}

/** 点「播放序列」进入播放态（返回 seq 供断言用） */
async function enterPlayer(wrapper: any, seqId = 'seq-morning-awaken') {
  await wrapper.find(`[data-testid="msq-start-${seqId}"]`).trigger('click')
  await wrapper.vm.$nextTick()
}

/**
 * 走完一条序列：进入播放 → 逐步推进到最后一步 → 点「完成」。
 * 用「点下一步」而非「等满倒计时」，因为倒计时逐秒推进要几万次 tick；
 * 推进逻辑（nextStep）与倒计时归零后调的 nextStep 是同一个函数，
 * 倒计时本身由 ② 用例单独验证。
 */
async function playToEnd(wrapper: any) {
  for (let guard = 0; guard < 20; guard++) {
    const next = wrapper.find('[data-testid="msql-next"]')
    if (!next.exists()) return          // 播放器已卸载（播完退出）
    await next.trigger('click')
    await wrapper.vm.$nextTick()
  }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

// ============================================================
// 1. 播放态：适配层换算结果真的渲染出来了
// ============================================================

describe('MeditationSequencePlayer · 播放器渲染（INCR-462）', () => {
  it('① 点「播放序列」进入播放态：显示序列名、步骤序号与按分钟换算的倒计时', async () => {
    const { wrapper, seq } = await mountPanel()
    // 播放前：列表在、播放器不在
    expect(wrapper.find('.msql-player').exists()).toBe(false)
    expect(wrapper.find('.msq-list').exists()).toBe(true)

    await enterPlayer(wrapper, seq.id)

    expect(wrapper.find('.msql-player').exists(), '未进入播放态').toBe(true)
    expect(wrapper.find('.msq-list').exists(), '播放时列表应让位给播放器').toBe(false)
    expect(wrapper.text()).toContain(seq.name)

    // 第 1 步 = 3 分钟 = 180 秒 ⇒ 倒计时显示 3:00
    // （这就是单位换算的 UI 侧证据：若忘了×60，这里会是 0:03）
    expect(wrapper.find('[data-testid="msql-countdown"]').text()).toBe('3:00')
    expect(wrapper.text()).toContain('第 1 / 3 步')
    // 第 1 步的引导指令与类型标签都渲染出来
    expect(wrapper.text()).toContain(seq.steps[0].instruction)
    expect(wrapper.text()).toContain('呼吸冥想')
    // 阶段标签也渲染出来了，且与适配层映射一致（breath → focus → 「专注」）。
    // 这条断言让「映射表写错」在UI 层也能被抓到，而不只是靠适配层单测。
    expect(wrapper.find('.msql-step-phase').text()).toBe('专注')
  })

  it('① 变体：每一步的阶段标签都按适配层映射渲染（推进到第 2 步应换成「深入」）', async () => {
    const { wrapper, seq } = await mountPanel()
    await enterPlayer(wrapper, seq.id)
    // 第 1 步 breath → focus → 专注
    expect(wrapper.find('.msql-step-phase').text()).toBe('专注')

    await wrapper.find('[data-testid="msql-next"]').trigger('click')
    await wrapper.vm.$nextTick()
    // 第 2 步 body_scan → deepen → 深入
    expect(wrapper.text()).toContain('第 2 / 3 步')
    expect(wrapper.find('.msql-step-phase').text()).toBe('深入')

    await wrapper.find('[data-testid="msql-next"]').trigger('click')
    await wrapper.vm.$nextTick()
    // 第 3 步 visualization → deepen → 深入
    expect(wrapper.find('.msql-step-phase').text()).toBe('深入')
  })

  it('① 变体：倒计时随时间递减（证明它是真的在走，不是静态文本）', async () => {
    const { wrapper, seq } = await mountPanel()
    await enterPlayer(wrapper, seq.id)

    const cd = '[data-testid="msql-countdown"]'
    expect(wrapper.find(cd).text()).toBe('3:00')

    await tick(wrapper, 1)
    expect(wrapper.find(cd).text()).toBe('2:59')
    await tick(wrapper, 58)
    expect(wrapper.find(cd).text()).toBe('2:01')
  })

  it('② 倒计时归零后自动推进到下一步（定时器驱动，非仅靠点按钮）', async () => {
    const { wrapper, seq } = await mountPanel()
    await enterPlayer(wrapper, seq.id)

    // 第 1 步 180 秒：走完这 180 秒后定时器应自动进入第 2 步
    await tick(wrapper, 181)
    expect(wrapper.text()).toContain('第 2 / 3 步')
    // 第 2 步 5 分钟 = 300 秒
    expect(wrapper.find('[data-testid="msql-countdown"]').text()).toBe('5:00')
  })

  it('③ 「上一步」可回退且回退后倒计时按该步时长重置', async () => {
    const { wrapper, seq } = await mountPanel()
    await enterPlayer(wrapper, seq.id)
    await wrapper.find('[data-testid="msql-next"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('第 2 / 3 步')

    await wrapper.find('[data-testid="msql-prev"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('第 1 / 3 步')
    expect(wrapper.find('[data-testid="msql-countdown"]').text()).toBe('3:00')
  })

  it('④ 最后一步的按钮文案是「完成」，非最后一步是「下一步 ›」', async () => {
    const { wrapper, seq } = await mountPanel()
    await enterPlayer(wrapper, seq.id)
    expect(wrapper.find('[data-testid="msql-next"]').text()).toContain('下一步')
    await wrapper.find('[data-testid="msql-next"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="msql-next"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="msql-next"]').text()).toContain('完成')
  })
})

// ============================================================
// 2. 播完才记（核心验收）：未播完不得触发 useSequence
// ============================================================

describe('MeditationSequencePlayer · 播放与记录解耦（播完才记）', () => {
  it('⑤ 进入播放态但一步都没走完：useSequence 未被调用（hf:light:practice 未落盘）', async () => {
    const { wrapper, storageMock, seq } = await mountPanel()

    // 前置：起始基准钉在用例里（字面量 0，非 seq.useCount —— 后者可能被写穿而漂移）
    expect(seq.useCount, '前置：预设该序列的 useCount 应为 0').toBe(0)

    await wrapper.find(`[data-testid="msq-start-${seq.id}"]`).trigger('click')
    await wrapper.vm.$nextTick()
    // 前置：确实进了播放态（否则「没落盘」是因为压根没播放，断言就空转了）
    expect(wrapper.find('.msql-player').exists(), '未进入播放态，本用例失去意义').toBe(true)

    // 核心反向断言：三个 key 一个都不该出现。
    // pavilion 未调 recordMeditation ⇒ MEDITATIONS_KEY 不该有；
    // useSequence 未调 ⇒ PRACTICE_KEY / CLARITY_KEY 不该有。
    expect(readKv(storageMock, PRACTICE_KEY), '未播完却落盘了序列（useSequence 被提前调用）').toBeUndefined()
    expect(readKv(storageMock, CLARITY_KEY), '未播完却累加了澄明时长').toBeUndefined()
    expect(readKv(storageMock, MEDITATIONS_KEY), '未播完却落了一条冥想记录').toBeUndefined()
  })

  it('⑤ 变体：只走完前两步（还差最后一步）依然不落盘', async () => {
    const { wrapper, storageMock } = await mountPanel()
    await wrapper.find(`[data-testid="msq-start-seq-morning-awaken"]`).trigger('click')
    await wrapper.vm.$nextTick()

    // 走到第 3 步（最后一步）为止，但**不点完成**
    await wrapper.find('[data-testid="msql-next"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="msql-next"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('第 3 / 3 步')

    // 还差最后一步 ⇒ 什么都没落
    expect(readKv(storageMock, PRACTICE_KEY), '还差最后一步就落盘了').toBeUndefined()
    expect(readKv(storageMock, MEDITATIONS_KEY), '还差最后一步就落了冥想记录').toBeUndefined()
  })

  it('⑤ 变体：中途退出（exit 事件）不落盘，且回到列表', async () => {
    const { wrapper, storageMock, seq } = await mountPanel()
    await wrapper.find(`[data-testid="msq-start-${seq.id}"]`).trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.msql-player').exists()).toBe(true)

    await wrapper.find('[data-testid="msql-exit"]').trigger('click')
    await wrapper.vm.$nextTick()

    // 回到列表
    expect(wrapper.find('.msql-player').exists()).toBe(false)
    expect(wrapper.find('.msq-list').exists()).toBe(true)
    // 使用次数没变（仍是 0）
    expect(wrapper.text()).toContain('已用 0 次')
    // 三个 key 全部未落盘
    expect(readKv(storageMock, PRACTICE_KEY), '中途退出却落盘了序列').toBeUndefined()
    expect(readKv(storageMock, CLARITY_KEY), '中途退出却累加了澄明时长').toBeUndefined()
    expect(readKv(storageMock, MEDITATIONS_KEY), '中途退出却落了冥想记录').toBeUndefined()
  })
})

// ============================================================
// 3. 播完落盘：真实useSequence 副作用
// ============================================================

describe('MeditationSequencePlayer · 播完落盘（真实 useSequence）', () => {
  it('⑥ 走完 3 步后点完成：useCount 由 0 递增为 1 并真实落盘', async () => {
    const { wrapper, storageMock, seq } = await mountPanel()

    // 前置断言：起始基准钉在用例里（字面量 0，非 seq.useCount）
    expect(wrapper.text()).toContain('已用 0 次')

    await wrapper.find(`[data-testid="msq-start-${seq.id}"]`).trigger('click')
    await wrapper.vm.$nextTick()
    await playToEnd(wrapper)
    await flushPromises()

    // ① useSequence 独占副作用：序列写回 + useCount 0→1
    //    （pavilion 只写 meditations/releases，从不写 practice/clarity，
    //     故这两个 key 的出现只能来自 useSequence）
    const rawSequences = readKv(storageMock, PRACTICE_KEY)
    expect(rawSequences, 'useSequence 未被调用：hf:light:practice 未落盘').toBeTruthy()
    const saved = (JSON.parse(rawSequences) as any[]).find((s) => s.id === seq.id)
    expect(saved.useCount).toBe(1)

    // ② useSequence 专属副作用：record.duration 计入澄明追踪（3+5+3=11）
    const rawClarity = readKv(storageMock, CLARITY_KEY)
    expect(rawClarity, 'useSequence 未被调用：hf:light:clarity 未落盘').toBeTruthy()
    expect(JSON.parse(rawClarity).totalMinutes).toBe(11)

    // ③ pavilion 侧：落了一条真实冥想记录，时长 11 分钟、类型取首步
    const meditations = JSON.parse(readKv(storageMock, MEDITATIONS_KEY))
    expect(meditations.length).toBe(1)
    expect(meditations[0].duration).toBe(11)
    expect(meditations[0].type).toBe(seq.steps[0].type)
    expect(meditations[0].insight).toBe(`冥想序列：${seq.name}`)

    // ④ UI 回读：回到列表、使用次数 +1、完成提示出现
    expect(wrapper.find('.msql-player').exists()).toBe(false)
    expect(wrapper.find('.msq-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('已用 1 次')
    expect(wrapper.text()).toContain('已记录一次练习')
  })

  it('⑥ 变体：走完全部步骤后 useSequence 只被调用一次（不重复落盘）', async () => {
    const { wrapper, storageMock, seq } = await mountPanel()
    await wrapper.find(`[data-testid="msq-start-${seq.id}"]`).trigger('click')
    await wrapper.vm.$nextTick()
    await playToEnd(wrapper)
    await flushPromises()

    const rawSequences = readKv(storageMock, PRACTICE_KEY)
    expect(rawSequences, 'useSequence 未被调用').toBeTruthy()
    const saved = (JSON.parse(rawSequences) as any[]).find((s) => s.id === seq.id)
    expect(saved.useCount, '一次播放被记了多次').toBe(1)
  })

  it('⑥ 变体：连播两次 useCount 累加到 2（每次播放各记一次）', async () => {
    const { wrapper, storageMock, seq } = await mountPanel()

    for (let round = 0; round < 2; round++) {
      await wrapper.find(`[data-testid="msq-start-${seq.id}"]`).trigger('click')
      await wrapper.vm.$nextTick()
      await playToEnd(wrapper)
      await flushPromises()
    }

    const rawSequences = readKv(storageMock, PRACTICE_KEY)
    expect(rawSequences, 'useSequence 未被调用').toBeTruthy()
    const saved = (JSON.parse(rawSequences) as any[]).find((s) => s.id === seq.id)
    expect(saved.useCount).toBe(2)
    // 澄明时长也累加了两轮：11 × 2 = 22
    expect(JSON.parse(readKv(storageMock, CLARITY_KEY)).totalMinutes).toBe(22)
  })

  it('⑦ 播放中途不落盘，但播完的那一次落盘时长 = 各步之和而非引擎 totalDuration 字段', async () => {
    // 构造一条 totalDuration 被写坏（999）、steps 真实为 2+3=5 的序列，
    // 证明落盘走的是 steps 求和而非冗余字段
    const broken = [{
      id: 'seq-broken', name: '坏总时长序列', description: 'totalDuration 与 steps 不一致',
      steps: [
        { type: 'breath', duration: 2, instruction: '第一步' },
        { type: 'silent', duration: 3, instruction: '第二步' },
      ],
      totalDuration: 999, difficulty: 'beginner', useCount: 0,
    }]
    const { wrapper, storageMock } = await mountPanel({ [PRACTICE_KEY]: JSON.stringify(broken) })

    await wrapper.find('[data-testid="msq-start-seq-broken"]').trigger('click')
    await wrapper.vm.$nextTick()
    await playToEnd(wrapper)
    await flushPromises()

    const meditations = JSON.parse(readKv(storageMock, MEDITATIONS_KEY))
    expect(meditations[0].duration, '落盘时长用了被写坏的 totalDuration').toBe(5)
    // 引擎侧澄明时长同样按 5 计
    expect(JSON.parse(readKv(storageMock, CLARITY_KEY)).totalMinutes).toBe(5)
  })

  it('⑧ 引擎预设常量不被写穿（INCR-458 回归：面板播放不得污染模块级预设）', async () => {
    const { wrapper } = await mountPanel()
    // 动态 import 的同一模块实例
    const { MEDITATION_SEQUENCES } = await import('../../modules/light')
    const presetId = MEDITATION_SEQUENCES[0].id
    expect(MEDITATION_SEQUENCES.find((s) => s.id === presetId)!.useCount, '前置：预设应为 0').toBe(0)

    await wrapper.find(`[data-testid="msq-start-${presetId}"]`).trigger('click')
    await wrapper.vm.$nextTick()
    await playToEnd(wrapper)
    await flushPromises()

    // UI 显示 1，但模块级预设必须仍是 0
    expect(wrapper.text()).toContain('已用 1 次')
    expect(
      MEDITATION_SEQUENCES.find((s) => s.id === presetId)!.useCount,
      '预设常量被面板播放写穿',
    ).toBe(0)
  })
})

// ============================================================
// 4. 空步骤序列：按钮禁用，不可进入播放态
// ============================================================

describe('MeditationSequencePlayer · 空步骤序列', () => {
  it('⑨ steps 为空的序列：播放按钮禁用且标注无步骤，点击不进入播放态', async () => {
    const empty = [{
      id: 'seq-empty', name: '空序列', description: '没有步骤',
      steps: [], totalDuration: 0, difficulty: 'beginner', useCount: 0,
    }]
    const { wrapper, storageMock } = await mountPanel({ [PRACTICE_KEY]: JSON.stringify(empty) })

    const btn = wrapper.find('[data-testid="msq-start-seq-empty"]')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.text()).toContain('暂无可播放步骤')

    await btn.trigger('click')
    await wrapper.vm.$nextTick()
    // 没有播放器；且序列未被写回（useCount 仍 0，序列数组仍是原来那一条）
    expect(wrapper.find('.msql-player').exists()).toBe(false)
    const saved = JSON.parse(readKv(storageMock, PRACTICE_KEY))
    expect(saved.length).toBe(1)
    expect(saved[0].useCount).toBe(0)
    // 空序列不产生任何冥想记录 / 澄明时长
    expect(readKv(storageMock, MEDITATIONS_KEY), '空序列不该落冥想记录').toBeUndefined()
    expect(readKv(storageMock, CLARITY_KEY), '空序列不该累加澄明时长').toBeUndefined()
  })
})
