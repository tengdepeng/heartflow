// ============================================================
// 镜我 · 人格建模引擎测试（P15-7）
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePersonalityModel, STYLE_DIMENSION_META, VALUE_DIMENSION_META, GROWTH_PHASE_META } from '../personality-model'
import type { DialogueEntry } from '../types'
import type { StyleDimension, ValueDimension } from '../personality-model'

// Mock storage
const storageMock = new Map<string, unknown>()

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, defaultValue: T): T => {
      const val = storageMock.get(key)
      return val !== undefined ? val as T : defaultValue
    },
    setKV: (key: string, value: unknown) => {
      storageMock.set(key, value)
    },
    removeKV: (key: string) => {
      storageMock.delete(key)
    },
  },
}))

// 生成测试对话数据
function createTestDialogues(count: number): DialogueEntry[] {
  const templates = [
    '我今天感觉很开心，因为完成了一个重要的项目。',
    '最近在想，为什么我总是容易焦虑？也许需要更深入地反思一下。',
    '我觉得自己需要更多的独立空间，但同时也渴望与人连接。',
    '今天学习了一些新的知识，感觉成长了很多。',
    '和朋友聊天让我感到温暖，谢谢他们的陪伴。',
    '我想创建一个新的计划，帮助自己更好地管理时间。',
    '最近在思考人生的意义，有时候觉得迷茫，有时候又觉得充满希望。',
    '完成了一个目标！虽然过程很辛苦，但结果很值得。',
    '今天尝试了一些新的方法，发现效果很好，很有创造力的一天。',
    '我觉得应该更坦诚地面对自己的感受，不要总是伪装。',
    '工作太累了，需要好好休息一下，找到生活的平衡。',
    '好奇心驱使我探索了很多新领域，这个世界真有趣。',
    '为什么我总是在重复同样的模式？也许需要认真分析一下。',
    '谢谢你的建议，我会认真考虑的。',
    '今天心情不太好，但没关系，明天会更好。',
  ]

  const dialogues: DialogueEntry[] = []
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length]
    dialogues.push({
      id: `test_${i}`,
      role: 'user',
      text: `${template} ${i}`,
      timestamp: Date.now() - (count - i) * 86400000,
    })
  }
  return dialogues
}

beforeEach(() => {
  storageMock.clear()
})

// ============================================================
// 对话风格分析测试
// ============================================================

describe('对话风格分析 (Style Analysis)', () => {
  it('对话不足时应该返回 null', () => {
    const dialogues = createTestDialogues(5)
    const { analyzeStyle } = usePersonalityModel(() => dialogues)
    const result = analyzeStyle()
    expect(result).toBeNull()
  })

  it('有足够对话时应该返回风格画像', () => {
    const dialogues = createTestDialogues(30)
    const { analyzeStyle } = usePersonalityModel(() => dialogues)
    const result = analyzeStyle()
    expect(result).not.toBeNull()
    expect(result!.sampleSize).toBe(30)
    expect(result!.dimensions.conciseness).toBeDefined()
    expect(result!.dimensions.emotionality).toBeDefined()
  })

  it('风格画像应该包含所有 8 个维度', () => {
    const dialogues = createTestDialogues(30)
    const { analyzeStyle } = usePersonalityModel(() => dialogues)
    const result = analyzeStyle()!
    const expectedDimensions: StyleDimension[] = [
      'conciseness', 'formality', 'emotionality', 'directness',
      'reflectiveness', 'creativity', 'analytical', 'social_warmth',
    ]
    for (const dim of expectedDimensions) {
      expect(result.dimensions[dim]).toBeGreaterThanOrEqual(0)
      expect(result.dimensions[dim]).toBeLessThanOrEqual(1)
    }
  })

  it('getLatestStyleProfile 应该返回最新画像', () => {
    const dialogues = createTestDialogues(30)
    const { analyzeStyle, getLatestStyleProfile } = usePersonalityModel(() => dialogues)
    expect(getLatestStyleProfile()).toBeNull()

    analyzeStyle()
    const profile = getLatestStyleProfile()
    expect(profile).not.toBeNull()
    expect(profile!.sampleSize).toBe(30)
  })

  it('应该包含长度偏好信息', () => {
    const dialogues = createTestDialogues(30)
    const { analyzeStyle } = usePersonalityModel(() => dialogues)
    const result = analyzeStyle()!
    expect(result.lengthPreference.averageLength).toBeGreaterThan(0)
    expect(result.lengthPreference.medianLength).toBeGreaterThan(0)
    expect(['increasing', 'stable', 'decreasing']).toContain(result.lengthPreference.trend)
  })
})

