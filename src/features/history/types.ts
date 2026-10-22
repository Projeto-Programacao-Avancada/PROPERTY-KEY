export type MovementType = 'withdrawal' | 'return'

// Contrato proposto para a futura API. Os IDs seguem o modelo existente key_movements.
export type HistoryMovement = {
  id: number
  key_id: number
  person_id: number | null
  type: MovementType
  notes: string | null
  created_at: string
  created_by: number | null
  key: { code: string; description: string }
  person: { name: string } | null
  operator: { name: string } | null
}
