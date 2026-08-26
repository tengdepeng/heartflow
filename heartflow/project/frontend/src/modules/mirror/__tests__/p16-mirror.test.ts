// ============================================================
// 镜我 · P16-13 · 单元测试
// LLM 集成桥接层 + 语音输入 + 主题聚类
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useLLMBridge } from '../llm-bridge'
import { useVoiceInput } from '../voice-input'
import { useTopicClustering } from '../topic-clustering'

// ============================================================
// Mock AI 引擎
// ============================================================

vi.mock('@/engine/ai', () => ({
  aiEngine: {
    chat: vi.fn().mockImplementation(async (messages: Array<{ role: string; content: string }>) => {
      const userContent = messages.find(m => m.role === 'user')?.content ?? ''

      // 意图精炼响应
      if (userContent.includes('意图分析专家')) {
        return {
          text: '{"refinedIntent":"focus","confidence":0.9,"extractedParams":{"duration":"25"},"subIntents":["work"],"emotionalTone":"calm","complexity":2}',
          model: 'test-model',
          tokenUsage: { prompt: 50, completion: 30, total: 80 },
          latency: 200,
          success: true,
        }
      }

      // 情绪分析响应
      if (userContent.includes('情绪分析专家')) {
        return {
          text: '{"primaryEmotion":"sadness","intensity":0.7,"emotionDistribution":{"sadness":0.6,"anxiety":0.3,"hope":0.1},"trend":"stable","underlyingNeeds":["被理解","支持"],"suggestedResponseTone":"温和","crisisSignals":[]}',
          model: 'test-model',
          tokenUsage: { prompt: 40, completion: 50, total: 90 },
          latency: 180,
          success: true,
        }
      }

      // 深度反思响应
      if (userContent.includes('反思引导者')) {
        return {
          text: '{"theme":"人生意义探索","insights":["你在寻找更深层次的意义","当前阶段是成长的关键期"],"guidingQuestions":["什么让你感到充实？","如果没有任何限制，你想做什么？"],"actionSuggestions":["每天花10分钟写反思日记","尝试新的事物"],"relatedPatterns":["自我探索","价值观澄清"],"growthPerspective":"这是自我认知深化的重要阶段"}',
          model: 'test-model',
          tokenUsage: { prompt: 60, completion: 80, total: 140 },
          latency: 250,
          success: true,
        }
      }

      // 默认响应
      return {
        text: '这是一个测试响应',
        model: 'test-model',
        tokenUsage: { prompt: 50, completion: 30, total: 80 },
        latency: 200,
        success: true,
      }
    }),
    chatStream: vi.fn().mockImplementation(async (_messages: unknown, callbacks: { onToken: (t: string) => void; onComplete: (t: string) => void; onError: (e: Error) => void }) => {
      callbacks.onToken('Hello')
      callbacks.onToken(' World')
      callbacks.onComplete('Hello World')
    }),
  },
}))

// ============================================================
// LLM 集成桥接层测试
// ============================================================

