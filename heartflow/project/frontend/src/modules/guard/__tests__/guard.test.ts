// ============================================================
// useGuard 组合式函数测试
// 将 storage 调用 mock 到内存 store，验证各存储键行为与单例重置。
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useGuard } from '../useGuard'

describe('useGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清空内存 store，确保测试间隔离
    Object.keys(store).forEach(k => delete store[k])
    // 重置模块级单例 ref
    useGuard().load()
  })

  it('load 初始化空状态', () => {
    const guard = useGuard()
    expect(guard.contacts.value).toEqual([])
    expect(guard.visitLogs.value).toEqual([])
    expect(guard.crashLogs.value).toEqual([])
    expect(guard.sessionActivity.value).toEqual([])
  })

  it('默认权限光点存在 4 项', () => {
    const guard = useGuard()
    expect(guard.permissionLights.value).toHaveLength(4)
    expect(guard.permissionLights.value[0].key).toBe('data-security')
  })

  it('load 读取已存联系人', () => {
    store['hf:contacts'] = [{ id: 'c1', name: '张三', phone: '138', priority: 'primary' }]
    const guard = useGuard()
    guard.load()
    expect(guard.contacts.value).toHaveLength(1)
    expect(guard.contacts.value[0].name).toBe('张三')
  })

  it('addContact 写入存储', () => {
    const guard = useGuard()
    guard.addContact('张三', '13800000000', 'primary')
    expect(store['hf:contacts']).toHaveLength(1)
    expect(store['hf:contacts'][0].name).toBe('张三')
    expect(mockSetKV).toHaveBeenCalledWith('hf:contacts', expect.anything())
  })

  it('removeContact 删除并保存', () => {
    const guard = useGuard()
    guard.addContact('张三', '138', 'primary')
    const id = guard.contacts.value[0].id
    guard.removeContact(id)
    expect(store['hf:contacts']).toHaveLength(0)
  })

  it('updateContact 更新字段', () => {
    const guard = useGuard()
    guard.addContact('张三', '138', 'primary')
    const id = guard.contacts.value[0].id
    guard.updateContact(id, { name: '李四', priority: 'secondary' })
    expect(store['hf:contacts'][0].name).toBe('李四')
    expect(store['hf:contacts'][0].priority).toBe('secondary')
  })

  it('addVisitLog 记录访问', () => {
    const guard = useGuard()
    guard.addVisitLog()
    expect(store['hf:guard_visits']).toHaveLength(1)
    expect(store['hf:guard_visits'][0].action).toBe('访问守护室')
    expect(mockSetKV).toHaveBeenCalledWith('hf:guard_visits', expect.anything())
  })

  it('clearVisitLog 删除单条', () => {
    const guard = useGuard()
    guard.addVisitLog()
    const id = guard.visitLogs.value[0].id
    guard.clearVisitLog(id)
    expect(store['hf:guard_visits']).toHaveLength(0)
  })

  it('cyclePermissionStatus 循环状态并保存', () => {
    const guard = useGuard()
    const before = guard.permissionLights.value[0].status
    const key = guard.permissionLights.value[0].key
    guard.cyclePermissionStatus(key)
    expect(guard.permissionLights.value[0].status).not.toBe(before)
    expect(mockSetKV).toHaveBeenCalledWith('hf:guard_permission_lights', expect.anything())
  })

  it('addCrashLog 添加日志', () => {
    const guard = useGuard()
    guard.addCrashLog('error')
    expect(store['hf:guard_crash_logs']).toHaveLength(1)
    expect(store['hf:guard_crash_logs'][0].level).toBe('error')
    expect(mockSetKV).toHaveBeenCalledWith('hf:guard_crash_logs', expect.anything())
  })

  it('removeCrashLog 删除', () => {
    const guard = useGuard()
    guard.addCrashLog('warning')
    const id = guard.crashLogs.value[0].id
    guard.removeCrashLog(id)
    expect(store['hf:guard_crash_logs']).toHaveLength(0)
  })

  it('clearCrashLogs 清空', () => {
    const guard = useGuard()
    guard.addCrashLog()
    guard.clearCrashLogs()
    expect(store['hf:guard_crash_logs']).toHaveLength(0)
  })

  it('clearSessionActivity 清空会话并保存', () => {
    const guard = useGuard()
    guard.sessionActivity.value = [{ id: 's1', at: new Date().toISOString(), action: 'x' }]
    guard.clearSessionActivity()
    expect(store['hf:session_activity']).toEqual([])
    expect(mockSetKV).toHaveBeenCalledWith('hf:session_activity', expect.anything())
  })

  it('isKeyPresent 检测键存在', () => {
    const guard = useGuard()
    expect(guard.isKeyPresent('hf:contacts')).toBe(false)
    guard.addContact('张三', '138', 'primary')
    expect(guard.isKeyPresent('hf:contacts')).toBe(true)
    expect(guard.isKeyPresent('hf:nonexistent_key')).toBe(false)
  })

  // ===== 隐私控制持久化（守宪法第1条：本地私有） =====
  it('隐私开关默认值正确', () => {
    const guard = useGuard()
    expect(guard.anonymousMode.value).toBe(false)
    expect(guard.dataReflux.value).toBe(false)
    expect(guard.externalLinkControl.value).toBe(true)
  })

  it('隐私开关切换后实时持久化', async () => {
    const guard = useGuard()
    guard.anonymousMode.value = true
    guard.dataReflux.value = true
    guard.externalLinkControl.value = false
    await nextTick()
    expect(store['hf:guard_anonymous_mode']).toBe(true)
    expect(store['hf:guard_data_reflux']).toBe(true)
    expect(store['hf:guard_external_link']).toBe(false)
  })

  it('load 读取已持久化的隐私开关', async () => {
    store['hf:guard_anonymous_mode'] = true
    store['hf:guard_data_reflux'] = true
    store['hf:guard_external_link'] = false
    useGuard().load()
    await nextTick()
    expect(useGuard().anonymousMode.value).toBe(true)
    expect(useGuard().dataReflux.value).toBe(true)
    expect(useGuard().externalLinkControl.value).toBe(false)
  })
})
