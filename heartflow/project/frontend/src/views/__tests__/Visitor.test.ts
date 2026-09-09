// ============================================================
// 访客中心视图测试
// 冒烟：标题/副题/概览统计/会话/邀请码/访问控制/足迹
// 空态与有数据渲染
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

// 模拟 useRoomNavigation 避免路由依赖
vi.mock('../../composables/useRoomNavigation', () => ({
  useRoomNavigation: () => ({ enterRoom: vi.fn() }),
}))

function recentIso(daysAgo = 2) {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString()
}
function futureIso(days = 96) {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

async function mountView(kvStore: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../Visitor.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function session(over: Record<string, any> = {}) {
  return {
    id: 'visitor_1',
    name: '张三',
    role: 'family',
    accessKey: 'KEY1234567890ABCD',
    allowedRooms: ['garden', 'home-space'],
    permissions: ['view:public', 'data:read'],
    createdAt: recentIso(),
    expiresAt: futureIso(),
    lastActiveAt: recentIso(),
    active: true,
    visitCount: 3,
    ...over,
  }
}
function invitation(over: Record<string, any> = {}) {
  return {
    id: 'invite_1',
    code: 'HF-ABCDEF',
    hostName: '殿堂主人',
    role: 'friend',
    allowedRooms: ['garden'],
    oneTime: false,
    maxUses: 5,
    usedCount: 1,
    createdAt: recentIso(),
    expiresAt: futureIso(),
    valid: true,
    ...over,
  }
}
function rule(over: Record<string, any> = {}) {
  return {
    id: 'rule_1',
    name: '花园仅开放',
    targetRoom: 'garden',
    minRole: 'guest',
    enabled: true,
    ...over,
  }
}
function footprint(over: Record<string, any> = {}) {
  return {
    id: 'fp_1',
    sessionId: 'visitor_1',
    visitorName: '张三',
    roomId: 'garden',
    timestamp: recentIso(),
    action: 'view',
    ...over,
  }
}

describe('Visitor 访客中心视图', () => {
  it('空态：标题/副题/概览/四功能区/空提示', async () => {
    const wrapper = await mountView()
    const text = wrapper.text()
    // 标题与副题
    expect(text).toContain('访客中心')
    expect(text).toContain('让访客以受限视角，看见你的殿堂')
    // 面包屑回「家」
    expect(text).toContain('家')
    // 概览统计标签
    expect(text).toContain('会话')
    expect(text).toContain('活跃')
    expect(text).toContain('访问')
    expect(text).toContain('独立访客')
    // 四功能区
    expect(text).toContain('访客会话')
    expect(text).toContain('邀请码')
    expect(text).toContain('访问控制')
    expect(text).toContain('访客足迹')
    // 角色下拉选项
    expect(text).toContain('陌生人')
    expect(text).toContain('好友')
    expect(text).toContain('家人')
    expect(text).toContain('协作者')
    // 空提示
    expect(text).toContain('还没有访客会话。')
    expect(text).toContain('还没有邀请码。')
    expect(text).toContain('还没有访问规则。')
    expect(text).toContain('还没有访客足迹。')
  })

  it('有数据：概览统计/会话/邀请/规则/足迹渲染', async () => {
    const wrapper = await mountView({
      'hf:visitor_sessions': [session()],
      'hf:visitor_invitations': [invitation()],
      'hf:visitor_rules': [rule()],
      'hf:visitor_footprints': [footprint()],
    })
    const text = wrapper.text()
    // 概览：1 会话 / 1 活跃 / 访问 3 次 / 1 独立访客
    expect(text).toContain('访问 3 次')
    // 会话项：名称/角色/状态/访问数
    expect(text).toContain('张三')
    expect(text).toContain('家人')
    expect(text).toContain('活跃')
    // 邀请项：邀请码/使用数/有效
    expect(text).toContain('HF-ABCDEF')
    expect(text).toContain('使用 1/5')
    expect(text).toContain('有效')
    // 规则项：名称/目标房/状态
    expect(text).toContain('花园仅开放')
    expect(text).toContain('情绪花房')
    expect(text).toContain('启用')
    // 足迹：访客名/房间/动作
    expect(text).toContain('👁')
    expect(text).toContain('查看')
    // 空提示应消失
    expect(text).not.toContain('还没有访客会话。')
  })
})