import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { parseBookFile, parseEpub, stripHtmlToText } from '../book-import'

// 纯函数：HTML → 文本，不依赖 DOM
describe('stripHtmlToText', () => {
  it('去除标签并保留文字', () => {
    expect(stripHtmlToText('<p>Hello <b>World</b></p>')).toBe('Hello World')
  })
  it('压缩多余空行', () => {
    expect(stripHtmlToText('<p>a</p>\n\n\n<p>b</p>')).toBe('a\n\nb')
  })
  it('解码常见实体', () => {
    expect(stripHtmlToText('&amp; &lt; &gt; &quot; &apos;')).toBe('& < > " \'')
  })
  it('剥离 script/style 内容', () => {
    expect(stripHtmlToText('<style>x</style><p>可见</p><script>隐藏</script>')).toBe('可见')
  })
})

// EPUB：用 jszip 现场构造最小合法包，走完整 container→OPF→spine→正文 链路
async function buildMinimalEpub(): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip')
  zip.folder('META-INF')!.file(
    'container.xml',
    `<?xml version="1.0"?>
     <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
       <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
     </container>`,
  )
  zip.folder('OEBPS')!.file(
    'content.opf',
    `<?xml version="1.0"?>
     <package xmlns="http://www.idpf.org/2007/opf" version="3.0"
       xmlns:dc="http://purl.org/dc/elements/1.1/">
       <metadata><dc:title>测试书</dc:title></metadata>
       <manifest><item id="c1" href="chap1.xhtml" media-type="application/xhtml+xml"/></manifest>
       <spine><itemref idref="c1"/></spine>
     </package>`,
  )
  zip.folder('OEBPS')!.file(
    'chap1.xhtml',
    '<html><head><title>x</title></head><body><p>第一</p><p>第二</p></body></html>',
  )
  return zip.generateAsync({ type: 'uint8array' })
}

describe('parseEpub（乙-2 本地解析）', () => {
  it('从 OPF 取书名、按 spine 顺序拼出正文', async () => {
    const bytes = await buildMinimalEpub()
    const result = await parseEpub(bytes as unknown as File)
    expect(result.title).toBe('测试书')
    expect(result.text).toContain('第一')
    expect(result.text).toContain('第二')
  })
})

// .txt 分发：标题留空（由调用方按正文首行推导）
describe('parseBookFile 分发', () => {
  it('.txt 走纯文本读取且标题为空', async () => {
    const file = new File(['第一章\n这是正文'], 'notes.txt', { type: 'text/plain' })
    const r = await parseBookFile(file)
    expect(r.title).toBe('')
    expect(r.text).toContain('这是正文')
  })
})
