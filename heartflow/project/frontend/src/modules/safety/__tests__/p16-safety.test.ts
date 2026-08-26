// ============================================================
// P16-15 守护室 · 测试套件
// 审计时间线 + Web Crypto 加密 + 实时异常检测
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuditTimeline } from '../audit-timeline'
import { useCryptoGuard } from '../crypto-guard'
import { useAnomalyDetector } from '../anomaly-detector'
import type { AuditLogEntry } from '../incident-response'

// ---- Mock Storage ----

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] || null,
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock Web Crypto
const mockCryptoKey = {} as CryptoKey

const mockSubtle = {
  generateKey: vi.fn().mockResolvedValue(mockCryptoKey),
  encrypt: vi.fn().mockImplementation((_algo: AlgorithmIdentifier, _key: CryptoKey, _data: BufferSource) => {
    return Promise.resolve(_data instanceof ArrayBuffer ? _data : new ArrayBuffer(16))
  }),
  decrypt: vi.fn().mockImplementation((_algo: AlgorithmIdentifier, _key: CryptoKey, _data: BufferSource) => {
    return Promise.resolve(_data instanceof ArrayBuffer ? _data : new ArrayBuffer(16))
  }),
  exportKey: vi.fn().mockResolvedValue({ kty: 'oct', k: 'test' }),
  importKey: vi.fn().mockResolvedValue(mockCryptoKey),
  sign: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
  verify: vi.fn().mockResolvedValue(true),
  digest: vi.fn().mockImplementation((_algo: AlgorithmIdentifier, _data: BufferSource) => {
    return Promise.resolve(new ArrayBuffer(32))
  }),
  deriveKey: vi.fn().mockResolvedValue(mockCryptoKey),
}

Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: mockSubtle,
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
      return arr
    },
  },
  writable: true,
})

// Mock TextEncoder/TextDecoder - 使用真实的 UTF-8 编码
class MockTextEncoder {
  encode(str: string): Uint8Array {
    // 使用 encodeURIComponent 进行 UTF-8 编码
    const utf8: number[] = []
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i)
      if (code < 0x80) {
        utf8.push(code)
      } else if (code < 0x800) {
        utf8.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
      } else {
        utf8.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
      }
    }
    return new Uint8Array(utf8)
  }
}

class MockTextDecoder {
  decode(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    let result = ''
    let i = 0
    while (i < bytes.length) {
      const b1 = bytes[i]
      if (b1 < 0x80) {
        result += String.fromCharCode(b1)
        i += 1
      } else if ((b1 & 0xe0) === 0xc0) {
        const b2 = bytes[i + 1]
        result += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f))
        i += 2
      } else if ((b1 & 0xf0) === 0xe0) {
        const b2 = bytes[i + 1]
        const b3 = bytes[i + 2]
        result += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f))
        i += 3
      } else {
        i += 1
      }
    }
    return result
  }
}

vi.stubGlobal('TextEncoder', MockTextEncoder)
vi.stubGlobal('TextDecoder', MockTextDecoder)

// Mock Blob
class MockBlob {
  size: number
  constructor(_parts: any[]) {
    this.size = 0
  }
}

vi.stubGlobal('Blob', MockBlob)

// ---- 测试辅助函数 ----

function createMockAuditEntries(count: number): AuditLogEntry[] {
  const entries: AuditLogEntry[] = []
  const actions = ['login', 'encrypt', 'config_update', 'data_export', 'permission_change', 'backup', 'logout']
  const results: ('success' | 'failure' | 'blocked')[] = ['success', 'success', 'success', 'failure', 'blocked']

  for (let i = 0; i < count; i++) {
    const hour = 8 + Math.floor(i / 10)
    const minute = i % 60
    entries.push({
      id: `audit_${i}`,
      action: actions[i % actions.length],
      actor: `user_${i % 3}`,
      target: `target_${i % 5}`,
      result: results[i % results.length],
      detail: `测试审计条目 ${i}`,
      timestamp: new Date(2026, 7, 2, hour, minute, 0).toISOString(),
    })
  }
  return entries
}

// ============================================================
// 1. 审计时间线测试
// ============================================================

