// ============================================================
// 调令动作执行器测试（useCommandExecutor）
// 验证 focus/note/anchor/emotion 真正触发对应动作，
// navigate/review/general 不产生副作用。
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { CommandTask } from '../../../stores/advisor'
import type { CommandTaskType } from '../commandIntent'
import { useCommandExecutor } from '../commandExecutor'

// ---- 模拟路由 ----
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// ---- 模拟专注计时 store ----
let timerStatus = 'idle'
const mockSetMode = vi.fn()
const mockStart = vi.fn()
vi.mock('../../../stores/timer', () => ({
  useTimerStore: () => ({
    session: { status: timerStatus } as any,
    setMode: (...a: any[]) => mockSetMode(...a),
    start: (...a: any[]) => mockStart(...a),
  }),
}))

// ---- 模拟笔记编辑器 ----
const mockOpenCreate = vi.fn()
vi.mock('../../note/useNoteEditor', () => ({
  useNoteEditor: () => ({ openCreate: (...a: any[]) => mockOpenCreate(...a) }),
}))

function makeTask(type: CommandTaskType, over: Partial<CommandTask> = {}): CommandTask {
  return {
    id: `cmd_${Math.random()}`,
    command: '测试调令',
    intentLabel: type,
    taskType: type,
    status: 'running',
    progressDesc: '测试中',
    createdAt: new Date().toISOString(),
    doneLight: false,
    ...over,
  }
}

describe('useCommandExecutor · 真办事层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    timerStatus = 'idle'
    mockPush.mockClear()
  })

  it('focus → 调用 setMode + start 启动专注计时', () => {
    
    const { runAction } = useCommandExecutor()
    const res = runAction(makeTask('focus'))
    expect(mockSetMode).toHaveBeenCalledWith('focus', expect.any(Number))
    expect(mockStart).toHaveBeenCalled()
    expect(res.acted).toBe(true)
    expect(res.navigated).toBeUndefined()
  })

  it('focus 在约束已自动开始时不再重复 start', () => {
    timerStatus = 'focusing'
    
    const { runAction } = useCommandExecutor()
    const res = runAction(makeTask('focus'))
    expect(mockSetMode).toHaveBeenCalled()
    expect(mockStart).not.toHaveBeenCalled()
    expect(res.acted).toBe(true)
  })

  it('note → 打开笔记编辑器', () => {
    
    const { runAction } = useCommandExecutor()
    const res = runAction(makeTask('note'))
    expect(mockOpenCreate).toHaveBeenCalled()
    expect(res.acted).toBe(true)
    expect(res.navigated).toBeUndefined()
  })

  it('anchor → 跳转锚点庭院', () => {
    
    const { runAction } = useCommandExecutor()
    const res = runAction(makeTask('anchor'))
    expect(mockPush).toHaveBeenCalledWith('/anchor')
    expect(res.acted).toBe(true)
    expect(res.navigated).toBe('/anchor')
  })

  it('emotion → 跳转情绪花房', () => {
    
    const { runAction } = useCommandExecutor()
    const res = runAction(makeTask('emotion'))
    expect(mockPush).toHaveBeenCalledWith('/garden')
    expect(res.acted).toBe(true)
    expect(res.navigated).toBe('/garden')
  })

  it('review → 纯汇报，不产生副作用', () => {
    
    const { runAction } = useCommandExecutor()
    const res = runAction(makeTask('review'))
    expect(mockSetMode).not.toHaveBeenCalled()
    expect(mockOpenCreate).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
    expect(res.acted).toBe(false)
  })

  it('general → 纯汇报，不产生副作用', () => {
    
    const { runAction } = useCommandExecutor()
    const res = runAction(makeTask('general'))
    expect(mockPush).not.toHaveBeenCalled()
    expect(res.acted).toBe(false)
  })

  it('navigate → 不产生副作用（跳转由调用方按 targetRoute 处理）', () => {
    
    const { runAction } = useCommandExecutor()
    const res = runAction(makeTask('navigate'))
    expect(mockPush).not.toHaveBeenCalled()
    expect(res.acted).toBe(false)
  })
})
