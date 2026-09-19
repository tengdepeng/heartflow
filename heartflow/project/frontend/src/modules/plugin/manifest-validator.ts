// ============================================================
// 插件管理器 · Manifest 校验
// 安装/加载前校验插件声明的合法性与安全性
//   - 结构: 必填字段 / 类型 / 格式
//   - 安全: 权限白名单 / 沙箱配置 / 能力与贡献点唯一性
//   - 分级: error(阻断安装) / warning(提示但不阻断)
// ============================================================

import type {
  PluginTier,
} from './types'
import { PERMISSION_LABELS } from './types'

/** 校验问题严重度 */
export type ManifestIssueSeverity = 'error' | 'warning'

/** 校验问题 */
export interface ManifestValidationIssue {
  severity: ManifestIssueSeverity
  /** 出错字段路径（如 meta.id / capabilities[0].id） */
  field: string
  message: string
}

/** 合法插件 ID：小写字母数字开头，仅含小写字母/数字/中划线 */
const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9-]*$/

/** 合法语义化版本：主.次.修 */
const SEMVER_RE = /^\d+\.\d+\.\d+$/

const TIERS: PluginTier[] = ['official', 'community', 'experimental']

const CATEGORIES = ['timer', 'note', 'emotion', 'health', 'knowledge', 'visual', 'automation', 'other'] as const

const ROOM_GROUPS = ['gravity', 'main-path', 'world', 'system'] as const

const ROOM_DOMAINS = ['inward', 'outward', 'body', 'knowledge', 'work', 'time', 'system'] as const

const PERMISSION_SET = new Set<string>(Object.keys(PERMISSION_LABELS))

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean'
}

function pushError(out: ManifestValidationIssue[], field: string, message: string) {
  out.push({ severity: 'error', field, message })
}

function pushWarning(out: ManifestValidationIssue[], field: string, message: string) {
  out.push({ severity: 'warning', field, message })
}

/** 校验插件 ID 格式（小写 kebab-case） */
function checkId(out: ManifestValidationIssue[], value: unknown, field: string): void {
  if (!isNonEmptyString(value)) {
    pushError(out, field, '插件 ID 不能为空')
    return
  }
  if (!PLUGIN_ID_RE.test(value as string)) {
    pushError(out, field, '插件 ID 仅允许小写字母/数字/中划线，且须以字母或数字开头')
  }
}

function checkMeta(out: ManifestValidationIssue[], meta: unknown): void {
  if (!isRecord(meta)) {
    pushError(out, 'meta', '缺少 meta 元数据声明')
    return
  }

  checkId(out, meta.id, 'meta.id')

  if (!isNonEmptyString(meta.name)) {
    pushError(out, 'meta.name', '插件名称不能为空')
  }

  if (!isNonEmptyString(meta.version) || !SEMVER_RE.test(meta.version as string)) {
    pushError(out, 'meta.version', '版本号须为语义化版本（如 1.0.0）')
  }

  if (!isNonEmptyString(meta.description)) {
    pushWarning(out, 'meta.description', '插件描述为空，市场展示效果不佳')
  }

  if (!TIERS.includes(meta.tier as PluginTier)) {
    pushError(out, 'meta.tier', '分级须为 official / community / experimental 之一')
  }

  if (!CATEGORIES.includes(meta.category as (typeof CATEGORIES)[number])) {
    pushError(out, 'meta.category', '分类不在允许范围内')
  }

  if (!isNonEmptyString(meta.icon)) {
    pushError(out, 'meta.icon', '图标不能为空')
  }
}

function checkPermissions(out: ManifestValidationIssue[], permissions: unknown): void {
  if (!Array.isArray(permissions)) {
    pushError(out, 'permissions', '缺少权限声明列表')
    return
  }
  const seen = new Set<string>()
  permissions.forEach((p, i) => {
    if (typeof p !== 'string' || !PERMISSION_SET.has(p)) {
      pushError(out, `permissions[${i}]`, `权限「${String(p)}」不在允许范围内`)
      return
    }
    if (seen.has(p)) {
      pushError(out, `permissions[${i}]`, `权限「${p}」重复声明`)
    }
    seen.add(p)
  })
}

function checkSandbox(out: ManifestValidationIssue[], sandbox: unknown): void {
  if (!isRecord(sandbox)) {
    pushError(out, 'sandbox', '缺少沙箱配置')
    return
  }
  for (const key of ['isolateFS', 'isolateNetwork', 'isolateDOM']) {
    if (!isBoolean(sandbox[key])) {
      pushError(out, `sandbox.${key}`, '沙箱隔离标志须为布尔值')
    }
  }
}

