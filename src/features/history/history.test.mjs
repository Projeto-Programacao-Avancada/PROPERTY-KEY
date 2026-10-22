import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterMovements } from './filterMovements.ts'
import { loadHistory } from './historySource.ts'

const filters = { search: '', type: '', startDate: '', endDate: '', order: 'newest' }
const localDate = (day, hour, minute) => new Date(2026, 9, day, hour, minute).toISOString()
const movements = Object.freeze([
  { id: 1, key_id: 1, person_id: 1, created_by: 2, type: 'withdrawal',
    created_at: localDate(22, 0, 5), notes: 'Manutenção',
    key: { code: 'S01', description: 'Salão de festas' },
    person: { name: 'João Silva' }, operator: { name: 'Ana' } },
  { id: 2, key_id: 2, person_id: null, created_by: null, type: 'return',
    created_at: localDate(22, 23, 59), notes: null,
    key: { code: 'A01', description: 'Apartamento' }, person: null, operator: null },
  { id: 3, key_id: 2, person_id: null, created_by: null, type: 'return',
    created_at: localDate(23, 0, 1), notes: null,
    key: { code: 'A01', description: 'Apartamento' }, person: null, operator: null },
])
const ids = (options = {}) => filterMovements(movements, { ...filters, ...options }).map((item) => item.id)

test('busca ignora acentos, maiúsculas e espaços nas bordas', () => {
  assert.deepEqual(ids({ search: '  SALAO  ' }), [1])
  assert.deepEqual(ids({ search: 'joao' }), [1])
  assert.deepEqual(ids({ search: 'manutencao' }), [1])
  assert.deepEqual(ids({ search: 's01' }), [1])
})

test('filtra pelo tipo e permite combinar critérios', () => {
  assert.deepEqual(ids({ type: 'return' }), [3, 2])
  assert.deepEqual(ids({ type: 'return', search: 'SALAO' }), [])
})

test('inclui o primeiro e o último minuto do dia no fuso local', () => {
  assert.deepEqual(ids({ startDate: '2026-10-22', endDate: '2026-10-22' }), [2, 1])
  assert.deepEqual(ids({ startDate: '2026-10-23' }), [3])
  assert.deepEqual(ids({ endDate: '2026-10-22' }), [2, 1])
})

test('período invertido e busca sem correspondência não retornam registros', () => {
  assert.deepEqual(ids({ startDate: '2026-10-23', endDate: '2026-10-22' }), [])
  assert.deepEqual(ids({ search: 'inexistente' }), [])
})

test('ordena sem modificar a lista original e aceita campos opcionais nulos', () => {
  assert.deepEqual(ids(), [3, 2, 1])
  assert.deepEqual(ids({ order: 'oldest' }), [1, 2, 3])
  assert.deepEqual(movements.map((item) => item.id), [1, 2, 3])
  assert.deepEqual(filterMovements([], filters), [])
})

test('integração pendente retorna null sem chamar uma API inexistente', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', () => {
    throw new Error('A integração pendente não deve fazer requisições.')
  })
  assert.equal(await loadHistory(), null)
  assert.equal(fetchMock.mock.callCount(), 0)
})
