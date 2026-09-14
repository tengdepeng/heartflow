import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, computed, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { SutraAnnotation, MeditationGuide, AnnotationType } from '../../modules/body-wisdom'

// ---- 经书注解引擎 mock（保留真实 ANNOTATION_TYPE_META / CLASSIC_EXCERPTS） ----
const annotations: Ref<SutraAnnotation[]> = ref([])
const guides: Ref<MeditationGuide[]> = ref([])

const stats = computed(() => {
  const byType: Record<string, number> = {}
  for (const a of annotations.value) byType[a.type] = (byType[a.type] || 0) + 1
  return {
    total: annotations.value.length,
    digested: annotations.value.filter((a) => a.digested).length,
    digestionRate: annotations.value.length > 0
      ? Math.round(annotations.value.filter((a) => a.digested).length / annotations.value.length * 100)
      : 0,
    byType,
  }
})

const loadAnnotations = vi.fn(() => annotations.value)
const addAnnotation = vi.fn((sutraId: string, position: string, type: AnnotationType, content: string) => {
  const a: SutraAnnotation = {
    id: `ann-${annotations.value.length + 1}`,
    sutraId,
    position,
    type,
    content,
    createdAt: new Date().toISOString(),
    digested: false,
  }
  annotations.value = [...annotations.value, a]
  return a
})
const digestAnnotation = vi.fn((id: string) => {
  const a = annotations.value.find((x) => x.id === id)
  if (a) a.digested = true
  return !!a
})
const createMeditationGuide = vi.fn(
  (sutraId: string, title: string, relatedVerse: string, steps: { instruction: string; durationMinutes: number }[]) => {
    const g: MeditationGuide = {
      id: `guide-${guides.value.length + 1}`,
      sutraId,
      title,
      relatedVerse,
      steps,
      totalDuration: steps.reduce((s, st) => s + st.durationMinutes, 0),
    }
    guides.value = [...guides.value, g]
    return g
  },
)
const saveAnnotations = vi.fn()

vi.mock('../../modules/body-wisdom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../modules/body-wisdom')>()
  return {
    ...actual,
    useSutraAnnotations: () => ({
      annotations,
      guides,
      annotationStats: stats,
      loadAnnotations,
      addAnnotation,
      digestAnnotation,
      createMeditationGuide,
      saveAnnotations,
    }),
  }
})

import SutraAnnotationPanel from '../SutraAnnotationPanel.vue'

function makeAnn(id: string, type: AnnotationType, content: string, digested = false): SutraAnnotation {
  return {
    id,
    sutraId: 'c1',
    position: '第1段',
    type,
    content,
    createdAt: '2026-09-01T00:00:00.000Z',
    digested,
  }
}

beforeEach(() => {
  annotations.value = []
  guides.value = []
  loadAnnotations.mockClear()
  addAnnotation.mockClear()
  digestAnnotation.mockClear()
  createMeditationGuide.mockClear()
  saveAnnotations.mockClear()
})

