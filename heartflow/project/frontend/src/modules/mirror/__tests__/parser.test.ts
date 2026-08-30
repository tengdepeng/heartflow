// ============================================================
// 镜面对话系统 · 任务解析器测试
// 覆盖：parseTask / parseTaskBest / parseTaskByIntent / getIntentConfidence
// ============================================================

import { describe, expect, it } from 'vitest'
import {
  parseTask,
  parseTaskBest,
  parseTaskByIntent,
  getIntentConfidence,
} from '../parser'

describe('镜我任务解析器 (parser)', () => {

  // ---- parseTask ----

  describe('parseTask', () => {

    it('空字符串返回空结果', () => {
      const result = parseTask('')
      expect(result.tasks).toHaveLength(0)
      expect(result.best).toBeNull()
      expect(result.ambiguous).toBe(false)
    })

    it('纯空白字符串返回空结果', () => {
      const result = parseTask('   ')
      expect(result.tasks).toHaveLength(0)
      expect(result.best).toBeNull()
    })

    // ---- 专注意图 ----

    it('识别"开始专注"为 focus', () => {
      const result = parseTask('开始专注')
      expect(result.best).not.toBeNull()
      expect(result.best!.intent).toBe('focus')
    })

    it('识别"启动专注"并提取时长', () => {
      const result = parseTask('启动专注 30 分钟')
      expect(result.best!.intent).toBe('focus')
      expect(result.best!.params.duration).toBe(30)
    })

    it('识别"我要工作"为 focus', () => {
      const result = parseTask('我要工作了')
      expect(result.best!.intent).toBe('focus')
    })

    it('识别"干活"为 focus', () => {
      const result = parseTask('干活')
      expect(result.best!.intent).toBe('focus')
    })

    it('识别"开始专注"并提取任务名', () => {
      const result = parseTask('开始专注写报告')
      expect(result.best!.intent).toBe('focus')
      expect(result.best!.params.taskName).toBe('报告')
    })

    it('识别"番茄钟"为 focus', () => {
      const result = parseTask('开始番茄钟')
      expect(result.best!.intent).toBe('focus')
    })

    // ---- 笔记意图 ----

    it('识别"记录笔记"为 note', () => {
      const result = parseTask('记录笔记')
      expect(result.best!.intent).toBe('note')
    })

    it('识别"记一下"并提取内容', () => {
      const result = parseTask('记一下今天去了超市')
      expect(result.best!.intent).toBe('note')
      expect(result.best!.params.content).toBeDefined()
    })

    it('识别"我想到"为 note', () => {
      const result = parseTask('我想到一个很有趣的点子')
      expect(result.best!.intent).toBe('note')
    })

    it('识别"备忘"为 note', () => {
      const result = parseTask('备忘一下这个重要的事情')
      expect(result.best!.intent).toBe('note')
    })

    it('识别"帮我记"为 note', () => {
      const result = parseTask('帮我记录一下')
      expect(result.best!.intent).toBe('note')
    })

    // ---- 情绪意图 ----

    it('识别"记录情绪"为 emotion', () => {
      const result = parseTask('记录情绪')
      expect(result.best!.intent).toBe('emotion')
    })

    it('识别"我很开心"为 emotion 并提取类型', () => {
      const result = parseTask('我今天很开心')
      expect(result.best!.intent).toBe('emotion')
      // 可能匹配到 happy 或 calm
      const type = result.best!.params.type as string
      expect(['happy', 'calm']).toContain(type)
    })

    it('识别"我很焦虑"为 emotion', () => {
      const result = parseTask('我现在很焦虑')
      expect(result.best!.intent).toBe('emotion')
    })

    it('识别"心情不好"为 emotion', () => {
      const result = parseTask('心情不太好')
      expect(result.best!.intent).toBe('emotion')
    })

    it('识别"我感觉很累"为 emotion', () => {
      const result = parseTask('我感觉今天很累')
      expect(result.best!.intent).toBe('emotion')
    })

    // ---- 锚点意图 ----

    it('识别"设立锚点"为 anchor', () => {
      const result = parseTask('设立锚点')
      expect(result.best!.intent).toBe('anchor')
    })

    it('识别"创建待办"为 anchor', () => {
      const result = parseTask('创建待办')
      expect(result.best!.intent).toBe('anchor')
    })

    it('识别"查看锚点"为 anchor', () => {
      const result = parseTask('查看我的锚点')
      expect(result.best!.intent).toBe('anchor')
    })

    it('识别"完成锚点"为 anchor', () => {
      const result = parseTask('完成锚点')
      expect(result.best!.intent).toBe('anchor')
    })

    it('识别"设个目标"并提取标题', () => {
      const result = parseTask('设个目标：读完三本书')
      expect(result.best!.intent).toBe('anchor')
      expect(result.best!.params.title).toBeDefined()
    })

    // ---- 计划意图 ----

    it('识别"制定计划"为 plan', () => {
      const result = parseTask('制定计划')
      expect(result.best!.intent).toBe('plan')
    })

    it('识别"今天要做什么"为 plan', () => {
      const result = parseTask('今天要做什么')
      expect(result.best!.intent).toBe('plan')
    })

    it('识别"安排一下"为 plan', () => {
      const result = parseTask('安排一下今天的日程')
      expect(result.best!.intent).toBe('plan')
    })

    // ---- 反思意图 ----

    it('识别"反思"为 reflect', () => {
      const result = parseTask('反思一下')
      expect(result.best!.intent).toBe('reflect')
    })

    it('识别"复盘"为 reflect', () => {
      const result = parseTask('复盘今天')
      expect(result.best!.intent).toBe('reflect')
    })

    it('识别"今天做了什么"为 reflect', () => {
      const result = parseTask('今天做了什么')
      expect(result.best!.intent).toBe('reflect')
    })

    it('识别"回顾"为 reflect', () => {
      const result = parseTask('回顾一下最近')
      expect(result.best!.intent).toBe('reflect')
    })

    // ---- 学习意图 ----

    it('识别"学习 TypeScript"为 learn', () => {
      const result = parseTask('学习 TypeScript')
      expect(result.best!.intent).toBe('learn')
      expect(result.best!.params.topic).toBeDefined()
    })

    it('识别"查一下"为 learn', () => {
      const result = parseTask('查一下 Vue 3 新特性')
      expect(result.best!.intent).toBe('learn')
    })

    it('识别"我想了解"为 learn', () => {
      const result = parseTask('我想了解 Pinia 的用法')
      expect(result.best!.intent).toBe('learn')
    })

    // ---- 创造意图 ----

    it('识别"写一篇"为 create', () => {
      const result = parseTask('写一篇文章')
      expect(result.best!.intent).toBe('create')
    })

    it('识别"设计一个"为 create', () => {
      const result = parseTask('设计一个 logo')
      expect(result.best!.intent).toBe('create')
    })

    // ---- 休息意图 ----

    it('识别"休息一下"为 rest', () => {
      const result = parseTask('休息一下')
      expect(result.best!.intent).toBe('rest')
    })

    it('识别"我累了"为 rest', () => {
      const result = parseTask('我累了')
      expect(result.best!.intent).toBe('rest')
    })

    it('识别"暂停"为 rest', () => {
      const result = parseTask('暂停一下')
      expect(result.best!.intent).toBe('rest')
    })

    it('识别"放松"为 rest', () => {
      const result = parseTask('放松一下')
      expect(result.best!.intent).toBe('rest')
    })

    it('识别"休息"并提取时长', () => {
      const result = parseTask('休息 10 分钟')
      expect(result.best!.intent).toBe('rest')
      expect(result.best!.params.duration).toBe(10)
    })

    // ---- 探索意图 ----

    it('识别"浏览"为 explore', () => {
      const result = parseTask('浏览一下')
      expect(result.best!.intent).toBe('explore')
    })

    it('识别"统计"为 explore', () => {
      const result = parseTask('统计一下')
      expect(result.best!.intent).toBe('explore')
    })

    it('识别"有多少"为 explore', () => {
      const result = parseTask('有多少次专注')
      expect(result.best!.intent).toBe('explore')
    })

    it('识别"怎么用"为 explore', () => {
      const result = parseTask('怎么用这个功能')
      expect(result.best!.intent).toBe('explore')
    })

    it('识别"去锚点"并提取房间目标', () => {
      const result = parseTask('去锚点')
      expect(result.best!.intent).toBe('explore')
      expect(result.best!.params.roomTarget).toBe('锚点')
    })

    // ---- 记账意图（修复：镜我对"我要记账/打开记账"此前无对应意图，只回文字不跳转） ----

    it('识别"我要记账"为 finance', () => {
      const result = parseTask('我要记账')
      expect(result.best).not.toBeNull()
      expect(result.best!.intent).toBe('finance')
    })

    it('识别"记账"为 finance（裸词也能命中）', () => {
      const result = parseTask('记账')
      expect(result.best).not.toBeNull()
      expect(result.best!.intent).toBe('finance')
    })

    it('识别"打开记账"为 finance 或 explore 且能解析到记账目标', () => {
      const result = parseTask('打开记账')
      expect(result.best).not.toBeNull()
      const intents = result.tasks.map(t => t.intent)
      // 两种意图任一命中都能最终跳到 /reward（finance 直跳 / explore 经 roomResolver 记账别名）
      expect(intents).toContain('finance')
      expect(result.best!.params.roomTarget === '劳酬' || result.best!.params.roomTarget === '记账' || result.best!.intent === 'finance').toBe(true)
    })

    it('识别"记一笔账"为 finance', () => {
      const result = parseTask('记一笔账')
      expect(result.best).not.toBeNull()
      expect(result.best!.intent).toBe('finance')
    })

    // ---- 歧义与边界 ----

    it('无意义输入不匹配任何意图', () => {
      const result = parseTask('asdfghjkl')
      expect(result.best).toBeNull()
    })

    it('单字输入不匹配', () => {
      const result = parseTask('嗯')
      expect(result.best).toBeNull()
    })

    it('置信度排序：最佳匹配置信度最高', () => {
      const result = parseTask('开始专注记笔记')
      if (result.tasks.length >= 2) {
        expect(result.tasks[0].confidence).toBeGreaterThanOrEqual(result.tasks[1].confidence)
      }
    })

    it('每个候选任务都有唯一的 id', () => {
      const result = parseTask('开始专注记笔记')
      const ids = result.tasks.map(t => t.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('每个候选任务都有 parsedAt 时间戳', () => {
      const result = parseTask('开始专注')
      for (const task of result.tasks) {
        expect(task.parsedAt).toBeGreaterThan(0)
      }
    })
  })

  // ---- parseTaskBest ----

  describe('parseTaskBest', () => {
    it('成功匹配返回最佳任务', () => {
      const task = parseTaskBest('开始专注')
      expect(task).not.toBeNull()
      expect(task!.intent).toBe('focus')
    })

    it('无匹配时返回 null', () => {
      const task = parseTaskBest('xyz')
      expect(task).toBeNull()
    })
  })

  // ---- parseTaskByIntent ----

  describe('parseTaskByIntent', () => {
    it('按指定意图筛选', () => {
      const task = parseTaskByIntent('开始专注', 'focus')
      expect(task).not.toBeNull()
      expect(task!.intent).toBe('focus')
    })

    it('不匹配指定意图时返回 null', () => {
      const task = parseTaskByIntent('开始专注', 'rest')
      expect(task).toBeNull()
    })

    it('多个候选中筛选指定意图', () => {
      const task = parseTaskByIntent('开始专注记录笔记', 'note')
      expect(task).not.toBeNull()
      expect(task!.intent).toBe('note')
    })
  })

  // ---- getIntentConfidence ----

  describe('getIntentConfidence', () => {
    it('匹配意图返回大于 0 的置信度', () => {
      const confidence = getIntentConfidence('开始专注', 'focus')
      expect(confidence).toBeGreaterThan(0)
    })

    it('不匹配意图返回 0', () => {
      const confidence = getIntentConfidence('开始专注', 'rest')
      expect(confidence).toBe(0)
    })

    it('不存在的意图返回 0', () => {
      const confidence = getIntentConfidence('开始专注', 'unknown')
      expect(confidence).toBe(0)
    })
  })
})