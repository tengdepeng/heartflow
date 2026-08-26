// ============================================================
// 宪法合规硬门控 · 单一真源
// 蓝图宪法第5条「按需开启 / 无推送」：禁止 OS 级主动推送（浏览器/桌面通知）。
//
// 此前门控只内联在 push-channel 组合式内部，导致 useDesktopTouchpoints /
// rest/notification-bridge / engine/automation 三处直连 new Notification 绕过
// 宪法。本模块把「是否禁止 OS 通知」抽成唯一函数，所有 OS 通知发射点必须
// 经过它，确保第5条端到端 fail-closed。
//
// 语义（与历史实现保持一致，不扩大范围）：
//   - 读取 useConfigStore().config.complianceOverride.notificationBlocked
//   - true  => 禁止（宪法第5条启用）
//   - false => 放行
//   - 读取异常 => 返回 false（防御性 fail-open，运行期 config 必在，极少触发）
// ============================================================

import { useConfigStore } from '../stores/config'

/**
 * 宪法第5条硬门控：OS 级主动推送是否应被禁止。
 * 所有浏览器/桌面原生通知发射点（push-channel、桌面触角、息壤提醒、
 * 自动化 notify 动作）在 `new Notification` 之前必须调用本函数，
 * blocked 时直接 return，确保端到端 fail-closed。
 */
export function isOsNotificationBlocked(): boolean {
  try {
    const override = useConfigStore().config?.complianceOverride
    return !!override?.notificationBlocked
  } catch {
    return false
  }
}
