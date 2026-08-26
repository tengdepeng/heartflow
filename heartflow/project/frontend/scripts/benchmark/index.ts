// ============================================================
// 心流 · 性能基准测试
// 测量关键模块的运行性能，记录基线用于后续对比
// 使用: npx tsx src/benchmark/index.ts
// ============================================================

import { performance } from 'perf_hooks'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const BASELINE_PATH = join(__dirname, 'baseline.json')

interface BenchmarkResult {
  name: string
  durationMs: number
  iterations: number
  avgMs: number
  minMs: number
  maxMs: number
}

interface BenchmarkSuite {
  name: string
  results: BenchmarkResult[]
  timestamp: string
}

// ---- 工具函数 ----

function measure(
  name: string,
  fn: () => void,
  iterations = 100,
): BenchmarkResult {
  const times: number[] = []

  // 预热
  for (let i = 0; i < 10; i++) fn()

  // 正式测量
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    const end = performance.now()
    times.push(end - start)
  }

  const total = times.reduce((a, b) => a + b, 0)
  return {
    name,
    durationMs: Math.round(total * 100) / 100,
    iterations,
    avgMs: Math.round((total / iterations) * 100) / 100,
    minMs: Math.round(Math.min(...times) * 100) / 100,
    maxMs: Math.round(Math.max(...times) * 100) / 100,
  }
}

// measureAsync not used - kept for reference

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(1)}µs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(3)}s`
}

// ---- 基准测试项 ----

function benchmarkObjectOperations() {
  const suite: BenchmarkResult[] = []

  suite.push(measure('浅对象合并', () => {
    const a = { a: 1, b: 2, c: 3 }
    const b = { d: 4, e: 5, f: 6 }
    return { ...a, ...b }
  }, 10000))

  suite.push(measure('深对象合并（3层）', () => {
    const a = { l1: { l2: { value: 1, items: [1, 2, 3] } } }
    const b = { l1: { l2: { value: 2, extra: 'test' } } }
    return JSON.parse(JSON.stringify({ ...a, ...b }))
  }, 5000))

  suite.push(measure('数组查找（1000项）', () => {
    const arr = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item_${i}` }))
    return arr.find(x => x.id === 999)
  }, 10000))

  suite.push(measure('数组过滤（1000项）', () => {
    const arr = Array.from({ length: 1000 }, (_, i) => ({ id: i, active: i % 2 === 0 }))
    return arr.filter(x => x.active)
  }, 10000))

  suite.push(measure('数组排序（1000项）', () => {
    const arr = Array.from({ length: 1000 }, (_, i) => ({ id: Math.random(), value: i }))
    return arr.sort((a, b) => a.id - b.id)
  }, 1000))

  suite.push(measure('Map 查找（1000项）', () => {
    const map = new Map(Array.from({ length: 1000 }, (_, i) => [i, { id: i, value: `item_${i}` }]))
    return map.get(999)
  }, 100000))

  return suite
}

function benchmarkStringOperations() {
  const suite: BenchmarkResult[] = []

  const longStr = 'a'.repeat(10000)
  suite.push(measure('正则匹配（10000字符）', () => {
    return /a{100}/.test(longStr)
  }, 1000))

  suite.push(measure('字符串分割', () => {
    return 'a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p'.split(',')
  }, 100000))

  suite.push(measure('模板字符串拼接', () => {
    const name = 'test', value = 42, active = true
    return `${name}_${value}_${active}_${Date.now()}`
  }, 100000))

  return suite
}

function benchmarkArrayOperations() {
  const suite: BenchmarkResult[] = []

  suite.push(measure('Array.push（10000次）', () => {
    const arr: number[] = []
    for (let i = 0; i < 10000; i++) arr.push(i)
    return arr
  }, 100))

  suite.push(measure('Array.map（10000项）', () => {
    const arr = Array.from({ length: 10000 }, (_, i) => i)
    return arr.map(x => x * 2)
  }, 1000))

  suite.push(measure('Array.reduce（10000项）', () => {
    const arr = Array.from({ length: 10000 }, (_, i) => i)
    return arr.reduce((sum, x) => sum + x, 0)
  }, 1000))

  suite.push(measure('Array.includes（10000项、尾部）', () => {
    const arr = Array.from({ length: 10000 }, (_, i) => i)
    return arr.includes(9999)
  }, 1000))

  suite.push(measure('Set.has（10000项）', () => {
    const set = new Set(Array.from({ length: 10000 }, (_, i) => i))
    return set.has(9999)
  }, 100000))

  return suite
}

