
import { useEffect, useState } from 'react'
import HistoryPage from './features/history/HistoryPage'
import KeysPage from './features/keys/KeysPage'
import GalleryPage from './features/gallery/GalleryPage'
import {
  ApiError,
  clearToken,
  createKey,
  fetchKeys,
  fetchMe,
  fetchPeople,
  getToken,
  login,
  registerUser,
  returnKey,
  setUnauthorizedHandler,
  type ApiKey,
  type ApiPerson,
  type ApiUser,
  withdrawKey,
} from './lib/api'

type KeyRecord = ApiKey

function errorMessage(error: unknown) {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Erro inesperado.'
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
  onSave: (code: string, description: string) => Promise<string | null>
  existingCodes: string[]
}) {
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

    setSaving(true)
    const saveError = await onSave(normalizedCode, normalizedDescription)
    setSaving(false)

    if (saveError) setError(saveError)
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

          <button
            className="submit-key"
            type="submit"
            disabled={saving}
          >
            {saving ? 'SALVANDO...' : 'CADASTRAR CHAVE'}
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

function LoginScreen({
  onLogin,
  onRegister,
  onPreview,
}: {
  onLogin: (identifier: string, password: string) => Promise<string | null>
  onRegister: (name: string, email: string, phone: string, password: string) => Promise<string | null>
  onPreview: () => void
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [identifier, setIdentifier] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (mode === 'register') {
      if (!email.trim() && !phone.trim()) {
        setError('Informe um e-mail ou telefone para acessar sua conta.')
        return
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.')
        return
      }

      setError('')
      setSuccess('')
      setLoading(true)
      const registrationError = await onRegister(name, email, phone, password)
      setLoading(false)

      if (registrationError) {
        setError(registrationError)
      } else {
        setMode('login')
        setIdentifier(email.trim() || phone.trim())
        setPassword('')
        setConfirmPassword('')
        setSuccess('Conta criada. Entre com seu e-mail ou telefone e sua senha.')
      }
      return
    }

    if (!identifier.trim() || !password.trim()) {
      setError('Preencha o e-mail ou telefone e a senha.')
      return
    }

    setError('')
    setLoading(true)
    const loginError = await onLogin(identifier, password)
    setLoading(false)

    if (loginError) setError(loginError)
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
          <span className="login-eyebrow">
            {mode === 'login' ? 'ACESSO AO SISTEMA' : 'NOVO CADASTRO'}
          </span>
          <h2>{mode === 'login' ? 'Bem-vindo de volta.' : 'Crie sua conta.'}</h2>
          <p>
            {mode === 'login'
              ? 'Entre com seus dados para continuar.'
              : 'Informe seus dados para acessar o sistema.'}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <>
              <label htmlFor="register-name">NOME COMPLETO</label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setError('')
                }}
                placeholder="Digite seu nome"
                autoComplete="name"
                maxLength={120}
                required
              />

              <label htmlFor="register-email">E-MAIL (OPCIONAL)</label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                }}
                placeholder="voce@exemplo.com"
                autoComplete="email"
                maxLength={255}
              />

              <label htmlFor="register-phone">TELEFONE (OPCIONAL)</label>
              <input
                id="register-phone"
                type="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value)
                  setError('')
                }}
                placeholder="(71) 99999-9999"
                autoComplete="tel"
                maxLength={25}
              />
              <p className="login-hint">Informe pelo menos um: e-mail ou telefone.</p>
            </>
          ) : (
            <>
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
                  setSuccess('')
                }}
                placeholder="Digite seu e-mail ou telefone"
                autoComplete="username"
                required
              />
            </>
          )}

          <label htmlFor="login-password">
            {mode === 'register' ? 'SENHA (MÍNIMO 8 CARACTERES)' : 'SENHA'}
          </label>
          <div className="login-password-field">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
                setSuccess('')
              }}
              placeholder={mode === 'register' ? 'Crie uma senha' : 'Digite sua senha'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={mode === 'register' ? 8 : undefined}
              maxLength={mode === 'register' ? 72 : undefined}
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

          {mode === 'register' && (
            <>
              <label htmlFor="register-confirm-password">CONFIRMAR SENHA</label>
              <input
                id="register-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setError('')
                }}
                placeholder="Digite novamente sua senha"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
              />
            </>
          )}

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="login-success" role="status">
              {success}
            </p>
          )}

          <button
            className="login-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? mode === 'login' ? 'ENTRANDO...' : 'CRIANDO CONTA...'
              : mode === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}{' '}
            <span aria-hidden="true">→</span>
          </button>
        </form>

        {mode === 'login' ? (
          <>
            <button
              className="forgot-password"
              type="button"
              onClick={() =>
                setError(
                  'Para redefinir sua senha, fale com o administrador do sistema.'
                )
              }
            >
              Esqueceu sua senha?
            </button>
            <button
              className="register-access"
              type="button"
              onClick={() => {
                setMode('register')
                setError('')
                setSuccess('')
              }}
            >
              NÃO TEM UMA CONTA? <span>CADASTRE-SE</span>
            </button>
          </>
        ) : (
          <button
            className="register-access"
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
            }}
          >
            JÁ TEM UMA CONTA? <span>ENTRAR</span>
          </button>
        )}

        {import.meta.env.DEV && (
          <button
            className="preview-access"
            type="button"
            onClick={onPreview}
          >
            VER TODAS AS TELAS (PRÉVIA)
          </button>
        )}

        <div className="login-footer">
          ACESSO RESTRITO A USUÁRIOS AUTORIZADOS
        </div>
      </section>
    </main>
  )
}

