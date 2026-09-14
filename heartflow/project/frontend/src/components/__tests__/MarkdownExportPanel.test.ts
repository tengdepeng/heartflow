// ============================================================
// MarkdownExportPanel 笔记导出面板测试（INCR-104）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const mockExportToMarkdown = vi.fn()
const mockExportToHTML = vi.fn()
const mockExportToPDF = vi.fn()
const mockBatchExport = vi.fn()
const mockCopyToClipboard = vi.fn()
const mockDownloadAsFile = vi.fn()
const mockPreviewExport = vi.fn()

vi.mock('../../modules/note/markdown-export', () => ({
  useMarkdownExport: () => ({
    exportToMarkdown: mockExportToMarkdown,
    exportToHTML: mockExportToHTML,
    exportToPDF: mockExportToPDF,
    batchExport: mockBatchExport,
    copyToClipboard: mockCopyToClipboard,
    downloadAsFile: mockDownloadAsFile,
    previewExport: mockPreviewExport,
  }),
}))

interface NoteType {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

function sampleNote(overrides: Partial<NoteType> = {}): NoteType {
  return {
    id: 'note_1',
    title: '测试笔记',
    content: '这是一条测试笔记的内容',
    tags: ['vue', 'test'],
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-01-05T10:00:00Z',
    ...overrides,
  }
}

function sampleResult(overrides: Record<string, unknown> = {}) {
  return {
    content: '# 测试笔记\n\n内容',
    format: 'markdown',
    filename: '测试笔记-2026-01-05.md',
    noteCount: 1,
    totalChars: 20,
    exportedAt: '2026-01-05T10:00:00Z',
    ...overrides,
  }
}

async function getWrapper(notes: NoteType[] = []) {
  const { default: MarkdownExportPanel } = await import('../MarkdownExportPanel.vue')
  return mount(MarkdownExportPanel, { props: { notes } })
}

describe('MarkdownExportPanel 笔记导出', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('标题徽标与副题渲染', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.mdx').exists()).toBe(true)
    expect(wrapper.text()).toContain('笔记导出')
    expect(wrapper.text()).toContain('单篇 · 批量 · Markdown / HTML / PDF')
  })