describe('SutraAnnotationPanel · 经书注解接线', () => {
  it('空态渲染标题、副题与空态提示', async () => {
    const wrapper = mount(SutraAnnotationPanel)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sap-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('经书注解')
    expect(wrapper.text()).toContain('注解 · 感悟 · 冥想引导')
    expect(wrapper.text()).toContain('注解统计')
    expect(wrapper.text()).toContain('添加注解')
    expect(wrapper.text()).toContain('注解列表')
    expect(wrapper.text()).toContain('暂无注解，在下方记录对经文的注解与感悟。')
    expect(wrapper.text()).toContain('冥想引导')
    expect(loadAnnotations).toHaveBeenCalled()
  })

  it('注解统计渲染总数、已消化、消化率与分类分布', async () => {
    annotations.value = [
      makeAnn('a1', 'reflection', '感悟一'),
      makeAnn('a2', 'explanation', '注解二', true),
    ]
    const wrapper = mount(SutraAnnotationPanel)
    await wrapper.vm.$nextTick()
    const cells = wrapper.findAll('.sap-cell')
    expect(cells[0].text()).toContain('2')
    expect(cells[0].text()).toContain('总注解')
    expect(cells[1].text()).toContain('1')
    expect(cells[1].text()).toContain('已消化')
    expect(cells[2].text()).toContain('50%')
    expect(cells[2].text()).toContain('消化率')
    const chips = wrapper.findAll('.sap-type-chip')
    expect(chips.map((c) => c.text()).join(' ')).toContain('感悟 ×1')
    expect(chips.map((c) => c.text()).join(' ')).toContain('注解 ×1')
  })

  it('添加注解调用 addAnnotation 并更新列表', async () => {
    const wrapper = mount(SutraAnnotationPanel)
    await wrapper.vm.$nextTick()
    await wrapper.find('.sap-select').setValue('c2')
    await wrapper.find('.sap-input').setValue('第2段')
    const typeBtns = wrapper.findAll('.sap-type-btn')
    await typeBtns[3].trigger('click')
    await wrapper.find('.sap-textarea').setValue('此处存疑，待考。')
    await wrapper.find('.sap-save').trigger('click')
    expect(addAnnotation).toHaveBeenCalledWith('c2', '第2段', 'question', '此处存疑，待考。')
    expect(annotations.value.length).toBe(1)
    expect(annotations.value[0].type).toBe('question')
    expect(wrapper.text()).toContain('此处存疑，待考。')
  })

  it('内容为空时保存按钮禁用', async () => {
    const wrapper = mount(SutraAnnotationPanel)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sap-save').attributes('disabled')).toBeDefined()
  })

  it('注解列表渲染类型图标、内容、经文、位置与日期', async () => {
    annotations.value = [makeAnn('a1', 'reflection', '今日感悟：法于阴阳。')]
    const wrapper = mount(SutraAnnotationPanel)
    await wrapper.vm.$nextTick()
    const ann = wrapper.find('.sap-ann')
    expect(ann.exists()).toBe(true)
    expect(ann.text()).toContain('感悟')
    expect(ann.text()).toContain('今日感悟：法于阴阳。')
    expect(ann.text()).toContain('《黄帝内经·素问》·上古天真论')
    expect(ann.text()).toContain('第1段')
    expect(ann.text()).toContain('2026-09-01')
    expect(ann.text()).toContain('消化')
  })

  it('点击消化调用 digestAnnotation 并标记已消化', async () => {
    annotations.value = [makeAnn('a1', 'explanation', '注解内容')]
    const wrapper = mount(SutraAnnotationPanel)
    await wrapper.vm.$nextTick()
    await wrapper.find('.sap-digest').trigger('click')
    expect(digestAnnotation).toHaveBeenCalledWith('a1')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('✓ 已消化')
  })

  it('创建冥想引导调用 createMeditationGuide 并渲染引导列表', async () => {
    const wrapper = mount(SutraAnnotationPanel)
    await wrapper.vm.$nextTick()
    await wrapper.findAll('.sap-input--wide')[0].setValue('晨起调息')
    await wrapper.findAll('.sap-select')[1].setValue('c3')
    await wrapper.find('.sap-step .sap-input--wide').setValue('静坐调息')
    await wrapper.findAll('.sap-step .sap-input')[1].setValue(10)
    await wrapper.findAll('.sap-save')[1].trigger('click')
    expect(createMeditationGuide).toHaveBeenCalled()
    const args = createMeditationGuide.mock.calls[0]
    expect(args[0]).toBe('c3')
    expect(args[1]).toBe('晨起调息')
    expect(args[3]).toEqual([{ instruction: '静坐调息', durationMinutes: 10 }])
    expect(wrapper.text()).toContain('晨起调息')
    expect(wrapper.text()).toContain('共 10 分钟')
  })
})
