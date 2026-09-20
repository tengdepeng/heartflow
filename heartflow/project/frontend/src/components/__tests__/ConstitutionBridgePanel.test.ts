// ============================================================
// 宪法 · 合规桥接总览面板（INCR-381）组件测试
// 真实引擎（useConstitutionBridge → baseline + review 全链路）+ mock storage 种子
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const AUDIT_KEY = 'hf:constitution:audit_log'
const CONFIG_KEY = 'hf:constitution:compliance_config'
const CHECKLIST_KEY = 'hf:constitution:checklist'
const SESSIONS_KEY = 'hf:constitution:review_sessions'
const REVIEW_HISTORY_KEY = 'hf:constitution:review_history'

function auditEntry(id: string, eventType: string, ts: string) {
  return { id, eventType, description: `审计 ${id}`, operator: 'user', timestamp: ts }
}

function checklistItem(id: string, category: string, passed: boolean | null) {
  return {
    id,
    category,
    title: `项 ${id}`,
    description: '',
    coreValue: 'local-private',
    weight: 3,
    checkMethod: 'manual' as const,
    passed,
  }
}

interface SeedOpts {
  config?: Record<string, unknown>
  audit?: unknown[]
  checklist?: unknown[]
  sessions?: unknown[]
  history?: unknown[]
}