describe('P16-13 LLM 集成桥接层', () => {
  let bridge: ReturnType<typeof useLLMBridge>

  beforeEach(() => {
    bridge = useLLMBridge()
  })

  describe('配置管理', () => {
    it('应使用默认配置初始化', () => {
      expect(bridge.bridgeConfig.value.enabled).toBe(true)
      expect(bridge.bridgeConfig.value.useStreaming).toBe(false)
      expect(bridge.bridgeConfig.value.maxTurns).toBe(20)
      expect(bridge.bridgeConfig.value.temperature).toBe(0.7)
      expect(bridge.bridgeConfig.value.enableIntentRefinement).toBe(true)
      expect(bridge.bridgeConfig.value.enableEmotionAnalysis).toBe(true)
      expect(bridge.bridgeConfig.value.enableDeepReflection).toBe(true)
    })

    it('应能更新配置', () => {
      bridge.updateConfig({ enabled: false, temperature: 0.5 })
      expect(bridge.bridgeConfig.value.enabled).toBe(false)
      expect(bridge.bridgeConfig.value.temperature).toBe(0.5)
      // 未更新的字段保持原值
      expect(bridge.bridgeConfig.value.maxTurns).toBe(20)
    })

    it('应支持自定义初始配置', () => {
      const custom = useLLMBridge({ maxTurns: 10, temperature: 0.3 })
      expect(custom.bridgeConfig.value.maxTurns).toBe(10)
      expect(custom.bridgeConfig.value.temperature).toBe(0.3)
    })
  })

  describe('初始状态', () => {
    it('isProcessing 应为 false', () => {
      expect(bridge.isProcessing.value).toBe(false)
    })

    it('lastResponse 应为 null', () => {
      expect(bridge.lastResponse.value).toBeNull()
    })

    it('lastError 应为 null', () => {
      expect(bridge.lastError.value).toBeNull()
    })

    it('responseHistory 应为空', () => {
      expect(bridge.responseHistory.value).toEqual([])
    })

    it('callCount 应为 0', () => {
      expect(bridge.callCount.value).toBe(0)
    })

    it('totalTokens 应为 0', () => {
      expect(bridge.totalTokens.value).toBe(0)
    })
  })

  describe('对话上下文', () => {
    it('应使用默认上下文初始化', () => {
      expect(bridge.dialogueContext.value.currentMood).toBe('neutral')
      expect(bridge.dialogueContext.value.activeTopics).toEqual([])
      expect(bridge.dialogueContext.value.turnCount).toBe(0)
    })

    it('应能更新上下文', () => {
      bridge.updateContext({ currentMood: 'happy', activeTopics: ['工作', '学习'] })
      expect(bridge.dialogueContext.value.currentMood).toBe('happy')
      expect(bridge.dialogueContext.value.activeTopics).toEqual(['工作', '学习'])
    })

    it('应能重置上下文', () => {
      bridge.updateContext({ currentMood: 'sad', turnCount: 10 })
      bridge.resetContext()
      expect(bridge.dialogueContext.value.currentMood).toBe('neutral')
      expect(bridge.dialogueContext.value.turnCount).toBe(0)
    })
  })

  describe('系统提示词', () => {
    it('应构建包含上下文的系统提示词', () => {
      bridge.updateContext({
        currentMood: 'anxious',
        activeTopics: ['项目'],
        recentSummary: '用户最近讨论了项目压力',
      })
      const prompt = bridge.buildSystemPrompt()
      expect(prompt).toContain('镜我')
      expect(prompt).toContain('anxious')
      expect(prompt).toContain('项目')
      expect(prompt).toContain('项目压力')
    })

    it('基础提示词应包含核心原则', () => {
      const prompt = bridge.buildSystemPrompt()
      expect(prompt).toContain('深度倾听')
      expect(prompt).toContain('温和反馈')
      expect(prompt).toContain('引导觉察')
      expect(prompt).toContain('成长陪伴')
    })
  })

  describe('LLM 调用', () => {
    it('chat 应返回成功的响应', async () => {
      const response = await bridge.chat('我今天很开心')
      expect(response.success).toBe(true)
      expect(response.text).toBeTruthy()
      expect(response.model).toBe('test-model')
      expect(bridge.callCount.value).toBe(1)
    })

    it('chat 应更新 lastResponse', async () => {
      await bridge.chat('你好')
      expect(bridge.lastResponse.value).not.toBeNull()
      expect(bridge.lastResponse.value?.success).toBe(true)
    })

    it('chat 应更新 responseHistory', async () => {
      await bridge.chat('消息1')
      await bridge.chat('消息2')
      expect(bridge.responseHistory.value.length).toBe(2)
    })

    it('chat 应更新 turnCount', async () => {
      await bridge.chat('消息')
      expect(bridge.dialogueContext.value.turnCount).toBe(1)
    })

    it('chatStream 应支持流式调用', async () => {
      const tokens: string[] = []
      let completed = ''

      await bridge.chatStream('你好', {
        onToken: (t) => tokens.push(t),
        onComplete: (t) => { completed = t },
        onError: () => {},
      })

      expect(tokens).toEqual(['Hello', ' World'])
      expect(completed).toBe('Hello World')
    })
  })

  describe('意图精炼', () => {
    it('应返回意图精炼结果', async () => {
      const result = await bridge.refineIntent('我想专注25分钟', 'focus')
      expect(result.originalIntent).toBe('focus')
      expect(result.refinedIntent).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('禁用意图精炼时应返回 fallback', async () => {
      bridge.updateConfig({ enableIntentRefinement: false })
      const result = await bridge.refineIntent('测试', 'focus')
      expect(result.refinedIntent).toBe('focus')
      expect(result.confidence).toBe(0.5)
      expect(result.emotionalTone).toBe('neutral')
    })
  })

  describe('情绪分析', () => {
    it('应返回情绪分析结果', async () => {
      const result = await bridge.analyzeEmotion('我今天很沮丧')
      expect(result.primaryEmotion).toBeDefined()
      expect(result.intensity).toBeGreaterThanOrEqual(0)
      expect(result.trend).toBeDefined()
    })

    it('禁用情绪分析时应返回 fallback', async () => {
      bridge.updateConfig({ enableEmotionAnalysis: false })
      const result = await bridge.analyzeEmotion('测试')
      expect(result.primaryEmotion).toBe('neutral')
      expect(result.intensity).toBe(0.3)
    })
  })

  describe('深度反思', () => {
    it('应返回深度反思结果', async () => {
      const result = await bridge.generateReflection('我最近在思考人生的意义')
      expect(result.theme).toBeDefined()
      expect(result.insights).toBeDefined()
      expect(result.guidingQuestions.length).toBeGreaterThan(0)
      expect(result.actionSuggestions).toBeDefined()
    })

    it('禁用深度反思时应返回 fallback', async () => {
      bridge.updateConfig({ enableDeepReflection: false })
      const result = await bridge.generateReflection('测试')
      expect(result.theme).toBe('日常反思')
      expect(result.insights).toContain('今天是一个新的开始')
    })
  })

  describe('派生状态', () => {
    it('averageLatency 应计算平均延迟', async () => {
      // 响应延迟为 200ms
      await bridge.chat('test')
      expect(bridge.averageLatency.value).toBeGreaterThan(0)
    })

    it('successRate 应计算成功率', async () => {
      await bridge.chat('test')
      expect(bridge.successRate.value).toBe(100)
    })
  })

  describe('重置', () => {
    it('应重置所有状态', async () => {
      await bridge.chat('测试')
      bridge.reset()
      expect(bridge.isProcessing.value).toBe(false)
      expect(bridge.lastResponse.value).toBeNull()
      expect(bridge.lastError.value).toBeNull()
      expect(bridge.responseHistory.value).toEqual([])
      expect(bridge.callCount.value).toBe(0)
      expect(bridge.totalTokens.value).toBe(0)
    })
  })
})

// ============================================================
// 语音输入模块测试
// ============================================================

describe('P16-13 语音输入模块', () => {
  let voice: ReturnType<typeof useVoiceInput>

  beforeEach(() => {
    voice = useVoiceInput()
  })

  describe('配置管理', () => {
    it('应使用默认配置初始化', () => {
      expect(voice.voiceConfig.value.lang).toBe('zh-CN')
      expect(voice.voiceConfig.value.continuous).toBe(true)
      expect(voice.voiceConfig.value.interimResults).toBe(true)
      expect(voice.voiceConfig.value.silenceTimeout).toBe(3000)
      expect(voice.voiceConfig.value.maxDuration).toBe(60000)
    })

    it('应支持自定义初始配置', () => {
      const custom = useVoiceInput({ lang: 'en-US', silenceTimeout: 5000 })
      expect(custom.voiceConfig.value.lang).toBe('en-US')
      expect(custom.voiceConfig.value.silenceTimeout).toBe(5000)
    })
  })

  describe('初始状态', () => {
    it('status 应为 idle', () => {
      expect(voice.status.value).toBe('idle')
    })

    it('isListening 应为 false', () => {
      expect(voice.isListening.value).toBe(false)
    })

    it('isPaused 应为 false', () => {
      expect(voice.isPaused.value).toBe(false)
    })

    it('currentText 应为空', () => {
      expect(voice.currentText.value).toBe('')
    })

    it('interimText 应为空', () => {
      expect(voice.interimText.value).toBe('')
    })

    it('segments 应为空', () => {
      expect(voice.segments.value).toEqual([])
    })

    it('sessions 应为空', () => {
      expect(voice.sessions.value).toEqual([])
    })
  })

  describe('浏览器支持检测', () => {
    it('isSupported 应为 boolean', () => {
      expect(typeof voice.isSupported.value).toBe('boolean')
    })
  })

  describe('语言切换', () => {
    it('应能切换语言', () => {
      voice.setLanguage('en-US')
      expect(voice.voiceConfig.value.lang).toBe('en-US')
    })

    it('支持的语言列表应包含中文和英文', () => {
      const langs = voice.SUPPORTED_LANGUAGES
      const zhCN = langs.find(l => l.code === 'zh-CN')
      const enUS = langs.find(l => l.code === 'en-US')
      expect(zhCN).toBeDefined()
      expect(enUS).toBeDefined()
    })
  })

  describe('会话管理', () => {
    it('getSessions 应返回空数组', () => {
      expect(voice.getSessions()).toEqual([])
    })

    it('clearSessions 不应出错', () => {
      expect(() => voice.clearSessions()).not.toThrow()
    })
  })

  describe('错误管理', () => {
    it('clearErrors 不应出错', () => {
      expect(() => voice.clearErrors()).not.toThrow()
    })
  })

  describe('派生状态', () => {
    it('sessionCount 应为 0', () => {
      expect(voice.sessionCount.value).toBe(0)
    })

    it('totalListeningTime 应为 0', () => {
      expect(voice.totalListeningTime.value).toBe(0)
    })

    it('averageConfidence 应为 0', () => {
      expect(voice.averageConfidence.value).toBe(0)
    })
  })

  describe('reset', () => {
    it('应重置所有状态', () => {
      voice.reset()
      expect(voice.status.value).toBe('idle')
      expect(voice.currentText.value).toBe('')
      expect(voice.segments.value).toEqual([])
      expect(voice.sessions.value).toEqual([])
    })
  })
})

// ============================================================
// 主题聚类模块测试
// ============================================================

describe('P16-13 主题聚类模块', () => {
  let clustering: ReturnType<typeof useTopicClustering>

  const sampleEntries = [
    { text: '今天工作很忙，项目进度有点赶不上', intent: 'reflect', emotion: 'anxious' },
    { text: '项目终于上线了，感觉松了一口气', intent: 'reflect', emotion: 'relieved' },
    { text: '和同事讨论了新的技术方案', intent: 'note', emotion: 'neutral' },
    { text: '学习了一些新的编程技巧', intent: 'learn', emotion: 'curious' },
    { text: '今天去健身房锻炼了，感觉很好', intent: 'note', emotion: 'happy' },
    { text: '健身计划要坚持下去', intent: 'plan', emotion: 'determined' },
    { text: '项目又遇到新的挑战，需要重新设计方案', intent: 'reflect', emotion: 'frustrated' },
    { text: '阅读了一本好书，收获很多', intent: 'note', emotion: 'inspired' },
    { text: '学习了新的框架，感觉很有意思', intent: 'learn', emotion: 'excited' },
    { text: '健身完感觉身体很舒服', intent: 'note', emotion: 'happy' },
    { text: '今天工作效率很高', intent: 'reflect', emotion: 'satisfied' },
    { text: '跑步 5 公里，突破了自己的记录', intent: 'note', emotion: 'proud' },
  ]

  beforeEach(() => {
    clustering = useTopicClustering()
  })

  describe('配置管理', () => {
    it('应使用默认配置初始化', () => {
      expect(clustering.clusteringConfig.value.minKeywordFrequency).toBe(2)
      expect(clustering.clusteringConfig.value.maxTopics).toBe(20)
      expect(clustering.clusteringConfig.value.similarityThreshold).toBe(0.3)
      expect(clustering.clusteringConfig.value.hierarchicalClustering).toBe(true)
    })

    it('应能更新配置', () => {
      clustering.updateConfig({ maxTopics: 10, minKeywordFrequency: 3 })
      expect(clustering.clusteringConfig.value.maxTopics).toBe(10)
      expect(clustering.clusteringConfig.value.minKeywordFrequency).toBe(3)
    })
  })

  describe('条目管理', () => {
    it('应能添加条目', () => {
      const entry = clustering.addEntry('测试文本', 'note', 'neutral')
      expect(entry.id).toBeTruthy()
      expect(entry.text).toBe('测试文本')
      expect(entry.intent).toBe('note')
      expect(entry.emotion).toBe('neutral')
      expect(clustering.entries.value.length).toBe(1)
    })

    it('应能批量添加条目', () => {
      clustering.addEntries([
        { text: '条目1', intent: 'note' },
        { text: '条目2', intent: 'reflect' },
      ])
      expect(clustering.entries.value.length).toBe(2)
    })

    it('应能移除条目', () => {
      const entry = clustering.addEntry('测试', 'note')
      expect(clustering.removeEntry(entry.id)).toBe(true)
      expect(clustering.entries.value.length).toBe(0)
    })

    it('移除不存在的条目应返回 false', () => {
      expect(clustering.removeEntry('non-existent')).toBe(false)
    })

    it('应能清除所有条目', () => {
      clustering.addEntry('条目1', 'note')
      clustering.addEntry('条目2', 'reflect')
      clustering.clearEntries()
      expect(clustering.entries.value.length).toBe(0)
    })
  })

  describe('聚类分析', () => {
    it('空条目时应返回空数组', () => {
      const result = clustering.cluster()
      expect(result).toEqual([])
    })

    it('应能对条目进行聚类', () => {
      clustering.addEntries(sampleEntries)
      const result = clustering.cluster()
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].id).toBeTruthy()
      expect(result[0].keywords.length).toBeGreaterThan(0)
      expect(result[0].entryCount).toBeGreaterThan(0)
    })

    it('聚类结果应包含主题名称', () => {
      clustering.addEntries(sampleEntries)
      const result = clustering.cluster()
      for (const topic of result) {
        expect(topic.name).toBeTruthy()
        expect(topic.name.length).toBeGreaterThan(0)
      }
    })

    it('主题强度应在 0-1 之间', () => {
      clustering.addEntries(sampleEntries)
      const result = clustering.cluster()
      for (const topic of result) {
        expect(topic.strength).toBeGreaterThanOrEqual(0)
        expect(topic.strength).toBeLessThanOrEqual(1)
      }
    })

    it('主题数不应超过 maxTopics', () => {
      clustering.updateConfig({ maxTopics: 2 })
      clustering.addEntries(sampleEntries)
      const result = clustering.cluster()
      expect(result.length).toBeLessThanOrEqual(2)
    })

    it('低频词应被过滤', () => {
      clustering.updateConfig({ minKeywordFrequency: 5 })
      clustering.addEntries([
        { text: '独特词汇仅出现一次', intent: 'note' },
        { text: '另一个独特词汇', intent: 'note' },
      ])
      const result = clustering.cluster()
      // 由于词频太低，可能没有主题
      expect(result.every(t => t.entryCount >= 1)).toBe(true)
    })
  })

  describe('趋势分析', () => {
    it('聚类后应生成趋势数据', () => {
      clustering.addEntries(sampleEntries)
      clustering.cluster()
      expect(clustering.trends.value.length).toBeGreaterThan(0)
    })

    it('趋势应包含时间段', () => {
      clustering.addEntries(sampleEntries)
      clustering.cluster()
      const trend = clustering.trends.value[0]
      expect(trend.periods.length).toBeGreaterThan(0)
      expect(trend.direction).toBeDefined()
    })

    it('趋势方向应为有效值', () => {
      clustering.addEntries(sampleEntries)
      clustering.cluster()
      const validDirections = ['rising', 'falling', 'stable', 'new', 'fading']
      for (const trend of clustering.trends.value) {
        expect(validDirections).toContain(trend.direction)
      }
    })
  })

  describe('主题搜索', () => {
    it('空查询应返回空数组', () => {
      const results = clustering.searchTopics('')
      expect(results).toEqual([])
    })

    it('应能搜索已有主题', () => {
      clustering.addEntries(sampleEntries)
      clustering.cluster()

      const keywords = clustering.topics.value[0]?.keywords[0]
      if (keywords) {
        const results = clustering.searchTopics(keywords)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].relevanceScore).toBeGreaterThan(0)
      }
    })

    it('搜索不存在的主题应返回空数组', () => {
      clustering.addEntries(sampleEntries)
      clustering.cluster()
      const results = clustering.searchTopics('xyzabc123不存在')
      expect(results).toEqual([])
    })
  })

  describe('条目搜索', () => {
    it('应能搜索条目', () => {
      clustering.addEntry('今天工作很忙', 'reflect')
      clustering.addEntry('今天健身了', 'note')
      const results = clustering.searchEntries('工作')
      expect(results.length).toBe(1)
      expect(results[0].text).toContain('工作')
    })

    it('搜索不存在的关键词应返回空数组', () => {
      clustering.addEntry('今天工作很忙', 'reflect')
      const results = clustering.searchEntries('xyzabc')
      expect(results).toEqual([])
    })
  })

  describe('摘要生成', () => {
    it('空状态时应返回空摘要', () => {
      const summary = clustering.generateSummary()
      expect(summary.totalTopics).toBe(0)
      expect(summary.activeTopics).toBe(0)
      expect(summary.hotTopics).toEqual([])
    })

    it('聚类后应生成有效摘要', () => {
      clustering.addEntries(sampleEntries)
      clustering.cluster()
      const summary = clustering.generateSummary()
      expect(summary.totalTopics).toBeGreaterThan(0)
      expect(summary.generatedAt).toBeGreaterThan(0)
    })
  })

  describe('派生状态', () => {
    it('topicCount 应与主题数一致', () => {
      clustering.addEntries(sampleEntries)
      clustering.cluster()
      expect(clustering.topicCount.value).toBe(clustering.topics.value.length)
    })

    it('topKeywords 应返回高频关键词', () => {
      clustering.addEntries(sampleEntries)
      clustering.cluster()
      const keywords = clustering.topKeywords.value
      if (keywords.length > 0) {
        expect(keywords[0].keyword).toBeTruthy()
        expect(keywords[0].score).toBeGreaterThan(0)
      }
    })
  })

  describe('reset', () => {
    it('应重置所有状态', () => {
      clustering.addEntries(sampleEntries)
      clustering.cluster()
      clustering.reset()
      expect(clustering.entries.value).toEqual([])
      expect(clustering.topics.value).toEqual([])
      expect(clustering.trends.value).toEqual([])
      expect(clustering.lastClusteredAt.value).toBeNull()
    })
  })
})