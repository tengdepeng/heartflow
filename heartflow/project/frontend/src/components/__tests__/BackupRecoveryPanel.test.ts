// ============================================================
// 备份恢复与安全报告面板测试（safety · useBackupRecovery / useSecurityReports）
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const BACKUPS_KEY = 'hf:safety_backups'
const REPORTS_KEY = 'hf:safety_reports'

function backupMeta(overrides: Record<string, any> = {}) {
  return {
    id: 'backup_test_001',
    type: 'full',
    name: '全量备份',
    createdAt: '2026-08-01T08:00:00.000Z',
    sizeBytes: 2048,
    keyCount: 3,
    description: '全量备份，包含 3 个存储键',
    isAuto: false,
    checksum: 'abc123',
    ...overrides,
  }
}

function report(overrides: Record<string, any> = {}) {
  return {
    id: 'report_weekly_2026-08-01',
    period: 'weekly',
    dateRange: { start: '2026-07-25T08:00:00.000Z', end: '2026-08-01T08:00:00.000Z' },
    generatedAt: '2026-08-01T08:00:00.000Z',
    score: { total: 72, level: 'good', dataSecurity: 18, propertySecurity: 20, personalSafety: 20, psychologicalSafety: 14 },
    incidents: { total: 0, byLevel: {}, byType: {}, resolved: 0, pending: 0 },
    backupStatus: { lastBackup: '2026-08-01T08:00:00.000Z', totalBackups: 1, autoBackupEnabled: true, lastBackupSize: 2048 },
    accessStats: { totalLogins: 1, failedLogins: 0, uniqueDevices: 1, suspiciousActivities: 0 },
    recommendations: ['当前安全状态良好，请继续保持'],
    status: 'final',
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}, passphrase = 'test-pass') {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../BackupRecoveryPanel.vue')
  const wrapper = mount(mod.default, { props: { passphrase } })
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('BackupRecoveryPanel 备份恢复', () => {
  it('渲染面板标题与空状态', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('备份恢复')
    expect(wrapper.text()).toContain('0 份备份')
    expect(wrapper.text()).toContain('还没有备份')
    expect(wrapper.text()).toContain('尚未生成报告')
  })

  it('无口令时创建按钮禁用', async () => {
    const wrapper = await mountPanel({}, '')
    const btn = wrapper.findAll('button.br-btn-primary').find(b => b.text() === '创建备份')!
    expect(btn.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('解锁保险库后可用当前口令创建加密备份')
  })

  it('创建备份后持久化元数据与密文载荷', async () => {
    const wrapper = await mountPanel({ 'hf:config': { theme: 'dark' } })
    const input = wrapper.find('input.br-input')
    await input.setValue('定稿备份')
    await wrapper.findAll('button.br-btn-primary').find(b => b.text() === '创建备份')!.trigger('click')

    // createBackup 走真实 Web Crypto（PBKDF2 150k 迭代），异步完成后更新 UI
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('1 份备份')
    })

    expect(wrapper.text()).toContain('定稿备份')

    const kv = readKv()
    const backups = kv[BACKUPS_KEY]
    expect(backups).toHaveLength(1)
    expect(backups[0].name).toBe('定稿备份')

    // 密文载荷落库（vault-cipher 形态，非明文）
    const backupKey = `hf:backup_${backups[0].id}`
    expect(kv[backupKey]).toBeDefined()
    expect(kv[backupKey].v).toBe(1)
    expect(kv[backupKey].data).toEqual(expect.any(String))
  })

  it('展示既有备份列表并可删除', async () => {
    const wrapper = await mountPanel({ [BACKUPS_KEY]: [backupMeta({ name: '全量备份' })] })
    expect(wrapper.text()).toContain('全量备份')
    expect(wrapper.text()).toContain('1 份备份')

    await wrapper.findAll('button.br-btn-sm.br-danger').find(b => b.text() === '删除')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('0 份备份')
    expect(wrapper.text()).toContain('还没有备份')
  })

  it('生成安全报告展示评分与建议', async () => {
    const wrapper = await mountPanel({})
    await wrapper.findAll('button.br-btn').find(b => b.text() === '生成报告')!.trigger('click')
    await wrapper.vm.$nextTick()

    // getSafetyScore 基于默认配置返回总分；报告生成后展示评分
    expect(wrapper.text()).toContain('安全报告')
    const kv = readKv()
    const reports = kv[REPORTS_KEY]
    expect(reports).toHaveLength(1)
    expect(reports[0].period).toBe('weekly')
  })

  it('展示已生成报告内容', async () => {
    const wrapper = await mountPanel({ [REPORTS_KEY]: [report()] })
    expect(wrapper.text()).toContain('72')
    expect(wrapper.text()).toContain('良好')
    expect(wrapper.text()).toContain('当前安全状态良好')
  })
})
