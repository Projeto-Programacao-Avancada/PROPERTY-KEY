
type Stat = {
  title: string
  value: string
  description: string
  color: string
}

const stats: Stat[] = [
  {
    title: 'TOTAL DE CHAVES',
    value: '0',
    description: 'cadastradas',
    color: 'default',
  },
  {
    title: 'DISPONÍVEIS',
    value: '0',
    description: 'no momento',
    color: 'green',
  },
  {
    title: 'RETIRADAS',
    value: '0',
    description: 'em uso',
    color: 'red',
  },
  {
    title: 'PESSOAS REGISTRADAS',
    value: '0',
    description: 'pessoas cadastradas',
    color: 'default',
  },
]

function OccupancyCard() {
  const total = 0
  const retiradas = 0
  const disponiveis = 0
  const ocupacao =
    total > 0 ? (retiradas / total) * 100 : 0

  return (
    <section className="occupancy-card">
      <div className="section-heading">
        <div>
          <h3>OCUPAÇÃO DE CHAVES</h3>
          <p>Visão geral da utilização</p>
        </div>

        <span className="occupancy-percentage">
          {ocupacao.toFixed(0)}%
        </span>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${ocupacao}%` }}
        />
      </div>

      <div className="occupancy-legend">
        <span>
          <i className="dot green-dot" />
          {' '}Disponíveis: {disponiveis}
        </span>

        <span>
          <i className="dot red-dot" />
          {' '}Retiradas: {retiradas}
        </span>
      </div>
    </section>
  )
}

function MovementChart() {
  return (
    <section className="movement-card">
      <div className="movement-heading">
        <div>
          <h3>MOVIMENTAÇÕES DA SEMANA</h3>
          <p>Retiradas e devoluções de chaves</p>
        </div>

        <span className="chart-period">
          ÚLTIMOS 7 DIAS
        </span>
      </div>

      <div className="chart-legend">
        <span>
          <i className="legend-line withdrawal-line" />
          {' '}Retiradas
        </span>

        <span>
          <i className="legend-line return-line" />
          {' '}Devoluções
        </span>
      </div>

      <div className="chart-container">
        <p className="empty-state">
          Nenhuma movimentação registrada.
          O gráfico será atualizado quando houver
          dados no sistema.
        </p>
      </div>
    </section>
  )
}

function KeyLists() {
  return (
    <section className="lists-grid">
      <article className="list-card">
        <div className="list-heading">
          <div>
            <h3>CHAVES MAIS MOVIMENTADAS</h3>
            <p>Imóveis com mais movimentações</p>
          </div>

          <span className="list-number">TOP 4</span>
        </div>

        <div className="most-moved-list">
          <p className="empty-state">
            Ainda não há movimentações para exibir.
          </p>
        </div>
      </article>

      <article className="list-card">
        <div className="list-heading">
          <div>
            <h3>ATIVIDADE RECENTE</h3>
            <p>Últimas movimentações registradas</p>
          </div>

          <span className="list-number">HOJE</span>
        </div>

        <div className="activity-list">
          <p className="empty-state">
            Nenhuma atividade registrada até o momento.
          </p>
        </div>
      </article>
    </section>
  )
}

function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">⚿</div>

          <div>
            <h1>CONTROLE DE CHAVES</h1>
            <span>Gestão de Imóveis</span>
          </div>
        </div>

        <div className="header-actions">
          <span className="available">
            ● 0 disponíveis
          </span>

          <span className="removed">
            ● 0 retiradas
          </span>

          <button className="new-key" type="button">
            + NOVA CHAVE
          </button>
        </div>
      </header>

      <nav className="navigation">
        <button className="active" type="button">
          DASHBOARD
        </button>

        <button type="button">
          HISTÓRICO
        </button>

        <button type="button">
          CHAVES
        </button>
      </nav>

      <main className="dashboard">
        <section className="stats-grid">
          {stats.map((stat) => (
            <article
              className="stat-card"
              key={stat.title}
            >
              <span className="stat-title">
                {stat.title}
              </span>

              <strong
                className={`stat-value ${stat.color}`}
              >
                {stat.value}
              </strong>

              <span className="stat-description">
                {stat.description}
              </span>
            </article>
          ))}
        </section>

        <OccupancyCard />
        <MovementChart />
        <KeyLists />
      </main>
    </div>
  )
}

export default App
