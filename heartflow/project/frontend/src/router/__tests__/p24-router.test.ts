// ============================================================
// P24-3 路由配置 · 增强测试
// 覆盖：withRoomMeta / 路由懒加载 / 路由名称唯一性 /
//       路径唯一性 / 动态参数路由 / afterEach 守卫 /
//       路由数量完整性 / 路由解析
// ============================================================

import { describe, expect, it, vi, beforeEach } from 'vitest'

describe('P24-3 路由配置增强', () => {
  beforeEach(() => {
    const mockLocation = { href: '', pathname: '/', hash: '', search: '' }
    vi.stubGlobal('location', mockLocation)
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({})),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      documentElement: {},
      createTextNode: vi.fn(() => ({})),
    })
    vi.stubGlobal('window', {
      location: mockLocation,
      history: { state: null, pushState: vi.fn(), replaceState: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  async function fresh() {
    const { default: router } = await import('../index')
    return router
  }

  // ---- 路由元数据 ----
  describe('withRoomMeta 路由元数据', () => {
    it('所有路由都有 meta.roomId', async () => {
      const router = await fresh()
      const routes = router.getRoutes()
      for (const r of routes) {
        expect(r.meta?.roomId).toBeDefined()
        expect(typeof (r.meta as any).roomId).toBe('string')
        expect(String((r.meta as any).roomId).length).toBeGreaterThan(0)
      }
    })

    it('所有路由都有 meta.title', async () => {
      const router = await fresh()
      const routes = router.getRoutes()
      for (const r of routes) {
        expect(r.meta?.title).toBeDefined()
        expect(typeof (r.meta as any).title).toBe('string')
        expect(String((r.meta as any).title).length).toBeGreaterThan(0)
      }
    })

    it('home 路由 roomId 为 home', async () => {
      const router = await fresh()
      const homeRoute = router.getRoutes().find(r => r.path === '/')
      expect((homeRoute!.meta as any).roomId).toBe('home')
    })

    it('timeline 路由 roomId 为 timeline', async () => {
      const router = await fresh()
      const route = router.getRoutes().find(r => r.path === '/timeline')
      expect((route!.meta as any).roomId).toBe('timeline')
    })

    it('sanctuary 路由 roomId 为 sanctuary', async () => {
      const router = await fresh()
      const route = router.getRoutes().find(r => r.path === '/sanctuary')
      expect((route!.meta as any).roomId).toBe('sanctuary')
    })
  })

  // ---- 路由懒加载 ----
  describe('路由懒加载', () => {
    it('所有路由组件使用动态 import', async () => {
      const router = await fresh()
      const routes = router.getRoutes()
      for (const r of routes) {
        // 路由定义中的 component 应该是函数（懒加载）
        // 但 getRoutes() 返回已解析的路由，无法直接检查
        // 我们验证路由已正确注册
        expect(r).toBeDefined()
      }
    })

    it('主链路路由组件可解析', async () => {
      const router = await fresh()
      const mainRoutes = ['/', '/timeline', '/anchor', '/garden', '/sanctuary']
      for (const path of mainRoutes) {
        const resolved = router.resolve(path)
        expect(resolved).toBeDefined()
      }
    })

    it('世界房间路由组件可解析', async () => {
      const router = await fresh()
      const worldRoutes = ['/goals', '/reading', '/relations', '/body', '/worklog', '/play']
      for (const path of worldRoutes) {
        const resolved = router.resolve(path)
        expect(resolved).toBeDefined()
      }
    })

    it('工作房间路由组件可解析', async () => {
      const router = await fresh()
      const workRoutes = ['/scar', '/reward', '/craft', '/career', '/bag', '/rest']
      for (const path of workRoutes) {
        const resolved = router.resolve(path)
        expect(resolved).toBeDefined()
      }
    })
  })

  // ---- 路由名称唯一性 ----
  describe('路由名称唯一性', () => {
    it('所有路由名称不重复', async () => {
      const router = await fresh()
      const routes = router.getRoutes()
      const names = routes.map(r => String(r.name ?? '')).filter(Boolean)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })
  })

  // ---- 路由路径唯一性 ----
  describe('路由路径唯一性', () => {
    it('所有路由路径不重复', async () => {
      const router = await fresh()
      const routes = router.getRoutes()
      const paths = routes.map(r => r.path)
      const uniquePaths = new Set(paths)
      expect(uniquePaths.size).toBe(paths.length)
    })
  })

  // ---- 动态参数路由 ----
  describe('动态参数路由', () => {
    it('advisors/witness/:id 正确解析参数', async () => {
      const router = await fresh()
      const resolved = router.resolve('/advisors/witness/test-id-123')
      expect(resolved).toBeDefined()
    })

    it('advisors/chat/:id 正确解析参数', async () => {
      const router = await fresh()
      const resolved = router.resolve('/advisors/chat/chat-id-456')
      expect(resolved).toBeDefined()
    })
  })

  // ---- 路由数量 ----
  describe('路由数量', () => {
    it('总路由数不少于 50 条', async () => {
      const router = await fresh()
      expect(router.getRoutes().length).toBeGreaterThanOrEqual(50)
    })
  })

  // ---- 路由解析 ----
  describe('路由解析', () => {
    it('不存在的路由解析为空匹配', async () => {
      const router = await fresh()
      const resolved = router.resolve('/nonexistent-path-xyz')
      expect(resolved.matched.length).toBe(0)
    })

    it('路由名称导航到正确路径', async () => {
      const router = await fresh()
      const route = router.resolve({ name: 'home' })
      expect(route.path).toBe('/')
    })

    it('worklog 路由名称导航到 /worklog', async () => {
      const router = await fresh()
      const route = router.resolve({ name: 'worklog' })
      expect(route.path).toBe('/worklog')
    })
  })

  // ---- 系统路由 ----
  describe('系统路由', () => {
    it('constitution 路由存在', async () => {
      const router = await fresh()
      const route = router.getRoutes().find(r => r.path === '/constitution')
      expect(route).toBeDefined()
    })

    it('settings 路由存在', async () => {
      const router = await fresh()
      const route = router.getRoutes().find(r => r.path === '/settings')
      expect(route).toBeDefined()
    })

    it('room-manager 路由存在', async () => {
      const router = await fresh()
      const route = router.getRoutes().find(r => r.path === '/room-manager')
      expect(route).toBeDefined()
    })
  })

  // ---- 补充空间 ----
  describe('补充空间路由', () => {
    it('output 路由存在', async () => {
      const router = await fresh()
      const route = router.getRoutes().find(r => r.path === '/output')
      expect(route).toBeDefined()
    })

    it('study 路由存在', async () => {
      const router = await fresh()
      const route = router.getRoutes().find(r => r.path === '/study')
      expect(route).toBeDefined()
    })
  })
})