import type { HistoryMovement } from './types'

// Dados fictícios exclusivos da prévia. Nunca são enviados à API ou ao banco.
const exampleKeys = [
  { id: 1, code: 'A01', description: 'Apto 101 — Bloco A' },
  { id: 2, code: 'A02', description: 'Apto 202 — Bloco A' },
  { id: 3, code: 'B01', description: 'Apto 103 — Bloco B' },
  { id: 4, code: 'G01', description: 'Garagem — Acesso principal' },
  { id: 5, code: 'S01', description: 'Salão de festas' },
]
const examplePeople = ['Mariana Costa', 'Lucas Almeida', 'Beatriz Santos', 'Pedro Oliveira']

export const exampleMovements: HistoryMovement[] = [
  { key: 0, person: 0, type: 'return', date: '2026-10-22T10:42:00-03:00', notes: 'Chave entregue na recepção.' },
  { key: 2, person: 1, type: 'withdrawal', date: '2026-10-22T10:15:00-03:00', notes: 'Visita ao imóvel.' },
  { key: 4, person: 2, type: 'withdrawal', date: '2026-10-22T09:30:00-03:00', notes: 'Preparação do espaço para evento.' },
  { key: 1, person: 3, type: 'return', date: '2026-10-22T09:05:00-03:00', notes: null },
  { key: 3, person: 1, type: 'return', date: '2026-10-21T17:50:00-03:00', notes: 'Manutenção concluída.' },
  { key: 0, person: 0, type: 'withdrawal', date: '2026-10-21T15:20:00-03:00', notes: 'Vistoria do apartamento.' },
  { key: 1, person: 3, type: 'withdrawal', date: '2026-10-21T14:10:00-03:00', notes: 'Apresentação do imóvel.' },
  { key: 3, person: 1, type: 'withdrawal', date: '2026-10-21T08:30:00-03:00', notes: 'Acesso para manutenção.' },
  { key: 2, person: 2, type: 'return', date: '2026-10-20T16:45:00-03:00', notes: null },
  { key: 4, person: 0, type: 'return', date: '2026-10-20T12:00:00-03:00', notes: 'Espaço conferido e fechado.' },
  { key: 2, person: 2, type: 'withdrawal', date: '2026-10-20T09:10:00-03:00', notes: 'Vistoria de entrada.' },
  { key: 4, person: 0, type: 'withdrawal', date: '2026-10-19T14:00:00-03:00', notes: 'Reserva do salão.' },
].map((item, index) => ({
  id: 1000 - index,
  key_id: exampleKeys[item.key].id,
  person_id: item.person + 1,
  type: item.type as HistoryMovement['type'],
  notes: item.notes,
  created_at: item.date,
  created_by: 1,
  key: { code: exampleKeys[item.key].code, description: exampleKeys[item.key].description },
  person: { name: examplePeople[item.person] },
  operator: { name: 'Ana Ferreira' },
}))
