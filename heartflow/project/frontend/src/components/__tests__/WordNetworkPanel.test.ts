import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, nextTick, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { WordEntry, EtymologyNode, SemanticNetwork, SemanticEdge, SemanticRelation } from '../../modules/word-mirror/types'

// ---- 词源引擎 mock ----
const etymologies: Ref<EtymologyNode[]> = ref([
  { word: '心', origin: '象形字，甲骨文像心脏之形', language: '甲骨文', cognates: ['芯', '沁'], components: ['心(独体象形)'] },
  { word: '思', origin: '从心囟声，本义为思考', language: '金文', cognates: ['腮'], components: ['田(囟)', '心'] },
])
const getEtymology = vi.fn((word: string) => etymologies.value.find((e) => e.word === word) ?? null)
const getRootRelatives = vi.fn((word: string) => {
  const t = getEtymology(word)
  if (!t || !t.components.length) return []
  const root = t.components[0].replace(/[（(].*[）)]/g, '')
  return etymologies.value.filter((e) => e.word !== word && e.components.some((c) => c.replace(/[（(].*[）)]/g, '') === root))
})
const addEtymology = vi.fn((node: EtymologyNode) => { etymologies.value.push(node) })
const suggestEtymologies = vi.fn((words: WordEntry[]) =>
  words.filter((w) => !etymologies.value.some((e) => e.word === w.word)).map((w) => ({
    word: w.word,
    suggestion: { word: w.word, origin: '待追溯', language: '未知', cognates: [], components: [] },
  })),
)
const getDictionarySize = vi.fn(() => etymologies.value.length)
const getEtymologiesByLanguage = vi.fn(() => {
  const g: Record<string, EtymologyNode[]> = {}
  for (const e of etymologies.value) {
    if (!g[e.language]) g[e.language] = []
    g[e.language].push(e)
  }
  return g
})
const searchEtymologies = vi.fn((query: string) =>
  etymologies.value.filter((e) => e.word.includes(query) || e.origin.includes(query)),
)

vi.mock('../../modules/word-mirror/etymology', () => ({
  useEtymologyNetwork: () => ({
    etymologies,
    getEtymology,
    getRootRelatives,
    addEtymology,
    suggestEtymologies,
    getDictionarySize,
    getEtymologiesByLanguage,
    searchEtymologies,
  }),
}))

// ---- 语义网络引擎 mock ----
const networks: Ref<SemanticNetwork[]> = ref([])
const buildNetwork = vi.fn((centerWord: string, wordPool: WordEntry[]) => ({
  nodes: [centerWord, ...wordPool.map((w) => w.word)].slice(0, 20),
  edges: [{ source: centerWord, target: '近义词', relationType: 'synonym' as SemanticRelation, strength: 0.9 }],
  center: centerWord,
}))
const describeRelation = vi.fn((edge: SemanticEdge) =>
  `${edge.source} ${edge.target}（近义，强度 ${Math.round(edge.strength * 100)}%）`,
)
const suggestRelatedWords = vi.fn((word: string, wordPool: WordEntry[]) =>
  wordPool.filter((w) => w.word !== word).map((w) => ({ word: w.word, relation: 'related' as SemanticRelation, reason: '共享标签' })),
)
const saveNetwork = vi.fn((network: SemanticNetwork) => { networks.value.push(network) })

vi.mock('../../modules/word-mirror/semantic-network', () => ({
  useSemanticNetwork: () => ({
    networks,
    buildNetwork,
    describeRelation,
    suggestRelatedWords,
    saveNetwork,
  }),
}))

import WordNetworkPanel from '../WordNetworkPanel.vue'

const words: WordEntry[] = [
  { id: 'w-1', word: '专注', definition: '集中注意力', proficiency: 1, favorite: false, tags: ['思考'], createdAt: '2026-01-01T00:00:00.000Z', reviewCount: 0 },
  { id: 'w-2', word: '坚持', definition: '持续不懈', proficiency: 1, favorite: false, tags: ['行动'], createdAt: '2026-01-02T00:00:00.000Z', reviewCount: 0 },
]

beforeEach(() => {
  etymologies.value = [
    { word: '心', origin: '象形字，甲骨文像心脏之形', language: '甲骨文', cognates: ['芯', '沁'], components: ['心(独体象形)'] },
    { word: '思', origin: '从心囟声，本义为思考', language: '金文', cognates: ['腮'], components: ['田(囟)', '心'] },
  ]
  networks.value = []
  getEtymology.mockClear()
  getRootRelatives.mockClear()
  addEtymology.mockClear()
  suggestEtymologies.mockClear()
  getDictionarySize.mockClear()
  getEtymologiesByLanguage.mockClear()
  searchEtymologies.mockClear()
  buildNetwork.mockClear()
  describeRelation.mockClear()
  suggestRelatedWords.mockClear()
  saveNetwork.mockClear()
})