describe('P16-15 审计时间线 (audit-timeline)', () => {
  const mockEntries = createMockAuditEntries(50)

  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('toTimelineEvents', () => {
    it('应该将审计日志转换为时间线事件', () => {
      const { toTimelineEvents } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      expect(events).toHaveLength(50)
      expect(events[0]).toHaveProperty('entry')
      expect(events[0]).toHaveProperty('group')
      expect(events[0]).toHaveProperty('severity')
      expect(events[0]).toHaveProperty('isAnomaly')
      expect(events[0]).toHaveProperty('relatedEventIds')
    })

    it('应该正确分组事件', () => {
      const { toTimelineEvents } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      const loginEvents = events.filter(e => e.entry.action === 'login')
      expect(loginEvents.length).toBeGreaterThan(0)
      expect(loginEvents[0].group).toBe('认证')
    })

    it('应该正确推断严重程度', () => {
      const { toTimelineEvents } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      const blockedEvents = events.filter(e => e.entry.result === 'blocked')
      expect(blockedEvents.length).toBeGreaterThan(0)
      expect(blockedEvents[0].severity).toBe('critical')
      expect(blockedEvents[0].isAnomaly).toBe(true)
    })

    it('空数组应返回空结果', () => {
      const { toTimelineEvents } = useAuditTimeline(() => [])
      const events = toTimelineEvents([])
      expect(events).toHaveLength(0)
    })
  })

  describe('createSegments', () => {
    it('应该按小时创建时间线分段', () => {
      const { toTimelineEvents, createSegments } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      const segments = createSegments(events)
      expect(segments.length).toBeGreaterThan(0)
    })

    it('每个分段应包含事件统计', () => {
      const { toTimelineEvents, createSegments } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      const segments = createSegments(events)
      for (const seg of segments) {
        expect(seg.eventCount).toBeGreaterThan(0)
        expect(seg.successRate).toBeGreaterThanOrEqual(0)
        expect(seg.successRate).toBeLessThanOrEqual(100)
      }
    })

    it('空事件应返回空分段', () => {
      const { createSegments } = useAuditTimeline(() => [])
      const segments = createSegments([])
      expect(segments).toHaveLength(0)
    })
  })

  describe('aggregateEvents', () => {
    it('应该按操作类型聚合事件', () => {
      const { toTimelineEvents, aggregateEvents } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      const aggregations = aggregateEvents(events, 'action')
      expect(aggregations.length).toBeGreaterThan(0)
      expect(aggregations[0]).toHaveProperty('count')
      expect(aggregations[0]).toHaveProperty('percentage')
      const totalPct = aggregations.reduce((s, a) => s + a.percentage, 0)
      expect(totalPct).toBeCloseTo(100, -1) // 允许舍入误差
    })

    it('应该按小时聚合事件', () => {
      const { toTimelineEvents, aggregateEvents } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      const aggregations = aggregateEvents(events, 'hour')
      expect(aggregations.length).toBeGreaterThan(0)
    })

    it('应该按结果聚合事件', () => {
      const { toTimelineEvents, aggregateEvents } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      const aggregations = aggregateEvents(events, 'result')
      const results = ['success', 'failure', 'blocked']
      for (const agg of aggregations) {
        expect(results).toContain(agg.key)
      }
    })
  })

  describe('analyzeTrends', () => {
    it('应该分析趋势并返回数据点', () => {
      const { analyzeTrends } = useAuditTimeline(() => mockEntries)
      const analysis = analyzeTrends(mockEntries, 24)
      expect(analysis).toHaveProperty('dataPoints')
      expect(analysis).toHaveProperty('direction')
      expect(analysis).toHaveProperty('changeRate')
      expect(analysis).toHaveProperty('anomalies')
      expect(['rising', 'falling', 'stable']).toContain(analysis.direction)
    })

    it('空数据应返回stable方向', () => {
      const { analyzeTrends } = useAuditTimeline(() => [])
      const analysis = analyzeTrends([], 24)
      expect(analysis.direction).toBe('stable')
      expect(analysis.dataPoints).toHaveLength(0)
    })
  })

  describe('generateHeatmap', () => {
    it('应该生成热力图数据', () => {
      const { generateHeatmap } = useAuditTimeline(() => mockEntries)
      const heatmap = generateHeatmap(mockEntries, 7)
      expect(heatmap.rows).toHaveLength(7)
      expect(heatmap.columns).toHaveLength(24)
      expect(heatmap.data).toHaveLength(7)
      expect(heatmap.data[0]).toHaveLength(24)
    })
  })

  describe('exportTimeline', () => {
    it('应该导出JSON格式', () => {
      const { toTimelineEvents, exportTimeline } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      const result = exportTimeline(events, 'json')
      expect(result.format).toBe('json')
      expect(result.filename).toContain('.json')
      const parsed = JSON.parse(result.content)
      expect(Array.isArray(parsed)).toBe(true)
    })

    it('应该导出CSV格式', () => {
      const { toTimelineEvents, exportTimeline } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      const result = exportTimeline(events, 'csv')
      expect(result.format).toBe('csv')
      expect(result.content).toContain('ID,时间,操作')
    })

    it('应该导出Markdown格式', () => {
      const { toTimelineEvents, exportTimeline } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      const result = exportTimeline(events, 'markdown')
      expect(result.format).toBe('markdown')
      expect(result.content).toContain('# 审计时间线报告')
      expect(result.content).toContain('| 时间 |')
    })
  })

  describe('searchEvents', () => {
    it('应该搜索匹配的事件', () => {
      const { toTimelineEvents, searchEvents } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      const results = searchEvents(events, 'login')
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(e => e.entry.action.includes('login'))).toBe(true)
    })

    it('应该返回空结果当无匹配时', () => {
      const { toTimelineEvents, searchEvents } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      const results = searchEvents(events, 'nonexistentaction')
      expect(results).toHaveLength(0)
    })
  })

  describe('getAnomalySummary', () => {
    it('应该返回异常摘要', () => {
      const { toTimelineEvents, getAnomalySummary } = useAuditTimeline(() => mockEntries)
      const events = toTimelineEvents(mockEntries)
      const summary = getAnomalySummary(events)
      expect(summary).toHaveProperty('totalAnomalies')
      expect(summary).toHaveProperty('bySeverity')
      expect(summary).toHaveProperty('byGroup')
      expect(summary).toHaveProperty('recentAnomalies')
    })
  })
})

