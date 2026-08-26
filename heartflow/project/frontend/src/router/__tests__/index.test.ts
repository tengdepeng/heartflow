// ============================================================
// router 路由配置测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

describe('router 路由配置', () => {
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

  it('路由实例已创建', async () => {
    const router = await fresh()
    expect(router).toBeDefined()
    expect(typeof router.push).toBe('function')
  })

  it('history 模式为 hash', async () => {
    const router = await fresh()
    expect(router.options.history).toBeDefined()
    expect(typeof router.options.history.push).toBe('function')
  })

  it('包含根路由 /', async () => {
    const router = await fresh()
    const route = router.getRoutes().find(r => r.path === '/')
    expect(route).toBeDefined()
    expect(route!.name).toBe('home')
  })

  it('包含所有核心路由名称', async () => {
    const router = await fresh()
    const names = router.getRoutes().map(r => r.name).filter(Boolean)

    const coreRoutes = ['home', 'home-space', 'timeline', 'anchor', 'goals', 'reading', 'relations', 'body', 'worklog', 'play', 'map', 'bookmarks', 'vault', 'scar', 'reward', 'craft', 'career', 'bag', 'rest']
    for (const name of coreRoutes) {
      expect(names).toContain(name)
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

  it('所有路由都有 meta.roomId', async () => {
    const router = await fresh()
    const routes = router.getRoutes()
    for (const r of routes) {
      expect(r.meta?.roomId).toBeDefined()
      expect(typeof (r.meta as any).roomId).toBe('string')
      expect(String((r.meta as any).roomId).length).toBeGreaterThan(0)
    }
  })

  it('meta.roomId 与路径对应', async () => {
    const router = await fresh()
    const routes = router.getRoutes()
    const homeRoute = routes.find(r => r.path === '/')
    expect(homeRoute).toBeDefined()
    expect((homeRoute!.meta as any).roomId).toBe('home')

    const timelineRoute = routes.find(r => r.path === '/timeline')
    expect(timelineRoute).toBeDefined()
    expect((timelineRoute!.meta as any).roomId).toBe('timeline')
  })

  it('总路由数量不少于 42 条', async () => {
    const router = await fresh()
    expect(router.getRoutes().length).toBeGreaterThanOrEqual(42)
  })

  it('找不到路由时不会报错', async () => {
    const router = await fresh()
    const resolved = router.resolve('/nonexistent-path')
    expect(resolved).toBeDefined()
    expect(resolved.matched.length).toBe(0)
  })

  it('支持路由名称导航', async () => {
    const router = await fresh()
    const route = router.resolve({ name: 'home' })
    expect(route.path).toBe('/')
  })
})