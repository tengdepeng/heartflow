// ============================================================
// 数据导入/导出
// ============================================================

import {
  downloadJSON,
  downloadMarkdown,
  downloadData,
  exportAllJSON,
  exportTimelineMarkdown,
  exportData,
  importJSON,
  importData,
} from '../engine/data-port'

export function useDataPort() {
  return {
    exportAllJSON,
    exportTimelineMarkdown,
    exportData,
    downloadJSON,
    downloadMarkdown,
    downloadData,
    importJSON,
    importData,
  }
}
