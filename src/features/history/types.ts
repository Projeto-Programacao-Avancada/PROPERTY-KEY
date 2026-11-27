export type MovementType = 'withdrawal' | 'return'

export type LoanStatus =
  | 'in_possession'
  | 'returned_on_time'
  | 'returned_late'
  | 'returned' // devolvida, mas a retirada não tinha previsão
  | 'unreturned' // dado inconsistente: nova retirada sem devolução anterior

// Uma retirada pareada com a devolução correspondente (contrato de /movements e /people/{id}/history).
export type Loan = {
  id: number // id da movimentação de retirada
  key_id: number
  key: { code: string; description: string }
  person_id: number | null
  person: { name: string } | null
  retirado_em: string
  previsto_em: string | null
  devolvido_em: string | null
  status: LoanStatus
  status_label: string
  duracao_real_minutos: number | null
  duracao_real_texto: string | null
  em_posse_minutos: number | null
  atraso_minutos: number | null
}

export type LoanMetrics = {
  total_retiradas: number
  em_posse: number
  devolucoes_concluidas: number
  duracao_media_minutos: number | null
  duracao_media_texto: string | null
  devolucoes_com_prazo: number
  devolucoes_com_atraso: number
  taxa_atraso: number | null // 0..1, entre as devoluções com prazo
  atraso_medio_minutos: number | null
  atraso_medio_texto: string | null
}

// Os IDs seguem o modelo existente key_movements.
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
  loan: Loan | null // null em devoluções sem retirada anterior (registros legados)
}

export type HistoryResponse = {
  movements: HistoryMovement[]
  summary: LoanMetrics
}

export type PersonDetail = {
  id: number
  name: string
  phone: string | null
  email: string | null
  document: string | null
}

export type PersonHistory = {
  person: PersonDetail
  summary: LoanMetrics
  loans: Loan[]
}

// Pessoa cujo histórico será aberto; `example` usa os dados fictícios da prévia.
export type PersonRef = { id: number; name: string; example?: boolean }

// ---------------------------------------------------------------- formatação

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const formatDate = (value: string | Date) => dateFormat.format(new Date(value))
export const formatTime = (value: string | Date) => timeFormat.format(new Date(value))
export const formatDateTime = (value: string | Date) => `${formatDate(value)} ${formatTime(value)}`

// `45 min`, `2h 15min`, `1d 3h 20min` (mesma regra do backend).
export function formatDuration(minutes: number) {
  const total = Math.max(0, Math.floor(minutes + 0.5))
  const days = Math.floor(total / 1440)
  const hours = Math.floor((total % 1440) / 60)
  const mins = total % 60
  if (!days && !hours) return `${mins} min`
  return [days && `${days}d`, hours && `${hours}h`, mins && `${mins}min`].filter(Boolean).join(' ')
}

export function formatDocument(document: string | null) {
  if (!document) return 'Documento não informado'
  return /^\d{11}$/.test(document)
    ? document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : document
}

// ------------------------------------------------------------------- cálculo

// Minutos inteiros (truncados) entre dois instantes; nunca negativo.
export function minutesBetween(start: string | Date, end: string | Date) {
  const difference = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(0, Math.floor(difference / 60000))
}

export const STATUS_LABELS: Record<LoanStatus, string> = {
  in_possession: 'Em posse',
  returned_on_time: 'Devolvida no prazo',
  returned_late: 'Devolvida com atraso',
  returned: 'Devolvida',
  unreturned: 'Sem devolução registrada',
}

type LoanDates = { retirado_em: string; previsto_em: string | null; devolvido_em: string | null }
export type LoanTiming = Pick<
  Loan,
  'status' | 'status_label' | 'duracao_real_minutos' | 'duracao_real_texto' | 'em_posse_minutos' | 'atraso_minutos'
>

// Duração real, tempo em posse e atraso de um empréstimo (mesmas regras do backend).
// Sem `devolvido_em` o empréstimo está em posse; sem `previsto_em` o atraso é null.
export function calculateLoanTiming({ retirado_em, previsto_em, devolvido_em }: LoanDates, now: Date): LoanTiming {
  const duration = devolvido_em ? minutesBetween(retirado_em, devolvido_em) : null
  const delay = devolvido_em && previsto_em ? minutesBetween(previsto_em, devolvido_em) : null
  const status: LoanStatus = !devolvido_em ? 'in_possession'
    : delay === null ? 'returned'
    : delay > 0 ? 'returned_late' : 'returned_on_time'

  return {
    status,
    status_label: STATUS_LABELS[status],
    duracao_real_minutos: duration,
    duracao_real_texto: duration === null ? null : formatDuration(duration),
    em_posse_minutos: devolvido_em ? null : minutesBetween(retirado_em, now),
    atraso_minutos: delay,
  }
}

// Tempo em posse recalculado a cada tick da tela; null quando a chave já foi devolvida.
export const liveMinutes = (loan: Loan, now: Date) =>
  loan.status === 'in_possession' ? minutesBetween(loan.retirado_em, now) : null

const mean = (values: number[]) =>
  values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null

// Totais, duração média e média de demora. Empréstimos em aberto ficam fora das médias;
// a média de demora considera só devoluções com previsão (no prazo conta como 0).
export function summarizeLoans(loans: Loan[]): LoanMetrics {
  const durations = loans.flatMap((loan) => loan.duracao_real_minutos === null ? [] : [loan.duracao_real_minutos])
  const delays = loans.flatMap((loan) => loan.atraso_minutos === null ? [] : [loan.atraso_minutos])
  const late = delays.filter((delay) => delay > 0).length
  const averageDuration = mean(durations)
  const averageDelay = mean(delays)

  return {
    total_retiradas: loans.length,
    em_posse: loans.filter((loan) => loan.status === 'in_possession').length,
    devolucoes_concluidas: durations.length,
    duracao_media_minutos: averageDuration,
    duracao_media_texto: averageDuration === null ? null : formatDuration(averageDuration),
    devolucoes_com_prazo: delays.length,
    devolucoes_com_atraso: late,
    taxa_atraso: delays.length ? Math.round((late / delays.length) * 10000) / 10000 : null,
    atraso_medio_minutos: averageDelay,
    atraso_medio_texto: averageDelay === null ? null : formatDuration(averageDelay),
  }
}

// Empréstimos distintos ligados às movimentações (retirada e devolução contam uma vez).
export function loansOf(movements: HistoryMovement[]): Loan[] {
  const loans = new Map<number, Loan>()
  for (const movement of movements) {
    if (movement.loan) loans.set(movement.loan.id, movement.loan)
  }
  return [...loans.values()]
}

export const summarizeMovements = (movements: HistoryMovement[]) => summarizeLoans(loansOf(movements))

// Quem retirou a chave: a pessoa do empréstimo ou, sem ele, a da própria movimentação.
export function borrowerOf(movement: HistoryMovement): { id: number; name: string } | null {
  const id = movement.loan?.person_id ?? movement.person_id
  const name = (movement.loan?.person ?? movement.person)?.name
  return id === null || !name ? null : { id, name }
}
