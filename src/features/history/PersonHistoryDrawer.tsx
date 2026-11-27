import { useEffect, useRef, useState } from 'react'
import { loadPersonHistory } from './historySource'
import { LoanDuration, LoanStatusBadge } from './LoanInfo'
import { formatDateTime, formatDocument, type PersonHistory, type PersonRef } from './types'
import { useNow } from '../../lib/useNow'
import './history.css'

type State = { status: 'loading' | 'error' } | { status: 'ready'; data: PersonHistory }

function StatCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <article className="person-stat">
      <span className="person-stat-title">{title}</span>
      <strong className="person-stat-value">{value}</strong>
      <span className="person-stat-description">{description}</span>
    </article>
  )
}

// Painel com as retiradas de uma pessoa. Quem abre deve usar `key` para trocar de pessoa.
export default function PersonHistoryDrawer({ person, onClose }: { person: PersonRef; onClose: () => void }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [reload, setReload] = useState(0)
  const closeButton = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const now = useNow()

  // Mantém o handler mais recente sem refazer o foco quando o pai renderiza de novo.
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    let cancelled = false
    loadPersonHistory(person)
      .then((data) => { if (!cancelled) setState({ status: 'ready', data }) })
      .catch(() => { if (!cancelled) setState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [person, reload])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  function retry() {
    setState({ status: 'loading' })
    setReload((current) => current + 1)
  }

  const data = state.status === 'ready' ? state.data : null
  const summary = data?.summary
  const delayDescription = !summary ? '' : summary.devolucoes_com_prazo === 0
    ? 'sem previsão de devolução'
    : `${summary.devolucoes_com_atraso} de ${summary.devolucoes_com_prazo} com atraso`

  return (
    <div className="person-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <aside className="person-drawer" role="dialog" aria-modal="true" aria-labelledby="person-drawer-title">
        <header className="person-drawer-header">
          <div>
            <span className="person-eyebrow">HISTÓRICO DE RETIRADAS</span>
            <h2 id="person-drawer-title">{data?.person.name ?? person.name}</h2>
            {data && <p>{formatDocument(data.person.document)}</p>}
          </div>
          <button ref={closeButton} className="person-close" type="button" onClick={onClose} aria-label="Fechar histórico">×</button>
        </header>

        <div className="person-drawer-body" aria-busy={state.status === 'loading'}>
          {state.status === 'loading' && <p className="person-message" role="status">Carregando histórico...</p>}
          {state.status === 'error' && (
            <div className="person-message" role="alert">
              <p>Não foi possível carregar o histórico desta pessoa.</p>
              <button className="person-retry" type="button" onClick={retry}>TENTAR NOVAMENTE</button>
            </div>
          )}

          {data && summary && (
            <>
              <section className="person-stats" aria-label="Resumo das retiradas">
                <StatCard title="RETIRADAS" value={String(summary.total_retiradas)} description="no total" />
                <StatCard title="EM POSSE AGORA" value={String(summary.em_posse)} description={summary.em_posse === 1 ? 'chave' : 'chaves'} />
                <StatCard title="DURAÇÃO MÉDIA REAL" value={summary.duracao_media_texto ?? '—'}
                  description={`${summary.devolucoes_concluidas} ${summary.devolucoes_concluidas === 1 ? 'devolução concluída' : 'devoluções concluídas'}`} />
                <StatCard title="MÉDIA DE DEMORA" value={summary.atraso_medio_texto ?? '—'} description={delayDescription} />
              </section>

              {data.loans.length === 0 ? (
                <p className="person-message">Esta pessoa ainda não retirou nenhuma chave.</p>
              ) : (
                <ol className="person-loans" aria-label="Retiradas, da mais recente para a mais antiga">
                  {data.loans.map((loan) => (
                    <li className="person-loan" key={loan.id}>
                      <div className="person-loan-head">
                        <div>
                          <span className="history-key-code">{loan.key.code}</span>
                          <span className="history-secondary">{loan.key.description}</span>
                        </div>
                        <div className="person-loan-status"><LoanStatusBadge loan={loan} /></div>
                      </div>
                      <dl className="person-loan-grid">
                        <div><dt>RETIRADA</dt><dd><time dateTime={loan.retirado_em}>{formatDateTime(loan.retirado_em)}</time></dd></div>
                        <div><dt>PREVISÃO</dt><dd>{loan.previsto_em ? <time dateTime={loan.previsto_em}>{formatDateTime(loan.previsto_em)}</time> : 'Não definida'}</dd></div>
                        <div><dt>DEVOLUÇÃO</dt><dd>{loan.devolvido_em ? <time dateTime={loan.devolvido_em}>{formatDateTime(loan.devolvido_em)}</time> : 'Ainda em posse'}</dd></div>
                        <div><dt>DURAÇÃO REAL</dt><dd><LoanDuration loan={loan} now={now} /></dd></div>
                      </dl>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
