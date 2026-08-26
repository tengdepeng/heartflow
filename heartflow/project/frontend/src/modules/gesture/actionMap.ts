import type { GestureAction, GestureActionHandler } from './contracts'

export function createCoreGestureActionMap(deps: {
  toggleFocusTimer: () => void
  finishFocusSession: () => void
  enterSafeIsland: () => void
  exitSafeIsland: () => void
  navigateNext?: () => void
  navigatePrev?: () => void
}): Record<GestureAction, GestureActionHandler> {
  return {
    doNothing: () => {},
    toggleFocusTimer: () => deps.toggleFocusTimer(),
    finishFocusSession: () => deps.finishFocusSession(),
    enterSafeIsland: () => deps.enterSafeIsland(),
    exitSafeIsland: () => deps.exitSafeIsland(),
    'navigate-next': () => deps.navigateNext?.(),
    'navigate-prev': () => deps.navigatePrev?.(),
  }
}

/** 导航动作映射 */
export function createNavigationActionMap(deps: {
  goNext: () => void
  goPrev: () => void
}): Record<GestureAction, GestureActionHandler> {
  return {
    doNothing: () => {},
    toggleFocusTimer: () => {},
    finishFocusSession: () => {},
    enterSafeIsland: () => {},
    exitSafeIsland: () => {},
    'navigate-next': () => deps.goNext(),
    'navigate-prev': () => deps.goPrev(),
  }
}
