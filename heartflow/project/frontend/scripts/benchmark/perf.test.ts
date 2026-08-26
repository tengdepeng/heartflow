// ============================================================
// 心流 · 性能基准测试（Vitest 集成）
// 随 vitest run 运行的性能度量，记录基线供后续对比
// ============================================================
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { performance } from 'perf_hooks'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const BASELINE_PATH = join(__dirname, 'baseline.json')

interface PerfMetric {
  name: string
  avgMs: number
  minMs: number
  maxMs: number
  iterations: number
}

// 当前会话的度量收集
const metrics: PerfMetric[] = []

function measure(name: string, fn: () => void, iterations = 100): PerfMetric {
  // 预热
  for (let i = 0; i < 5; i++) fn()

  const times: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    const end = performance.now()
    times.push(end - start)
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const metric: PerfMetric = {
    name,
    avgMs: Math.round(avg * 100) / 100,
    minMs: Math.round(Math.min(...times) * 100) / 100,
    maxMs: Math.round(Math.max(...times) * 100) / 100,
    iterations,
  }
  metrics.push(metric)
  return metric
}

beforeAll(() => {
  metrics.length = 0
})

describe('性能基准', () => {
  it('对象操作性能', () => {
    let _result: any = null

    const shallowMerge = measure('浅对象合并', () => {
      _result = { ...{ a: 1, b: 2, c: 3 }, ...{ d: 4, e: 5, f: 6 } }
    }, 10000)
    expect(shallowMerge.avgMs).toBeLessThan(0.1) // 应在 0.1ms 内完成

    const arr = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item_${i}` }))
    const arrayFind = measure('数组查找（1000项）', () => {
      _result = arr.find(x => x.id === 999)
    }, 10000)
    expect(arrayFind.avgMs).toBeLessThan(0.1)

    const map = new Map(Array.from({ length: 1000 }, (_, i) => [i, { id: i }]))
    const mapGet = measure('Map 查找（1000项）', () => {
      _result = map.get(999)
    }, 100000)
    expect(mapGet.avgMs).toBeLessThan(0.05)
    expect(_result).toBeDefined()

    // 大数组排序（1000项）
    const sortArr = Array.from({ length: 1000 }, (_, i) => ({ id: Math.random(), value: i }))
    const arraySort = measure('数组排序（1000项）', () => {
      _result = [...sortArr].sort((a, b) => a.id - b.id)
    }, 500)
    expect(arraySort.avgMs).toBeLessThan(2) // 应在 2ms 内完成（性能基准允许波动）
  })

  it('字符串操作性能', () => {
    const longStr = 'a'.repeat(10000)
    let _result = false

    const regex = measure('正则匹配（10000字符）', () => {
      _result = /a{100}/.test(longStr)
    }, 1000)
    expect(regex.avgMs).toBeLessThan(0.5)
    expect(_result).toBe(true)

    let _split: string[] = []
    const split = measure('字符串分割（16段）', () => {
      _split = 'a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p'.split(',')
    }, 100000)
    expect(split.avgMs).toBeLessThan(0.05)
    expect(_split).toHaveLength(16)
  })

  it('数组操作性能', () => {
    let _result: number[] = []

    const push = measure('Array.push（10000次）', () => {
      const arr: number[] = []
      for (let i = 0; i < 10000; i++) arr.push(i)
      _result = arr
    }, 100)
    expect(push.avgMs).toBeLessThan(10) // 应在 10ms 内完成
    expect(_result).toHaveLength(10000)

    const mapArr = Array.from({ length: 10000 }, (_, i) => i)
    const map = measure('Array.map（10000项）', () => {
      _result = mapArr.map(x => x * 2)
    }, 1000)
    expect(map.avgMs).toBeLessThan(1)

    let _sum = 0
    const reduce = measure('Array.reduce（10000项）', () => {
      _sum = mapArr.reduce((s, x) => s + x, 0)
    }, 1000)
    expect(reduce.avgMs).toBeLessThan(1)
    expect(_sum).toBe(49995000)

    const set = new Set(mapArr)
    let _has = false
    const setHas = measure('Set.has（10000项）', () => {
      _has = set.has(9999)
    }, 100000)
    expect(setHas.avgMs).toBeLessThan(0.05)
    expect(_has).toBe(true)
  })

  it('JSON 序列化/反序列化性能', () => {
    const testData = {
      version: 7,
      config: {
        theme: { primary: '#d4a574', background: '#0a0a0a' },
        timer: { defaultDuration: 25, breakDuration: 5, autoStart: false },
      },
      carriers: Array.from({ length: 10 }, (_, i) => ({
        id: `carrier_${i}`, name: `测试载体 ${i}`,
        beadCount: Math.floor(Math.random() * 108), maxBeads: 108,
      })),
      notes: Array.from({ length: 50 }, (_, i) => ({
        id: `note_${i}`, content: `测试笔记 ${i}`,
        tags: ['test'], createdAt: new Date().toISOString(),
      })),
    }

    let _serialized = ''
    const stringify = measure('JSON.stringify（10KB）', () => {
      _serialized = JSON.stringify(testData)
    }, 1000)
    expect(stringify.avgMs).toBeLessThan(0.5)
    expect(_serialized).toBeTruthy()

    let _parsed: any
    const parse = measure('JSON.parse（10KB）', () => {
      _parsed = JSON.parse(_serialized!)
    }, 1000)
    expect(parse.avgMs).toBeLessThan(0.5)
    expect(_parsed.version).toBe(7)
  })

  it('存储访问模式性能', () => {
    // 模拟带 1000 项的 KV 存储查找
    const kvStore = new Map<string, any>()
    for (let i = 0; i < 1000; i++) {
      kvStore.set(`key_${i}`, { id: i, data: `value_${i}`.repeat(10) })
    }

    let _result: any = null
    const kvGet = measure('KV 查找（1000项）', () => {
      _result = kvStore.get('key_500')
    }, 10000)
    expect(kvGet.avgMs).toBeLessThan(0.05)
    expect(_result).toBeDefined()

    // 模拟存储写入
    const kvSet = measure('KV 写入（1000项）', () => {
      for (let i = 0; i < 1000; i++) {
        kvStore.set(`key_${i}`, { id: i, data: `updated_${i}` })
      }
    }, 100)
    expect(kvSet.avgMs).toBeLessThan(10)
  })

  it('房间图路径查找性能', () => {
    const graph = new Map<string, string[]>([
      ['home', ['home-space', 'timeline', 'anchor', 'garden']],
      ['home-space', ['study', 'bedroom', 'kitchen', 'courtyard']],
      ['study', ['home-space', 'worklog']],
      ['worklog', ['study', 'scar', 'reward', 'craft', 'career', 'bag', 'rest']],
      ['scar', ['worklog']],
      ['reward', ['worklog']],
      ['craft', ['worklog', 'career']],
      ['career', ['craft', 'bag', 'rest']],
      ['bag', ['career']],
      ['rest', ['career']],
      ['timeline', ['home']],
      ['anchor', ['home']],
      ['garden', ['home']],
    ])

    function findPath(from: string, to: string, visited = new Set<string>()): string[] | null {
      if (from === to) return [from]
      if (visited.has(from)) return null
      visited.add(from)
      const neighbors = graph.get(from) || []
      for (const n of neighbors) {
        const path = findPath(n, to, visited)
        if (path) return [from, ...path]
      }
      return null
    }

    let _path: string[] | null = null
    const pathFind = measure('路径查找（home→rest）', () => {
      _path = findPath('home', 'rest')
    }, 5000)
    expect(pathFind.avgMs).toBeLessThan(0.1)
    expect(_path).not.toBeNull()
    expect(_path![0]).toBe('home')
    expect(_path![_path!.length - 1]).toBe('rest')

    let _path2: string[] | null = null
    const pathFind2 = measure('路径查找（home→garden）', () => {
      _path2 = findPath('home', 'garden')
    }, 5000)
    expect(pathFind2.avgMs).toBeLessThan(0.1)
    expect(_path2).toEqual(['home', 'garden'])
  })
})

// ---- 在全部基准测试完成后保存基线 ----
// 使用 afterAll 保存，避免每个测试文件独立保存
describe('性能基准保存', () => {
  afterAll(() => {
    // 只在主线程写入
    if (process.env.VITEST_POOL_ID && process.env.VITEST_POOL_ID !== '0') return

    const timestamp = new Date().toISOString()
    const baseline = {
      generatedAt: timestamp,
      environment: { node: process.version, platform: process.platform },
      suites: [
        {
          name: '性能基准测试',
          results: metrics.map(m => ({
            name: m.name,
            iterations: m.iterations,
            avgMs: m.avgMs,
            minMs: m.minMs,
            maxMs: m.maxMs,
          })),
          timestamp,
        },
      ],
    }

    try {
      writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2), 'utf-8')
      // eslint-disable-next-line no-console
      console.log(`[性能基准] 基线已保存: ${BASELINE_PATH} (${metrics.length} 项)`)
    } catch {
      // 写入失败不阻塞测试
    }
  })

  it('基线保存状态', () => {
    expect(true).toBe(true)
  })
})