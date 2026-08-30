// ============================================================
// 镜面对话系统 · 三级操作模式门控测试
// 覆盖 Item 9：三级操作模式（静默/确认/建议）必须对幕僚对话真正生效
// - silent  → 直接执行（navigate 真实跳转）
// - confirm → 不自动执行，发出待确认事件并携带原始指令
// - suggest → 不自动执行，发出建议事件
// ============================================================

import { describe, expect, it, vi, beforeEach } from 'vitest'

// 路由 mock：返回单例，便于断言 composable 是否真正调用 navigate
const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

// 门控 mock：默认 silent（直接执行），测试内通过 h.mode 切换返回值
const h = vi.hoisted(() => ({
  emitOperationGate: vi.fn(),
  mode: 'execute' as 'execute' | 'confirm' | 'suggest',
}))
vi.mock('../../operation-mode/gate', () => ({
  decideForProactive: () => h.mode,
  emitOperationGate: h.emitOperationGate,
  GATE_EVENT_NAME: 'hf:operation-gate',
  ADVISOR_CONFIRM_EXECUTE_EVENT: 'hf:advisor-confirm-execute',
}))

import { useMirrorDialogue } from '../useMirrorDialogue'

describe('三级操作模式门控（Item 9）', () => {
  beforeEach(() => {
    routerPush.mockClear()
    h.emitOperationGate.mockClear()
    h.mode = 'execute'
  })

  it('silent 模式：直接执行，navigate 真实跳转且不发门控事件', async () => {
    const { send } = useMirrorDialogue()
    const res = await send('我要记账')

    expect(h.emitOperationGate).not.toHaveBeenCalled()
    expect(routerPush).toHaveBeenCalled()
    expect(res.response).not.toContain('待确认')
    expect(res.response).not.toContain('建议')
  })

  it('confirm 模式：不自动执行，发出待确认事件并携带原始指令+意图', async () => {
    h.mode = 'confirm'
    const { send } = useMirrorDialogue()
    const res = await send('我要记账')

    expect(h.emitOperationGate).toHaveBeenCalledTimes(1)
    const evt = h.emitOperationGate.mock.calls[0][0] as Record<string, unknown>
    expect(evt.kind).toBe('advisor')
    expect(evt.decision).toBe('confirm')
    expect(evt.originalText).toBe('我要记账')
    expect(evt.intent).toBe('finance')
    // 关键：未自动跳转，杜绝"静默无动作"也杜绝"卡死不执行"
    expect(routerPush).not.toHaveBeenCalled()
    expect(res.response).toContain('待确认')
  })

  it('suggest 模式：不自动执行，发出建议事件', async () => {
    h.mode = 'suggest'
    const { send } = useMirrorDialogue()
    const res = await send('我要记账')

    expect(h.emitOperationGate).toHaveBeenCalledTimes(1)
    const evt = h.emitOperationGate.mock.calls[0][0] as Record<string, unknown>
    expect(evt.decision).toBe('suggest')
    expect(routerPush).not.toHaveBeenCalled()
    expect(res.response).toContain('建议')
  })

  it('bypassGate=true（来自待确认托盘回投）：跳过门控，直接执行', async () => {
    h.mode = 'confirm'
    const { send } = useMirrorDialogue()
    const res = await send('我要记账', { bypassGate: true })

    // 即便模式是 confirm，bypass 后仍真实执行
    expect(routerPush).toHaveBeenCalled()
    expect(h.emitOperationGate).not.toHaveBeenCalled()
    expect(res.response).not.toContain('待确认')
  })
})
