// ============================================================
// 文明根系视图 · traditions 孤儿接线验证
// 断言：真实 KV 民俗条目 / 文明收藏能灌入视图并渲染对应卡片；
// 空数据时两个区块均显示空态而非报错。
// 宪法安全：收藏以 isPublic=false 本地创建，UI 不出现"公共/公开"措辞。
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TraditionsView from '../Traditions.vue'
import { storage } from '@/engine/storage'
import type { FolkloreEntry, CivilizationMirror } from '@/modules/traditions'

const ENTRIES_KEY = 'hf:folklore_entries'
const MIRRORS_KEY = 'hf:civilization_mirrors'

function makeEntry(id: string, name: string): FolkloreEntry {
  const now = new Date().toISOString()
  return {
    id,
    name,
    category: 'handicraft',
    region: '江南',
    description: `${name} 的描述`,
    steps: ['备料'],
    materials: ['竹'],
    meanings: ['祈福'],
    inheritor: undefined,
    tags: ['民俗'],
    endangered: false,
    recordedAt: now,
    lastPracticedAt: undefined,
    practiceCount: 0,
    source: 'personal',
    mediaUrls: [],
  }
}

function makeMirror(id: string, name: string): CivilizationMirror {
  const now = new Date().toISOString()
  return {
    id,
    name,
    region: '江南',
    period: '清末至今',
    entryCount: 0,
    createdAt: now,
    updatedAt: now,
    contributors: 1,
    public: false,
    description: `${name} 的描述`,
    tags: ['岁时'],
  }
}

beforeEach(() => {
  storage.setKV(ENTRIES_KEY, [])
  storage.setKV(MIRRORS_KEY, [])
})

describe('TraditionsView', () => {
  it('有民俗条目时渲染对应数量的卡片', async () => {
    storage.setKV(ENTRIES_KEY, [
      makeEntry('e1', '端午龙舟'),
      makeEntry('e2', '苏绣'),
    ])

    const wrapper = mount(TraditionsView)
    await flushPromises()
    expect(wrapper.findAll('.trad-entry').length).toBe(2)
  })

  it('有个人文明收藏时渲染对应数量的卡片', async () => {
    storage.setKV(MIRRORS_KEY, [
      makeMirror('m1', '江南水乡岁时记'),
    ])

    const wrapper = mount(TraditionsView)
    await flushPromises()
    expect(wrapper.findAll('.trad-mirror').length).toBe(1)
  })

  it('无任何数据时两个区块均显示空态且不渲染卡片', async () => {
    const wrapper = mount(TraditionsView)
    await flushPromises()
    expect(wrapper.find('.trad-empty').exists()).toBe(true)
    expect(wrapper.find('.trad-entry').exists()).toBe(false)
    expect(wrapper.find('.trad-mirror').exists()).toBe(false)
  })

  it('UI 不出现"公共/公开"等社交措辞', async () => {
    const wrapper = mount(TraditionsView)
    await flushPromises()
    const text = wrapper.text()
    expect(text).not.toContain('公共')
    expect(text).not.toContain('公开')
    expect(text).not.toContain('社区')
  })
})
