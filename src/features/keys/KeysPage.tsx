

import { useState } from 'react'
import type { ApiKey } from '../../lib/api'
import './keys.css'

function CabinetHook() {
  return (
    <svg className="key-cabinet-hook" viewBox="0 0 24 30" aria-hidden="true" focusable="false">
      <ellipse className="key-cabinet-hook-base" cx="12" cy="4.5" rx="4.5" ry="2.7" />
      <circle className="key-cabinet-hook-screw" cx="12" cy="4.5" r="1" />
      <path className="key-cabinet-hook-shadow" d="M12 7v10.5c0 3.4-1.2 6-4 6-2.2 0-3.8-1.6-3.8-4.1" />
      <path className="key-cabinet-hook-metal" d="M11.3 7.2v10.1c0 3-1 5.3-3.2 5.3-1.6 0-2.8-1.2-2.8-3.1" />
      <path className="key-cabinet-hook-highlight" d="M10.4 8v9.4c0 2.1-.6 3.8-1.8 4.3" />
    </svg>
  )
}

const keyColors = ['#e6533d', '#2979b8', '#d69a18', '#19856f', '#8656a8', '#d45b91', '#566b35']

function keyColor(id: number) {
  // O ID não muda quando a tela atualiza ou quando o código da chave é editado.
  let hash = Math.imul(id ^ 0x45d9f3b, 0x45d9f3b)
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b)
  return keyColors[Math.abs(hash >>> 0) % keyColors.length]
}

function CabinetKey() {
  return (
    <svg className="key-cabinet-pendant" viewBox="0 0 24 38" aria-hidden="true" focusable="false">
      <circle className="key-cabinet-key-ring" cx="12" cy="5.5" r="4" />
      <path className="key-cabinet-key-shaft" d="M12 9.5v21.8" />
      <path className="key-cabinet-key-teeth" d="M12 25.5h5v3h-3v3h-2" />
      <path className="key-cabinet-key-glint" d="M10.7 3.4a2.5 2.5 0 0 0-.8 1.8" />
    </svg>
  )
}

type KeysPageProps = {
  keys: ApiKey[]
  onWithdraw: (keyId: number, responsibleName: string, document: string, notes: string) => Promise<string | null>
  onReturn: (keyId: number, responsibleName: string, document: string, notes: string) => Promise<string | null>
  onUpdate: (keyId: number, code: string, description: string) => Promise<string | null>
  onDelete: (keyId: number) => Promise<string | null>
  readOnly?: boolean
}