// ============================================================
// 价值观分析测试
// ============================================================

describe('价值观分析 (Value Analysis)', () => {
  it('对话不足时应该返回 null', () => {
    const dialogues = createTestDialogues(10)
    const { analyzeValues } = usePersonalityModel(() => dialogues)
    const result = analyzeValues()
    expect(result).toBeNull()
  })

  it('有足够对话时应该返回价值观画像', () => {
    const dialogues = createTestDialogues(60)
    const { analyzeValues } = usePersonalityModel(() => dialogues)
    const result = analyzeValues()
    expect(result).not.toBeNull()
    expect(result!.values.length).toBe(10)
    expect(result!.sampleSize).toBe(60)
  })

  it('价值观画像应该包含所有 10 个维度', () => {
    const dialogues = createTestDialogues(60)
    const { analyzeValues } = usePersonalityModel(() => dialogues)
    const result = analyzeValues()!
    const expectedDimensions: ValueDimension[] = [
      'autonomy', 'growth', 'connection', 'contribution', 'security',
      'pleasure', 'achievement', 'authenticity', 'balance', 'curiosity',
    ]
    for (const dim of expectedDimensions) {
      const entry = result.values.find(v => v.dimension === dim)
      expect(entry).toBeDefined()
      expect(entry!.score).toBeGreaterThanOrEqual(0)
      expect(entry!.score).toBeLessThanOrEqual(1)
    }
  })

  it('应该识别核心价值观', () => {
    const dialogues = createTestDialogues(60)
    const { analyzeValues } = usePersonalityModel(() => dialogues)
    const result = analyzeValues()!
    expect(result.coreValues.length).toBeGreaterThanOrEqual(0)
    for (const cv of result.coreValues) {
      expect(cv.isCore).toBe(true)
    }
  })

  it('getLatestValueProfile 应该返回最新画像', () => {
    const dialogues = createTestDialogues(60)
    const { analyzeValues, getLatestValueProfile } = usePersonalityModel(() => dialogues)
    expect(getLatestValueProfile()).toBeNull()

    analyzeValues()
    const profile = getLatestValueProfile()
    expect(profile).not.toBeNull()
    expect(profile!.values.length).toBe(10)
  })
})

// ============================================================
// 成长轨迹测试
// ============================================================

describe('成长轨迹 (Growth Trajectory)', () => {
  it('对话不足时应该返回 null', () => {
    const dialogues = createTestDialogues(5)
    const { buildTrajectory } = usePersonalityModel(() => dialogues)
    const result = buildTrajectory()
    expect(result).toBeNull()
  })

  it('有足够对话时应该返回成长轨迹', () => {
    const dialogues = createTestDialogues(40)
    const { buildTrajectory } = usePersonalityModel(() => dialogues)
    const result = buildTrajectory()
    expect(result).not.toBeNull()
    expect(result!.nodes.length).toBeGreaterThanOrEqual(1)
    expect(result!.startDate).toBeDefined()
    expect(result!.lastDate).toBeDefined()
  })

  it('成长轨迹应该包含阶段信息', () => {
    const dialogues = createTestDialogues(40)
    const { buildTrajectory } = usePersonalityModel(() => dialogues)
    const result = buildTrajectory()!
    for (const node of result.nodes) {
      expect(node.phase).toBeDefined()
      expect(['initial', 'exploration', 'consolidation', 'transformation', 'integration']).toContain(node.phase)
      expect(node.phaseDescription.length).toBeGreaterThan(0)
    }
  })

  it('getLatestTrajectory 应该返回最新轨迹', () => {
    const dialogues = createTestDialogues(40)
    const { buildTrajectory, getLatestTrajectory } = usePersonalityModel(() => dialogues)
    expect(getLatestTrajectory()).toBeNull()

    buildTrajectory()
    const trajectory = getLatestTrajectory()
    expect(trajectory).not.toBeNull()
  })

  it('成长轨迹应该包含稳定性和变化量', () => {
    const dialogues = createTestDialogues(40)
    const { buildTrajectory } = usePersonalityModel(() => dialogues)
    const result = buildTrajectory()!
    expect(result.totalChange).toBeGreaterThanOrEqual(0)
    expect(result.totalChange).toBeLessThanOrEqual(1)
    expect(result.stabilityScore).toBeGreaterThanOrEqual(0)
    expect(result.stabilityScore).toBeLessThanOrEqual(1)
  })
})

