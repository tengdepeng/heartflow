// ============================================================
// ZeitgeistPanel 时令元数据面板测试（INCR-91）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ---- Storage Mock ----
const mockKV = new Map<string, any>()
const mockGetKV = vi.fn((key: string, fallback?: any) => mockKV.get(key) ?? fallback)
const mockSetKV = vi.fn((key: string, val: any) => { mockKV.set(key, val) })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => mockGetKV(key, fallback),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
}))

import ZeitgeistPanel from '../ZeitgeistPanel.vue'

async function mountPanel() {
  const wrapper = mount(ZeitgeistPanel)
  await nextTick()
  return wrapper
}

describe('ZeitgeistPanel 时令元数据', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('标题与副标题渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('时令元数据')
    expect(wrapper.text()).toContain('时辰')
  })

  it('渲染十二时辰环共 12 项', async () => {
    const wrapper = await mountPanel()
    const items = wrapper.findAll('.zgp-ring-item')
    expect(items.length).toBe(12)
  })

  it('当前时辰高亮（on 类）', async () => {
    const wrapper = await mountPanel()
    const on = wrapper.findAll('.zgp-ring-item.on')
    expect(on.length).toBe(1)
  })

  it('空态：未采集时显示提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('尚未采集')
  })

  it('选择天气并采集：写入最近元数据', async () => {
    const wrapper = await mountPanel()
    await wrapper.findAll('.zgp-weather-item')[0].trigger('click')
    await wrapper.find('button.zgp-collect').trigger('click')
    await nextTick()
    expect(mockKV.has('hf:zeitgeist_last')).toBe(true)
    expect(wrapper.text()).toContain('采集当前时令')
  })

  it('采集后展示最近时令快照', async () => {
    mockKV.set('hf:zeitgeist_last', {
      date: '2026-03-20',
      weekday: '星期五',
      shichen: '未',
      shichenAlias: '日昳',
      shichenElement: '土',
      solarTerm: '春分',
      solarTermIcon: '☯',
      season: '春',
      weather: 'sunny',
    })
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('2026-03-20')
    expect(wrapper.text()).toContain('春分')
  })

  it('偏好切换：关闭自动采集并持久化', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('input[type="checkbox"]').setValue(false)
    await nextTick()
    expect(mockKV.get('hf:zeitgeist_pref')).toMatchObject({ autoCollect: false })
  })
})
