
import { useState } from 'react'

type KeyRecord = {
  id: number
  code: string
  description: string
  status: 'available' | 'withdrawn'
}

type Stat = {
  title: string
  value: string
  description: string
  color: string
}

function NewKeyModal({
  onClose,
  onSave,
  existingCodes,
}: {
  onClose: () => void
  onSave: (code: string, description: string) => void
  existingCodes: string[]
}) {
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedCode = code.trim().toUpperCase()
    const normalizedDescription = description.trim()

    if (!normalizedCode || !normalizedDescription) {
      setError('Preencha o código e a descrição.')
      return
    }

    if (
      existingCodes.some(
        (existingCode) =>
          existingCode.toUpperCase() === normalizedCode
      )
    ) {
      setError('Já existe uma chave com esse código.')
      return
    }

    onSave(normalizedCode, normalizedDescription)
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="key-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <h2 id="modal-title">CADASTRAR NOVA CHAVE</h2>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <form className="key-form" onSubmit={handleSubmit}>
          <label htmlFor="key-code">CÓDIGO *</label>
          <input
            id="key-code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              setError('')
            }}
            placeholder="Ex: A02, G01, S01"
            maxLength={30}
            autoFocus
            required
          />

          <label htmlFor="key-description">DESCRIÇÃO *</label>
          <input
            id="key-description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value)
              setError('')
            }}
            placeholder="Ex: Apto 201 – Bloco A"
            maxLength={120}
            required
          />

          {error && <p className="form-error">{error}</p>}

          <button className="submit-key" type="submit">
            CADASTRAR CHAVE
          </button>
        </form>
      </section>
    </div>
  )
}

function OccupancyCard({ keys }: { keys: KeyRecord[] }) {
  const total = keys.length
  const retiradas = keys.filter(
    (key) => key.status === 'withdrawn'
  ).length
  const disponiveis = total - retiradas
  const ocupacao =
    total > 0 ? (retiradas / total) * 100 : 0

  return (
    <section className="occupancy-card">
      <div className="section-heading">
        <div>
          <h3>TAXA DE OCUPAÇÃO</h3>
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
          {' '}{disponiveis} disponíveis
        </span>
        <span>
          <i className="dot red-dot" />
          {' '}{retiradas} em uso
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
          <h3>MOVIMENTAÇÕES — ÚLTIMOS 7 DIAS</h3>
          <p>Retiradas e devoluções de chaves</p>
        </div>
        <span className="chart-period">ÚLTIMOS 7 DIAS</span>
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
          Nenhuma movimentação registrada nos últimos 7 dias.
        </p>
      </div>
    </section>
  )
}

function MostMovedKeys() {
  return (
    <article className="list-card">
      <div className="list-heading">
        <div>
          <h3>CHAVES MAIS MOVIMENTADAS</h3>
          <p>Imóveis com mais movimentações</p>
        </div>
      </div>
      <div className="most-moved-list">
        <p className="empty-state">
          As chaves aparecerão aqui quando houver movimentações.
        </p>
      </div>
    </article>
  )
}

