/*
  Heartflow localStorage backup exporter

  Usage:
  1. Open the running app in a browser or webview with DevTools.
  2. Open DevTools console.
  3. Paste this file content and run it.
  4. A JSON backup file will be downloaded locally.
*/

(() => {
  const STORAGE_KEY = 'heartflow:storage'
  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    console.warn(`[Heartflow Backup] No data found for key: ${STORAGE_KEY}`)
    return
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `heartflow-storage-backup-${stamp}.json`
  const blob = new Blob([raw], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  console.info(`[Heartflow Backup] Exported backup: ${fileName}`)
})()
