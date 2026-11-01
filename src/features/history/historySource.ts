import type { HistoryMovement } from './types'
import { fetchHistory } from '../../lib/api'

export function loadHistory(): Promise<HistoryMovement[] | null> {
  return fetchHistory()
}