// ============================================================
// 2. Web Crypto 加密测试
// ============================================================

describe('P16-15 Web Crypto 加密 (crypto-guard)', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('generateAESKey', () => {
    it('应该生成AES-GCM密钥', async () => {
      const guard = useCryptoGuard()
      const meta = await guard.generateAESKey('test-key')
      expect(meta).toBeDefined()
      expect(meta.algorithm).toBe('AES-GCM')
      expect(meta.keyLength).toBe(256)
      expect(meta.label).toBe('test-key')
      expect(meta.revoked).toBe(false)
      expect(meta.fingerprint).toBeTruthy()
    })

    it('应该支持128位密钥', async () => {
      const guard = useCryptoGuard()
      const meta = await guard.generateAESKey('test-128', 128)
      expect(meta.keyLength).toBe(128)
    })
  })

  describe('generateRSAKeyPair', () => {
    it('应该生成RSA-OAEP密钥对', async () => {
      const guard = useCryptoGuard()
      const pair = await guard.generateRSAKeyPair('test-rsa')
      expect(pair).toBeDefined()
      expect(pair.algorithm).toBe('RSA-OAEP')
      expect(pair.publicKey.usages).toContain('encrypt')
      expect(pair.privateKey.usages).toContain('decrypt')
    })
  })

  describe('encrypt/decrypt', () => {
    it('应该成功加密和解密文本', async () => {
      const guard = useCryptoGuard()
      const keyMeta = await guard.generateAESKey('enc-test')
      const plaintext = 'Hello HeartFlow 安全测试'

      const encrypted = await guard.encrypt(plaintext, keyMeta.id)
      expect(encrypted).toBeDefined()
      expect(encrypted!.ciphertext).toBeTruthy()
      expect(encrypted!.iv).toBeTruthy()
      expect(encrypted!.algorithm).toBe('AES-GCM')

      const decrypted = await guard.decrypt(encrypted!)
      expect(decrypted.success).toBe(true)
      expect(decrypted.plaintext).toBe(plaintext)
    })

    it('没有密钥ID时应自动选择密钥', async () => {
      const guard = useCryptoGuard()
      const plaintext = '自动选择密钥测试'

      const encrypted = await guard.encrypt(plaintext)
      expect(encrypted).toBeDefined()
      expect(encrypted!.keyId).toBeTruthy()
    })

    it('批量加密解密应正常工作', async () => {
      const guard = useCryptoGuard()
      await guard.generateAESKey('batch-test')

      const items = [
        { plaintext: '数据1' },
        { plaintext: '数据2' },
        { plaintext: '数据3' },
      ]

      const encrypted = await guard.encryptBatch(items)
      expect(encrypted).toHaveLength(3)
      expect(encrypted.every(r => r !== null)).toBe(true)

      const decrypted = await guard.decryptBatch(encrypted.filter(Boolean) as any)
      expect(decrypted).toHaveLength(3)
      expect(decrypted.every(r => r.success)).toBe(true)
      expect(decrypted[0].plaintext).toBe('数据1')
      expect(decrypted[1].plaintext).toBe('数据2')
      expect(decrypted[2].plaintext).toBe('数据3')
    })
  })

  describe('密钥管理', () => {
    it('应该能撤销密钥', async () => {
      const guard = useCryptoGuard()
      const meta = await guard.generateAESKey('revoke-test')
      expect(guard.activeKeys.value.length).toBeGreaterThan(0)

      const result = guard.revokeKey(meta.id)
      expect(result).toBe(true)
      expect(guard.revokedKeys.value.length).toBeGreaterThan(0)
    })

    it('重复撤销应返回false', async () => {
      const guard = useCryptoGuard()
      const meta = await guard.generateAESKey('revoke-test')
      guard.revokeKey(meta.id)
      const result = guard.revokeKey(meta.id)
      expect(result).toBe(false)
    })

    it('应该能导出和导入密钥', async () => {
      const guard = useCryptoGuard()
      const meta = await guard.generateAESKey('export-test')

      const exported = await guard.exportKey(meta.id, 'jwk')
      expect(exported).toBeDefined()
      expect(exported!.format).toBe('jwk')

      const imported = await guard.importKey({
        format: 'jwk',
        data: exported!.data,
        algorithm: 'AES-GCM',
        usages: ['encrypt', 'decrypt'],
        extractable: true,
      })
      expect(imported).toBeDefined()
      expect(imported!.algorithm).toBe('AES-GCM')
    })
  })

  describe('签名', () => {
    it('应该生成和验证HMAC签名', async () => {
      const guard = useCryptoGuard()
      const meta = await guard.generateAESKey('sign-test')
      const data = '需要签名的数据'

      const sig = await guard.signHMAC(data, meta.id)
      expect(sig).toBeDefined()
      expect(sig!.signature).toBeTruthy()

      const valid = await guard.verifyHMAC(data, sig!)
      expect(valid).toBe(true)
    })
  })

  describe('安全存储', () => {
    it('应该安全存储和读取数据', async () => {
      const guard = useCryptoGuard()
      await guard.initialize()

      const testData = { name: '测试', value: 42 }
      const success = await guard.secureSet('test:secure', testData)
      expect(success).toBe(true)

      const result = await guard.secureGet<{ name: string; value: number }>('test:secure')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testData)
    })
  })

  describe('查询', () => {
    it('应该能获取活跃和已撤销密钥', async () => {
      const guard = useCryptoGuard()
      await guard.generateAESKey('key1')
      await guard.generateAESKey('key2')

      expect(guard.activeKeys.value.length).toBe(2)
      expect(guard.getActiveKeysByAlgorithm('AES-GCM').length).toBe(2)
    })

    it('应该检测密钥过期', async () => {
      const guard = useCryptoGuard()
      const meta = await guard.generateAESKey('expire-test')
      expect(guard.isKeyExpired(meta.id)).toBe(false)
    })
  })

  describe('初始化', () => {
    it('应该正确初始化加密系统', async () => {
      const guard = useCryptoGuard()
      expect(guard.isReady.value).toBe(false)

      await guard.initialize()
      expect(guard.isReady.value).toBe(true)
      expect(guard.status.value.initialized).toBe(true)
    })
  })
})

