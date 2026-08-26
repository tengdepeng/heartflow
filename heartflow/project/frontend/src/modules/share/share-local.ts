// ============================================================
// 分享的本地边界治理层（宪法第43条）
//   第43条「分享的本地边界」——社区分享、房间模板与交互风格包的交换
//     仅经本地文件或点对点传输完成，不经过任何官方服务器，不强制云端账号。
//   本层是「分享目标是否合规」的单一事实源：
//     - isShareLocalOnly()：第43条是否开启（本地边界强制）
//     - assertShareLocalOnly(dest) / canShareTo(dest)：在任何分享/导出入口据宪法拦截云端目标
//   当前所有分享入口均为本地文件（.carrier / .hf-template / 种子 JSON），
//   故默认总是放行；但若未来出现云端上传目标，本守卫会据第43条拒绝，使条款真实生效。
// ============================================================

import { isTargetActive } from '../../engine/constitution-effect'

/** 分享目标类型 */
export type ShareDestination = 'local' | 'community-cloud' | 'account-cloud'

/** 第43条 分享的本地边界：是否仅允许本地分享 */
export function isShareLocalOnly(): boolean {
  return isTargetActive('share:local-only')
}

/**
 * 断言分享目标符合第43条本地边界。
 * @param dest 'local'(本地文件/P2P) 总是允许；'community-cloud'/'account-cloud' 在本地边界开启时拒绝。
 * @throws 当目标为云且本地边界开启时，抛出宪法第43条违规。
 */
export function assertShareLocalOnly(dest: ShareDestination): void {
  if (dest === 'local') return
  if (isShareLocalOnly()) {
    throw new Error('宪法第43条「分享的本地边界」已开启：社区分享仅限本地文件或 P2P，不可上传至服务器')
  }
}

/** 非抛错版本：判断某目标是否被允许 */
export function canShareTo(dest: ShareDestination): boolean {
  if (dest === 'local') return true
  return !isShareLocalOnly()
}
