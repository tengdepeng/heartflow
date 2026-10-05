import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shallowMount, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/settings' }),
}))

// PlayGallery 从 storage 读数据（key: hf:play_v2），需预置后「动态 import」，
// 否则组件在模块加载期就把空数据读走，v-if 不成立、列表不渲染。
const mockStore = vi.hoisted(() => ({}) as Record<string, any>)
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => mockStore[k] ?? def,
    setKV: (k: string, v: any) => { mockStore[k] = v },
    removeKV: (k: string) => { delete mockStore[k] },
    getConfig: () => ({
      locale: 'zh-CN' as const,
      background: { type: 'none' as const, image: '', video: '', overlayEnabled: true, overlayMode: 'minimal' as const, blur: 0, brightness: 100 },
      gestures: { enabled: false, bindings: {} as Record<string, string> },
      display: { uploadImageMaxBytes: 2 * 1024 * 1024, uploadVideoMaxBytes: 4 * 1024 * 1024, trendNoteCount: 20, titleTruncateLength: 8, excerptTruncateLength: 80, tagDisplayCount: 2, statsWindowDays: 30, searchResultLimit: 10, dreamStorageLimit: 100, cleanupThresholdDays: 30, moveTrajectoryCount: 20 },
      tags: { categories: [] },
      notifications: { native: true, focusComplete: true, advisorGreet: true },
      touchpoints: { lockScreenGlow: { enabled: false, color: '#d4a574', intensity: 50 }, greetingFloating: { enabled: false, size: 'medium' as const, position: 'bottom-right' as const }, overlay: { mode: 'minimal' as const } },
      complianceOverride: { forbiddenPatterns: false, notificationBlocked: true, advisorEnabled: false, comparativePhrases: false, personification: false, autoStartOverwrite: false, hapticFeedbackOverwrite: false, dataDriven: false },
    }),
  },
}))

import RoomSettingsPanel from '../RoomSettingsPanel.vue'
import Settings from '../../views/Settings.vue'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('item2 房间自适应排版基底接入', () => {
  it('RoomSettingsPanel：房间卡片被自适应网格容器包裹，且无卡片丢失', () => {
    const wrapper = shallowMount(RoomSettingsPanel)
    const grids = wrapper.findAll('.hf-room-grid--wide')
    expect(grids.length).toBeGreaterThan(0)
    const cardsInGrid = grids.reduce((n, g) => n + g.findAll('.rm-room-card').length, 0)
    const allCards = wrapper.findAll('.rm-room-card').length
    expect(allCards).toBeGreaterThan(0)
    // 所有卡片都必须落在网格容器内（无游离卡片）
    expect(cardsInGrid).toBe(allCards)
  })

  it('Settings：默认仅展开首个分组（bg），其余全部折叠', async () => {
    const wrapper = shallowMount(Settings)
    const { SETTINGS_NAV_ITEMS } = await import('../../views/Settings.vue')
    const groups = wrapper.findAll('.sub-group')
    // 分组数从 SETTINGS_NAV_ITEMS 派生：新增分组时本用例自动跟随，不会静默腐烂
    expect(groups.length).toBe(SETTINGS_NAV_ITEMS.length)
    const collapsed = groups.filter((g) => g.classes().includes('is-collapsed'))
    expect(collapsed.length).toBe(SETTINGS_NAV_ITEMS.length - 1)
    expect(groups[0].classes()).not.toContain('is-collapsed')
  })

  it('PlayGallery：游戏列表接入 --wide，3 处收藏列表均接入默认网格', async () => {
    mockStore['hf:play_v2'] = {
      games: [{ id: 'g1', name: '游戏A', hours: 20, platform: 'PC', at: '2026-06-15T00:00:00.000Z' }],
      toys: [{ id: 't1', name: '玩具A', note: '', value: 'mint', at: '2026-06-15T00:00:00.000Z' }],
      models: [{ id: 'm1', name: '模型A', series: '系列A', status: 'owned', at: '2026-06-15T00:00:00.000Z' }],
      others: [{ id: 'o1', name: '其他A', note: '', at: '2026-06-15T00:00:00.000Z' }],
    }
    const { default: PlayGallery } = await import('../../views/PlayGallery.vue')
    const wrapper = mount(PlayGallery)
    // 游戏 tab（默认）：列表为 --wide 网格
    const gameList = wrapper.find('.game-list')
    expect(gameList.exists()).toBe(true)
    expect(gameList.classes()).toContain('hf-room-grid--wide')
    // 依次切换 玩具/模型/其他：各收藏列表均接入默认网格
    const tabLabels: Record<string, string> = { toy: '玩具', model: '模型', other: '其他' }
    for (const label of Object.values(tabLabels)) {
      const tab = wrapper.findAll('.tab').find((b) => b.text().includes(label))!
      await tab.trigger('click')
      await wrapper.vm.$nextTick()
      const grids = wrapper.findAll('.item-grid')
      expect(grids.length).toBe(1)
      expect(grids[0].classes()).toContain('hf-room-grid')
    }
  })
})
