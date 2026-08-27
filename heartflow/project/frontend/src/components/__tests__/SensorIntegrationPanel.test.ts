// ============================================================
// 传感器感知面板测试（safety · useSensorIntegration）
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const ALERTS_KEY = 'hf:safety_alerts'
const SENSOR_STATUS_KEY = 'hf:sensor_status'

async function mountPanel(kv: Record<string, any> = {}) {
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
  const mod = await import('../SensorIntegrationPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('SensorIntegrationPanel 传感器感知', () => {
  it('渲染面板标题与全部传感器项', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('传感器感知')
    expect(wrapper.text()).toContain('加速度计')
    expect(wrapper.text()).toContain('陀螺仪')
    expect(wrapper.text()).toContain('心率')
    expect(wrapper.text()).toContain('定位')
    expect(wrapper.text()).toContain('电量')
    expect(wrapper.text()).toContain('网络')
    expect(wrapper.findAll('li.si-item')).toHaveLength(6)
  })

  it('默认无可用传感器且无警报', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('0 / 6 项可用')
    expect(wrapper.text()).toContain('安全警报 · 0')
    expect(wrapper.text()).toContain('暂无待处理警报')
  })

  it('录入异常心率触发安全警报并持久化', async () => {
    const wrapper = await mountPanel({})
    const valueInput = wrapper.findAll('input.si-input')[0]
    await valueInput.setValue('200')
    await wrapper.findAll('button.si-btn').find(b => b.text() === '录入')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('心率异常')
    expect(wrapper.text()).toContain('安全警报 · 1')

    const kv = readKv()
    const alerts = kv[ALERTS_KEY]
    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('irregular_heartbeat')
    expect(alerts[0].resolved).toBe(false)

    // 传感器读数计数落库
    const statuses = kv[SENSOR_STATUS_KEY]
    const hr = statuses.find((s: any) => s.sensorType === 'heart_rate')
    expect(hr.readingCount).toBe(1)
  })

  it('录入正常心率不触发警报', async () => {
    const wrapper = await mountPanel({})
    const valueInput = wrapper.findAll('input.si-input')[0]
    await valueInput.setValue('70')
    await wrapper.findAll('button.si-btn').find(b => b.text() === '录入')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('安全警报 · 0')
  })

  it('标记已处理清空警报列表', async () => {
    const alert = {
      id: 'alert_test',
      type: 'low_battery',
      severity: 'medium',
      title: '电量过低',
      description: '电量仅剩 5%',
      detectedAt: '2026-08-01T08:00:00.000Z',
      sensorData: [],
      actionTaken: null,
      resolved: false,
    }
    const wrapper = await mountPanel({ [ALERTS_KEY]: [alert] })
    expect(wrapper.text()).toContain('电量过低')
    expect(wrapper.text()).toContain('安全警报 · 1')

    await wrapper.findAll('button.si-btn-sm').find(b => b.text() === '标记已处理')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('安全警报 · 0')
    expect(wrapper.text()).toContain('暂无待处理警报')

    const kv = readKv()
    const alerts = kv[ALERTS_KEY]
    expect(alerts[0].resolved).toBe(true)
    expect(alerts[0].actionTaken).toContain('用户确认已处理')
  })

  it('展示已保存的传感器状态', async () => {
    const statuses = [
      { sensorType: 'heart_rate', available: true, permissionRequired: true, permissionGranted: true, lastReadingAt: '2026-08-01T08:00:00.000Z', readingCount: 3 },
      { sensorType: 'network', available: true, permissionRequired: false, permissionGranted: true, lastReadingAt: null, readingCount: 0 },
    ]
    const wrapper = await mountPanel({ [SENSOR_STATUS_KEY]: statuses })
    expect(wrapper.text()).toContain('2 / 2 项可用')
    expect(wrapper.text()).toContain('3 次读数')
  })
})
