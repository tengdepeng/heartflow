// ============================================================
// 计时↔习惯直连 · 专注完成自动打卡桥
// 在专注会话（mode==='focus'）完成后，自动打卡所有
// 用户显式开启「专注自动打卡」(autoCheckInOnFocus) 的习惯。
//
// 设计约束（对齐宪法与项目惯例）：
// - 默认静默、用户主权：仅作用于用户手动开启的习惯，系统不静默动数据。
// - 幂等：completeHabit 自身保证「今日已打卡则不重复计数」，
//   因此每次专注完成重复调用是安全的。
// - 可逆：用户在习惯卡片上关闭开关即可停止自动打卡。
// - 仅 focus 模式触发：nap(小憩)/free(自由) 不视为「专注」。
// ============================================================

import { useDisciplineBridge } from './workshop-bridge'

/**
 * 专注会话完成 → 自动打卡所有开启「专注自动打卡」的启用习惯。
 * @returns 本次被成功自动打卡的习惯标题列表（用于可选的用户反馈/通知）。
 */
export function autoCheckInFocusHabits(): string[] {
  const bridge = useDisciplineBridge()
  const checkedIn: string[] = []

  for (const habit of bridge.getTodayHabits()) {
    if (!habit.autoCheckInOnFocus) continue
    const result = bridge.completeHabit(habit.id)
    // completeHabit 返回 null 表示未打卡（已打卡/未启用/不存在），跳过
    if (result) checkedIn.push(habit.title)
  }

  return checkedIn
}
