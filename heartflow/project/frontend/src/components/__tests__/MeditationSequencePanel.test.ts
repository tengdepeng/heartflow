// ============================================================
// MeditationSequencePanel 组件测试 - 留光阁冥想序列预设上盘（INCR-457）
// 真实引擎全链路：直引 light-practice 引擎的 useLightPractice 与其内置预设
// MEDITATION_SEQUENCES（不 mock 引擎，才能证明预设序列真的渲染出来了）。
// 存储走createMockStorage + invalidateCache + 动态 import（同CapsuleArchivePanel），
// 因为引擎在 setup 期同步读 localStorage，必须在装组件前把 localStorage 换掉。
// 另注：mountPanel 里的 vi.resetModules() 会让本文件静态 import 的 MEDITATION_SEQUENCES
// 与组件内useLightPractice 拿到的是**不同模块实例**，故本文件的预设常量不会被组件污染；
// 但真实 App 单实例下浅拷贝会穿透（见「播放完整条序列后」用例内注释），断言仍按字面量基准写。
//
//INCR-462 更新：面板的「启动序列」改为「播放序列」= 发起真播放器
// （MeditationSequencePlayer），**播完才落盘**。原「点一下就落盘」的用例契约
// 已被有意替换为「走完全部步骤才落盘 + 未播完不落盘」，
// 播放态/ 倒计时 / 退出不落盘等细粒度断言在 MeditationSequencePlayer.test.ts。
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import { MEDITATION_SEQUENCES } from '../../modules/light'

const PRACTICE_KEY = 'hf:light:practice'
const CLARITY_KEY = 'hf:light:clarity'
const MEDITATIONS_KEY = 'hf:light:meditations'

/**
 * @param kv 预置 kvStore（用于制造「用户曾把序列清空」的真实持久化路径）
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
  return { wrapper, storageMock }
}

/** 读回真实落盘数据（证明引擎副作用真的发生了，而非仅改内存） */
function readKv(storageMock: Record<string, any>, key: string) {
  const raw = storageMock.getItem('heartflow:storage')
  return raw ? JSON.parse(raw).kvStore?.[key] : undefined
}