// ============================================================
// 自我认知报告测试
// ============================================================

describe('自我认知报告 (Self-Awareness Report)', () => {
  it('无数据时应该返回 null', () => {
    const dialogues: DialogueEntry[] = []
    const { generateReport } = usePersonalityModel(() => dialogues)
    const result = generateReport()
    expect(result).toBeNull()
  })

  it('有数据时应该生成报告', () => {
    const dialogues = createTestDialogues(60)
    const { analyzeStyle, analyzeValues, buildTrajectory, generateReport } = usePersonalityModel(() => dialogues)

    analyzeStyle()
    analyzeValues()
    buildTrajectory()

    const report = generateReport()
    expect(report).not.toBeNull()
    expect(report!.summary.length).toBeGreaterThan(0)
    expect(report!.dimensions.length).toBe(6)
  })

  it('报告应该包含所有 6 个维度', () => {
    const dialogues = createTestDialogues(60)
    const { analyzeStyle, analyzeValues, buildTrajectory, generateReport } = usePersonalityModel(() => dialogues)

    analyzeStyle()
    analyzeValues()
    buildTrajectory()

    const report = generateReport()!
    const dimensionNames = report.dimensions.map(d => d.dimension)
    expect(dimensionNames).toContain('strengths')
    expect(dimensionNames).toContain('growth_areas')
    expect(dimensionNames).toContain('patterns')
    expect(dimensionNames).toContain('blind_spots')
    expect(dimensionNames).toContain('potentials')
    expect(dimensionNames).toContain('needs')
  })

  it('getLatestReport 应该返回最新报告', () => {
    const dialogues = createTestDialogues(60)
    const { analyzeStyle, analyzeValues, buildTrajectory, generateReport, getLatestReport } = usePersonalityModel(() => dialogues)

    analyzeStyle()
    analyzeValues()
    buildTrajectory()
    generateReport()

    const report = getLatestReport()
    expect(report).not.toBeNull()
    expect(report!.version).toBeGreaterThan(0)
  })

  it('报告应该包含建议', () => {
    const dialogues = createTestDialogues(60)
    const { analyzeStyle, analyzeValues, buildTrajectory, generateReport } = usePersonalityModel(() => dialogues)

    analyzeStyle()
    analyzeValues()
    buildTrajectory()

    const report = generateReport()!
    expect(report.recommendations.length).toBeGreaterThan(0)
    expect(report.growthSummary.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 演化预测测试
// ============================================================

describe('演化预测 (Evolution Prediction)', () => {
  it('数据不足时应该返回 null', () => {
    const { predictEvolution } = usePersonalityModel(() => [])
    const result = predictEvolution()
    expect(result).toBeNull()
  })

  it('有足够历史时应该生成预测', () => {
    const dialogues1 = createTestDialogues(60)
    const model = usePersonalityModel(() => dialogues1)

    // 第一次分析
    model.analyzeStyle()
    model.analyzeValues()
    model.buildTrajectory()

    // 第二次分析，使用更多对话数据
    const moreDialogues = [...dialogues1, ...createTestDialogues(40)]
    const model2 = usePersonalityModel(() => moreDialogues)

    model2.analyzeStyle()
    model2.analyzeValues()

    const prediction = model2.predictEvolution('3_months')
    expect(prediction).not.toBeNull()
    expect(prediction!.horizon).toBe('3_months')
    expect(prediction!.stylePredictions.length).toBe(8)
    expect(prediction!.valuePredictions.length).toBe(10)
  })

  it('预测应该包含可能的发展路径', () => {
    const dialogues1 = createTestDialogues(60)
    const model = usePersonalityModel(() => dialogues1)

    model.analyzeStyle()
    model.analyzeValues()
    model.buildTrajectory()

    const moreDialogues = [...dialogues1, ...createTestDialogues(40)]
    const model2 = usePersonalityModel(() => moreDialogues)

    model2.analyzeStyle()
    model2.analyzeValues()

    const prediction = model2.predictEvolution('6_months')
    expect(prediction).not.toBeNull()
    expect(prediction!.possiblePaths.length).toBeGreaterThan(0)
    expect(prediction!.overallConfidence).toBeGreaterThanOrEqual(0)
    expect(prediction!.overallConfidence).toBeLessThanOrEqual(1)
    expect(prediction!.basis.length).toBeGreaterThan(0)
  })

  it('getLatestPrediction 应该返回最新预测', () => {
    const model = usePersonalityModel(() => createTestDialogues(60))

    model.analyzeStyle()
    model.analyzeValues()
    model.buildTrajectory()

    expect(model.getLatestPrediction()).toBeNull()

    const moreDialogues = createTestDialogues(80)
    const model2 = usePersonalityModel(() => moreDialogues)
    model2.analyzeStyle()
    model2.analyzeValues()

    model2.predictEvolution()
    expect(model2.getLatestPrediction()).not.toBeNull()
  })
})

// ============================================================
// 综合画像测试
// ============================================================

describe('综合画像 (Full Profile)', () => {
  it('getFullProfile 应该返回完整画像', () => {
    const { getFullProfile } = usePersonalityModel(() => [])
    const profile = getFullProfile()

    expect(profile).toHaveProperty('style')
    expect(profile).toHaveProperty('values')
    expect(profile).toHaveProperty('trajectory')
    expect(profile).toHaveProperty('report')
    expect(profile).toHaveProperty('prediction')
  })

  it('空数据时所有字段应该为 null', () => {
    const { getFullProfile } = usePersonalityModel(() => [])
    const profile = getFullProfile()

    expect(profile.style).toBeNull()
    expect(profile.values).toBeNull()
    expect(profile.trajectory).toBeNull()
    expect(profile.report).toBeNull()
    expect(profile.prediction).toBeNull()
  })
})

// ============================================================
// 配置测试
// ============================================================

describe('配置管理', () => {
  it('默认配置应该正确', () => {
    const { config } = usePersonalityModel(() => [])
    expect(config.value.minDialoguesForStyle).toBe(20)
    expect(config.value.minDialoguesForValues).toBe(50)
    expect(config.value.trajectorySamplingInterval).toBe(7)
    expect(config.value.coreValueThreshold).toBe(0.7)
    expect(config.value.autoAnalysis).toBe(true)
  })

  it('updateConfig 应该能更新配置', () => {
    const { config, updateConfig } = usePersonalityModel(() => [])
    updateConfig({ minDialoguesForStyle: 30, coreValueThreshold: 0.8 })

    expect(config.value.minDialoguesForStyle).toBe(30)
    expect(config.value.coreValueThreshold).toBe(0.8)
    expect(config.value.minDialoguesForValues).toBe(50) // unchanged
  })
})

// ============================================================
// 元数据测试
// ============================================================

describe('元数据', () => {
  it('STYLE_DIMENSION_META 应该包含所有 8 个风格维度', () => {
    const expected: StyleDimension[] = [
      'conciseness', 'formality', 'emotionality', 'directness',
      'reflectiveness', 'creativity', 'analytical', 'social_warmth',
    ]
    for (const dim of expected) {
      expect(STYLE_DIMENSION_META[dim]).toBeDefined()
      expect(STYLE_DIMENSION_META[dim].label).toBeDefined()
      expect(STYLE_DIMENSION_META[dim].highLabel).toBeDefined()
      expect(STYLE_DIMENSION_META[dim].lowLabel).toBeDefined()
    }
  })

  it('VALUE_DIMENSION_META 应该包含所有 10 个价值观维度', () => {
    const expected: ValueDimension[] = [
      'autonomy', 'growth', 'connection', 'contribution', 'security',
      'pleasure', 'achievement', 'authenticity', 'balance', 'curiosity',
    ]
    for (const dim of expected) {
      expect(VALUE_DIMENSION_META[dim]).toBeDefined()
      expect(VALUE_DIMENSION_META[dim].label).toBeDefined()
      expect(VALUE_DIMENSION_META[dim].description).toBeDefined()
    }
  })

  it('GROWTH_PHASE_META 应该包含所有 5 个成长阶段', () => {
    const phases = ['initial', 'exploration', 'consolidation', 'transformation', 'integration']
    for (const phase of phases) {
      expect(GROWTH_PHASE_META[phase as keyof typeof GROWTH_PHASE_META]).toBeDefined()
      expect(GROWTH_PHASE_META[phase as keyof typeof GROWTH_PHASE_META].label).toBeDefined()
      expect(GROWTH_PHASE_META[phase as keyof typeof GROWTH_PHASE_META].description).toBeDefined()
    }
  })
})