import { fetchHistory, fetchPersonHistory } from '../../lib/api'
import { examplePersonHistory } from './exampleMovements'
import type { HistoryMovement, PersonHistory, PersonRef } from './types'

export async function loadHistory(): Promise<HistoryMovement[]> {
  return (await fetchHistory()).movements
}

export function loadPersonHistory(person: PersonRef): Promise<PersonHistory> {
  return person.example ? Promise.resolve(examplePersonHistory(person.id)) : fetchPersonHistory(person.id)
}
