

import { useState } from 'react'
import type { ApiKey } from '../../lib/api'
import './keys.css'

type KeysPageProps = {
  keys: ApiKey[]
  onWithdraw: (keyId: number, responsibleName: string, document: string, notes: string) => Promise<string | null>
  onReturn: (keyId: number, responsibleName: string, document: string, notes: string) => Promise<string | null>
}

export default function KeysPage({ keys, onWithdraw, onReturn }: KeysPageProps) {
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [action, setAction] = useState<'withdrawal' | 'return'>('withdrawal')
  const [responsibleName, setResponsibleName] = useState('')
  const [document, setDocument] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const filteredKeys = keys.filter((key) =>
    `${key.code} ${key.description}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  function openAction(key: ApiKey, nextAction: 'withdrawal' | 'return') {
    setSelectedKey(key)
    setAction(nextAction)
    setResponsibleName('')
    setDocument('')
    setNotes('')
    setError('')
  }

  function closeWithdrawal() {
    if (saving) return
    setSelectedKey(null)
    setResponsibleName('')
    setDocument('')
    setNotes('')
    setError('')
  }

  async function submitWithdrawal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedKey) return
    if (!responsibleName.trim() || (action === 'withdrawal' && !document.trim())) {
      setError(action === 'withdrawal'
        ? 'Informe o responsável e o CPF ou documento.'
        : 'Informe quem está devolvendo a chave.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const submit = action === 'withdrawal' ? onWithdraw : onReturn
      const message = await submit(
        selectedKey.id,
        responsibleName.trim(),
        document.trim(),
        notes.trim()
      )
      if (message) {
        setError(message)
        return
      }
      setSelectedKey(null)
      setResponsibleName('')
      setDocument('')
      setNotes('')
      setError('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="keys-page">
      <section className="keys-content">
        <div className="keys-toolbar">
          <input
            type="text"
            placeholder="Buscar por código ou descrição..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {filteredKeys.length > 0 ? (
          <div className="keys-table-wrapper">
            <table className="keys-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Status</th>
                  <th>Responsável atual</th>
                  <th>Desde</th>
                  <th>Imagens</th>
                  <th>Ação</th>
                </tr>
              </thead>

              <tbody>
                {filteredKeys.map((key) => {
                  const isAvailable = key.status === 'available'

                  return (
                    <tr key={key.id}>
                      <td className="key-code">
                        {key.code}
                      </td>

                      <td className="key-description">
                        {key.description}
                      </td>

                      <td>
                        <span
                          className={`key-status ${
                            isAvailable ? 'available' : 'withdrawn'
                          }`}
                        >
                          {isAvailable ? 'DISPONÍVEL' : 'RETIRADA'}
                        </span>
                      </td>

                      <td className="key-responsible">
                        {key.status === 'withdrawn' ? key.responsible || '—' : '—'}
                      </td>

                      <td className="key-since">
                        {key.status === 'withdrawn' && key.since
                          ? new Date(key.since).toLocaleString('pt-BR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>

                      <td>
                        <span className="key-images">
                          <span aria-hidden="true">▧</span>
                          0
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className={`key-action ${
                            isAvailable
                              ? 'withdraw-action'
                              : 'return-action'
                          }`}
                          disabled={saving}
                          onClick={() => {
                            openAction(key, isAvailable ? 'withdrawal' : 'return')
                          }}
                        >
                          {isAvailable ? 'RETIRAR' : 'DEVOLVER'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="keys-empty">
            <h3>Nenhuma chave encontrada</h3>
            <p>
              Não encontramos chaves com esse código ou descrição.
            </p>
          </div>
        )}
      </section>

      {selectedKey && (
        <div
          className="key-withdraw-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeWithdrawal()
          }}
        >
          <section
            className={`key-withdraw-dialog ${action === 'return' ? 'key-return-dialog' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="key-withdraw-title"
          >
            <div className="key-withdraw-heading">
              <h2 id="key-withdraw-title">
                {action === 'withdrawal' ? 'REGISTRAR RETIRADA' : 'REGISTRAR DEVOLUÇÃO'}
              </h2>
              <button type="button" onClick={closeWithdrawal} aria-label="Fechar" disabled={saving}>
                ×
              </button>
            </div>

            <form onSubmit={submitWithdrawal}>
              <div className="key-withdraw-key-info">
                <strong>{selectedKey.code}</strong>
                <span>{selectedKey.description}</span>
              </div>

              {action === 'return' && (
                <div className="key-return-summary">
                  <p>Retirada por <strong>{selectedKey.responsible || 'Responsável não informado'}</strong></p>
                  <time>
                    {selectedKey.since
                      ? new Date(selectedKey.since).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      : 'Data não informada'}
                  </time>
                </div>
              )}

              <label htmlFor="key-withdraw-name">
                {action === 'withdrawal' ? 'RESPONSÁVEL *' : 'DEVOLVIDA POR *'}
              </label>
              <input
                id="key-withdraw-name"
                value={responsibleName}
                onChange={(event) => setResponsibleName(event.target.value)}
                maxLength={120}
                placeholder={action === 'withdrawal' ? 'Nome completo' : 'Nome do responsável'}
                autoComplete="name"
                required
              />

              <label htmlFor="key-withdraw-document">
                CPF / DOCUMENTO{action === 'withdrawal' ? ' *' : ''}
              </label>
              <input
                id="key-withdraw-document"
                value={document}
                onChange={(event) => setDocument(event.target.value)}
                maxLength={30}
                placeholder="000.000.000-00"
                autoComplete="off"
                required={action === 'withdrawal'}
              />

              <label htmlFor="key-withdraw-notes">OBSERVAÇÕES</label>
              <input
                id="key-withdraw-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={5000}
                placeholder="Opcional"
              />

              {error && <p className="key-withdraw-error" role="alert">{error}</p>}

              <div className="key-withdraw-actions">
                <button type="submit" disabled={saving}>
                  {saving
                    ? 'REGISTRANDO…'
                    : action === 'withdrawal' ? 'CONFIRMAR RETIRADA' : 'CONFIRMAR DEVOLUÇÃO'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

