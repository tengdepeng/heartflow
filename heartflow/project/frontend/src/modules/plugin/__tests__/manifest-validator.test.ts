import { describe, it, expect } from 'vitest'
import {
  validatePluginManifest,
  isValidPluginManifest,
} from '../manifest-validator'
import type { PluginCapability, PluginManifest } from '../types'

/** 构造一个合法 manifest，测试中按需破坏字段 */
function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    meta: {
      id: 'test-plugin',
      name: '测试插件',
      version: '1.0.0',
      description: '测试用插件',
      tier: 'community',
      category: 'other',
      icon: '🧪',
    },
    permissions: ['read:current'],
    sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: true },
    entry: 'test:plugin',
    ...overrides,
  }
}

function errorFields(manifest: unknown): string[] {
  return validatePluginManifest(manifest)
    .filter(i => i.severity === 'error')
    .map(i => i.field)
}

describe('validatePluginManifest', () => {
  it('合法 manifest 无 error 且通过 isValid', () => {
    const m = makeManifest()
    expect(errorFields(m)).toEqual([])
    expect(isValidPluginManifest(m)).toBe(true)
  })

  it('非对象声明直接拒绝', () => {
    expect(errorFields(null)).toEqual(['$'])
    expect(errorFields(undefined)).toEqual(['$'])
    expect(errorFields('str')).toEqual(['$'])
    expect(isValidPluginManifest(42)).toBe(false)
  })

  it('meta 缺失被拒绝', () => {
    const m = makeManifest() as unknown as Record<string, unknown>
    delete m.meta
    expect(errorFields(m)).toContain('meta')
  })

  it('插件 ID 格式校验', () => {
    expect(errorFields(makeManifest({ meta: { ...makeManifest().meta, id: 'Bad_ID' } }))).toContain('meta.id')
    expect(errorFields(makeManifest({ meta: { ...makeManifest().meta, id: '-lead-dash' } }))).toContain('meta.id')
    expect(errorFields(makeManifest({ meta: { ...makeManifest().meta, id: '' } }))).toContain('meta.id')
    expect(errorFields(makeManifest({ meta: { ...makeManifest().meta, id: 'ok-id-2' } }))).not.toContain('meta.id')
  })

  it('版本号须为语义化版本', () => {
    expect(errorFields(makeManifest({ meta: { ...makeManifest().meta, version: '1.0' } }))).toContain('meta.version')
    expect(errorFields(makeManifest({ meta: { ...makeManifest().meta, version: 'v1.0.0' } }))).toContain('meta.version')
    expect(errorFields(makeManifest({ meta: { ...makeManifest().meta, version: '1.0.0' } }))).not.toContain('meta.version')
  })

  it('空描述仅 warning 不阻断', () => {
    const m = makeManifest({ meta: { ...makeManifest().meta, description: '' } })
    const issues = validatePluginManifest(m)
    expect(issues.some(i => i.severity === 'error')).toBe(false)
    expect(issues.some(i => i.field === 'meta.description' && i.severity === 'warning')).toBe(true)
    expect(isValidPluginManifest(m)).toBe(true)
  })

  it('分级与分类须在允许范围内', () => {
    expect(errorFields(makeManifest({ meta: { ...makeManifest().meta, tier: 'unknown' as never } }))).toContain('meta.tier')
    expect(errorFields(makeManifest({ meta: { ...makeManifest().meta, category: 'x' as never } }))).toContain('meta.category')
  })

  it('权限白名单与重复校验', () => {
    expect(errorFields(makeManifest({ permissions: ['read:current', 'evil:all' as never] }))).toContain('permissions[1]')
    expect(errorFields(makeManifest({ permissions: ['read:current', 'read:current'] }))).toContain('permissions[1]')
    expect(errorFields(makeManifest({ permissions: [] as never }))).toEqual([])
  })

  it('沙箱配置须为布尔标志', () => {
    expect(errorFields(makeManifest({ sandbox: { isolateFS: true, isolateNetwork: 'yes' as never, isolateDOM: true } })))
      .toContain('sandbox.isolateNetwork')
    const m = makeManifest() as unknown as Record<string, unknown>
    delete m.sandbox
    expect(errorFields(m)).toContain('sandbox')
  })

  it('入口不能为空', () => {
    expect(errorFields(makeManifest({ entry: '' }))).toContain('entry')
    const m = makeManifest() as unknown as Record<string, unknown>
    delete m.entry
    expect(errorFields(m)).toContain('entry')
  })

  it('能力 ID 唯一性与字段校验', () => {
    const cap: PluginCapability = { id: 'cap-a', label: '能力A', description: '说明', keywords: ['甲'], permission: 'read:current' }
    expect(errorFields(makeManifest({
      capabilities: [cap, { ...cap, id: 'cap-a' }],
    }))).toContain('capabilities[1].id')
    expect(errorFields(makeManifest({ capabilities: [{ ...cap, permission: 'evil' as never }] })))
      .toContain('capabilities[0].permission')
    expect(errorFields(makeManifest({ capabilities: [{ ...cap, keywords: [] }] })))
      .toContain('capabilities[0].keywords')
    expect(errorFields(makeManifest({ capabilities: [cap] }))).toEqual([])
  })

  it('贡献房间 ID/路径唯一性与字段校验', () => {
    const room = { id: 'room-a', path: '/room-a', name: '房间A', icon: '🏠', color: '#8a9ab8' }
    const valid = makeManifest({ contributes: { rooms: [room] } })
    expect(errorFields(valid)).toEqual([])

    expect(errorFields(makeManifest({ contributes: { rooms: [room, { ...room, id: 'room-a' }] } })))
      .toContain('contributes.rooms[1].id')
    expect(errorFields(makeManifest({ contributes: { rooms: [room, { ...room, path: '/room-a' }] } })))
      .toContain('contributes.rooms[1].path')
    expect(errorFields(makeManifest({ contributes: { rooms: [{ ...room, path: 'no-slash' }] } })))
      .toContain('contributes.rooms[0].path')
    expect(errorFields(makeManifest({ contributes: { rooms: [{ ...room, group: 'void' as never }] } })))
      .toContain('contributes.rooms[0].group')
    expect(errorFields(makeManifest({ contributes: { rooms: [{ ...room, domain: 'void' as never }] } })))
      .toContain('contributes.rooms[0].domain')
    expect(errorFields(makeManifest({ contributes: { rooms: [{ ...room, adjacentTo: [123 as never] }] } })))
      .toContain('contributes.rooms[0].adjacentTo')
    expect(errorFields(makeManifest({ contributes: { rooms: [{ ...room, color: '' }] } })))
      .toContain('contributes.rooms[0].color')
  })

  it('CORE_PLUGINS 全部通过校验', async () => {
    const { CORE_PLUGINS } = await import('../types')
    for (const m of CORE_PLUGINS) {
      expect(errorFields(m), `CORE_PLUGINS[${m.meta.id}]`).toEqual([])
    }
  })
})