function benchmarkStorage() {
  const suite: BenchmarkResult[] = []

  // 模拟 storage 的 JSON 序列化/反序列化
  const testData = {
    version: 7,
    config: {
      theme: { primary: '#d4a574', background: '#0a0a0a' },
      timer: { defaultDuration: 25, breakDuration: 5, autoStart: false },
      advisor: { enabled: false, maxAdvisors: 3 },
    },
    carriers: Array.from({ length: 10 }, (_, i) => ({
      id: `carrier_${i}`,
      name: `测试载体 ${i}`,
      beadCount: Math.floor(Math.random() * 108),
      maxBeads: 108,
      active: i === 0,
    })),
    notes: Array.from({ length: 50 }, (_, i) => ({
      id: `note_${i}`,
      content: `测试笔记内容 ${i} `.repeat(20),
      tags: ['test', 'benchmark'],
      createdAt: new Date().toISOString(),
    })),
  }

  suite.push(measure('JSON.stringify（10KB 数据）', () => {
    return JSON.stringify(testData)
  }, 1000))

  const serialized = JSON.stringify(testData)
  suite.push(measure('JSON.parse（10KB 数据）', () => {
    return JSON.parse(serialized)
  }, 1000))

  // 大对象
  const largeData = { items: Array.from({ length: 1000 }, (_, i) => ({ id: i, values: Array.from({ length: 20 }, (_, j) => `v_${i}_${j}`) })) }
  suite.push(measure('JSON.stringify（100KB 数据）', () => {
    return JSON.stringify(largeData)
  }, 100))

  const largeSerialized = JSON.stringify(largeData)
  suite.push(measure('JSON.parse（100KB 数据）', () => {
    return JSON.parse(largeSerialized)
  }, 100))

  return suite
}

function benchmarkRoomGraph() {
  const suite: BenchmarkResult[] = []

  suite.push(measure('房间查找（按 ID，34 间）', () => {
    const rooms = [
      { id: 'home', name: 'Home', adjacentTo: ['home-space', 'timeline', 'anchor', 'garden'] },
      { id: 'home-space', name: 'HomeSpace', adjacentTo: ['study', 'bedroom', 'kitchen'] },
      { id: 'study', name: 'Study', adjacentTo: ['home-space'] },
      { id: 'worklog', name: 'WorkLog', adjacentTo: ['scar', 'reward', 'craft'] },
      { id: 'scar', name: 'Scar', adjacentTo: ['worklog'] },
      { id: 'reward', name: 'Reward', adjacentTo: ['worklog'] },
      { id: 'craft', name: 'Craft', adjacentTo: ['worklog', 'career'] },
      { id: 'career', name: 'Career', adjacentTo: ['craft', 'bag', 'rest'] },
      { id: 'bag', name: 'Bag', adjacentTo: ['career'] },
      { id: 'rest', name: 'Rest', adjacentTo: ['career'] },
    ]
    return rooms.find(r => r.id === 'career')
  }, 100000))

  suite.push(measure('路径查找（5 层深度）', () => {
    // 模拟从 home to rest 的路径查找
    const graph = new Map<string, string[]>()
    graph.set('home', ['home-space'])
    graph.set('home-space', ['study'])
    graph.set('study', ['worklog'])
    graph.set('worklog', ['career'])
    graph.set('career', ['rest'])

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

    return findPath('home', 'rest')
  }, 10000))

  return suite
}

// ---- 主入口 ----

