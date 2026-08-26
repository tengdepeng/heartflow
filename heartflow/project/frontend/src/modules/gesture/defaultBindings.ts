import type { GestureBindings } from './contracts'

export const DEFAULT_GESTURE_BINDINGS: GestureBindings = {
  tap: 'doNothing',
  'long-press': 'finishFocusSession',
  'circle-cw': 'toggleFocusTimer',
  'circle-ccw': 'doNothing',
  cross: 'doNothing',
  wave: 'doNothing',
  'horizontal-swipe-left': 'doNothing',
  'horizontal-swipe-right': 'doNothing',
}
