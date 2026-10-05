// ============================================================
// TtsControlPanel 测试 - 阅览殿「听书」控制面板
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- Mock speechSynthesis 环境 ----
const spoken: string[] = []
let endHandlers: (() => void)[] = []
const synth = {
  speak: vi.fn((u: any) => {
    spoken.push(u.text)
    if (u.onend) endHandlers.push(u.onend)
  }),
  pause: vi.fn(),
  resume: vi.fn(),
  cancel: vi.fn(),
}

class MockUtterance {
  text: string
  rate = 1
  lang = ''
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(text: string) {
    this.text = text
  }
}

function setupSupported() {
  ;(globalThis as Record<string, unknown>).SpeechSynthesisUtterance = MockUtterance
  ;(globalThis as Record<string, unknown>).window = globalThis
  ;(globalThis as Record<string, unknown>).speechSynthesis = synth
}

function setupUnsupported() {
  delete (globalThis as Record<string, unknown>).speechSynthesis
  delete (globalThis as Record<string, unknown>).SpeechSynthesisUtterance
  ;(globalThis as Record<string, unknown>).window = globalThis
}

async function mountPanel(text: string, extra: Record<string, unknown> = {}) {
  const mod = await import('../TtsControlPanel.vue')
  return mount(mod.default, { props: { text, ...extra } })
}

describe('TtsControlPanel 听书控制', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    spoken.length = 0
    endHandlers = []
  })

  it('不支持 TTS 时显示降级提示', async () => {
    setupUnsupported()
    const wrapper = await mountPanel('测试文本')
    expect(wrapper.text()).toContain('听书')
    expect(wrapper.text()).toContain('不支持语音朗读')
  })

  it('支持 TTS 时渲染控制按钮', async () => {
    setupSupported()
    const wrapper = await mountPanel('测试文本')
    expect(wrapper.text()).toContain('朗读')
    expect(wrapper.text()).toContain('停止')
    expect(wrapper.text()).toContain('倍速')
  })

  it('点击朗读开始播放并显示进度', async () => {
    setupSupported()
    const wrapper = await mountPanel('第一句。第二句。')
    await wrapper.find('.ttp-btn-primary').trigger('click')
    expect(synth.speak).toHaveBeenCalled()
    expect(wrapper.text()).toContain('暂停')
    expect(wrapper.text()).toContain('第 1 / 2 句')
  })

  it('播放中点击切换为暂停，按钮变为续播', async () => {
    setupSupported()
    const wrapper = await mountPanel('第一句。第二句。')
    await wrapper.find('.ttp-btn-primary').trigger('click')
    await wrapper.find('.ttp-btn-primary').trigger('click')
    expect(synth.pause).toHaveBeenCalled()
    expect(wrapper.text()).toContain('续播')
  })

  it('点击停止回到待机', async () => {
    setupSupported()
    const wrapper = await mountPanel('第一句。第二句。')
    await wrapper.find('.ttp-btn-primary').trigger('click')
    await wrapper.find('.ttp-btn-stop').trigger('click')
    expect(synth.cancel).toHaveBeenCalled()
    expect(wrapper.text()).toContain('朗读')
  })

  it('点击倍速按钮后高亮对应档位', async () => {
    setupSupported()
    const wrapper = await mountPanel('第一句。')
    const rateBtns = wrapper.findAll('.ttp-rate-btn')
    await rateBtns[2].trigger('click')
    expect(wrapper.find('.ttp-rate-btn.active').text()).toContain('1x')
  })

  it('文本变化时停止朗读', async () => {
    setupSupported()
    const wrapper = await mountPanel('第一句。')
    await wrapper.find('.ttp-btn-primary').trigger('click')
    expect(wrapper.text()).toContain('暂停')
    await wrapper.setProps({ text: '新文本' })
    expect(synth.cancel).toHaveBeenCalled()
    expect(wrapper.text()).toContain('朗读')
  })

  it('朗读时渲染句块列表并高亮当前句（INCR-515）', async () => {
    setupSupported()
    const wrapper = await mountPanel('第一句。第二句。第三句。')
    await wrapper.find('.ttp-btn-primary').trigger('click')
    const items = wrapper.findAll('.ttp-sentence')
    expect(items.length).toBe(3)
    expect(items[0].classes()).toContain('is-active')
    expect(items[1].classes()).not.toContain('is-active')
  })

  it('句块读完推进高亮到下一句', async () => {
    setupSupported()
    const wrapper = await mountPanel('第一句。第二句。')
    await wrapper.find('.ttp-btn-primary').trigger('click')
    endHandlers.shift()?.()
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('.ttp-sentence')
    expect(items[0].classes()).toContain('is-read')
    expect(items[1].classes()).toContain('is-active')
  })

  it('从 startParagraph 起读（读→听续接）', async () => {
    setupSupported()
    const wrapper = await mountPanel('第一段。\n第二段。', { startParagraph: 1 })
    await wrapper.find('.ttp-btn-primary').trigger('click')
    expect(spoken).toEqual(['第二段。'])
  })

  it('朗读推进按段落回报 progress（听→读续接）', async () => {
    setupSupported()
    const wrapper = await mountPanel('甲一。甲二。\n乙一。')
    await wrapper.find('.ttp-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    const lastProgress = () => {
      const ev = wrapper.emitted('progress')!
      return ev[ev.length - 1]
    }
    expect(wrapper.emitted('progress')?.[0]).toEqual([0, 0])
    // 推进到第二块（仍属段 0，段内第 2 句）
    endHandlers.shift()?.()
    await wrapper.vm.$nextTick()
    expect(lastProgress()).toEqual([0, 1])
    // 推进到第三块（属段 1，段内第 1 句）
    endHandlers.shift()?.()
    await wrapper.vm.$nextTick()
    expect(lastProgress()).toEqual([1, 0])
  })

  it('从 startChunkOffset 起读（读→听句块级续接）', async () => {
    setupSupported()
    const wrapper = await mountPanel('甲。乙。丙。', { startParagraph: 0, startChunkOffset: 2 })
    await wrapper.find('.ttp-btn-primary').trigger('click')
    expect(spoken).toEqual(['丙。'])
  })

  it('startChunkOffset 越段时夹取到该段末块', async () => {
    setupSupported()
    const wrapper = await mountPanel('甲。乙。\n丙。', { startParagraph: 0, startChunkOffset: 9 })
    await wrapper.find('.ttp-btn-primary').trigger('click')
    expect(spoken).toEqual(['乙。'])
  })

  it('跟读开关点击后 emit update:follow', async () => {
    setupSupported()
    const wrapper = await mountPanel('第一句。')
    await wrapper.find('.ttp-follow-btn').trigger('click')
    expect(wrapper.emitted('update:follow')?.[0]).toEqual([true])
  })

  it('停止后取消逐句高亮', async () => {
    setupSupported()
    const wrapper = await mountPanel('第一句。第二句。')
    await wrapper.find('.ttp-btn-primary').trigger('click')
    await wrapper.find('.ttp-btn-stop').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ttp-sentence.is-active').exists()).toBe(false)
  })
})