describe('WordNetworkPanel · 词源与语义网络接线', () => {
  it('空态：标题渲染 + 统计（词典规模/语言覆盖/已存网络）', async () => {
    const wrapper = mount(WordNetworkPanel, { props: { words: [] } })
    await nextTick()
    const text = wrapper.text()
    expect(text).toContain('词源与语义网络')
    expect(text).toContain('词源追溯')
    expect(text).toContain('词典规模')
    expect(text).toContain('语言覆盖')
    expect(text).toContain('已存网络')
    expect(text).toContain('2') // 词典规模 2
    expect(text).toContain('0') // 已存网络 0
  })

  it('词源查询：输入词点查询 → getEtymology 接线 + 词源详情渲染', async () => {
    const wrapper = mount(WordNetworkPanel, { props: { words } })
    await nextTick()
    const input = wrapper.findAll('.wnp-input')[0]
    await input.setValue('心')
    await wrapper.findAll('.wnp-btn--primary')[0].trigger('click')
    expect(getEtymology).toHaveBeenCalledWith('心')
    await nextTick()
    const text = wrapper.text()
    expect(text).toContain('象形字，甲骨文像心脏之形')
    expect(text).toContain('语言 · 甲骨文')
    expect(text).toContain('同源 · 芯、沁')
    expect(text).toContain('构词 · 心(独体象形)')
  })

  it('词源查询：同根词渲染（getRootRelatives 接线）', async () => {
    const wrapper = mount(WordNetworkPanel, { props: { words } })
    await nextTick()
    const input = wrapper.findAll('.wnp-input')[0]
    await input.setValue('心')
    await wrapper.findAll('.wnp-btn--primary')[0].trigger('click')
    expect(getRootRelatives).toHaveBeenCalledWith('心')
    await nextTick()
    expect(wrapper.text()).toContain('同根词')
    expect(wrapper.text()).toContain('思') // 与「心」共享「心」根
  })

  it('词源查询：未找到时显示提示', async () => {
    const wrapper = mount(WordNetworkPanel, { props: { words } })
    await nextTick()
    const input = wrapper.findAll('.wnp-input')[0]
    await input.setValue('不存在')
    await wrapper.findAll('.wnp-btn--primary')[0].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('未找到该词的词源')
  })

  it('词源搜索：输入搜索词 → searchEtymologies 接线 + 结果列表渲染', async () => {
    const wrapper = mount(WordNetworkPanel, { props: { words } })
    await nextTick()
    const input = wrapper.findAll('.wnp-input')[1]
    await input.setValue('心')
    await nextTick()
    expect(searchEtymologies).toHaveBeenCalledWith('心')
    expect(wrapper.text()).toContain('象形字，甲骨文像心脏之形')
  })

  it('词源建议：词汇库中无词源的词渲染建议', async () => {
    const wrapper = mount(WordNetworkPanel, { props: { words } })
    await nextTick()
    expect(suggestEtymologies).toHaveBeenCalled()
    const text = wrapper.text()
    expect(text).toContain('词源建议')
    expect(text).toContain('专注')
    expect(text).toContain('坚持')
  })

  it('添加词源：填表单点添加 → addEtymology 接线', async () => {
    const wrapper = mount(WordNetworkPanel, { props: { words } })
    await nextTick()
    const inputs = wrapper.findAll('.wnp-input')
    // 词源添加表单：word / origin / language / cognates / components
    await inputs[2].setValue('悟')
    await inputs[3].setValue('从心吾声，本义为领悟')
    await inputs[4].setValue('说文')
    await inputs[5].setValue('梧,唔')
    await inputs[6].setValue('忄,吾')
    await wrapper.findAll('.wnp-btn--primary')[1].trigger('click')
    expect(addEtymology).toHaveBeenCalledWith({
      word: '悟',
      origin: '从心吾声，本义为领悟',
      language: '说文',
      cognates: ['梧', '唔'],
      components: ['忄', '吾'],
    })
  })

  it('语义网络：输入中心词点构建 → buildNetwork 接线 + 节点/边渲染 + 保存 → saveNetwork 接线', async () => {
    const wrapper = mount(WordNetworkPanel, { props: { words } })
    await nextTick()
    // 语义网络输入框（centerWord）
    const inputs = wrapper.findAll('.wnp-input')
    await inputs[7].setValue('思考')
    await wrapper.findAll('.wnp-btn--primary')[2].trigger('click')
    expect(buildNetwork).toHaveBeenCalledWith('思考', words)
    await nextTick()
    const text = wrapper.text()
    expect(text).toContain('思考')
    expect(text).toContain('专注')
    expect(text).toContain('近义，强度 90%')
    await wrapper.findAll('.wnp-network .wnp-btn')[0].trigger('click')
    expect(saveNetwork).toHaveBeenCalledWith(expect.objectContaining({ center: '思考' }))
    await nextTick()
    expect(wrapper.text()).toContain('已保存网络')
    expect(wrapper.text()).toContain('3 节点 · 1 边')
  })

  it('关联推荐：输入词点推荐 → suggestRelatedWords 接线 + 推荐列表渲染', async () => {
    const wrapper = mount(WordNetworkPanel, { props: { words } })
    await nextTick()
    const inputs = wrapper.findAll('.wnp-input')
    await inputs[8].setValue('专注')
    await wrapper.findAll('.wnp-btn--primary')[3].trigger('click')
    expect(suggestRelatedWords).toHaveBeenCalledWith('专注', words)
    await nextTick()
    const text = wrapper.text()
    expect(text).toContain('坚持')
    expect(text).toContain('相关')
    expect(text).toContain('共享标签')
  })

  it('已保存网络：networks 有数据时渲染列表', async () => {
    networks.value = [
      { nodes: ['思考', '思索'], edges: [{ source: '思考', target: '思索', relationType: 'synonym', strength: 0.9 }], center: '思考' },
    ]
    const wrapper = mount(WordNetworkPanel, { props: { words } })
    await nextTick()
    const text = wrapper.text()
    expect(text).toContain('已保存网络')
    expect(text).toContain('思考')
    expect(text).toContain('2 节点 · 1 边')
  })
})