async function mountPanel(seed: SeedOpts = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, unknown> = {}
  if (seed.audit) kvStore[AUDIT_KEY] = JSON.stringify(seed.audit)
  if (seed.config) kvStore[CONFIG_KEY] = JSON.stringify(seed.config)
  if (seed.checklist) kvStore[CHECKLIST_KEY] = seed.checklist
  if (seed.sessions) kvStore[SESSIONS_KEY] = seed.sessions
  if (seed.history) kvStore[REVIEW_HISTORY_KEY] = seed.history

  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()

  const mod = await import('../ConstitutionBridgePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

const now = Date.now()
const DAY = 86400000
const recentTs = new Date(now - DAY).toISOString()
const weekTs = new Date(now - 3 * DAY).toISOString()
const oldTs = new Date(now - 30 * DAY).toISOString()

describe('ConstitutionBridgePanel 宪法·合规桥接总览（INCR-381）', () => {
  it('空态：默认配置 + 归零概览 + 未初始化清单提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="constitution-bridge-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('宪法 · 合规桥接总览')
    expect(wrapper.find('[data-test="cbp-badge"]').text()).toBe('最低达标 60 分 · 自动检查 开')

    expect(wrapper.find('[data-test="cbp-stat-audit"] .cbp-stat-num').text()).toBe('0')
    expect(wrapper.find('[data-test="cbp-stat-sessions"] .cbp-stat-num').text()).toBe('0')
    expect(wrapper.find('[data-test="cbp-stat-checked"] .cbp-stat-num').text()).toContain('0')
    // initChecklist 始终注入 DEFAULT_CHECKLIST（20 项 8 分类，passed 全为 null）
    const checklist = wrapper.find('[data-test="cbp-checklist"]')
    expect(checklist.text()).toContain('数据主权')
    expect(checklist.text()).toContain('0/3')
    expect(checklist.text()).not.toContain('尚未初始化')
    expect(wrapper.find('[data-test="cbp-stat-failed"] .cbp-stat-num').text()).toBe('0')
    expect(wrapper.find('[data-test="cbp-history"]').text()).toContain('暂无审查记录')
    expect(wrapper.find('[data-test="cbp-audit"]').exists()).toBe(false)
  })

  it('配置徽标：按种子合规配置渲染最低分与自动检查开关', async () => {
    const wrapper = await mountPanel({ config: { autoCheck: false, minScore: 80 } })
    expect(wrapper.find('[data-test="cbp-badge"]').text()).toBe('最低达标 80 分 · 自动检查 关')
  })

  it('概览统计：审计总数/近7天/审查会话', async () => {
    const wrapper = await mountPanel({
      audit: [
        auditEntry('a1', 'rule_added', recentTs),
        auditEntry('a2', 'rule_toggled', weekTs),
        auditEntry('a3', 'compliance_checked', recentTs),
        auditEntry('a4', 'rule_updated', oldTs),
      ],
    })
    expect(wrapper.find('[data-test="cbp-stat-audit"] .cbp-stat-num').text()).toBe('4')
    expect(wrapper.find('[data-test="cbp-stat-audit"] .cbp-stat-meta').text()).toContain('近 7 天 3')
    // 近 7 天：recents + a2(3天) + a1/a3(1天) = 3
  })

  it('审查会话统计与审查历史同源渲染', async () => {
    const sessions = [
      { id: 's1', status: 'draft', initiator: 'user', title: '会话一', description: '', checklistProgress: 0, comments: [], createdAt: recentTs, updatedAt: recentTs },
      { id: 's2', status: 'in_review', initiator: 'user', title: '会话二', description: '', checklistProgress: 50, comments: [], createdAt: weekTs, updatedAt: weekTs },
      { id: 's3', status: 'approved', initiator: 'user', title: '会话三', description: '', checklistProgress: 100, comments: [], createdAt: oldTs, updatedAt: oldTs },
    ]
    const wrapper = await mountPanel({ audit: [], sessions })
    expect(wrapper.find('[data-test="cbp-stat-sessions"] .cbp-stat-num').text()).toBe('3')
    expect(wrapper.find('[data-test="cbp-stat-audit"] .cbp-stat-num').text()).toBe('0')
  })

  it('清单进度：已核/未过 + 分类进度条', async () => {
    const wrapper = await mountPanel({
      checklist: [
        checklistItem('a', 'data-sovereignty', true),
        checklistItem('b', 'data-sovereignty', true),
        checklistItem('c', 'user-autonomy', false),
        checklistItem('d', 'privacy', null),
        checklistItem('e', 'security', true),
      ],
    })
    expect(wrapper.find('[data-test="cbp-stat-checked"] .cbp-stat-num').text()).toContain('4/5')
    expect(wrapper.find('[data-test="cbp-stat-checked"] .cbp-stat-meta').text()).toContain('80%')
    expect(wrapper.find('[data-test="cbp-stat-failed"] .cbp-stat-num').text()).toBe('1')

    const checklist = wrapper.find('[data-test="cbp-checklist"]')
    expect(checklist.text()).toContain('数据主权')
    expect(checklist.text()).toContain('安全保障')
    expect(checklist.text()).toContain('用户自主')
    expect(checklist.text()).not.toContain('尚未初始化')
  })

  it('审查历史：最近会话标题 + 状态标签 + 评分', async () => {
    const wrapper = await mountPanel({
      history: [
        {
          sessionId: 'h1',
          title: '宪法首轮审查',
          status: 'approved',
          score: 88,
          checklistCompletion: 90,
          reviewer: 'pending',
          startedAt: new Date(now - 2 * DAY).toISOString(),
        },
        {
          sessionId: 'h2',
          title: '隐私条款复审',
          status: 'rejected',
          score: 42,
          checklistCompletion: 55,
          reviewer: 'pending',
          startedAt: new Date(now - 10 * DAY).toISOString(),
        },
      ],
    })
    const hist = wrapper.find('[data-test="cbp-history"]')
    expect(hist.text()).toContain('宪法首轮审查')
    expect(hist.text()).toContain('已通过')
    expect(hist.text()).toContain('评分 88')
    expect(hist.text()).toContain('隐私条款复审')
    expect(hist.text()).toContain('已驳回')
  })

  it('审计类型分布：事件类型 chips', async () => {
    const wrapper = await mountPanel({
      audit: [
        auditEntry('a1', 'rule_added', recentTs),
        auditEntry('a2', 'rule_added', weekTs),
        auditEntry('a3', 'compliance_checked', oldTs),
      ],
    })
    const audit = wrapper.find('[data-test="cbp-audit"]')
    expect(audit.exists()).toBe(true)
    expect(audit.text()).toContain('新增 2')
    expect(audit.text()).toContain('体检 1')
  })
})