export default function KeysPage({ keys, onWithdraw, onReturn, onUpdate, onDelete, readOnly = false }: KeysPageProps) {
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [action, setAction] = useState<'withdrawal' | 'return'>('withdrawal')
  const [responsibleName, setResponsibleName] = useState('')
  const [document, setDocument] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [cabinetPage, setCabinetPage] = useState(0)
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingKey, setDeletingKey] = useState<ApiKey | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const filteredKeys = keys.filter((key) =>
    `${key.code} ${key.description}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )
  const cabinetKeys = [...keys].sort((a, b) =>
    a.code.localeCompare(b.code, 'pt-BR', { numeric: true })
  )
  const cabinetPageSize = 30
  const cabinetPageCount = Math.max(1, Math.ceil(cabinetKeys.length / cabinetPageSize))
  const visibleCabinetPage = Math.min(cabinetPage, cabinetPageCount - 1)
  const cabinetPageStart = visibleCabinetPage * cabinetPageSize
  const visibleCabinetKeys = cabinetKeys.slice(cabinetPageStart, cabinetPageStart + cabinetPageSize)
  const cabinetSlots = Array.from({ length: cabinetPageSize }, (_, index) => ({
    number: cabinetPageStart + index + 1,
    key: visibleCabinetKeys[index] ?? null,
  }))

  function openAction(key: ApiKey, nextAction: 'withdrawal' | 'return') {
    setSelectedKey(key)
    setAction(nextAction)
    setResponsibleName('')
    setDocument('')
    setNotes('')
    setError('')
  }

  function openEdit(key: ApiKey) {
    setEditingKey(key)
    setEditCode(key.code)
    setEditDescription(key.description)
    setEditError('')
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingKey) return

    const code = editCode.trim().toUpperCase()
    const description = editDescription.trim()
    if (!code || !description) {
      setEditError('Preencha o código e a descrição da chave.')
      return
    }

    setSavingEdit(true)
    setEditError('')
    try {
      const message = await onUpdate(editingKey.id, code, description)
      if (message) {
        setEditError(message)
        return
      }
      setEditingKey(null)
    } finally {
      setSavingEdit(false)
    }
  }

  async function confirmDelete() {
    if (!deletingKey) return
    setDeleting(true)
    setDeleteError('')
    try {
      const message = await onDelete(deletingKey.id)
      if (message) {
        setDeleteError(message)
        return
      }
      setDeletingKey(null)
    } finally {
      setDeleting(false)
    }
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
    if (!responsibleName.trim() || (action === 'withdrawal' && document.length !== 11)) {
      setError(action === 'withdrawal'
        ? 'Informe o responsável e um CPF com 11 números.'
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

        <section className="key-cabinet" aria-labelledby="key-cabinet-title">
          <div className="key-cabinet-heading">
            <div className="key-cabinet-title-group">
              <span className="key-cabinet-eyebrow">VISÃO FÍSICA</span>
              <h2 id="key-cabinet-title">Armário de chaves</h2>
              <p>Posições numeradas e organizadas pelo código.</p>
            </div>
            <div className="key-cabinet-tools">
              <div className="key-cabinet-total">
                <strong>{cabinetKeys.length}</strong>
                <span>{cabinetKeys.length === 1 ? 'chave cadastrada' : 'chaves cadastradas'}</span>
              </div>
              {cabinetPageCount > 1 && (
                <div className="key-cabinet-pagination" aria-label="Navegação do armário">
                  <button
                    type="button"
                    aria-label="Ver posições anteriores"
                    disabled={visibleCabinetPage === 0}
                    onClick={() => setCabinetPage(Math.max(0, visibleCabinetPage - 1))}
                  >
                    ‹
                  </button>
                  <span aria-live="polite">
                    {cabinetPageStart + 1}–{Math.min(cabinetPageStart + cabinetPageSize, cabinetKeys.length)} / {cabinetKeys.length}
                  </span>
                  <button
                    type="button"
                    aria-label="Ver próximas posições"
                    disabled={visibleCabinetPage >= cabinetPageCount - 1}
                    onClick={() => setCabinetPage(Math.min(cabinetPageCount - 1, visibleCabinetPage + 1))}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="key-cabinet-board" role="list" aria-label={`Posições ${cabinetPageStart + 1} a ${cabinetPageStart + cabinetPageSize} do armário`}>
            {cabinetSlots.map(({ number, key }) => (
              <div className="key-cabinet-slot" role="listitem" key={number}>
                <span className="key-cabinet-number">{number}</span>
                {key ? (
                  <button
                    className={`key-cabinet-hook-card ${key.status === 'available' ? 'is-available' : 'is-withdrawn'}`}
                    style={{ '--key-color': keyColor(key.id) } as React.CSSProperties}
                    type="button"
                    disabled={saving || readOnly}
                    title={readOnly ? `${key.code} · ${key.description}` : `${key.code} · ${key.description} · clique para registrar ${key.status === 'available' ? 'retirada' : 'devolução'}`}
                    aria-label={`Posição ${number}, chave ${key.code}, ${key.status === 'available' ? 'disponível' : 'retirada'}`}
                    onClick={() => openAction(key, key.status === 'available' ? 'withdrawal' : 'return')}
                  >
                    <span className="key-cabinet-hardware">
                      <CabinetHook />
                      <CabinetKey />
                    </span>
                    <span className="key-cabinet-code">{key.code}</span>
                  </button>
                ) : (
                  <div className="key-cabinet-empty" aria-label={`Posição ${number} livre`}>
                    <CabinetHook />
                    <span className="key-cabinet-free-label">LIVRE</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="key-cabinet-legend" aria-label="Legenda de status">
            <span><i className="is-available" /> Disponível</span>
            <span><i className="is-withdrawn" /> Retirada</span>
            <span><i className="is-empty" /> Posição livre</span>
          </div>
        </section>

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
                        <div className="key-row-actions">
                          <button
                            type="button"
                            className={`key-action ${isAvailable ? 'withdraw-action' : 'return-action'}`}
                            disabled={saving || readOnly}
                            title={readOnly ? 'Ações desativadas na prévia' : undefined}
                            onClick={() => openAction(key, isAvailable ? 'withdrawal' : 'return')}
                          >
                            {isAvailable ? 'RETIRAR' : 'DEVOLVER'}
                          </button>
                          <button
                            type="button"
                            className="key-icon-action"
                            aria-label={`Modificar chave ${key.code}`}
                            title="Modificar chave"
                            disabled={savingEdit || deleting || readOnly}
                            onClick={() => openEdit(key)}
                          >
                            <svg viewBox="0 0 16 16" aria-hidden="true">
                              <path d="m2.4 11.7-.6 2.5 2.5-.6 8.2-8.2-1.9-1.9-8.2 8.2Z" />
                              <path d="m9.7 4.1 1.9 1.9M2 14h12" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="key-icon-action delete"
                            aria-label={`Excluir chave ${key.code}`}
                            title={isAvailable ? 'Excluir chave' : 'Devolva a chave antes de excluí-la'}
                            disabled={!isAvailable || savingEdit || deleting || readOnly}
                            onClick={() => {
                              setDeletingKey(key)
                              setDeleteError('')
                            }}
                          >
                            <svg viewBox="0 0 16 16" aria-hidden="true">
                              <path d="M3 4.5h10M6 4.5V3h4v1.5m-5.5 0 .6 9h5.8l.6-9M6.5 7v4m3-4v4" />
                            </svg>
                          </button>
                        </div>
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
                onChange={(event) => setDocument(event.target.value.replace(/\D/g, '').slice(0, 11))}
                type="text"
                inputMode="numeric"
                pattern="[0-9]{11}"
                maxLength={11}
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

      {editingKey && (
        <div
          className="key-withdraw-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingEdit) setEditingKey(null)
          }}
        >
          <section className="key-withdraw-dialog key-manage-dialog" role="dialog" aria-modal="true" aria-labelledby="key-edit-title">
            <div className="key-withdraw-heading">
              <h2 id="key-edit-title">MODIFICAR CHAVE</h2>
              <button type="button" onClick={() => setEditingKey(null)} aria-label="Fechar" disabled={savingEdit}>×</button>
            </div>
            <form onSubmit={submitEdit}>
              <div className="key-withdraw-key-info">
                <strong>{editingKey.code}</strong>
                <span>Atualize os dados desta chave</span>
              </div>
              <label htmlFor="key-edit-code">CÓDIGO *</label>
              <input id="key-edit-code" value={editCode} onChange={(event) => setEditCode(event.target.value)} maxLength={30} required autoFocus />
              <label htmlFor="key-edit-description">DESCRIÇÃO *</label>
              <input id="key-edit-description" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={120} required />
              {editError && <p className="key-withdraw-error" role="alert">{editError}</p>}
              <div className="key-manage-actions">
                <button type="button" className="key-manage-cancel" onClick={() => setEditingKey(null)} disabled={savingEdit}>CANCELAR</button>
                <button type="submit" className="key-manage-save" disabled={savingEdit}>{savingEdit ? 'SALVANDO…' : 'SALVAR ALTERAÇÕES'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deletingKey && (
        <div
          className="key-withdraw-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) setDeletingKey(null)
          }}
        >
          <section className="key-withdraw-dialog key-manage-dialog" role="alertdialog" aria-modal="true" aria-labelledby="key-delete-title">
            <div className="key-withdraw-heading">
              <h2 id="key-delete-title">EXCLUIR CHAVE</h2>
              <button type="button" onClick={() => setDeletingKey(null)} aria-label="Fechar" disabled={deleting}>×</button>
            </div>
            <div className="key-delete-content">
              <div className="key-withdraw-key-info">
                <strong>{deletingKey.code}</strong>
                <span>{deletingKey.description}</span>
              </div>
              <p className="key-delete-warning">A chave e todo o histórico de movimentações dela serão excluídos permanentemente.</p>
              {deleteError && <p className="key-withdraw-error" role="alert">{deleteError}</p>}
              <div className="key-manage-actions">
                <button type="button" className="key-manage-cancel" onClick={() => setDeletingKey(null)} disabled={deleting}>CANCELAR</button>
                <button type="button" className="key-manage-delete" onClick={confirmDelete} disabled={deleting}>{deleting ? 'EXCLUINDO…' : 'EXCLUIR CHAVE'}</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