function WithdrawnKeys({ keys }: { keys: KeyRecord[] }) {
  const withdrawn = keys.filter(
    (key) => key.status === 'withdrawn'
  )

  return (
    <article className="list-card withdrawn-card">
      <div className="list-heading">
        <div>
          <h3>CHAVES RETIRADAS AGORA</h3>
          <p>Chaves que ainda não foram devolvidas</p>
        </div>
        <span className="list-number">{withdrawn.length}</span>
      </div>

      <div className="activity-list">
        {withdrawn.length === 0 ? (
          <p className="empty-state">
            Nenhuma chave retirada no momento.
          </p>
        ) : (
          withdrawn.map((key) => (
            <div className="activity-item" key={key.id}>
              <div className="activity-info">
                <strong>{key.code}</strong>
                <span>{key.description}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  )
}

function RecentActivity() {
  return (
    <article className="list-card">
      <div className="list-heading">
        <div>
          <h3>ATIVIDADE RECENTE</h3>
          <p>Últimas movimentações registradas</p>
        </div>
      </div>
      <div className="activity-list">
        <p className="empty-state">
          Nenhuma atividade registrada.
        </p>
      </div>
    </article>
  )
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!identifier.trim() || !password.trim()) {
      setError('Preencha o e-mail ou telefone e a senha.')
      return
    }

    setError('')
    onLogin()
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">⚿</div>
          <div>
            <h1>CONTROLE DE CHAVES</h1>
            <span>Gestão de Imóveis</span>
          </div>
        </div>

        <div className="login-heading">
          <span className="login-eyebrow">ACESSO AO SISTEMA</span>
          <h2>Bem-vindo de volta.</h2>
          <p>Entre com seus dados para continuar.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="login-identifier">
            E-MAIL OU NÚMERO DE TELEFONE
          </label>
          <input
            id="login-identifier"
            type="text"
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value)
              setError('')
            }}
            placeholder="Digite seu e-mail ou telefone"
            autoComplete="username"
            required
          />

          <label htmlFor="login-password">SENHA</label>
          <div className="login-password-field">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? 'OCULTAR' : 'MOSTRAR'}
            </button>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button className="login-submit" type="submit">
            ENTRAR <span aria-hidden="true">→</span>
          </button>
        </form>

        <button
          className="forgot-password"
          type="button"
          onClick={() =>
            setError(
              'A recuperação de senha estará disponível após a integração com o backend.'
            )
          }
        >
          Esqueceu sua senha?
        </button>

        <div className="login-footer">
          ACESSO RESTRITO A USUÁRIOS AUTORIZADOS
        </div>
      </section>
    </main>
  )
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [keys, setKeys] = useState<KeyRecord[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  function handleSaveKey(code: string, description: string) {
    const newKey: KeyRecord = {
      id: Date.now(),
      code,
      description,
      status: 'available',
    }

    setKeys((currentKeys) => [...currentKeys, newKey])
    setIsModalOpen(false)
  }

  const total = keys.length
  const disponiveis = keys.filter(
    (key) => key.status === 'available'
  ).length
  const retiradas = keys.filter(
    (key) => key.status === 'withdrawn'
  ).length

  const stats: Stat[] = [
    {
      title: 'TOTAL DE CHAVES',
      value: String(total),
      description: 'cadastradas',
      color: 'default',
    },
    {
      title: 'DISPONÍVEIS',
      value: String(disponiveis),
      description: 'no momento',
      color: 'green',
    },
    {
      title: 'RETIRADAS',
      value: String(retiradas),
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

  if (!isLoggedIn) {
    return (
      <LoginScreen
        onLogin={() => setIsLoggedIn(true)}
      />
    )
  }

  return (
    <>
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
              ● {disponiveis} disponíveis
            </span>
            <span className="removed">
              ● {retiradas} retiradas
            </span>
            <button
              className="new-key"
              type="button"
              onClick={() => setIsModalOpen(true)}
            >
              + NOVA CHAVE
            </button>
          </div>
        </header>

        <nav className="navigation">
          <button className="active" type="button">
            DASHBOARD
          </button>
          <button type="button">HISTÓRICO</button>
          <button type="button">CHAVES</button>
        </nav>

        <main className="dashboard">
          <section className="stats-grid">
            {stats.map((stat) => (
              <article className="stat-card" key={stat.title}>
                <span className="stat-title">{stat.title}</span>
                <strong className={`stat-value ${stat.color}`}>
                  {stat.value}
                </strong>
                <span className="stat-description">
                  {stat.description}
                </span>
              </article>
            ))}
          </section>

          <section className="overview-grid">
            <div className="overview-side">
              <OccupancyCard keys={keys} />
              <MostMovedKeys />
            </div>
            <MovementChart />
          </section>

          <section className="bottom-grid">
            <WithdrawnKeys keys={keys} />
            <RecentActivity />
          </section>
        </main>
      </div>

      {isModalOpen && (
        <NewKeyModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveKey}
          existingCodes={keys.map((key) => key.code)}
        />
      )}
    </>
  )
}

export default App
