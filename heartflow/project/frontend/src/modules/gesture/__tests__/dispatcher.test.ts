import { describe, expect, it, vi } from 'vitest'
import { createGestureDispatcher } from '../dispatcher'
import { DEFAULT_GESTURE_BINDINGS } from '../defaultBindings'
import { createCoreGestureActionMap } from '../actionMap'

describe('gesture dispatcher', () => {
  it('includes doNothing in default bindings', () => {
    expect(Object.values(DEFAULT_GESTURE_BINDINGS)).toContain('doNothing')
  })

  it('skips silently for doNothing mapping', async () => {
    const dispatcher = createGestureDispatcher({
      getBindings: () => DEFAULT_GESTURE_BINDINGS,
      actionMap: createCoreGestureActionMap({
        toggleFocusTimer: vi.fn(),
        finishFocusSession: vi.fn(),
        enterSafeIsland: vi.fn(),
        exitSafeIsland: vi.fn(),
      }),
    })

    await expect(dispatcher('tap', {
      isFocusing: false,
      isPaused: false,
      isInSafeIsland: false,
    })).resolves.toEqual({ kind: 'skipped', reason: 'do-nothing' })
  })

  it('executes mapped action with injected handlers', async () => {
    const toggleFocusTimer = vi.fn()
    const dispatcher = createGestureDispatcher({
      getBindings: () => DEFAULT_GESTURE_BINDINGS,
      actionMap: createCoreGestureActionMap({
        toggleFocusTimer,
        finishFocusSession: vi.fn(),
        enterSafeIsland: vi.fn(),
        exitSafeIsland: vi.fn(),
      }),
    })

    await expect(dispatcher('circle-cw', {
      isFocusing: false,
      isPaused: false,
      isInSafeIsland: false,
    })).resolves.toEqual({ kind: 'executed', action: 'toggleFocusTimer' })

    expect(toggleFocusTimer).toHaveBeenCalledTimes(1)
  })

  it('blocks non-exit actions in safe island context', async () => {
    const dispatcher = createGestureDispatcher({
      getBindings: () => DEFAULT_GESTURE_BINDINGS,
      actionMap: createCoreGestureActionMap({
        toggleFocusTimer: vi.fn(),
        finishFocusSession: vi.fn(),
        enterSafeIsland: vi.fn(),
        exitSafeIsland: vi.fn(),
      }),
    })

    await expect(dispatcher('long-press', {
      isFocusing: true,
      isPaused: false,
      isInSafeIsland: true,
    })).resolves.toEqual({ kind: 'skipped', reason: 'blocked-by-context' })
  })

  it('skips unregistered action handlers safely', async () => {
    const dispatcher = createGestureDispatcher({
      getBindings: () => ({
        ...DEFAULT_GESTURE_BINDINGS,
        wave: 'enterSafeIsland',
      }),
      actionMap: {
        doNothing: vi.fn(),
      },
    })

    await expect(dispatcher('wave', {
      isFocusing: false,
      isPaused: false,
      isInSafeIsland: false,
    })).resolves.toEqual({ kind: 'skipped', reason: 'unregistered' })
  })
})
