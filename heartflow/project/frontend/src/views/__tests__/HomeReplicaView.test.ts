import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import HomeReplicaView from '../HomeReplicaView.vue'
import { storage } from '../../engine/storage'

const KEY = 'hf:home_replica_assets'

// 模拟 WebGL 上下文（jsdom 无 WebGL）
function mockWebGL(): void {
  HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
    if (contextId === 'webgl2' || contextId === 'webgl') {
      return {} as WebGLRenderingContext
    }
    return null
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext
}

// 模拟程序化场景工厂（避免真实 import('three') 在 jsdom 中失败）
vi.mock('../../modules/home/useHomeReplicaProceduralScene', () => ({
  createProceduralHomeScene: vi.fn().mockResolvedValue({
    dispose: vi.fn(),
    focusRoom: vi.fn(),
    getCurrentRoomId: () => 'entrance',
  }),
}))

describe('HomeReplicaView · 家 3D 复刻（程序化）', () => {
  beforeEach(() => {
    storage.setKV(KEY, null)
    mockWebGL()
  })

  it('默认显示 3D 复刻舞台 + 房间导航面板 + 常驻导入/示例面板', async () => {
    const wrapper = mount(HomeReplicaView)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hr-stage').exists()).toBe(true)
    expect(wrapper.find('.hr-rooms__list').exists()).toBe(true)
    // 程序化房间列表包含 11 个房间
    const names = wrapper.findAll('.hr-rooms__item-name').map((n) => n.text())
    expect(names).toContain('玄关')
    expect(names).toContain('客厅')
    // 导入/示例/导出控件常驻可达
    expect(wrapper.find('.hr-import').exists()).toBe(true)
    expect(wrapper.find('.hr-sample').exists()).toBe(true)
    expect(wrapper.find('.hr-export').exists()).toBe(true)
  })

  it('有清单时仍渲染 3D 复刻舞台 + 房间导航', async () => {
    storage.setKV(KEY, {
      version: 1,
      unit: 'm',
      rooms: [
        { id: 'living-room', name: '客厅', model: '/home-replica/living-room.glb' },
        { id: 'bedroom', name: '卧室', model: '/home-replica/bedroom.glb' },
      ],
    })
    const wrapper = mount(HomeReplicaView)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hr-stage').exists()).toBe(true)
    expect(wrapper.find('.hr-rooms__list').exists()).toBe(true)
    const names = wrapper.findAll('.hr-rooms__item-name').map((n) => n.text())
    expect(names).toContain('玄关')
  })

  it('粘贴合法 manifest → 导入后仍显示复刻舞台', async () => {
    const wrapper = mount(HomeReplicaView)
    await wrapper.vm.$nextTick()
    const valid = JSON.stringify({
      version: 1,
      unit: 'm',
      rooms: [
        { id: 'living-room', name: '客厅', model: '/home-replica/living-room.glb' },
        { id: 'bedroom', name: '卧室', model: '/home-replica/bedroom.glb' },
      ],
    })
    await wrapper.find('.hr-import__text').setValue(valid)
    await wrapper.find('.hr-import__btn').trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hr-stage').exists()).toBe(true)
  })

  it('粘贴非法 manifest → 显示错误且不破坏视图', async () => {
    const wrapper = mount(HomeReplicaView)
    await wrapper.vm.$nextTick()
    await wrapper.find('.hr-import__text').setValue('{ not valid json')
    await wrapper.find('.hr-import__btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hr-import__error').exists()).toBe(true)
    expect(wrapper.find('.hr-stage').exists()).toBe(true)
    expect(wrapper.find('.hr-placeholder').exists()).toBe(false)
  })

  it('导出按钮存在且点击不崩溃', async () => {
    storage.setKV(KEY, {
      version: 1,
      unit: 'm',
      rooms: [{ id: 'living-room', name: '客厅', model: '/home-replica/living-room.glb' }],
    })
    const wrapper = mount(HomeReplicaView)
    await wrapper.vm.$nextTick()
    const btn = wrapper.find('.hr-export')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hr-stage').exists()).toBe(true)
  })

  it('点击「载入示例家」→ 加载示例 manifest 后仍显示复刻舞台', async () => {
    const wrapper = mount(HomeReplicaView)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hr-stage').exists()).toBe(true)
    await wrapper.find('.hr-sample__btn').trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hr-stage').exists()).toBe(true)
  })

  it('点击「载入真实户型图（网上 CC0）」→ 加载后仍显示复刻舞台', async () => {
    const wrapper = mount(HomeReplicaView)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hr-stage').exists()).toBe(true)
    const btns = wrapper.findAll('.hr-sample__btn')
    expect(btns.length).toBe(2)
    await btns[1].trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hr-stage').exists()).toBe(true)
  })

  it('清除清单 → 重新挂载程序化场景（不显示占位）', async () => {
    const wrapper = mount(HomeReplicaView)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hr-stage').exists()).toBe(true)
    await wrapper.find('.hr-clear').trigger('click')
    await wrapper.vm.$nextTick()
    // 清除后仍然显示舞台（程序化场景重新挂载）
    expect(wrapper.find('.hr-stage').exists()).toBe(true)
  })

  it('房间导航：点击房间列表项切换当前房间', async () => {
    const wrapper = mount(HomeReplicaView)
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('.hr-rooms__item')
    expect(items.length).toBe(11)
    // 第一个房间（玄关）默认选中
    expect(items[0].classes()).toContain('active')
    // 点击第三个房间
    await items[2].trigger('click')
    await wrapper.vm.$nextTick()
    expect(items[2].classes()).toContain('active')
  })

  it('房间导航：prev/next 按钮切换房间', async () => {
    const wrapper = mount(HomeReplicaView)
    await wrapper.vm.$nextTick()
    const navBtns = wrapper.findAll('.hr-nav__btn')
    expect(navBtns.length).toBe(2)
    // 点击 next
    await navBtns[1].trigger('click')
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('.hr-rooms__item')
    expect(items[1].classes()).toContain('active')
  })

  it('显示当前房间信息和氛围色条', async () => {
    const wrapper = mount(HomeReplicaView)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hr-rooms__current').exists()).toBe(true)
    expect(wrapper.find('.hr-atmos-bar').exists()).toBe(true)
    expect(wrapper.find('.hr-rooms__current-icon').exists()).toBe(true)
  })
})