describe('MeditationSequencePanel · 冥想序列预设（INCR-457）', () => {
  it('渲染引擎内置的全部预设序列（名称/描述/总时长/难度/步骤数）', async () => {
    const { wrapper } = await mountPanel()
    const text = wrapper.text()
    // 四条预设逐一出现
    for (const seq of MEDITATION_SEQUENCES) {
      expect(text).toContain(seq.name)
      expect(text).toContain(seq.description)
      expect(text).toContain(`${seq.totalDuration} 分钟`)
      expect(text).toContain(`${seq.steps.length} 步`)
    }
    // 难度复用引擎 MEDITATION_DIFFICULTY_META 的中文标签
    expect(text).toContain('初学者')
    expect(text).toContain('进阶')
    expect(text).toContain('深入')
    // 卡片数与预设数一致
    expect(wrapper.findAll('.msq-item').length).toBe(MEDITATION_SEQUENCES.length)
  })

  it('展开后可见每一步的类型标签与引导指令', async () => {
    const { wrapper } = await mountPanel()
    const target = MEDITATION_SEQUENCES[0]
    expect(target.steps.length).toBeGreaterThan(0)

    await wrapper.findAll('.msq-item-head')[0].trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.msq-step').length).toBe(target.steps.length)
    const text = wrapper.text()
    for (const step of target.steps) {
      expect(text).toContain(step.instruction)
    }
    // 类型标签复用 MEDITATION_TYPE_META
    expect(text).toContain('呼吸冥想')
    expect(text).toContain('身体扫描')
  })

  it('未展开时不渲染步骤指令', async () => {
    const { wrapper } = await mountPanel()
    const target = MEDITATION_SEQUENCES[0]
    expect(wrapper.find('.msq-steps').exists()).toBe(false)
    expect(wrapper.text()).not.toContain(target.steps[0].instruction)
  })

  it('播放完整条序列后：调用引擎 useSequence 并真实落盘（useCount+1 / 练习入冥想记录 / 澄明时长累加）', async () => {
    const { wrapper, storageMock } = await mountPanel()
    const target = MEDITATION_SEQUENCES[0]

    // 前置条件：本用例开始时该序列的使用次数确定为 0（下方所有断言都以此为基准）。
    // 基准写成字面量而非 target.useCount + N —— 引擎 loadSequences() 的 [...MEDITATION_SEQUENCES]
    // 是浅拷贝，useSequence 的 useCount++ 会穿透 reactive proxy 改写模块级预设对象；
    // 若基准读自身属性，就会随被测行为漂移，得出误导性结论。
    expect(wrapper.text()).toContain('已用 0 次')

    expect(wrapper.find(`[data-testid="msq-start-${target.id}"]`).exists()).toBe(true)
    await wrapper.find(`[data-testid="msq-start-${target.id}"]`).trigger('click')
    await wrapper.vm.$nextTick()

    // ── INCR-462 语义变更 ──
    // 「启动序列」不再是「点一下就记一次练习」，而是发起**真播放**
    // （逐步倒计时 + 步骤推进 + 进度条，播放器由 MeditationSequencePlayer 承载）。
    // 因此本用例必须**走完全部步骤**才谈得上落盘 —— 这正是「播完才记」的产品要求。
    // （INCR-457 时这条用例点一下按钮就断言落盘；那个契约已被本增量有意替换。）
    expect(wrapper.find('.msql-player').exists(), '未进入播放态').toBe(true)
    // 关键反向断言：进入播放但没播完 ⇒ 三个 key 一个都不该落盘
    expect(readKv(storageMock, PRACTICE_KEY), '未播完却落盘了序列').toBeUndefined()
    expect(readKv(storageMock, MEDITATIONS_KEY), '未播完却落了冥想记录').toBeUndefined()

    // 走完 N 步：逐步点「下一步」直到最后一步的「完成」
    for (let guard = 0; guard < 20; guard++) {
      const next = wrapper.find('[data-testid="msql-next"]')
      if (!next.exists()) break
      await next.trigger('click')
      await wrapper.vm.$nextTick()
    }

    // ① useSequence 的副作用：序列被写回且 useCount 由 0 递增为 1
    //    （pavilion 不写这个 key，故它的变化只能来自 useSequence → saveSequences）
    //    先断言 key 存在再 parse：若 useSequence 未被调用则该 key缺失，
    //    直接 JSON.parse(undefined) 会抛 SyntaxError 而掩盖真正的失败原因。
    const rawSequences = readKv(storageMock, PRACTICE_KEY)
    expect(rawSequences, 'useSequence 未被调用：hf:light:practice 未落盘').toBeTruthy()
    const saved = (JSON.parse(rawSequences) as any[]).find((s) => s.id === target.id)
    expect(saved.useCount).toBe(1)

    // ② 引擎把 record.duration 计入澄明追踪（useSequence 专属副作用）
    const rawClarity = readKv(storageMock, CLARITY_KEY)
    expect(rawClarity, 'useSequence 未被调用：hf:light:clarity 未落盘').toBeTruthy()
    const clarity = JSON.parse(rawClarity)
    expect(clarity.totalMinutes).toBe(target.totalDuration)

    // ③ 面板经 pavilion 落的真实冥想记录（总时长 = 序列各步之和）
    const meditations = JSON.parse(readKv(storageMock, MEDITATIONS_KEY))
    expect(meditations.length).toBe(1)
    expect(meditations[0].duration).toBe(target.totalDuration)
    expect(meditations[0].insight).toBe(`冥想序列：${target.name}`)

    // ④ UI 回读：使用次数与完成提示都更新，且已退出播放态回到列表
    expect(wrapper.find('.msql-player').exists()).toBe(false)
    expect(wrapper.text()).toContain('已用 1 次')
    expect(wrapper.text()).toContain('已记录一次练习')
  })

  it('持久化为空序列时渲染共享 EmptyState 空态', async () => {
    // 真实引擎路径：loadSequences() 只在 kv 为空串时回退预设；
    // 用户曾把序列清空（落盘 "[]"）时 sequences 就是空数组。
    const { wrapper } = await mountPanel({ [PRACTICE_KEY]: JSON.stringify([]) })

    expect(wrapper.find('.msq-item').exists()).toBe(false)
    // 用的是项目共享空态组件，而非自写空态 div
    expect(wrapper.find('.hf-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有冥想序列')
  })
})
