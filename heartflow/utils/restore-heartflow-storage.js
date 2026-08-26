/*
  Heartflow localStorage restore helper

  Usage:
  1. Open the app in a browser/webview with DevTools.
  2. Load a previous JSON backup file content into `backupJson`.
  3. Run this script in DevTools console.
  4. Refresh the app.
*/

(() => {
  const STORAGE_KEY = 'heartflow:storage'

  const backupJson = window.__HEARTFLOW_BACKUP_JSON__

  if (typeof backupJson !== 'string' || !backupJson.trim()) {
    console.error('[Heartflow Restore] Please assign backup JSON text to window.__HEARTFLOW_BACKUP_JSON__ first.')
    return
  }

  try {
    JSON.parse(backupJson)
    window.localStorage.setItem(STORAGE_KEY, backupJson)
    console.info('[Heartflow Restore] Backup restored. Refresh the app to load restored data.')
  } catch (error) {
    console.error('[Heartflow Restore] Invalid backup JSON.', error)
  }
})()
