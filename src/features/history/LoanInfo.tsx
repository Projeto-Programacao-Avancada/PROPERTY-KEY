import { formatDuration, liveMinutes, type Loan } from './types'

// Duração real da posse; enquanto a chave não volta, mostra o tempo decorrido até `now`.
export function LoanDuration({ loan, now }: { loan: Loan; now: Date }) {
  const elapsed = liveMinutes(loan, now)
  if (elapsed !== null) {
    return <span className="loan-duration loan-duration-live">há {formatDuration(elapsed)}</span>
  }
  if (loan.duracao_real_minutos === null) return <span aria-label="Sem duração calculada">—</span>
  return <span className="loan-duration">{formatDuration(loan.duracao_real_minutos)}</span>
}

export function LoanStatusBadge({ loan }: { loan: Loan }) {
  return (
    <>
      <span className={`loan-badge loan-badge-${loan.status}`}>{loan.status_label}</span>
      {loan.status === 'returned_late' && loan.atraso_minutos !== null && (
        <span className="history-secondary">Atraso de {formatDuration(loan.atraso_minutos)}</span>
      )}
    </>
  )
}