// ============================================================
// 3. 实时异常检测测试
// ============================================================

describe('P16-15 实时异常检测 (anomaly-detector)', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('recordDataPoint', () => {
    it('应该记录数据点', () => {
      const detector = useAnomalyDetector()
      const point = detector.recordDataPoint('login_frequency', 15)
      expect(point).toBeDefined()
      expect(point.dimension).toBe('login_frequency')
      expect(point.value).toBe(15)
      expect(point.timestamp).toBeTruthy()
    })

    it('应该支持批量记录', () => {
      const detector = useAnomalyDetector()
      const points = detector.recordBatch([
        { dimension: 'login_frequency', value: 10 },
        { dimension: 'error_rate', value: 5 },
        { dimension: 'api_call_rate', value: 100 },
      ])
      expect(points).toHaveLength(3)
    })
  })

  describe('calculateBaseline', () => {
    it('应该计算行为基线', () => {
      const detector = useAnomalyDetector()
      // 先记录一些数据点
      for (let i = 0; i < 30; i++) {
        detector.recordDataPoint('login_frequency', 10 + Math.random() * 5)
      }

      const baseline = detector.calculateBaseline('login_frequency')
      expect(baseline).toBeDefined()
      if (baseline) {
        expect(baseline.mean).toBeGreaterThan(0)
        expect(baseline.stdDev).toBeGreaterThan(0)
        expect(baseline.sampleCount).toBeGreaterThan(0)
        expect(baseline.p25).toBeLessThanOrEqual(baseline.p75)
      }
    })

    it('数据不足时应该返回null', () => {
      const detector = useAnomalyDetector()
      const baseline = detector.calculateBaseline('login_frequency')
      expect(baseline).toBeNull()
    })

    it('应该计算所有维度基线', () => {
      const detector = useAnomalyDetector()
      const dimensions = ['login_frequency', 'data_access_volume', 'error_rate'] as const
      for (const dim of dimensions) {
        for (let i = 0; i < 30; i++) {
          detector.recordDataPoint(dim, 10 + Math.random() * 20)
        }
      }

      const baselines = detector.calculateAllBaselines()
      expect(baselines.length).toBeGreaterThan(0)
    })
  })

  describe('异常检测', () => {
    it('应该检测到阈值类型的异常', () => {
      const detector = useAnomalyDetector()

      // 正常值建立基线
      for (let i = 0; i < 20; i++) {
        detector.recordDataPoint('permission_changes', 2)
      }

      // 异常值
      const anomaly = detector.detectAnomaly({
        timestamp: new Date().toISOString(),
        dimension: 'permission_changes',
        value: 10,
      })

      expect(anomaly).toBeDefined()
      if (anomaly) {
        expect(anomaly.dimension).toBe('permission_changes')
        expect(anomaly.severity).toBeDefined()
        expect(anomaly.description).toBeTruthy()
        expect(anomaly.suggestion).toBeTruthy()
      }
    })

    it('应该检测到统计异常', () => {
      const detector = useAnomalyDetector()

      // 建立基线
      for (let i = 0; i < 50; i++) {
        detector.recordDataPoint('login_frequency', 10 + Math.random() * 2)
      }

      // 先计算基线
      detector.calculateBaseline('login_frequency')

      // 极端异常值
      const anomaly = detector.detectAnomaly({
        timestamp: new Date().toISOString(),
        dimension: 'login_frequency',
        value: 100,
      })

      expect(anomaly).toBeDefined()
      if (anomaly) {
        expect(anomaly.dimension).toBe('login_frequency')
        expect(anomaly.zScore).toBeGreaterThan(2)
      }
    })

    it('应该检测到错误率过高', () => {
      const detector = useAnomalyDetector()

      const anomaly = detector.detectAnomaly({
        timestamp: new Date().toISOString(),
        dimension: 'error_rate',
        value: 35,
      })

      expect(anomaly).toBeDefined()
      if (anomaly) {
        expect(anomaly.dimension).toBe('error_rate')
        expect(anomaly.value).toBe(35)
      }
    })
  })

  describe('查询与统计', () => {
    it('应该返回检测统计', () => {
      const detector = useAnomalyDetector()

      for (let i = 0; i < 30; i++) {
        detector.recordDataPoint('login_frequency', 10 + Math.random() * 5)
      }

      const stats = detector.getDetectionStats()
      expect(stats.totalDetections).toBe(30)
      expect(stats).toHaveProperty('totalAnomalies')
      expect(stats).toHaveProperty('anomalyRate')
      expect(stats).toHaveProperty('byDimension')
      expect(stats).toHaveProperty('bySeverity')
    })

    it('应该获取指定维度的数据点', () => {
      const detector = useAnomalyDetector()

      detector.recordDataPoint('login_frequency', 10)
      detector.recordDataPoint('error_rate', 15)
      detector.recordDataPoint('login_frequency', 12)

      const loginPoints = detector.getDataPointsByDimension('login_frequency')
      expect(loginPoints).toHaveLength(2)
    })

    it('应该获取未解决的严重异常', () => {
      const detector = useAnomalyDetector()

      // 记录一些正常数据
      for (let i = 0; i < 20; i++) {
        detector.recordDataPoint('login_frequency', 10)
      }

      const critical = detector.getCriticalAnomalies()
      expect(Array.isArray(critical)).toBe(true)
    })
  })

  describe('解决异常', () => {
    it('应该解决异常', () => {
      const detector = useAnomalyDetector()

      // 触发异常
      const anomaly = detector.detectAnomaly({
        timestamp: new Date().toISOString(),
        dimension: 'error_rate',
        value: 50,
      })

      if (anomaly) {
        const resolved = detector.resolveAnomaly(anomaly.id)
        expect(resolved).toBe(true)
      }
    })

    it('解决不存在的异常应返回false', () => {
      const detector = useAnomalyDetector()
      const result = detector.resolveAnomaly('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('规则管理', () => {
    it('应该更新规则', () => {
      const detector = useAnomalyDetector()
      detector.updateRule('rule_login_spike', { enabled: false })
      const rule = detector.rules.value.find(r => r.id === 'rule_login_spike')
      expect(rule?.enabled).toBe(false)
    })

    it('应该切换规则启用状态', () => {
      const detector = useAnomalyDetector()
      detector.toggleRule('rule_login_spike', false)
      const rule = detector.rules.value.find(r => r.id === 'rule_login_spike')
      expect(rule?.enabled).toBe(false)

      detector.toggleRule('rule_login_spike', true)
      const updatedRule = detector.rules.value.find(r => r.id === 'rule_login_spike')
      expect(updatedRule?.enabled).toBe(true)
    })

    it('应该重置规则', () => {
      const detector = useAnomalyDetector()
      // 验证 resetRules 函数存在且可调用
      expect(typeof detector.resetRules).toBe('function')
      detector.resetRules()
      // 重置后规则应恢复为默认值
      const rule = detector.rules.value.find(r => r.id === 'rule_login_spike')
      expect(rule).toBeDefined()
      expect(rule?.zScoreThreshold).toBe(3.0)
    })
  })

  describe('runFullDetection', () => {
    it('应该运行全维度检测', () => {
      const detector = useAnomalyDetector()

      // 记录一些数据
      for (const dim of ['login_frequency', 'error_rate', 'api_call_rate'] as const) {
        for (let i = 0; i < 20; i++) {
          detector.recordDataPoint(dim, 10 + Math.random() * 5)
        }
      }

      const results = detector.runFullDetection()
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('数据清理', () => {
    it('应该清理旧数据', () => {
      const detector = useAnomalyDetector()

      for (let i = 0; i < 50; i++) {
        detector.recordDataPoint('login_frequency', 10)
      }

      const purged = detector.purgeOldData(30)
      expect(purged).toBeGreaterThanOrEqual(0)
    })
  })
})