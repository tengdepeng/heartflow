import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRuntimeStore } from './runtime'
import { useTimerStore } from './timer'
import { useAdvisorStore } from './advisor'
import { storage } from '../engine/storage'

describe('runtime sanctuary control', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
  })

  it('enterSanctuary pauses timer and advisor once', () => {
    const runtime = useRuntimeStore()
    const timer = useTimerStore()
    const advisor = useAdvisorStore()

    const timerSpy = vi.spyOn(timer, 'pauseForSanctuary')
    const advisorSpy = vi.spyOn(advisor, 'pauseForSanctuary')

    runtime.enterSanctuary()

    expect(runtime.isSanctuaryActive).toBe(true)
    expect(timerSpy).toHaveBeenCalledTimes(1)
    expect(advisorSpy).toHaveBeenCalledTimes(1)
  })

  it('exitSanctuary resumes timer and advisor', () => {
    const runtime = useRuntimeStore()
    const timer = useTimerStore()
    const advisor = useAdvisorStore()

    const timerSpy = vi.spyOn(timer, 'resumeFromSanctuary')
    const advisorSpy = vi.spyOn(advisor, 'resumeFromSanctuary')

    runtime.enterSanctuary()
    runtime.exitSanctuary()

    expect(runtime.isSanctuaryActive).toBe(false)
    expect(timerSpy).toHaveBeenCalledTimes(1)
    expect(advisorSpy).toHaveBeenCalledTimes(1)
  })

  it('re-entering sanctuary does not pause twice', () => {
    const runtime = useRuntimeStore()
    const timer = useTimerStore()
    const advisor = useAdvisorStore()

    const timerSpy = vi.spyOn(timer, 'pauseForSanctuary')
    const advisorSpy = vi.spyOn(advisor, 'pauseForSanctuary')

    runtime.enterSanctuary()
    runtime.enterSanctuary()

    expect(runtime.isSanctuaryActive).toBe(true)
    expect(timerSpy).toHaveBeenCalledTimes(1)
    expect(advisorSpy).toHaveBeenCalledTimes(1)
  })

  it('exiting when sanctuary is inactive stays silent', () => {
    const runtime = useRuntimeStore()
    const timer = useTimerStore()
    const advisor = useAdvisorStore()

    const timerSpy = vi.spyOn(timer, 'resumeFromSanctuary')
    const advisorSpy = vi.spyOn(advisor, 'resumeFromSanctuary')

    runtime.exitSanctuary()

    expect(runtime.isSanctuaryActive).toBe(false)
    expect(timerSpy).not.toHaveBeenCalled()
    expect(advisorSpy).not.toHaveBeenCalled()
  })
})
