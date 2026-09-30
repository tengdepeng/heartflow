// ============================================================
// useSystemApps · 系统已安装应用枚举桥 单元测试
// 覆盖：后端枚举结果→DeskItem(kind:'app') 映射；web / 失败降级为空。
// 后端命令经 @/engine/tauri-bridge 的 enumSystemApps 注入（可 mock）。
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockEnum } = vi.hoisted(() => ({ mockEnum: vi.fn() }))
vi.mock('@/engine/tauri-bridge', () => ({
  enumSystemApps: () => mockEnum(),
}))

describe('useSystemApps · 系统应用枚举桥', () => {
  beforeEach(() => {
    mockEnum.mockReset()
  })

  async function prepare() {
    vi.resetModules()
    const mod = await import('../system-apps')
    return mod.useSystemApps()
  }

  it('把后端枚举结果映射成 DeskItem(kind:"app")', async () => {
    mockEnum.mockResolvedValue({
      success: true,
      data: [
        { id: 'sys:notepad', name: '记事本', exec: 'C:\\n.lnk' },
        { id: 'sys:calc', name: '计算器', exec: 'C:\\c.lnk' },
      ],
    })
    const { appItems, refresh } = await prepare()
    expect(appItems.value.length).toBe(0)
    await refresh()
    expect(appItems.value.length).toBe(2)

    const a = appItems.value.find(i => i.id === 'sys:notepad')!
    expect(a.kind).toBe('app')
    expect(a.name).toBe('记事本')
    expect(a.launch).toBe('C:\\n.lnk')
    expect(a.icon).toBe('📦') // 无图标时兜底字形
  })

  it('web / 失败降级为空，不抛错', async () => {
    mockEnum.mockResolvedValue({ success: false, data: undefined })
    const { appItems, refresh } = await prepare()
    await refresh()
    expect(appItems.value.length).toBe(0)
  })

  it('无效条目（缺 id/name）被跳过', async () => {
    mockEnum.mockResolvedValue({
      success: true,
      data: [
        { id: '', name: '无名', exec: 'x' },
        { id: 'sys:ok', name: '有效', exec: 'y' },
      ],
    })
    const { appItems, refresh } = await prepare()
    await refresh()
    expect(appItems.value.length).toBe(1)
    expect(appItems.value[0].id).toBe('sys:ok')
  })
})
