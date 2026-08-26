// ============================================================
// 世界壳 · 导出入口
// ============================================================

export type {
  WorldShellRenderer,
  ShellContext,
  ShellRoomAnchor,
  ShellSlot,
} from './types'

export {
  registerShell,
  createShell,
  isShellRegistered,
} from './types'
export { buildShellRoomAnchors } from './rooms'

export { CourtyardShell } from './courtyard'
export { Courtyard3DShell } from './courtyard-3d'
export { StarsShell } from './stars'
export { Stars3DShell } from './stars-3d'
export { SolidShell } from './solid'

// 注册所有已实现的壳（各壳在自身文件中自注册；
// ocean/home-scan/video/custom 中 video/custom 为占位渐变，ocean/home-scan 待实现）
import './courtyard'
import './courtyard-3d'
import './stars'
import './stars-3d'
import './solid'
import './placeholder'
