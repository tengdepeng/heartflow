// ============================================================
// 劳酬 · 数据导出（INCR-30：Excel 导出）
// 纯函数：把 RewardRecord 列表转成 Excel(.xls SpreadsheetML 2003) 或 CSV 文本。
// 不引入第三方库，产出可被 Excel/WPS 直接打开的格式。
// ============================================================
import type { RewardRecord } from './reward-list'
import { getLocalDateKey, getLocalMonthKey } from '../../utils/time'

export interface ExportRow {
  日期: string
  类型: string
  类别: string
  备注: string
  金额: number
  账户: string
  标签: string
}

export type ExportScope = 'all' | 'month' | 'range'

export interface ExportOptions {
  scope?: ExportScope
  /** scope=month 时取 yyyy-mm；scope=range 时取 yyyy-mm-dd（含） */
  month?: string
  from?: string
  to?: string
  /** 类别名解析（自定义分类标签），缺省回退原键 */
  categoryLabel?: (key: string) => string
  /** 账户名解析，缺省回退原 id */
  accountName?: (id: string) => string
}

export function buildExportRows(
  records: RewardRecord[],
  opts: ExportOptions = { scope: 'all' },
): ExportRow[] {
  const catLabel = opts.categoryLabel ?? ((k: string) => k)
  const accName = opts.accountName ?? ((id: string) => id)
  const scope = opts.scope ?? 'all'

  let list = records
  if (scope === 'month' && opts.month) {
    list = records.filter(r => getLocalMonthKey(r.at) === opts.month)
  } else if (scope === 'range' && opts.from && opts.to) {
    list = records.filter(r => {
      const d = getLocalDateKey(new Date(r.at))
      return d >= opts.from! && d <= opts.to!
    })
  }

  return [...list]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map(r => ({
      日期: getLocalDateKey(new Date(r.at)),
      类型: r.type === 'income' ? '收入' : '支出',
      类别: catLabel(r.category),
      备注: r.description ?? '',
      金额: r.type === 'income' ? r.amount : -r.amount,
      账户: accName(r.account ?? 'cash'),
      标签: (r.tags ?? []).join(','),
    }))
}

function csvCell(v: string | number): string {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** 生成 CSV 文本（UTF-8；用 \uFEFF BOM 前缀以便 Excel 正确识别中文） */
export function toCsv(rows: ExportRow[]): string {
  const header = ['日期', '类型', '类别', '备注', '金额', '账户', '标签']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push([
      csvCell(r.日期),
      csvCell(r.类型),
      csvCell(r.类别),
      csvCell(r.备注),
      csvCell(r.金额),
      csvCell(r.账户),
      csvCell(r.标签),
    ].join(','))
  }
  return '\uFEFF' + lines.join('\r\n')
}

/** 生成 Excel(.xls, SpreadsheetML 2003 XML) 文本，UTF-8 BOM 前缀，Excel/WPS 直接打开 */
export function toExcelXls(rows: ExportRow[]): string {
  const esc = (s: string | number) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const body = rows.map(r => {
    const cells = [
      `<Cell><Data ss:Type="String">${esc(r.日期)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${esc(r.类型)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${esc(r.类别)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${esc(r.备注)}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${r.金额}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${esc(r.账户)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${esc(r.标签)}</Data></Cell>`,
    ].join('')
    return `<Row>${cells}</Row>`
  }).join('')
  const header = [
    '日期', '类型', '类别', '备注', '金额', '账户', '标签',
  ].map(h => `<Cell ss:StyleID="h"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join('')

  return '\uFEFF' + `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="h"><Font ss:Bold="1"/></Style>
 </Styles>
 <Worksheet ss:Name="收支明细">
  <Table>
   <Row>${header}</Row>
   ${body}
  </Table>
 </Worksheet>
</Workbook>`
}

/** 下载辅助：Blob 触发浏览器下载 */
export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}