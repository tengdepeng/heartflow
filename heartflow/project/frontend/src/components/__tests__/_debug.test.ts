import { describe, expect, it, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import SecurityIncidentPanel from '../SecurityIncidentPanel.vue'

const storageMock = new Map<string, unknown>()

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, defaultValue: T): T => {
      const val = storageMock.get(key)
      return val !== undefined ? (val as T) : defaultValue
    },
    setKV: (key: string, value: unknown) => { storageMock.set(key, value) },
    removeKV: (key: string) => { storageMock.delete(key) },
  },
}))

beforeEach(() => {
  storageMock.clear()
})

describe('debug', () => {
  it('dashboard 加载', async () => {
    const { useSecurityDashboard } = await import('../../modules/safety/incident-response')
    const api = useSecurityDashboard()
    const d = api.getDashboard()
    console.log('DIRECT DASHBOARD:', JSON.stringify(d))
    const wrapper = mount(SecurityIncidentPanel)
    await nextTick()
    console.log('HAS SCORE:', wrapper.find('.sip-score-num').exists())
    expect(true).toBe(true)
  })
})