function checkCapabilities(out: ManifestValidationIssue[], caps: unknown): void {
  if (caps === undefined) return
  if (!Array.isArray(caps)) {
    pushError(out, 'capabilities', '能力清单须为数组')
    return
  }
  const seenIds = new Set<string>()
  caps.forEach((cap, i) => {
    const base = `capabilities[${i}]`
    if (!isRecord(cap)) {
      pushError(out, base, '能力声明须为对象')
      return
    }
    const id = cap.id
    if (!isNonEmptyString(id)) {
      pushError(out, `${base}.id`, '能力 ID 不能为空')
    } else if (seenIds.has(id)) {
      pushError(out, `${base}.id`, `能力 ID「${id}」重复声明`)
    } else {
      seenIds.add(id)
    }

    if (!isNonEmptyString(cap.label)) {
      pushError(out, `${base}.label`, '能力名称不能为空')
    }
    if (!isNonEmptyString(cap.description)) {
      pushError(out, `${base}.description`, '能力说明不能为空')
    }
    if (!Array.isArray(cap.keywords) || cap.keywords.length === 0 || !cap.keywords.every(k => isNonEmptyString(k))) {
      pushError(out, `${base}.keywords`, '能力须声明至少一个非空关键词')
    }
    if (typeof cap.permission !== 'string' || !PERMISSION_SET.has(cap.permission)) {
      pushError(out, `${base}.permission`, `能力权限「${String(cap.permission)}」不在允许范围内`)
    }
  })
}

function checkRooms(out: ManifestValidationIssue[], rooms: unknown): void {
  if (rooms === undefined) return
  if (!Array.isArray(rooms)) {
    pushError(out, 'contributes.rooms', '贡献房间须为数组')
    return
  }
  const seenIds = new Set<string>()
  const seenPaths = new Set<string>()
  rooms.forEach((room, i) => {
    const base = `contributes.rooms[${i}]`
    if (!isRecord(room)) {
      pushError(out, base, '房间声明须为对象')
      return
    }

    const id = room.id
    if (!isNonEmptyString(id)) {
      pushError(out, `${base}.id`, '房间 ID 不能为空')
    } else if (seenIds.has(id)) {
      pushError(out, `${base}.id`, `房间 ID「${id}」重复声明`)
    } else {
      seenIds.add(id)
    }

    const path = room.path
    if (!isNonEmptyString(path) || !path.startsWith('/')) {
      pushError(out, `${base}.path`, '路由路径须以 / 开头')
    } else if (seenPaths.has(path)) {
      pushError(out, `${base}.path`, `路由路径「${path}」重复声明`)
    } else {
      seenPaths.add(path)
    }

    if (!isNonEmptyString(room.name)) {
      pushError(out, `${base}.name`, '房间名称不能为空')
    }
    if (!isNonEmptyString(room.icon)) {
      pushError(out, `${base}.icon`, '房间图标不能为空')
    }
    if (!isNonEmptyString(room.color)) {
      pushError(out, `${base}.color`, '房间主题色不能为空')
    }
    if (room.group !== undefined && !ROOM_GROUPS.includes(room.group as (typeof ROOM_GROUPS)[number])) {
      pushError(out, `${base}.group`, '房间组不在允许范围内')
    }
    if (room.domain !== undefined && !ROOM_DOMAINS.includes(room.domain as (typeof ROOM_DOMAINS)[number])) {
      pushError(out, `${base}.domain`, '房间领域不在允许范围内')
    }
    if (
      room.adjacentTo !== undefined &&
      (!Array.isArray(room.adjacentTo) || !room.adjacentTo.every(a => isNonEmptyString(a)))
    ) {
      pushError(out, `${base}.adjacentTo`, '邻接房间须为非空字符串数组')
    }
  })
}

/**
 * 校验插件声明，返回全部问题（error 阻断安装，warning 仅提示）。
 * 校验器为纯函数，不读取存储与注册表；ID/路径的全仓唯一性由安装侧校验。
 */
export function validatePluginManifest(manifest: unknown): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = []
  if (!isRecord(manifest)) {
    pushError(issues, '$', '插件声明须为对象')
    return issues
  }

  checkMeta(issues, manifest.meta)
  checkPermissions(issues, manifest.permissions)
  checkSandbox(issues, manifest.sandbox)

  if (!isNonEmptyString(manifest.entry)) {
    pushError(issues, 'entry', '入口不能为空')
  }

  checkCapabilities(issues, manifest.capabilities)
  if (manifest.contributes !== undefined) {
    if (!isRecord(manifest.contributes)) {
      pushError(issues, 'contributes', '贡献点声明须为对象')
    } else {
      checkRooms(issues, manifest.contributes.rooms)
    }
  }

  return issues
}

/** 是否可安装（无 error 级问题） */
export function isValidPluginManifest(manifest: unknown): boolean {
  return !validatePluginManifest(manifest).some(i => i.severity === 'error')
}