  it('空态：无笔记时显示提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('书架还空着')
  })

  it('笔记列表渲染', async () => {
    const wrapper = await getWrapper([
      sampleNote(),
      sampleNote({ id: 'note_2', title: '第二篇' }),
    ])
    expect(wrapper.findAll('.mdx-item').length).toBe(2)
    expect(wrapper.text()).toContain('测试笔记')
    expect(wrapper.text()).toContain('第二篇')
  })

  it('渲染三个格式按钮与四个选项', async () => {
    const wrapper = await getWrapper([sampleNote()])
    expect(wrapper.findAll('.mdx-fmt').length).toBe(3)
    expect(wrapper.text()).toContain('Markdown')
    expect(wrapper.text()).toContain('HTML')
    expect(wrapper.text()).toContain('PDF')
    expect(wrapper.findAll('.mdx-opt').length).toBe(4)
  })

  it('切换格式到 HTML', async () => {
    const wrapper = await getWrapper([sampleNote()])
    await wrapper.findAll('.mdx-fmt')[1].trigger('click')
    await nextTick()
    expect(wrapper.findAll('.mdx-fmt')[1].classes()).toContain('active')
  })

  it('导出单篇 Markdown 调用 exportToMarkdown 并显示结果', async () => {
    const notes = [sampleNote()]
    mockExportToMarkdown.mockReturnValue(sampleResult())
    const wrapper = await getWrapper(notes)
    await wrapper.find('.mdx-item input').setValue(true)
    await nextTick()
    await wrapper.findAll('.mdx-actions .mdx-btn')[0].trigger('click')
    await nextTick()
    expect(mockExportToMarkdown).toHaveBeenCalledWith(notes[0], expect.any(Object))
    expect(wrapper.text()).toContain('测试笔记-2026-01-05.md')
    expect(wrapper.text()).toContain('1 篇')
  })

  it('导出单篇 HTML 调用 exportToHTML', async () => {
    const notes = [sampleNote()]
    mockExportToHTML.mockReturnValue(sampleResult({ format: 'html', filename: '测试笔记-2026-01-05.html' }))
    const wrapper = await getWrapper(notes)
    await wrapper.find('.mdx-item input').setValue(true)
    await wrapper.findAll('.mdx-fmt')[1].trigger('click')
    await nextTick()
    await wrapper.findAll('.mdx-actions .mdx-btn')[0].trigger('click')
    await nextTick()
    expect(mockExportToHTML).toHaveBeenCalled()
  })

  it('导出单篇 PDF 调用 exportToPDF', async () => {
    const notes = [sampleNote()]
    mockExportToPDF.mockReturnValue(sampleResult({ format: 'pdf', filename: '测试笔记-2026-01-05.pdf' }))
    const wrapper = await getWrapper(notes)
    await wrapper.find('.mdx-item input').setValue(true)
    await wrapper.findAll('.mdx-fmt')[2].trigger('click')
    await nextTick()
    await wrapper.findAll('.mdx-actions .mdx-btn')[0].trigger('click')
    await nextTick()
    expect(mockExportToPDF).toHaveBeenCalled()
  })

  it('批量导出调用 batchExport', async () => {
    const notes = [sampleNote(), sampleNote({ id: 'note_2', title: '第二篇' })]
    mockBatchExport.mockReturnValue(sampleResult({ noteCount: 2, filename: 'notes-export-2026-01-05.md' }))
    const wrapper = await getWrapper(notes)
    const inputs = wrapper.findAll('.mdx-item input')
    await inputs[0].setValue(true)
    await inputs[1].setValue(true)
    await nextTick()
    await wrapper.findAll('.mdx-actions .mdx-btn')[1].trigger('click')
    await nextTick()
    expect(mockBatchExport).toHaveBeenCalled()
    expect(wrapper.text()).toContain('notes-export-2026-01-05.md')
    expect(wrapper.text()).toContain('2 篇')
  })

  it('复制调用 copyToClipboard', async () => {
    const notes = [sampleNote()]
    mockCopyToClipboard.mockResolvedValue(true)
    const wrapper = await getWrapper(notes)
    await wrapper.find('.mdx-item input').setValue(true)
    await nextTick()
    await wrapper.findAll('.mdx-actions .mdx-btn')[2].trigger('click')
    await nextTick()
    expect(mockCopyToClipboard).toHaveBeenCalledWith(notes[0], expect.any(Object))
  })

  it('预览调用 previewExport 并显示预览', async () => {
    const notes = [sampleNote()]
    mockPreviewExport.mockReturnValue('# 测试笔记\n\n内容...')
    const wrapper = await getWrapper(notes)
    await wrapper.find('.mdx-item input').setValue(true)
    await nextTick()
    await wrapper.findAll('.mdx-actions .mdx-btn')[3].trigger('click')
    await nextTick()
    expect(mockPreviewExport).toHaveBeenCalled()
    expect(wrapper.find('.mdx-preview').exists()).toBe(true)
    expect(wrapper.text()).toContain('内容...')
  })

  it('下载调用 downloadAsFile', async () => {
    const notes = [sampleNote()]
    mockExportToMarkdown.mockReturnValue(sampleResult())
    const wrapper = await getWrapper(notes)
    await wrapper.find('.mdx-item input').setValue(true)
    await nextTick()
    await wrapper.findAll('.mdx-actions .mdx-btn')[0].trigger('click')
    await nextTick()
    await wrapper.find('.mdx-result .mdx-btn--small').trigger('click')
    await nextTick()
    expect(mockDownloadAsFile).toHaveBeenCalled()
  })
})


