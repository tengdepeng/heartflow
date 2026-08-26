import type { GestureType } from './types'

export type GestureAction =
  | 'doNothing'
  | 'toggleFocusTimer'
  | 'finishFocusSession'
  | 'enterSafeIsland'
  | 'exitSafeIsland'
  | 'navigate-next'
  | 'navigate-prev'

export type GestureBindings = Record<GestureType, GestureAction>

export interface GestureContext {
  isFocusing: boolean
  isPaused: boolean
  isInSafeIsland: boolean
}

export interface GestureActionHandlerArgs {
  context: GestureContext
}

export type GestureActionHandler = (
  args: GestureActionHandlerArgs,
) => void | Promise<void>

export interface GestureDispatcherDeps {
  getBindings: () => GestureBindings
  actionMap: Partial<Record<GestureAction, GestureActionHandler>>
}

export type DispatchResult =
  | { kind: 'executed'; action: GestureAction }
  | { kind: 'skipped'; reason: 'do-nothing' | 'no-config' | 'unregistered' | 'blocked-by-context' }
