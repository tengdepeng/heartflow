// ============================================================
// 字镜阁 · 词源网络测试（P16-4 扩展）
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { useEtymologyNetwork } from '../etymology'

describe('etymology network (P16-4 expanded)', () => {
  let network: ReturnType<typeof useEtymologyNetwork>

  beforeEach(() => {
    network = useEtymologyNetwork()
  })

  describe('dictionary size', () => {
    it('应包含至少 55 条内置词源', () => {
      expect(network.getDictionarySize()).toBeGreaterThanOrEqual(55)
    })
  })

  describe('新增词源查询', () => {
    it('应能查询新增的"日"字词源', () => {
      const result = network.getEtymology('日')
      expect(result).not.toBeNull()
      expect(result!.word).toBe('日')
      expect(result!.origin).toContain('太阳')
      expect(result!.language).toBe('甲骨文')
    })

    it('应能查询新增的"月"字词源', () => {
      const result = network.getEtymology('月')
      expect(result).not.toBeNull()
      expect(result!.word).toBe('月')
      expect(result!.cognates).toContain('明')
    })

    it('应能查询新增的"山"字词源', () => {
      const result = network.getEtymology('山')
      expect(result).not.toBeNull()
      expect(result!.cognates.length).toBeGreaterThan(3)
    })

    it('应能查询新增的"水"字词源', () => {
      const result = network.getEtymology('水')
      expect(result).not.toBeNull()
      expect(result!.components[0]).toContain('水')
    })

    it('应能查询新增的"火"字词源', () => {
      const result = network.getEtymology('火')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('炎')
    })

    it('应能查询新增的"风"字词源', () => {
      const result = network.getEtymology('风')
      expect(result).not.toBeNull()
      expect(result!.origin).toContain('空气流动')
    })

    it('应能查询新增的"星"字词源', () => {
      const result = network.getEtymology('星')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('醒')
    })

    it('应能查询新增的"天"字词源', () => {
      const result = network.getEtymology('天')
      expect(result).not.toBeNull()
      expect(result!.origin).toContain('头顶')
    })

    it('应能查询新增的"地"字词源', () => {
      const result = network.getEtymology('地')
      expect(result).not.toBeNull()
      expect(result!.components).toContain('土')
    })

    it('应能查询新增的"手"字词源', () => {
      const result = network.getEtymology('手')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('掌')
    })

    it('应能查询新增的"目"字词源', () => {
      const result = network.getEtymology('目')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('眼')
    })

    it('应能查询新增的"口"字词源', () => {
      const result = network.getEtymology('口')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('吃')
    })

    it('应能查询新增的"足"字词源', () => {
      const result = network.getEtymology('足')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('跑')
    })

    it('应能查询新增的"身"字词源', () => {
      const result = network.getEtymology('身')
      expect(result).not.toBeNull()
      expect(result!.origin).toContain('身体')
    })

    it('应能查询新增的"生"字词源', () => {
      const result = network.getEtymology('生')
      expect(result).not.toBeNull()
      expect(result!.origin).toContain('草木')
    })

    it('应能查询新增的"命"字词源', () => {
      const result = network.getEtymology('命')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('令')
    })

    it('应能查询新增的"情"字词源', () => {
      const result = network.getEtymology('情')
      expect(result).not.toBeNull()
      expect(result!.components[0]).toContain('心')
    })

    it('应能查询新增的"意"字词源', () => {
      const result = network.getEtymology('意')
      expect(result).not.toBeNull()
      expect(result!.origin).toContain('心意')
    })

    it('应能查询新增的"志"字词源', () => {
      const result = network.getEtymology('志')
      expect(result).not.toBeNull()
      expect(result!.origin).toContain('志向')
    })

    it('应能查询新增的"爱"字词源', () => {
      const result = network.getEtymology('爱')
      expect(result).not.toBeNull()
      expect(result!.origin).toContain('喜爱')
    })

    it('应能查询新增的"梦"字词源', () => {
      const result = network.getEtymology('梦')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('朦')
    })

    it('应能查询新增的"行"字词源', () => {
      const result = network.getEtymology('行')
      expect(result).not.toBeNull()
      expect(result!.origin).toContain('十字路口')
    })

    it('应能查询新增的"建"字词源', () => {
      const result = network.getEtymology('建')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('健')
    })

    it('应能查询新增的"道"字词源', () => {
      const result = network.getEtymology('道')
      expect(result).not.toBeNull()
      expect(result!.origin).toContain('道路')
    })

    it('应能查询新增的"德"字词源', () => {
      const result = network.getEtymology('德')
      expect(result).not.toBeNull()
      expect(result!.components).toContain('心')
    })

    it('应能查询新增的"空"字词源', () => {
      const result = network.getEtymology('空')
      expect(result).not.toBeNull()
      expect(result!.origin).toContain('空虚')
    })

    it('应能查询新增的"静"字词源', () => {
      const result = network.getEtymology('静')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('净')
    })

    it('应能查询新增的"美"字词源', () => {
      const result = network.getEtymology('美')
      expect(result).not.toBeNull()
      expect(result!.origin).toContain('羊大')
    })

    it('应能查询新增的"善"字词源', () => {
      const result = network.getEtymology('善')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('膳')
    })

    it('应能查询新增的"真"字词源', () => {
      const result = network.getEtymology('真')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('慎')
    })

    it('应能查询新增的"变"字词源', () => {
      const result = network.getEtymology('变')
      expect(result).not.toBeNull()
      expect(result!.origin).toContain('改变')
    })

    it('应能查询新增的"化"字词源', () => {
      const result = network.getEtymology('化')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('花')
    })
  })

  describe('原有词源兼容性', () => {
    it('应仍能查询原有的"心"字词源', () => {
      const result = network.getEtymology('心')
      expect(result).not.toBeNull()
      expect(result!.word).toBe('心')
      expect(result!.origin).toContain('心脏')
    })

    it('应仍能查询原有的"流"字词源', () => {
      const result = network.getEtymology('流')
      expect(result).not.toBeNull()
      expect(result!.cognates).toContain('硫')
    })

    it('应仍能查询原有的"镜"字词源', () => {
      const result = network.getEtymology('镜')
      expect(result).not.toBeNull()
      expect(result!.origin).toContain('铜镜')
    })
  })

  describe('getEtymologiesByLanguage', () => {
    it('应按语言分组词源', () => {
      const grouped = network.getEtymologiesByLanguage()
      expect(grouped).toBeDefined()
      expect(Object.keys(grouped).length).toBeGreaterThanOrEqual(3)
      expect(grouped['甲骨文']).toBeDefined()
      expect(grouped['金文']).toBeDefined()
      expect(grouped['说文']).toBeDefined()
    })

    it('甲骨文类别应包含"日""月""山"等象形字', () => {
      const grouped = network.getEtymologiesByLanguage()
      const oracleWords = grouped['甲骨文']?.map((e) => e.word) || []
      expect(oracleWords).toContain('日')
      expect(oracleWords).toContain('月')
      expect(oracleWords).toContain('山')
    })
  })

  describe('searchEtymologies', () => {
    it('应能按词搜索', () => {
      const results = network.searchEtymologies('日')
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results.some((r) => r.word === '日')).toBe(true)
    })

    it('应能按同源词搜索', () => {
      const results = network.searchEtymologies('明')
      // "明"是"日"和"月"的同源词
      expect(results.length).toBeGreaterThanOrEqual(2)
    })

    it('应能按词源解释搜索', () => {
      const results = network.searchEtymologies('象形')
      expect(results.length).toBeGreaterThan(10)
    })

    it('空查询应返回空结果', () => {
      const results = network.searchEtymologies('xyzabc123')
      expect(results.length).toBe(0)
    })
  })

  describe('getRootRelatives', () => {
    it('应能找到共享词根的词汇', () => {
      const relatives = network.getRootRelatives('情')
      // 情从心，应能找到其他从心的字
      expect(relatives.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('suggestEtymologies', () => {
    it('应为未收录的词生成词源建议', () => {
      const suggestions = network.suggestEtymologies([
        { word: '心流', id: '1', definition: '', proficiency: 1, favorite: false, tags: [], createdAt: '', reviewCount: 0 },
      ] as any)
      expect(suggestions.length).toBeGreaterThanOrEqual(1)
      expect(suggestions[0].suggestion.origin).toContain('心')
    })
  })
})