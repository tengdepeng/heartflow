import { loadSchema, saveSchema } from './core'
import type { LedgerRecord } from '../../types'
export function getLedger(): LedgerRecord[] { return loadSchema().ledger ?? [] }
export function addLedgerRecord(record: LedgerRecord): void { const s = loadSchema(); if (!s.ledger) s.ledger = []; s.ledger.push(record); saveSchema(s) }
export function removeLedgerRecord(id: string): void { const s = loadSchema(); if (!s.ledger) return; s.ledger = s.ledger.filter(r => r.id !== id); saveSchema(s) }