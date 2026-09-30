// ============================================================
// 镜我对话 · M2 结构化回显 单测
// 复用 extractStructured（语丝同款）：用户在镜我说的话若含
// 时间 / 执行人 / 优先级，消息旁回显对应 chip（方案 14 落库字段）。
// ============================================================

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { DialogueEntry, ParsedTask } from '../../modules/mirror/types'

const dialogueRef = ref<DialogueEntry[]>([])
const isProcessingRef = ref(false)
const isAmbiguousRef = ref(false)
const candidatesRef = ref<ParsedTask[]>([])
const mockSend = vi.fn()

vi.mock('../../modules/mirror/useMirrorDialogue', () => ({
  useMirrorDialogue: () => ({
    dialogue: dialogueRef,
    isProcessing: isProcessingRef,
    isAmbiguous: isAmbiguousRef,
    candidates: candidatesRef,
    send: mockSend,
  }),
}))

vi.mock('../../modules/mirror/intents', () => ({
  INTENT_INFO: {},
}))

async function getWrapper() {
  const { default: MirrorDialogue } = await import('../MirrorDialogue.vue')
  return mount(MirrorDialogue, { props: { visible: true } })
}

beforeEach(() => {
  vi.clearAllMocks()
  dialogueRef.value = []
  isProcessingRef.value = false
  isAmbiguousRef.value = false
  candidatesRef.value = []
  mockSend.mockResolvedValue({
    response: '',
    result: { success: true, stepsExecuted: 0, stepsTotal: 0, message: '', stepResults: [] },
    parsedTask: null,
    ambiguous: false,
  })
})

describe('MirrorDialogue · M2 结构化回显', () => {
  it('用户消息含 时间/执行人/优先级 时回显结构化 chips', async () => {
    dialogueRef.value = [{
      id: 'd1', role: 'user', text: '明天下午3点让张三处理上线 高优先级', timestamp: Date.now(),
    }]
    const wrapper = await getWrapper()
    const chips = wrapper.findAll('.md-struct-chip')
    expect(chips.length).toBeGreaterThanOrEqual(3)

    const labels = chips.map((c) => c.text()).join(' | ')
    expect(labels).toContain('执行 · 张三')
    expect(labels).toContain('高优先级')
    expect(labels).toMatch(/时间/)
  })

  it('纯文本无结构化字段时不渲染 chips', async () => {
    dialogueRef.value = [{
      id: 'd2', role: 'user', text: '你好世界', timestamp: Date.now(),
    }]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-struct-chips').exists()).toBe(false)
  })
})
