// ============================================================
// 镜面对话系统 · 资产感知测试（Item 4）
// 覆盖"幕僚不知道自己有啥房间"：用户问房间/能力时，幕僚真正列举院落资产
// ============================================================

import { describe, expect, it, vi, beforeEach } from 'vitest'

// 路由 mock：返回单例，便于断言 navigate 是否真实发生
const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

// 门控 mock：默认 silent（直接执行）
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

describe('幕僚资产感知（Item 4）', () => {
  beforeEach(() => {
    routerPush.mockClear()
    h.emitOperationGate.mockClear()
    h.mode = 'execute'
  })

  it('用户问"有哪些房间" → 列举真实院落资产并提示打开方式', async () => {
    const { send } = useMirrorDialogue()
    const res = await send('你都有哪些房间')
    expect(res.response).toContain('心流') // 主房间必在
    expect(res.response).toContain('劳酬') // 记账空间必在
    expect(res.response).toContain('打开') // 给出"打开 XX"的操作指引
    // 不应走到通用兜底
    expect(res.response).not.toContain('不太确定你想做什么')
  })

  it('用户问"有哪些功能" → 列举可执行的意图能力', async () => {
    const { send } = useMirrorDialogue()
    const res = await send('你都会哪些功能')
    expect(res.response).toContain('记账理财') // 来自 INTENT_INFO 能力标签
    expect(res.response).toContain('专注')
  })

  it('"打开记账" 仍真实跳转（执行接线回归，不误触资产感知）', async () => {
    const { send } = useMirrorDialogue()
    const res = await send('打开记账')
    expect(routerPush).toHaveBeenCalled() // finance → /reward 真实导航
    expect(res.response).not.toContain('不太确定你想做什么')
  })

  it('无关闲聊不触发资产感知，走通用兜底', async () => {
    const { send } = useMirrorDialogue()
    const res = await send('今天天气真好')
    expect(res.response).toContain('不太确定你想做什么')
    expect(routerPush).not.toHaveBeenCalled()
  })
})
