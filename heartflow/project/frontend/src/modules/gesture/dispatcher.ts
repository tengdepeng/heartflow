import type { GestureType } from './types'
import type { DispatchResult, GestureContext, GestureDispatcherDeps } from './contracts'

export function createGestureDispatcher(deps: GestureDispatcherDeps) {
  return async function dispatchGesture(
    gestureType: GestureType,
    context: GestureContext,
  ): Promise<DispatchResult> {
    const bindings = deps.getBindings()
    const action = bindings[gestureType]

    if (!action) {
      return { kind: 'skipped', reason: 'no-config' }
    }

    if (action === 'doNothing') {
      return { kind: 'skipped', reason: 'do-nothing' }
    }

    if (context.isInSafeIsland && action !== 'exitSafeIsland') {
      return { kind: 'skipped', reason: 'blocked-by-context' }
    }

    const handler = deps.actionMap[action]
    if (!handler) {
      return { kind: 'skipped', reason: 'unregistered' }
    }

    await handler({ context })
    return { kind: 'executed', action }
  }
}
