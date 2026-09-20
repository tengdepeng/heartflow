// ============================================================
// VisitorBridgePanel 访客·桥接总览（INCR-387）
// mock 直接子路径 ../../modules/visitor/visitor-bridge 注入受控 ref
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const summary = ref<any>({
  activeSessions: 0,
  totalSessions: 0,
  pendingInvitations: 0,
  totalFootprints: 0,
  activeRules: 0,
  mostActiveRoom: null,
  lastVisitAt: null,
})
const infos = ref<any[]>([])

vi.mock('../../modules/visitor/visitor-bridge', () => ({
  useVisitorBridge: () => ({ summary, sessionInfos: infos }),
}))

async function mountPanel() {
  const mod = await import('../VisitorBridgePanel.vue')
  return mount(mod.default)
}

function sess(over: Record<string, any> = {}) {
  return {
    session: {
      id: 'visitor_1',
      name: '张三',
      role: 'family',
      allowedRooms: ['garden', 'home-space'],
      active: true,
      ...(over.session ?? {}),
    },
    footprintCount: 0,
    isExpired: false,
    remainingTime: null,
    ...over,
  }
}

describe('VisitorBridgePanel 访客·桥接总览（INCR-387）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    summary.value = {
      activeSessions: 0,
      totalSessions: 0,
      pendingInvitations: 0,
      totalFootprints: 0,
      activeRules: 0,
      mostActiveRoom: null,
      lastVisitAt: null,
    }
    infos.value = []
  })

  it('空态：标题 + 徽标待客 + 六格归零 + 最近访问— + 会话块不渲染 + 空态引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="visitor-bridge-panel"]').exists()).toBe(true)
    expect(wrapper.find('.vbp-title').text()).toContain('访客·桥接总览')
    expect(wrapper.find('[data-test="vbp-status"]').classes()).toContain('idle')
    expect(wrapper.text()).toContain('待客')
    const cells = wrapper.findAll('[data-test="vbp-cell"]')
    expect(cells.length).toBe(6)
    expect(cells[0].text()).toContain('活跃会话')
    expect(cells[0].text()).toContain('0')
    expect(cells[4].text()).toContain('足迹总数')
    expect(cells[5].text()).toContain('最活跃房间')
    expect(cells[5].text()).toContain('—')
    expect(wrapper.find('[data-test="vbp-lastvisit"]').text()).toContain('最近访问 · —')
    expect(wrapper.find('[data-test="vbp-sessions"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="vbp-empty"]').text()).toContain('殿堂的门还很安静')
  })

  it('门禁概览：活跃/累计/待办/规则/足迹/最活跃房间 + 徽标有邀约 + 最近访问时间', async () => {
    summary.value = {
      activeSessions: 2,
      totalSessions: 5,
      pendingInvitations: 1,
      totalFootprints: 12,
      activeRules: 3,
      mostActiveRoom: 'garden',
      lastVisitAt: new Date(2026, 4, 15, 9, 30).toISOString(),
    }
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('有邀约')
    const cells = wrapper.findAll('[data-test="vbp-cell"]')
    expect(cells[0].text()).toContain('2')
    expect(cells[1].text()).toContain('5')
    expect(cells[2].text()).toContain('1')
    expect(cells[3].text()).toContain('3')
    expect(cells[4].text()).toContain('12')
    expect(cells[5].text()).not.toContain('—')
    expect(wrapper.find('[data-test="vbp-lastvisit"]').text()).toContain('最近访问')
    expect(wrapper.find('[data-test="vbp-lastvisit"]').text()).not.toContain('· —')
    expect(wrapper.find('[data-test="vbp-empty"]').exists()).toBe(false)
  })

  it('徽标往来中：有足迹无待办邀请', async () => {
    summary.value = { ...summary.value, totalFootprints: 4, totalSessions: 2 }
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('往来中')
  })

  it('会话卡片：剩余时间 + 门禁有效 + 足迹数 + 可访问房数', async () => {
    infos.value = [
      sess({
        session: { id: 'v1', name: '张三', role: 'family', allowedRooms: ['garden'] },
        footprintCount: 3,
        remainingTime: '2小时5分钟',
      }),
      sess({
        session: { id: 'v2', name: '李四', role: 'guest', allowedRooms: [] },
        footprintCount: 1,
        remainingTime: '48小时0分钟',
      }),
    ]
    const wrapper = await mountPanel()
    const items = wrapper.findAll('[data-test="vbp-session"]')
    expect(items.length).toBe(2)
    expect(text(wrapper, 0)).toContain('张三')
    expect(text(wrapper, 0)).toContain('家人')
    expect(text(wrapper, 0)).toContain('门禁有效')
    expect(text(wrapper, 0)).toContain('剩余 2小时5分钟')
    expect(text(wrapper, 0)).toContain('足迹 3 处')
    expect(text(wrapper, 0)).toContain('可访问 1 房')
    expect(wrapper.find('[data-test="vbp-empty"]').exists()).toBe(false)
  })

  it('会话卡片过期：已过期徽标 + 续期提示', async () => {
    infos.value = [
      sess({ session: { id: 'vx', name: '王五', role: 'friend' }, isExpired: true, remainingTime: null }),
    ]
    const wrapper = await mountPanel()
    const item = wrapper.findAll('[data-test="vbp-session"]')[0]
    expect(item.text()).toContain('已过期')
    expect(item.text()).toContain('请续期或重新邀请')
  })

  function text(w: any, i: number): string {
    return w.findAll('[data-test="vbp-session"]')[i].text()
  }
})