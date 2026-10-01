// ============================================================
// 接入层收口 · 导航/星盘可达性交叉验证
// 防止回归：room-graph 注册了空间，但路由表或视图缺失导致 404。
// 交叉核对「room-graph 节点 path」↔「真实 Vue Router 路由」↔「视图组件可解析」。
// ============================================================
import { describe, it, expect } from 'vitest'
import router from '../index'
import { getRoom } from '../../engine/room-graph'

// 接入层收口新增/补注册的功能空间（含本轮回填的 4 个已路由未注册空间）
const ACCESS_LAYER_ROOMS = [
  'automation',
  'transform-gallery',
  'output',
  'study',
  'dream-nook',
  'growth-garden',
  'app-space',
  'decoration-workshop',
  'space-customizer',
  'time-corridor',
  'time-capsule',
  'mirror-self',
  'data-outflow',
  'visualization-studio',
  'star-map',
  'home-replica',
  'traditions',
] as const

describe('接入层可达性 · 导航/星盘', () => {
  const allRoutes = router.getRoutes()

  for (const id of ACCESS_LAYER_ROOMS) {
    it(`空间 ${id} 的 path 在真实路由表中存在`, () => {
      const room = getRoom(id)
      expect(room, `room-graph 未注册 ${id}`).toBeDefined()
      const route = allRoutes.find((r) => r.path === room!.path)
      expect(route, `路由表缺少 path=${room!.path}（空间 ${id} 将 404）`).toBeDefined()
    })

    it(`空间 ${id} 的视图组件可被解析（文件存在且可编译）`, async () => {
      const room = getRoom(id)!
      const route = allRoutes.find((r) => r.path === room.path)
      expect(route).toBeDefined()
      // 懒加载路由：component 会被 vue-router 归一化为 components.default
      const loader = (route as any).components?.default ?? (route as any).component
      expect(typeof loader, `空间 ${id} 路由未配置 component 加载器`).toBe('function')
      // 实际触发 import('../views/X.vue')，文件缺失/编译失败会抛错
      const mod = await loader()
      expect(mod, `空间 ${id} 视图模块解析为空`).toBeDefined()
      expect(mod.default, `空间 ${id} 视图模块缺少 default 导出`).toBeDefined()
    })
  }

  it('新空间全部 group=world，会被导航侧边栏与星盘外环渲染', () => {
    for (const id of ACCESS_LAYER_ROOMS) {
      const room = getRoom(id)!
      expect(room.group).toBe('world')
    }
  })
})