async function main() {
  console.log('')
  console.log('  ╔══════════════════════════════════════════════╗')
  console.log('  ║      心流 · 性能基准测试                     ║')
  console.log('  ║      Heartflow Performance Benchmark         ║')
  console.log('  ╚══════════════════════════════════════════════╝')
  console.log('')

  const suites: BenchmarkSuite[] = []
  const timestamp = new Date().toISOString()

  // 1. 对象操作
  console.log('  ┌─ 对象操作 ───────────────────────────────────┐')
  const objSuite: BenchmarkSuite = {
    name: '对象操作',
    results: benchmarkObjectOperations(),
    timestamp,
  }
  for (const r of objSuite.results) {
    console.log(`  │ ${r.name.padEnd(30)} ${formatDuration(r.avgMs).padStart(12)} avg`)
  }
  console.log('  └──────────────────────────────────────────────┘')
  suites.push(objSuite)

  // 2. 字符串操作
  console.log('  ┌─ 字符串操作 ─────────────────────────────────┐')
  const strSuite: BenchmarkSuite = {
    name: '字符串操作',
    results: benchmarkStringOperations(),
    timestamp,
  }
  for (const r of strSuite.results) {
    console.log(`  │ ${r.name.padEnd(30)} ${formatDuration(r.avgMs).padStart(12)} avg`)
  }
  console.log('  └──────────────────────────────────────────────┘')
  suites.push(strSuite)

  // 3. 数组操作
  console.log('  ┌─ 数组操作 ───────────────────────────────────┐')
  const arrSuite: BenchmarkSuite = {
    name: '数组操作',
    results: benchmarkArrayOperations(),
    timestamp,
  }
  for (const r of arrSuite.results) {
    console.log(`  │ ${r.name.padEnd(30)} ${formatDuration(r.avgMs).padStart(12)} avg`)
  }
  console.log('  └──────────────────────────────────────────────┘')
  suites.push(arrSuite)

  // 4. 存储模拟
  console.log('  ┌─ 存储性能 ───────────────────────────────────┐')
  const storageSuite: BenchmarkSuite = {
    name: '存储性能',
    results: benchmarkStorage(),
    timestamp,
  }
  for (const r of storageSuite.results) {
    console.log(`  │ ${r.name.padEnd(30)} ${formatDuration(r.avgMs).padStart(12)} avg`)
  }
  console.log('  └──────────────────────────────────────────────┘')
  suites.push(storageSuite)

  // 5. 房间图操作
  console.log('  ┌─ 房间图操作 ─────────────────────────────────┐')
  const roomSuite: BenchmarkSuite = {
    name: '房间图操作',
    results: benchmarkRoomGraph(),
    timestamp,
  }
  for (const r of roomSuite.results) {
    console.log(`  │ ${r.name.padEnd(30)} ${formatDuration(r.avgMs).padStart(12)} avg`)
  }
  console.log('  └──────────────────────────────────────────────┘')
  suites.push(roomSuite)

  // 汇总
  console.log('')
  console.log('  ┌─ 汇总 ───────────────────────────────────────┐')
  let totalTests = 0
  let totalDuration = 0
  for (const suite of suites) {
    const suiteDuration = suite.results.reduce((s, r) => s + r.durationMs, 0)
    totalTests += suite.results.length
    totalDuration += suiteDuration
    console.log(`  │ ${suite.name.padEnd(16)} ${suite.results.length.toString().padStart(3)} 项    ${formatDuration(suiteDuration).padStart(10)}`)
  }
  console.log('  │')
  console.log(`  │ 总计: ${totalTests} 项基准测试, 总耗时 ${formatDuration(totalDuration)}`)
  console.log('  └──────────────────────────────────────────────┘')

  // 保存基线
  const baseline = {
    generatedAt: timestamp,
    environment: {
      node: process.version,
      platform: process.platform,
    },
    suites,
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2), 'utf-8')
  console.log(`\n  ✓ 基线已保存至: ${BASELINE_PATH}`)

  // 与之前的基线对比
  console.log('')
  if (existsSync(BASELINE_PATH)) {
    // 读取之前的基线（如果有历史版本）
    const prevBaselinePath = BASELINE_PATH.replace('.json', '_prev.json')
    if (existsSync(prevBaselinePath)) {
      try {
        const prev = JSON.parse(readFileSync(prevBaselinePath, 'utf-8'))
        console.log('  ┌─ 与历史基线对比 ─────────────────────────────┐')
        for (const suite of suites) {
          const prevSuite = prev.suites.find((s: any) => s.name === suite.name)
          if (!prevSuite) continue
          for (const r of suite.results) {
            const prevResult = prevSuite.results.find((pr: any) => pr.name === r.name)
            if (!prevResult) continue
            const diff = r.avgMs - prevResult.avgMs
            const pct = prevResult.avgMs > 0 ? ((diff / prevResult.avgMs) * 100).toFixed(1) : 'N/A'
            const sign = diff > 0 ? '+' : ''
            if (Math.abs(diff) > 0.01) {
              console.log(`  │ ${r.name.padEnd(30)} ${sign}${diff.toFixed(2)}ms (${sign}${pct}%)`)
            }
          }
        }
        console.log('  └──────────────────────────────────────────────┘')
      } catch { /* 忽略解析错误 */ }
    }
    // 将当前基线保存为历史
    writeFileSync(prevBaselinePath, JSON.stringify(baseline, null, 2), 'utf-8')
  }

  console.log('')
}

main().catch(console.error)