import { describe, it, expect, beforeEach, vi } from 'vitest'
import { recognizeEntities, entityTypesOf, useTextSense, CLIP_HISTORY_CAP, ENTITY_TYPE_META } from '../index'

// ---- 实体速识 ----

describe('recognizeEntities', () => {
  it('识别链接', () => {
    const es = recognizeEntities('文档见 https://example.com/a?b=1 欢迎')
    expect(es).toHaveLength(1)
    expect(es[0].type).toBe('url')
    expect(es[0].value).toBe('https://example.com/a?b=1')
  })

  it('识别邮箱', () => {
    const es = recognizeEntities('联系 me@mail.com 或 you@x.cn')
    expect(es).toHaveLength(2)
    expect(es.every(e => e.type === 'email')).toBe(true)
  })

  it('识别手机号', () => {
    const es = recognizeEntities('电话 13812345678')
    expect(es).toHaveLength(1)
    expect(es[0].type).toBe('phone')
    expect(es[0].value).toBe('13812345678')
  })

  it('识别快递单号（带公司前缀）', () => {
    const es = recognizeEntities('顺丰 SF123456789012')
    expect(es.some(e => e.type === 'express' && e.value === 'SF123456789012')).toBe(true)
  })

  it('识别航班号（含空格分隔）', () => {
    const es = recognizeEntities('乘坐 CA 1234 次航班')
    expect(es.some(e => e.type === 'flight')).toBe(true)
  })

  it('识别身份证号', () => {
    const es = recognizeEntities('证件 110101199001011234')
    expect(es.some(e => e.type === 'idcard')).toBe(true)
  })

  it('识别金额', () => {
    const es = recognizeEntities('需 ¥128.5 或 99元')
    expect(es.some(e => e.type === 'amount' && e.value.includes('128.5'))).toBe(true)
    expect(es.some(e => e.type === 'amount' && e.value.includes('99元'))).toBe(true)
  })

  it('识别日期', () => {
    const es = recognizeEntities('截止 2026-08-21 前')
    expect(es.some(e => e.type === 'date')).toBe(true)
  })

  it('重叠匹配去重取长', () => {
    const es = recognizeEntities('身份证 110101199001011234')
    const spans = es.map(e => ({ start: e.start, end: e.end }))
    for (let i = 0; i < spans.length - 1; i++) {
      expect(spans[i].end).toBeLessThanOrEqual(spans[i + 1].start)
    }
    expect(es.some(e => e.type === 'idcard')).toBe(true)
  })

  it('空文本返回空数组', () => {
    expect(recognizeEntities('')).toEqual([])
    expect(recognizeEntities('   ')).toEqual([])
  })
})

describe('entityTypesOf / meta', () => {
  it('返回去重实体类型集合', () => {
    const types = entityTypesOf('z@mail.com 13812345678 z@mail.com')
    expect(types).toEqual(['email', 'phone'])
  })

  it('所有实体类型都有元数据', () => {
    const used = new Set<string>()
    for (const k of Object.keys(ENTITY_TYPE_META)) {
      used.add(k)
    }
    expect(used.size).toBeGreaterThanOrEqual(9)
  })
})

// ---- 剪贴板历史 ----

const kv = new Map<string, unknown>()
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, defaultValue: T): T => (kv.has(key) ? (kv.get(key) as T) : defaultValue),
    setKV: (key: string, value: unknown) => kv.set(key, value),
  },
}))

beforeEach(() => kv.clear())

describe('useTextSense', () => {
  it('新增剪贴板条目并识别实体', () => {
    const p = useTextSense()
    p.addClip('订单 https://a.com/123，电话 13812345678')
    expect(p.clips.value).toHaveLength(1)
    expect(p.clips.value[0].entityTypes).toContain('url')
    expect(p.clips.value[0].entityTypes).toContain('phone')
  })

  it('重复文本去重置顶', () => {
    const p = useTextSense()
    p.addClip('第一条')
    p.addClip('第二条')
    p.addClip('第一条')
    expect(p.clips.value).toHaveLength(2)
    expect(p.clips.value[0].text).toBe('第一条')
  })

  it('上限截断', () => {
    const p = useTextSense()
    for (let i = 0; i < CLIP_HISTORY_CAP + 5; i++) {
      p.addClip(`第${i}条`)
    }
    expect(p.clips.value).toHaveLength(CLIP_HISTORY_CAP)
    expect(p.clips.value[0].text).toBe(`第${CLIP_HISTORY_CAP + 4}条`)
  })

  it('移除与清空', () => {
    const p = useTextSense()
    const a = p.addClip('A')
    p.addClip('B')
    p.removeClip(a.id)
    expect(p.clips.value.map(c => c.text)).toEqual(['B'])
    p.clearClips()
    expect(p.clips.value).toEqual([])
  })

  it('空文本不新增', () => {
    const p = useTextSense()
    expect(() => p.addClip('   ')).toThrow()
    expect(p.clips.value).toEqual([])
  })
})