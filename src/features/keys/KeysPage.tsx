

import { useState } from 'react'
import type { ApiKey } from '../../lib/api'
import './keys.css'

type KeysPageProps = {
  keys: ApiKey[]
}

export default function KeysPage({ keys }: KeysPageProps) {
  const [search, setSearch] = useState('')

  const filteredKeys = keys.filter((key) =>
    `${key.code} ${key.description}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

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
                        —
                      </td>

                      <td className="key-since">
                        —
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
                          disabled
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
    </main>
  )
}

