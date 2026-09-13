// ============================================================
// 地图室 · 本地坐标星图 + 离线城市定位 测试
// 不依赖任何外部地图瓦片 / SDK。
// 全程通过 DOM 交互与持久化落盘断言，不触及组件内部状态。
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { invalidateCache } from '../../engine/storage/core'

function readSchema(): Record<string, any> {
  return JSON.parse(localStorage.getItem('heartflow:storage') || '{}')
}

async function getWrapper() {
  const { default: MapRoom } = await import('../MapRoom.vue')
  return mount(MapRoom)
}

describe('MapRoom 本地坐标星图', () => {
  beforeEach(() => {
    localStorage.clear()
    invalidateCache()
  })

  it('记录已知城市地点时自动离线定位（落经纬度）', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('input[placeholder="地点名称"]').setValue('故宫')
    await wrapper.find('input[placeholder="城市（可联想）"]').setValue('北京')
    await nextTick()
    await wrapper.find('.add-row button.mr-btn').trigger('click')
    await flushPromises()

    // 列表出现一条记录
    expect(wrapper.findAll('.place-card').length).toBe(1)
    // 持久化中点位已带经纬度
    const stored = readSchema().kvStore?.['hf:map_places_v2']
    expect(stored).toBeTruthy()
    expect(stored[0].lng).toBeCloseTo(116.41, 1)
    expect(stored[0].lat).toBeCloseTo(39.9, 1)
    // 星图渲染了一个已定位圆点
    expect(wrapper.find('.mr-map').element.querySelectorAll('circle').length).toBe(1)
  })

  it('已定位地点在 SVG 星图上渲染圆点', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('input[placeholder="地点名称"]').setValue('外滩')
    await wrapper.find('input[placeholder="城市（可联想）"]').setValue('上海')
    await nextTick()
    await wrapper.find('.add-row button.mr-btn').trigger('click')
    await flushPromises()

    const svg = wrapper.find('.mr-map')
    expect(svg.exists()).toBe(true)
    expect(svg.element.querySelectorAll('circle').length).toBe(1)
  })

  it('按类型筛选地点记录', async () => {
    const wrapper = await getWrapper()
    const selects = wrapper.findAll('select.mr-select')

    await wrapper.find('input[placeholder="地点名称"]').setValue('城市A')
    await wrapper.find('input[placeholder="城市（可联想）"]').setValue('北京')
    await selects[0].setValue('city')
    await nextTick()
    await wrapper.find('.add-row button.mr-btn').trigger('click')
    await flushPromises()

    await wrapper.find('input[placeholder="地点名称"]').setValue('自然B')
    await wrapper.find('input[placeholder="城市（可联想）"]').setValue('拉萨')
    await selects[0].setValue('nature')
    await nextTick()
    await wrapper.find('.add-row button.mr-btn').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.place-card').length).toBe(2)

    // 列表内的类型筛选下拉是第二个 select
    await selects[1].setValue('nature')
    await flushPromises()
    const cards = wrapper.findAll('.place-card')
    expect(cards.length).toBe(1)
    expect(cards[0].text()).toContain('自然B')
  })

  it('人生节点可增删', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('input[placeholder="年份"]').setValue('2018')
    await wrapper.find('input[placeholder="事件"]').setValue('留学东京')
    await nextTick()
    await wrapper.find('.empty-hint button.mr-btn').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.node-card').length).toBe(1)

    await wrapper.find('.node-card .mr-del').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.node-card').length).toBe(0)
  })

  // ============================================================
  // 旅程档案（INCR-58 设计，INCR-195 恢复挂载）
  // ============================================================
  it('渲染旅程档案面板（空态引导）', async () => {
    const wrapper = await getWrapper()
    await flushPromises()
    expect(wrapper.find('.jap').exists()).toBe(true)
    expect(wrapper.text()).toContain('旅程档案')
    expect(wrapper.text()).toContain('旅程未启')
  })

  it('注入足迹记录后渲染旅程统计与清单', async () => {
    const schema = readSchema()
    schema.kvStore = schema.kvStore || {}
    schema.kvStore['hf:footprint_records'] = [
      { id: 'fp1', name: '故宫', region: '北京', date: '2026-01-05', type: 'sight' },
      { id: 'fp2', name: '外滩', region: '上海', date: '2026-01-06', type: 'sight' },
      { id: 'fp3', name: '西湖', region: '杭州', date: '2026-01-07', type: 'sight' },
    ]
    localStorage.setItem('heartflow:storage', JSON.stringify(schema))
    invalidateCache()

    const wrapper = await getWrapper()
    await flushPromises()
    expect(wrapper.text()).toContain('段旅程')
    expect(wrapper.findAll('.jap-stat').length).toBe(4)
    expect(wrapper.findAll('.jap-row').length).toBeGreaterThan(0)
  })

  // ============================================================
  // 3D 地球（INCR-299 补挂载孤儿组件 Globe3D：WebGL 三维地球）
  // 测试环境经 src/test/setup.ts 的 WebGL stub 支持 three.js 渲染器初始化
  // ============================================================
  it('渲染 3D 地球小节与容器', async () => {
    const wrapper = await getWrapper()
    await flushPromises()
    expect(wrapper.text()).toContain('3D 地球 · 环球立体标记')
    expect(wrapper.find('.globe3d-container').exists()).toBe(true)
  })

  it('无地点时显示空态引导', async () => {
    const wrapper = await getWrapper()
    await flushPromises()
    expect(wrapper.text()).toContain('添加带经纬度的地点后，3D 地球将自动标记')
  })

  it('WebGL 场景初始化并挂载 canvas（setup.ts WebGL stub）', async () => {
    const wrapper = await getWrapper()
    await flushPromises()
    expect(wrapper.find('.globe3d-container canvas').exists()).toBe(true)
  })

  it('注入已定位地点后空态消失，未定位地点不参与', async () => {
    const schema = readSchema()
    schema.kvStore = schema.kvStore || {}
    schema.kvStore['hf:map_places_v2'] = [
      { id: 'pl1', name: '外滩', city: '上海', type: 'city', note: '', visitCount: 3, at: '2026-01-06T00:00:00.000Z', lng: 121.47, lat: 31.23 },
      { id: 'pl2', name: '梦游之地', city: '', type: 'nature', note: '', visitCount: 1, at: '2026-01-07T00:00:00.000Z' },
    ]
    localStorage.setItem('heartflow:storage', JSON.stringify(schema))
    invalidateCache()

    const wrapper = await getWrapper()
    await flushPromises()
    // 已定位 → 空态引导消失；未定位地点不落点（空态不出现即证明有地点进入）
    expect(wrapper.text()).not.toContain('添加带经纬度的地点后，3D 地球将自动标记')
    expect(wrapper.find('.globe3d-container').exists()).toBe(true)
    expect(wrapper.find('.globe3d-container canvas').exists()).toBe(true)
  })
})
