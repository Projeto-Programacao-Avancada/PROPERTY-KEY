import { calculateLoanTiming, summarizeLoans } from './types.ts'
import type { HistoryMovement, Loan, MovementType, PersonHistory } from './types.ts'

// Dados fictícios exclusivos da prévia. Nunca são enviados à API ou ao banco.
const exampleKeys = [
  { id: 1, code: 'A01', description: 'Apto 101 — Bloco A' },
  { id: 2, code: 'A02', description: 'Apto 202 — Bloco A' },
  { id: 3, code: 'B01', description: 'Apto 103 — Bloco B' },
  { id: 4, code: 'G01', description: 'Garagem — Acesso principal' },
  { id: 5, code: 'S01', description: 'Salão de festas' },
]
const examplePeople = [
  { name: 'Mariana Costa', document: '12345678901' },
  { name: 'Lucas Almeida', document: '23456789012' },
  { name: 'Beatriz Santos', document: '34567890123' },
  { name: 'Pedro Oliveira', document: '45678901234' },
]

const HOUR = 60
const DAY = 24 * HOUR
const now = new Date()
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString()

// Datas relativas a "agora", para a prévia sempre mostrar posses em andamento realistas.
// heldMinutes null = ainda em posse; dueAfterMinutes null = retirada sem previsão.
const exampleLoanData = [
  { key: 4, person: 0, ago: 3 * DAY + 21 * HOUR, heldMinutes: 22 * HOUR, dueAfterMinutes: 20 * HOUR,
    notes: 'Reserva do salão.', returnNotes: 'Espaço conferido e fechado.' },
  { key: 2, person: 2, ago: 2 * DAY + 13 * HOUR, heldMinutes: 7 * HOUR + 35, dueAfterMinutes: 8 * HOUR,
    notes: 'Vistoria de entrada.', returnNotes: null },
  { key: 3, person: 1, ago: DAY + 15 * HOUR, heldMinutes: 9 * HOUR + 20, dueAfterMinutes: null,
    notes: 'Acesso para manutenção.', returnNotes: 'Manutenção concluída.' },
  { key: 1, person: 3, ago: DAY + 10 * HOUR, heldMinutes: 19 * HOUR, dueAfterMinutes: 10 * HOUR,
    notes: 'Apresentação do imóvel.', returnNotes: null },
  { key: 0, person: 0, ago: DAY + 5 * HOUR, heldMinutes: 80, dueAfterMinutes: 3 * HOUR,
    notes: 'Vistoria do apartamento.', returnNotes: 'Chave entregue na recepção.' },
  { key: 2, person: 1, ago: 3 * HOUR + 50, heldMinutes: null, dueAfterMinutes: 6 * HOUR,
    notes: 'Visita ao imóvel.', returnNotes: null },
  { key: 4, person: 2, ago: 6 * HOUR + 50, heldMinutes: null, dueAfterMinutes: 5 * HOUR,
    notes: 'Preparação do espaço para evento.', returnNotes: null },
]

const events = exampleLoanData
  .flatMap((loan, loanIndex) => [
    { loanIndex, type: 'withdrawal' as MovementType, ago: loan.ago },
    ...(loan.heldMinutes === null ? [] : [{ loanIndex, type: 'return' as MovementType, ago: loan.ago - loan.heldMinutes }]),
  ])
  .sort((a, b) => b.ago - a.ago || (a.type === 'withdrawal' ? -1 : 1))
  .map((event, index) => ({ ...event, id: index + 1 }))

export const exampleLoans: Loan[] = exampleLoanData.map((data, loanIndex) => {
  const withdrawal = events.find((event) => event.loanIndex === loanIndex && event.type === 'withdrawal')!
  const returned = events.find((event) => event.loanIndex === loanIndex && event.type === 'return')
  const dates = {
    retirado_em: minutesAgo(data.ago),
    previsto_em: data.dueAfterMinutes === null ? null : minutesAgo(data.ago - data.dueAfterMinutes),
    devolvido_em: returned ? minutesAgo(returned.ago) : null,
  }
  return {
    id: withdrawal.id,
    key_id: exampleKeys[data.key].id,
    key: { code: exampleKeys[data.key].code, description: exampleKeys[data.key].description },
    person_id: data.person + 1,
    person: { name: examplePeople[data.person].name },
    ...dates,
    ...calculateLoanTiming(dates, now),
  }
})

export const exampleMovements: HistoryMovement[] = events.map((event) => {
  const data = exampleLoanData[event.loanIndex]
  return {
    id: event.id,
    key_id: exampleKeys[data.key].id,
    person_id: data.person + 1,
    type: event.type,
    notes: event.type === 'withdrawal' ? data.notes : data.returnNotes,
    created_at: minutesAgo(event.ago),
    created_by: 1,
    key: { code: exampleKeys[data.key].code, description: exampleKeys[data.key].description },
    person: { name: examplePeople[data.person].name },
    operator: { name: 'Ana Ferreira' },
    loan: exampleLoans[event.loanIndex],
  }
}).sort((a, b) => b.id - a.id)

export function examplePersonHistory(personId: number): PersonHistory {
  const person = examplePeople[personId - 1]
  const loans = exampleLoans
    .filter((loan) => loan.person_id === personId)
    .sort((a, b) => new Date(b.retirado_em).getTime() - new Date(a.retirado_em).getTime())
  return {
    person: { id: personId, name: person?.name ?? 'Pessoa de exemplo', phone: null, email: null, document: person?.document ?? null },
    summary: summarizeLoans(loans),
    loans,
  }
}
