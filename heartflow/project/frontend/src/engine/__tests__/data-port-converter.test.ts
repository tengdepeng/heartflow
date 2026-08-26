// ============================================================
// data-port-converter 转换器注册表测试
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerConverter,
  unregisterConverter,
  getConverters,
  findConverterForInput,
  findConverterForOutput,
  initBuiltinConverters,
  jsonConverter,
  markdownConverter,
  csvConverter,
  htmlConverter,
  txtConverter,
} from '../data-port-converter'

describe('data-port-converter', () => {
  beforeEach(() => {
    // 重置注册表：先注销所有，再重新注册内置
    for (const c of getConverters()) {
      unregisterConverter(c.id)
    }
  })

  describe('注册表管理', () => {
    it('初始注册表为空', () => {
      expect(getConverters()).toEqual([])
    })

    it('registerConverter 注册一个转换器', () => {
      registerConverter(jsonConverter)
      expect(getConverters()).toHaveLength(1)
      expect(getConverters()[0].id).toBe('builtin-json')
    })

    it('unregisterConverter 注销转换器', () => {
      registerConverter(jsonConverter)
      registerConverter(csvConverter)
      unregisterConverter('builtin-json')
      expect(getConverters()).toHaveLength(1)
      expect(getConverters()[0].id).toBe('builtin-csv')
    })

    it('unregisterConverter 对不存在的 id 不报错', () => {
      unregisterConverter('nonexistent')
      expect(getConverters()).toEqual([])
    })
  })

  describe('findConverterForInput', () => {
    it('按输入格式查找', () => {
      registerConverter(jsonConverter)
      registerConverter(csvConverter)
      const found = findConverterForInput('json')
      expect(found).toHaveLength(1)
      expect(found[0].id).toBe('builtin-json')
    })

    it('查找不存在的格式返回空数组', () => {
      registerConverter(jsonConverter)
      expect(findConverterForInput('xml')).toEqual([])
    })
  })

  describe('findConverterForOutput', () => {
    it('按输出格式查找', () => {
      registerConverter(jsonConverter)
      registerConverter(markdownConverter)
      const found = findConverterForOutput('markdown')
      expect(found).toHaveLength(1)
      expect(found[0].id).toBe('builtin-markdown')
    })
  })

  describe('initBuiltinConverters', () => {
    it('初始化所有内置转换器', () => {
      initBuiltinConverters()
      expect(getConverters()).toHaveLength(5)
      const ids = getConverters().map(c => c.id).sort()
      expect(ids).toEqual(['builtin-csv', 'builtin-html', 'builtin-json', 'builtin-markdown', 'builtin-txt'])
    })
  })

  describe('jsonConverter', () => {
    it('toPayload 解析有效 JSON', () => {
      const data = JSON.stringify({ sessions: [{ id: 's1', elapsed: 60000, mode: 'focus', status: 'completed', plannedDuration: 1500000, pausedDuration: 0, pausedAt: null, startedAt: null, completedAt: '2026-01-01T00:00:00Z', tags: [], note: '', carrierId: null }] })
      const result = jsonConverter.toPayload(data, 'json')
      expect(result).not.toBeNull()
      expect(result!.sessions).toHaveLength(1)
    })

    it('toPayload 解析无效 JSON 返回 null', () => {
      const result = jsonConverter.toPayload('not valid json', 'json')
      expect(result).toBeNull()
    })

    it('fromPayload 返回格式化 JSON', () => {
      const payload = { sessions: [{ id: 's1', elapsed: 60000, mode: 'focus', status: 'completed', plannedDuration: 1500000, pausedDuration: 0, pausedAt: null, startedAt: null, completedAt: '2026-01-01T00:00:00Z', tags: [], note: '', carrierId: null }] }
      const result = jsonConverter.fromPayload(payload as any, 'json')
      expect(result).toContain('s1')
      expect(result).toContain('60000')
    })
  })

  describe('csvConverter', () => {
    it('fromPayload 生成 CSV 字符串', () => {
      const payload = {
        sessions: [{ id: 's1', elapsed: 60000, mode: 'focus', status: 'completed', plannedDuration: 1500000, pausedDuration: 0, pausedAt: null, startedAt: null, completedAt: '2026-01-01T00:00:00Z', tags: ['tag1'], note: '', carrierId: null }],
        notes: [{ id: 'n1', title: '测试笔记', content: '内容', tags: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }],
      }
      const result = csvConverter.fromPayload(payload as any, 'csv')
      expect(result).toContain('=== sessions ===')
      expect(result).toContain('=== notes ===')
      expect(result).toContain('s1')
      expect(result).toContain('测试笔记')
    })

    it('toPayload 解析 CSV 字符串', () => {
      const csv = `=== sessions ===
id,startedAt,completedAt,elapsed(ms),mode,status,tags
s1,,2026-01-01T00:00:00Z,60000,focus,completed,tag1
=== notes ===
id,title,content,createdAt
n1,测试笔记,内容,2026-01-01T00:00:00Z`
      const result = csvConverter.toPayload(csv, 'csv')
      expect(result).not.toBeNull()
      expect(result!.sessions).toHaveLength(1)
      expect(result!.notes).toHaveLength(1)
      expect(result!.sessions![0].id).toBe('s1')
      expect(result!.notes![0].title).toBe('测试笔记')
    })

    it('toPayload 解析空 CSV 返回 null', () => {
      const result = csvConverter.toPayload('', 'csv')
      expect(result).toBeNull()
    })
  })

  describe('markdownConverter', () => {
    it('fromPayload 生成 Markdown 字符串', () => {
      const payload = {
        sessions: [{ id: 's1', elapsed: 60000, mode: 'focus', status: 'completed', plannedDuration: 1500000, pausedDuration: 0, pausedAt: null, startedAt: null, completedAt: '2026-01-01T00:00:00Z', tags: ['tag1'], note: '', carrierId: null }],
        notes: [{ id: 'n1', title: '测试笔记', content: '内容', tags: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }],
      }
      const result = markdownConverter.fromPayload(payload as any, 'markdown')
      expect(result).toContain('# 心流工坊')
      expect(result).toContain('测试笔记')
      expect(result).toContain('```json')
    })

    it('toPayload 解析 Markdown 中的 JSON 块', () => {
      const md = `# 心流工坊

## 专注记录

- **2026-01-01** · 1分钟

\`\`\`json
{"sessions":[{"id":"s1","elapsed":60000,"mode":"focus","status":"completed","plannedDuration":1500000,"pausedDuration":0,"pausedAt":null,"startedAt":null,"completedAt":"2026-01-01T00:00:00Z","tags":[],"note":"","carrierId":null}]}
\`\`\``
      const result = markdownConverter.toPayload(md, 'markdown')
      expect(result).not.toBeNull()
      expect(result!.sessions).toHaveLength(1)
      expect(result!.sessions![0].id).toBe('s1')
    })

    it('toPayload 解析无 JSON 块的 Markdown 返回 null', () => {
      const result = markdownConverter.toPayload('# 普通 Markdown', 'markdown')
      expect(result).toBeNull()
    })
  })

  describe('htmlConverter', () => {
    it('toPayload 始终返回 null', async () => {
      expect(htmlConverter.toPayload('anything', 'html')).toBeNull()
    })

    it('fromPayload 生成完整 HTML 报告', () => {
      const payload = {
        sessions: [{ id: 's1', elapsed: 60000, mode: 'focus', status: 'completed', plannedDuration: 1500000, pausedDuration: 0, pausedAt: null, startedAt: null, completedAt: '2026-01-01T00:00:00Z', tags: [], note: '', carrierId: null }],
        emotions: [{ id: 'e1', type: 'joy', intensity: 0.8, note: '', createdAt: '2026-01-01T00:00:00Z' }],
      }
      const result = htmlConverter.fromPayload(payload as any, 'html')
      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('心流工坊')
      expect(result).toContain('1 分钟')
    })
  })

  describe('txtConverter', () => {
    it('fromPayload 生成纯文本', () => {
      const payload = {
        sessions: [{ id: 's1', elapsed: 60000, mode: 'focus', status: 'completed', plannedDuration: 1500000, pausedDuration: 0, pausedAt: null, startedAt: null, completedAt: '2026-01-01T00:00:00Z', tags: ['tag1'], note: '', carrierId: null }],
      }
      const result = txtConverter.fromPayload(payload as any, 'txt')
      expect(result).toContain('心流工坊')
      expect(result).toContain('1分钟')
      expect(result).toContain('--- DATA ---')
    })

    it('toPayload 解析文本中的 DATA 块', () => {
      const text = `= 心流工坊 =

--- DATA ---
{"sessions":[{"id":"s1","elapsed":60000,"mode":"focus","status":"completed","plannedDuration":1500000,"pausedDuration":0,"pausedAt":null,"startedAt":null,"completedAt":"2026-01-01T00:00:00Z","tags":[],"note":"","carrierId":null}]}
--- END ---`
      const result = txtConverter.toPayload(text, 'txt')
      expect(result).not.toBeNull()
      expect(result!.sessions).toHaveLength(1)
    })

    it('toPayload 解析无 DATA 块的文本返回 null', () => {
      const result = txtConverter.toPayload('普通文本', 'txt')
      expect(result).toBeNull()
    })
  })

  describe('csvConverter', () => {
    const sessionData = [{ id: 's1', elapsed: 60000, mode: 'focus', status: 'completed', plannedDuration: 1500000, pausedDuration: 0, pausedAt: null, startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T01:00:00Z', tags: ['tag1'], note: 'test', carrierId: null }]

    it('fromPayload 生成 sessions 节', () => {
      const result = csvConverter.fromPayload({ sessions: sessionData as any }, 'csv')
      expect(result).toContain('=== sessions ===')
      expect(result).toContain('s1')
      expect(result).toContain('tag1')
    })

    it('fromPayload 生成 notes 节', () => {
      const result = csvConverter.fromPayload({ notes: [{ id: 'n1', title: '笔记', content: '内\\n容', createdAt: '2026-01-01T00:00:00Z' }] as any }, 'csv')
      expect(result).toContain('=== notes ===')
      expect(result).toContain('笔记')
    })

    it('fromPayload 生成 emotions 节', () => {
      const result = csvConverter.fromPayload({ emotions: [{ id: 'e1', type: 'joy', createdAt: '2026-01-01T00:00:00Z', note: '' }] as any }, 'csv')
      expect(result).toContain('=== emotions ===')
      expect(result).toContain('joy')
    })

    it('fromPayload 生成 crystals 节', () => {
      const result = csvConverter.fromPayload({ crystals: [{ id: 'c1', sessionId: 's1', createdAt: '2026-01-01T00:00:00Z' }] as any }, 'csv')
      expect(result).toContain('=== crystals ===')
    })

    it('fromPayload 生成 anchors 节', () => {
      const result = csvConverter.fromPayload({ anchors: [{ id: 'a1', text: '心锚', at: '2026-01-01' }] as any }, 'csv')
      expect(result).toContain('=== anchors ===')
    })

    it('fromPayload 生成 goals 节', () => {
      const result = csvConverter.fromPayload({ goals: [{ id: 'g1', title: '目标' }] as any }, 'csv')
      expect(result).toContain('=== goals ===')
    })

    it('toPayload 解析 CSV 中的 sessions', () => {
      const csv = '=== sessions ===\nid,startedAt,elapsed,mode,status,tags\ns1,2026-01-01,60000,focus,completed,tag1'
      const result = csvConverter.toPayload(csv, 'csv')
      expect(result).not.toBeNull()
      expect(result!.sessions).toHaveLength(1)
      expect(result!.sessions![0].id).toBe('s1')
    })

    it('toPayload 解析 CSV 中的 notes', () => {
      const csv = '=== notes ===\nid,title,content,createdAt\nn1,笔记,内容,2026-01-01'
      const result = csvConverter.toPayload(csv, 'csv')
      expect(result).not.toBeNull()
      expect(result!.notes).toHaveLength(1)
      expect(result!.notes![0].title).toBe('笔记')
    })

    it('toPayload 解析无标题 CSV 返回 null', () => {
      const result = csvConverter.toPayload('a,b,c\n1,2,3', 'csv')
      expect(result).toBeNull()
    })
  })

  describe('htmlConverter 完整数据', () => {
    it('fromPayload 包含所有数据域统计', () => {
      const payload = {
        sessions: [{ id: 's1', elapsed: 60000, mode: 'focus', status: 'completed', plannedDuration: 1500000, pausedDuration: 0, pausedAt: null, startedAt: null, completedAt: '2026-01-01T00:00:00Z', tags: [], note: '', carrierId: null }],
        notes: [{ id: 'n1', title: '笔记', content: '内容', tags: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }],
        crystals: [{ id: 'c1', sessionId: 's1', color: '#fff', intensity: 1, createdAt: '2026-01-01T00:00:00Z', shape: 'sphere', tags: [], insight: null }],
        emotions: [{ id: 'e1', type: 'joy', note: '', createdAt: '2026-01-01T00:00:00Z' }],
        anchors: [{ id: 'a1', text: '心锚', done: false, targetDate: '2026-01-01', createdAt: '2026-01-01T00:00:00Z', priority: 'must', driftCount: 0 }],
        goals: [{ id: 'g1', title: '目标', description: '', tier: 'target', status: 'seed', domain: 'growth', order: 0, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', anchorCount: 0, anchorDone: 0 }],
      }
      const result = htmlConverter.fromPayload(payload as any, 'html')
      expect(result).toContain('1 分钟')
      expect(result).toContain('笔记')
      expect(result).toContain('joy')
    })
  })
})