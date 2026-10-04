// ============================================================
// 多时段提醒 · barrel export（INCR-490）
// ============================================================

export {
  useMultiReminder,
  defaultMultiReminder,
  isValidTime,
  parseTime,
  formatTime,
  minutesOfDay,
  sortSlots,
  classifySlots,
  nextSlot,
  msUntilNextSlot,
  dayProgress,
  slotPercent,
  DEFAULT_SLOTS,
} from './multi-reminder'

export type { ReminderSlot, MultiReminderState, SlotStatus, ClassifiedSlot } from './multi-reminder'
