import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAdvisorStore } from '../advisor'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

function setupStorage() {
  const memoryStorage = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => memoryStorage.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStorage.set(key, value),
      removeItem: (key: string) => memoryStorage.delete(key),
    },
    configurable: true,
  })
}

describe('调令系统闭环 (issueCommand)', () => {
  beforeEach(() => {
    setupStorage()
    setActivePinia(createPinia())
    storage.clear()
    const today = getLocalDateKey()
    storage.setConfig({ ...storage.getConfig(), advisorEnabled: true, advisorResetDate: today })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('空调令返回 null', () => {
    const advisor = useAdvisorStore()
    expect(advisor.issueCommand('   ')).toBeNull()
  })

  it('下达调令：解析意图并派单，进入 running 状态', () => {
    const advisor = useAdvisorStore()
    const task = advisor.issueCommand('帮我查一下最近的工作记录')
    expect(task).not.toBeNull()
    expect(task!.status).toBe('running')
    expect(task!.intentLabel).toBe('汇总检索')
    expect(task!.advisorName).toBeTruthy()
    // 任务进入列表
    expect(advisor.getCommandTasks().length).toBe(1)
    expect(advisor.commandTasks.length).toBe(1)
  })

  it('任务生命周期：运行 → 收尾浮现完成光点', () => {
    vi.useFakeTimers()
    const advisor = useAdvisorStore()
    const task = advisor.issueCommand('开始专注写代码')!
    vi.advanceTimersByTime(1700)
    expect(task.status).toBe('done')
    expect(task.doneLight).toBe(true)
    expect(task.resultSummary).toBeTruthy()
    expect(advisor.getCommandTasks()[0].status).toBe('done')
  })

  it('review 类调令收尾给出真实数据汇总结论', () => {
    vi.useFakeTimers()
    const advisor = useAdvisorStore()
    const task = advisor.issueCommand('统计我最近一个月的笔记和情绪')!
    vi.advanceTimersByTime(1700)
    expect(task.status).toBe('done')
    expect(task.resultSummary).toContain('近 30 天')
  })

  it('调令持久化：reload 后历史任务保留，running 收尾为 done', () => {
    vi.useFakeTimers()
    const advisor = useAdvisorStore()
    advisor.issueCommand('记一下今天的灵感')
    vi.advanceTimersByTime(1700)
    const persisted = storage.getKV<any[]>('hf:command-tasks', [])
    expect(persisted.length).toBe(1)
    expect(persisted[0].status).toBe('done')
  })
})
