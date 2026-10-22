import { useEffect, useState } from 'react'
import { loadHistory } from './historySource'
import { exampleMovements } from './exampleMovements'
import { filterMovements, type HistoryFilters } from './filterMovements'
import type { HistoryMovement } from './types'
import './history.css'

type HistoryState = {
  status: 'loading' | 'unavailable' | 'error' | 'ready'
  movements: HistoryMovement[]
}

const initialFilters: HistoryFilters = {
  search: '', type: '', startDate: '', endDate: '', order: 'newest',
}
const PAGE_SIZE = 8
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

function HistoryIcon({ search = false }: { search?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {search ? <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></> :
        <><path d="M3 11a9 9 0 1 1 2.6 7.4M3 4v7h7" /><path d="M12 7v5l3 2" /></>}
    </svg>
  )
}

export default function HistoryPage() {
  const [state, setState] = useState<HistoryState>({ status: 'loading', movements: [] })
  const [reload, setReload] = useState(0)
  const [preview, setPreview] = useState(false)
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    loadHistory().then((movements) => {
      if (!cancelled) {
        setState(movements === null
          ? { status: 'unavailable', movements: [] }
          : { status: 'ready', movements })
      }
    }).catch(() => {
      if (!cancelled) setState({ status: 'error', movements: [] })
    })
    return () => { cancelled = true }
  }, [reload])

  function updateFilter<K extends keyof HistoryFilters>(name: K, value: HistoryFilters[K]) {
    setFilters((current) => ({ ...current, [name]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters(initialFilters)
    setPage(1)
  }

  function togglePreview() {
    setPreview((current) => !current)
    clearFilters()
  }

  function retry() {
    setState({ status: 'loading', movements: [] })
    setReload((current) => current + 1)
  }

  const available = preview || state.status === 'ready'
  const movements = preview ? exampleMovements : state.movements
  const invalidPeriod = Boolean(filters.startDate && filters.endDate && filters.startDate > filters.endDate)
  const filtered = invalidPeriod ? [] : filterMovements(movements, filters)
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const hasFilters = Boolean(filters.search || filters.type || filters.startDate || filters.endDate)
  const withdrawals = filtered.filter((movement) => movement.type === 'withdrawal').length
  const people = new Set(filtered.flatMap((movement) => movement.person_id === null ? [] : [movement.person_id])).size
  const stats = [
    { title: 'MOVIMENTAÇÕES', value: filtered.length, description: 'registros no período', color: '' },
    { title: 'RETIRADAS', value: withdrawals, description: 'saídas de chaves', color: 'history-red' },
    { title: 'DEVOLUÇÕES', value: filtered.length - withdrawals, description: 'chaves devolvidas', color: 'history-green' },
    { title: 'PESSOAS', value: people, description: 'com movimentações', color: '' },
  ]

  return (
    <main className="history-page">
      <div className="history-title-row">
        <div>
          <span className="history-eyebrow">REGISTRO DE ATIVIDADES</span>
          <h2>HISTÓRICO DE MOVIMENTAÇÕES</h2>
          <p>Acompanhe as retiradas e devoluções de chaves.</p>
        </div>
        <button className="history-button" type="button" onClick={togglePreview}>
          <HistoryIcon /> {preview ? 'VOLTAR AO HISTÓRICO' : 'VER DADOS DE EXEMPLO'}
        </button>
      </div>

      {preview && (
        <div className="history-preview" role="status">
          <span className="history-preview-label">DADOS DE EXEMPLO</span>
          <span>Prévia com registros fictícios. Nenhuma informação é salva no banco.</span>
        </div>
      )}

      <section className="history-stats" aria-label="Resumo das movimentações filtradas">
        {stats.map((stat) => (
          <article className="history-stat" key={stat.title}>
            <span className="history-stat-title">{stat.title}</span>
            <strong className={`history-stat-value ${stat.color}`}>{available ? String(stat.value).padStart(2, '0') : '—'}</strong>
            <span className="history-stat-description">{stat.description}</span>
          </article>
        ))}
      </section>

      <section className="history-panel" aria-label="Consulta de movimentações">
        <div className="history-filter-heading">
          <h3>FILTRAR HISTÓRICO</h3>
          <button type="button" className="history-clear" onClick={clearFilters} disabled={!hasFilters}>Limpar filtros <span aria-hidden="true">×</span></button>
        </div>
        <div className="history-filters">
          <label className="history-search">
            BUSCAR
            <span className="history-search-input">
              <HistoryIcon search />
              <input type="search" placeholder="Chave, imóvel ou pessoa..." value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} />
            </span>
          </label>
          <label>
            MOVIMENTAÇÃO
            <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value as HistoryFilters['type'])}>
              <option value="">Todas as movimentações</option>
              <option value="withdrawal">Retiradas</option>
              <option value="return">Devoluções</option>
            </select>
          </label>
          <label>
            DATA INICIAL
            <input type="date" value={filters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} aria-invalid={invalidPeriod} aria-describedby={invalidPeriod ? 'history-period-error' : undefined} />
          </label>
          <label>
            DATA FINAL
            <input type="date" value={filters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} aria-invalid={invalidPeriod} aria-describedby={invalidPeriod ? 'history-period-error' : undefined} />
          </label>
        </div>
        {invalidPeriod && <p className="history-error" id="history-period-error" role="alert">A data final deve ser igual ou posterior à data inicial.</p>}
      </section>

      <section className="history-panel history-records" aria-labelledby="history-records-title" aria-busy={!preview && state.status === 'loading'}>
        <div className="history-records-heading">
          <div>
            <h3 id="history-records-title">REGISTROS DE MOVIMENTAÇÕES</h3>
            <p aria-live="polite">{available ? `${filtered.length} ${filtered.length === 1 ? 'registro encontrado' : 'registros encontrados'}` : 'Retiradas e devoluções em um só lugar'}</p>
          </div>
          <label className="history-order">
            <span>Ordenar por</span>
            <select aria-label="Ordenar registros" value={filters.order} onChange={(event) => updateFilter('order', event.target.value as HistoryFilters['order'])}>
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
            </select>
          </label>
        </div>

        <div className="history-table-scroll" role="region" aria-label="Tabela de movimentações" tabIndex={0}>
          <table className="history-table">
            <thead><tr>
              <th scope="col">DATA / HORA</th><th scope="col">CHAVE / IMÓVEL</th>
              <th scope="col">MOVIMENTAÇÃO</th><th scope="col">RESPONSÁVEL</th><th scope="col">OBSERVAÇÕES</th>
            </tr></thead>
            <tbody>
              {available && visible.map((movement) => {
                const date = new Date(movement.created_at)
                return (
                  <tr key={movement.id}>
                    <td><time dateTime={movement.created_at}><span className="history-date">{dateFormat.format(date)}</span><span className="history-secondary history-time">{timeFormat.format(date)}</span></time></td>
                    <td><span className="history-key-code">{movement.key.code}</span><span className="history-secondary">{movement.key.description}</span></td>
                    <td><span className={`history-badge history-badge-${movement.type}`}><span aria-hidden="true">{movement.type === 'withdrawal' ? '↗' : '↙'}</span>{movement.type === 'withdrawal' ? 'RETIRADA' : 'DEVOLUÇÃO'}</span></td>
                    <td><span className="history-person">{movement.person?.name ?? 'Não informado'}</span><span className="history-secondary">Registrado por {movement.operator?.name ?? 'usuário não informado'}</span></td>
                    <td className="history-notes">{movement.notes || <span aria-label="Sem observações">—</span>}</td>
                  </tr>
                )
              })}
              {(!available || visible.length === 0) && (
                <tr><td colSpan={5}>
                  <div className="history-empty" role="status">
                    <span className="history-empty-icon"><HistoryIcon search={available && hasFilters} /></span>
                    <h4>{!preview && state.status === 'loading' ? 'Carregando histórico...' : !preview && state.status === 'error' ? 'Não foi possível carregar o histórico' : !preview && state.status === 'unavailable' ? 'Histórico ainda não disponível' : hasFilters ? 'Nenhuma movimentação encontrada' : 'Nenhuma movimentação registrada'}</h4>
                    <p>{!preview && state.status === 'loading' ? 'Aguarde enquanto consultamos os registros.' : !preview && state.status === 'error' ? 'Verifique sua conexão e tente novamente.' : !preview && state.status === 'unavailable' ? 'Você pode explorar os dados de exemplo enquanto os registros não estão disponíveis.' : hasFilters ? 'Tente buscar outro termo ou ajustar o período selecionado.' : 'As retiradas e devoluções aparecerão aqui quando forem registradas.'}</p>
                    {!preview && state.status === 'error' && <button className="history-button" type="button" onClick={retry}>TENTAR NOVAMENTE</button>}
                    {available && hasFilters && <button className="history-clear" type="button" onClick={clearFilters}>Limpar filtros</button>}
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="history-table-footer">
          <span>{available && filtered.length > 0 ? <>Exibindo <strong>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}</strong> de <strong>{filtered.length}</strong> registros</> : 'Nenhum registro para exibir'}</span>
          <nav className="history-pagination" aria-label="Paginação do histórico">
            <button className="history-button" type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1 || !available} aria-label="Página anterior">← <span>Anterior</span></button>
            <span aria-live="polite">{String(currentPage).padStart(2, '0')} <span className="history-page-divider">/</span> {String(pages).padStart(2, '0')}</span>
            <button className="history-button" type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pages || !available} aria-label="Próxima página"><span>Próxima</span> →</button>
          </nav>
        </footer>
      </section>
    </main>
  )
}
