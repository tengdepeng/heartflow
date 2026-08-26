import { describe, it, expect } from 'vitest'
import { renderMarkdown, stripMarkdown, countWords, countChars } from '../markdown'

describe('renderMarkdown', () => {
  it('renders plain text as paragraph', () => {
    expect(renderMarkdown('hello')).toBe('<p>hello</p>')
  })

  it('renders headings', () => {
    expect(renderMarkdown('# H1')).toBe('<h1>H1</h1>')
    expect(renderMarkdown('## H2')).toBe('<h2>H2</h2>')
    expect(renderMarkdown('###### H6')).toBe('<h6>H6</h6>')
  })

  it('renders bold text', () => {
    expect(renderMarkdown('**bold**')).toBe('<p><strong>bold</strong></p>')
  })

  it('renders italic text', () => {
    expect(renderMarkdown('*italic*')).toBe('<p><em>italic</em></p>')
  })

  it('renders inline code', () => {
    expect(renderMarkdown('`code`')).toBe('<p><code>code</code></p>')
  })

  it('renders links', () => {
    expect(renderMarkdown('[text](url)')).toBe('<p><a href="url" target="_blank" rel="noopener noreferrer">text</a></p>')
  })

  it('renders unordered list', () => {
    const input = '- item1\n- item2'
    expect(renderMarkdown(input)).toContain('<ul>')
    expect(renderMarkdown(input)).toContain('<li>item1</li>')
    expect(renderMarkdown(input)).toContain('<li>item2</li>')
  })

  it('renders ordered list', () => {
    const input = '1. first\n2. second'
    expect(renderMarkdown(input)).toContain('<ol>')
    expect(renderMarkdown(input)).toContain('<li>first</li>')
    expect(renderMarkdown(input)).toContain('<li>second</li>')
  })

  it('renders blockquote', () => {
    expect(renderMarkdown('> quote')).toBe('<blockquote>quote</blockquote>')
  })

  it('renders horizontal rule', () => {
    expect(renderMarkdown('---')).toBe('<hr>')
  })

  it('renders code block', () => {
    const input = '```\nconst x = 1\n```'
    expect(renderMarkdown(input)).toContain('<pre><code>')
    expect(renderMarkdown(input)).toContain('const x = 1')
  })

  it('escapes HTML in content', () => {
    expect(renderMarkdown('<script>alert("xss")</script>')).toContain('&lt;script&gt;')
  })

  it('renders mixed content', () => {
    const input = '# Title\n\n**bold** and *italic* and `code`'
    const result = renderMarkdown(input)
    expect(result).toContain('<h1>Title</h1>')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<code>code</code>')
  })

  // ---- 新增语法 ----

  it('renders strikethrough', () => {
    expect(renderMarkdown('~~deleted~~')).toBe('<p><del>deleted</del></p>')
  })

  it('renders task list unchecked', () => {
    const input = '- [ ] 待办事项'
    const result = renderMarkdown(input)
    expect(result).toContain('<ul class="task-list">')
    expect(result).toContain('<li class="task-item">')
    expect(result).toContain('<input type="checkbox" disabled>')
    expect(result).toContain('待办事项')
  })

  it('renders task list checked', () => {
    const input = '- [x] 已完成事项'
    const result = renderMarkdown(input)
    expect(result).toContain('<li class="task-item done">')
    expect(result).toContain('<input type="checkbox" disabled checked>')
    expect(result).toContain('已完成事项')
  })

  it('renders image', () => {
    expect(renderMarkdown('![alt](img.png)')).toBe('<p><img src="img.png" alt="alt" loading="lazy"></p>')
  })

  it('renders wikilink as anchor', () => {
    expect(renderMarkdown('[[note_1]]')).toBe(
      '<p><a class="wikilink" data-wikilink="note_1">note_1</a></p>',
    )
  })

  it('renders wikilink by title token', () => {
    expect(renderMarkdown('见 [[我的笔记]]')).toBe(
      '<p>见 <a class="wikilink" data-wikilink="我的笔记">我的笔记</a></p>',
    )
  })

  it('does not anchor wikilink inside inline code', () => {
    expect(renderMarkdown('`[[note_1]]`')).toBe('<p><code>[[note_1]]</code></p>')
  })

  it('escapes quotes in wikilink token', () => {
    const result = renderMarkdown('[[a"b]]')
    expect(result).toContain('data-wikilink="a&quot;b"')
    expect(result).toContain('>a&quot;b</a>')
  })

  it('renders code block with language', () => {
    const input = '```ts\nconst x: number = 1\n```'
    const result = renderMarkdown(input)
    expect(result).toContain('<code class="lang-ts">')
    expect(result).toContain('const x: number = 1')
  })

  it('renders basic table', () => {
    const input = '| 名称 | 数量 |\n| --- | --- |\n| 苹果 | 3 |\n| 香蕉 | 5 |'
    const result = renderMarkdown(input)
    expect(result).toContain('<table>')
    expect(result).toContain('<th>名称</th>')
    expect(result).toContain('<th>数量</th>')
    expect(result).toContain('<td>苹果</td>')
    expect(result).toContain('<td>3</td>')
    expect(result).toContain('<td>香蕉</td>')
    expect(result).toContain('<td>5</td>')
  })

  it('renders table with alignment', () => {
    const input = '| 左对齐 | 居中 | 右对齐 |\n| :--- | :---: | ---: |\n| a | b | c |'
    const result = renderMarkdown(input)
    expect(result).toContain('<th>左对齐</th>')
    expect(result).toContain('<th center>居中</th>')
    expect(result).toContain('<th right>右对齐</th>')
  })
})

describe('stripMarkdown', () => {
  it('strips markdown syntax', () => {
    expect(stripMarkdown('**bold** *italic* `code`')).toBe('bold italic code')
  })

  it('strips headings', () => {
    expect(stripMarkdown('# Title')).toBe('Title')
  })

  it('strips links', () => {
    expect(stripMarkdown('[text](url)')).toBe('text')
  })

  it('strips list markers', () => {
    expect(stripMarkdown('- item')).toBe('item')
  })

  it('strips blockquote', () => {
    expect(stripMarkdown('> quote')).toBe('quote')
  })

  it('strips strikethrough', () => {
    expect(stripMarkdown('~~deleted~~')).toBe('deleted')
  })

  it('strips image', () => {
    expect(stripMarkdown('![alt](img.png)')).toBe('alt')
  })

  it('strips wikilink to inner text', () => {
    expect(stripMarkdown('见 [[我的笔记]] 与 [[note_1]]')).toBe('见 我的笔记 与 note_1')
  })

  it('strips task list', () => {
    expect(stripMarkdown('- [x] done')).toBe('done')
  })

  it('strips table', () => {
    expect(stripMarkdown('| a | b |')).toBe('a  b')
  })
})

describe('countWords', () => {
  it('counts Chinese characters', () => {
    expect(countWords('你好世界')).toBe(4)
  })

  it('counts English words', () => {
    expect(countWords('hello world')).toBe(2)
  })

  it('counts mixed content', () => {
    expect(countWords('你好 world')).toBe(3)
  })

  it('ignores markdown syntax', () => {
    expect(countWords('**bold** text')).toBe(2)
  })

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0)
  })
})

describe('countChars', () => {
  it('counts characters', () => {
    expect(countChars('hello')).toBe(5)
  })

  it('strips markdown before counting', () => {
    expect(countChars('**bold**')).toBe(4)
  })
})