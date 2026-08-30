import { describe, expect, it, beforeEach, vi } from 'vitest'

// 镜我对话依赖 vue-router（仅 navigate 步骤用到），单元测试中桩掉
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

describe('镜我对话 · send（MVP-A：M3 房间感知 + M4 歧义消解）', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  it('planMirrorInput 支持强制意图，真正消解歧义', async () => {
    const { parseTask } = await import('../parser')
    const { planMirrorInput } = await import('../executor')

    // "帮我写个方案" 同时命中 note 与 create，且置信度接近 → 歧义
    const r = parseTask('帮我写个方案')
    const intents = r.tasks.map(t => t.intent)
    expect(intents).toContain('note')
    expect(intents).toContain('create')
    expect(r.ambiguous).toBe(true)

    // 强制为 note / create 都应被采纳（不再听命于置信度最高者）
    expect(planMirrorInput('帮我写个方案', 'note').parsedTask?.intent).toBe('note')
    expect(planMirrorInput('帮我写个方案', 'create').parsedTask?.intent).toBe('create')
  })

  it('send 携带 roomId，镜我创建的笔记归属当前房间（M3）', async () => {
    const { useMirrorDialogue } = await import('../useMirrorDialogue')
    const { useStudy } = await import('../../study')

    const m = useMirrorDialogue()
    const res = await m.send('记一个灵感 #测试', { overrideIntent: 'note', roomId: 'study' })

    expect(res.parsedTask?.intent).toBe('note')
    const notes = useStudy().notes.value
    expect(notes.length).toBeGreaterThan(0)
    expect(notes[0].roomId).toBe('study')
    expect(notes[0].tags).toContain('测试')
  })

  it('send 歧义消解后不再标记为 ambiguous，且选定意图生效（M4）', async () => {
    const { useMirrorDialogue } = await import('../useMirrorDialogue')
    const m = useMirrorDialogue()

    await m.send('帮我写个方案', { overrideIntent: 'note', roomId: 'study' })
    // 选定意图后，解析状态不再歧义
    expect(m.isAmbiguous.value).toBe(false)
    expect(m.candidates.value.some(c => c.intent === 'note')).toBe(true)
    // 用户消息上的解析结果应为被强制选定的意图
    const userEntry = m.dialogue.value.find(d => d.role === 'user')
    expect(userEntry?.parsedTask?.intent).toBe('note')
  })

  it('send「我要记账」真办事：解析为 finance 并 router.push 到 /reward（修复：此前镜我说打开记账不做）', async () => {
    const { useMirrorDialogue } = await import('../useMirrorDialogue')
    const m = useMirrorDialogue()

    const res = await m.send('我要记账')
    expect(res.parsedTask?.intent).toBe('finance')
    // useMirrorDialogue 在 executePlan 前对 navigate 步执行 router.push
    expect(mockPush).toHaveBeenCalledWith('/reward')
    // 回应文案确认打开了劳酬
    expect(res.response).toContain('劳酬')
  })
})