function App() {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [keys, setKeys] = useState<KeyRecord[]>([])
  const [people, setPeople] = useState<ApiPerson[]>([])
  const [previewMode, setPreviewMode] = useState(false)
  const [dataError, setDataError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [activePage, setActivePage] = useState<
    'dashboard' | 'history' | 'keys' | 'gallery'
  >('dashboard')

  const isLoggedIn = user !== null

  function resetSession() {
    clearToken()
    setUser(null)
    setKeys([])
    setPeople([])
    setPreviewMode(false)
    setDataError('')
    setIsModalOpen(false)
    setActivePage('dashboard')
  }

  // Restaura a sessão a partir do token salvo e trata expiração
  useEffect(() => {
    setUnauthorizedHandler(resetSession)

    if (!getToken()) {
      setAuthLoading(false)
    } else {
      fetchMe()
        .then(setUser)
        .catch((error) => {
          console.error('Erro ao ler sessão:', error)
          if (!(error instanceof ApiError) || error.status === 401) {
            clearToken()
          }
        })
        .finally(() => setAuthLoading(false))
    }

    return () => setUnauthorizedHandler(null)
  }, [])

  // Carrega os dados quando o usuário está logado
  useEffect(() => {
    if (!user || previewMode) return

    let cancelled = false

    async function loadData() {
      try {
        const [keysData, peopleData] = await Promise.all([
          fetchKeys(),
          fetchPeople(),
        ])

        if (cancelled) return

        setDataError('')
        setKeys(keysData)
        setPeople(peopleData)
      } catch (error) {
        if (cancelled) return
        console.error('Erro ao carregar dados:', error)
        setDataError(errorMessage(error))
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [user, previewMode])

  function handlePreview() {
    setPreviewMode(true)
    setUser({ id: 0, name: 'Prévia', email: null, phone: null })
    setKeys([
      { id: 1, code: 'A01', description: 'Apartamento 101 — Bloco A', status: 'available' },
      { id: 2, code: 'A02', description: 'Apartamento 202 — Bloco A', status: 'withdrawn', responsible: 'Mariana Costa', since: '2026-11-04T09:30:00-03:00' },
      { id: 3, code: 'B01', description: 'Apartamento 103 — Bloco B', status: 'available' },
      { id: 4, code: 'G01', description: 'Garagem — Acesso principal', status: 'withdrawn', responsible: 'Lucas Almeida', since: '2026-11-04T11:15:00-03:00' },
      { id: 5, code: 'S01', description: 'Salão de festas', status: 'available' },
    ])
    setPeople([
      { id: 1, name: 'Mariana Costa', phone: null, email: null },
      { id: 2, name: 'Lucas Almeida', phone: null, email: null },
      { id: 3, name: 'Beatriz Santos', phone: null, email: null },
    ])
    setDataError('')
  }

  async function handleLogin(
    identifier: string,
    password: string
  ): Promise<string | null> {
    try {
      setUser(await login(identifier.trim(), password))
      return null
    } catch (error) {
      console.error('Erro ao entrar:', error)
      return errorMessage(error)
    }
  }

  async function handleRegister(
    name: string,
    email: string,
    phone: string,
    password: string
  ): Promise<string | null> {
    try {
      await registerUser(name.trim(), email, phone, password)
      return null
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      return errorMessage(error)
    }
  }

  function handleLogout() {
    resetSession()
  }

  async function handleSaveKey(
    code: string,
    description: string
  ): Promise<string | null> {
    if (!user) return 'Sua sessão expirou. Entre novamente.'

    try {
      const created = await createKey(code, description)

      setKeys((currentKeys) =>
        [...currentKeys, created].sort((a, b) =>
          a.code.localeCompare(b.code, 'pt-BR', { numeric: true })
        )
      )
      setIsModalOpen(false)
      return null
    } catch (error) {
      console.error('Erro ao salvar chave:', error)
      return errorMessage(error)
    }
  }

  async function handleWithdrawKey(
    keyId: number,
    responsibleName: string,
    document: string,
    notes: string
  ): Promise<string | null> {
    if (!user) return 'Sua sessão expirou. Entre novamente.'

    try {
      const updated = await withdrawKey(keyId, responsibleName, document, notes)
      setKeys((currentKeys) =>
        currentKeys.map((key) => key.id === updated.id ? updated : key)
      )
      fetchPeople().then(setPeople).catch((error) => {
        console.error('Erro ao atualizar pessoas cadastradas:', error)
      })
      return null
    } catch (error) {
      console.error('Erro ao registrar retirada:', error)
      return errorMessage(error)
    }
  }

  async function handleReturnKey(
    keyId: number,
    responsibleName: string,
    document: string,
    notes: string
  ): Promise<string | null> {
    if (!user) return 'Sua sessão expirou. Entre novamente.'

    try {
      const updated = await returnKey(keyId, responsibleName, document, notes)
      setKeys((currentKeys) =>
        currentKeys.map((key) => key.id === updated.id ? updated : key)
      )
      fetchPeople().then(setPeople).catch((error) => {
        console.error('Erro ao atualizar pessoas cadastradas:', error)
      })
      return null
    } catch (error) {
      console.error('Erro ao registrar devolução:', error)
      return errorMessage(error)
    }
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
      value: String(people.length),
      description: 'pessoas cadastradas',
      color: 'default',
    },
  ]

  if (authLoading) {
    return (
      <main className="login-page">
        <p className="empty-state">Carregando...</p>
      </main>
    )
  }

  if (!isLoggedIn) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        onPreview={handlePreview}
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
            {previewMode && (
              <span className="preview-notice">PRÉVIA · DADOS FICTÍCIOS</span>
            )}
            <span className="available">
              ● {disponiveis} disponíveis
            </span>
            <span className="removed">
              ● {retiradas} retiradas
            </span>
            {!previewMode && (
              <button
                className="new-key"
                type="button"
                onClick={() => setIsModalOpen(true)}
              >
                + NOVA CHAVE
              </button>
            )}
            <button
              className="logout"
              type="button"
              onClick={handleLogout}
            >
              SAIR
            </button>
          </div>
        </header>

        <nav className="navigation">
          <button
            className={activePage === 'dashboard' ? 'active' : ''}
            type="button"
            onClick={() => setActivePage('dashboard')}
            aria-current={activePage === 'dashboard' ? 'page' : undefined}
          >
            DASHBOARD
          </button>

          <button
            className={activePage === 'history' ? 'active' : ''}
            type="button"
            onClick={() => setActivePage('history')}
            aria-current={activePage === 'history' ? 'page' : undefined}
          >
            HISTÓRICO
          </button>

          <button
            className={activePage === 'keys' ? 'active' : ''}
            type="button"
            onClick={() => setActivePage('keys')}
            aria-current={activePage === 'keys' ? 'page' : undefined}
          >
            CHAVES
          </button>

          <button
            className={activePage === 'gallery' ? 'active' : ''}
            type="button"
            onClick={() => setActivePage('gallery')}
            aria-current={activePage === 'gallery' ? 'page' : undefined}
          >
            GALERIA
          </button>
        </nav>

        {activePage === 'history' ? (
          <HistoryPage previewMode={previewMode} />
        ) : activePage === 'keys' ? (
          <KeysPage keys={keys} onWithdraw={handleWithdrawKey} onReturn={handleReturnKey} readOnly={previewMode} />
        ) : activePage === 'gallery' ? (
          <GalleryPage keys={keys} />
        ) : (
          <main className="dashboard">
            {dataError && (
              <p className="form-error" role="alert">
                {dataError}
              </p>
            )}

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
        )}
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
