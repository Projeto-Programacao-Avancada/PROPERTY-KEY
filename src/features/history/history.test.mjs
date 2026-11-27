import assert from 'node:assert/strict'
import { test } from 'node:test'
import { exampleLoans, exampleMovements, examplePersonHistory } from './exampleMovements.ts'
import { filterMovements, listPeople } from './filterMovements.ts'
import {
  calculateLoanTiming,
  formatDuration,
  liveMinutes,
  loansOf,
  summarizeLoans,
  summarizeMovements,
} from './types.ts'

const filters = { search: '', type: '', personId: null, startDate: '', endDate: '', order: 'newest' }
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

// ---------------------------------------------------------------- duração e atraso

test('formata duração como minutos, horas e dias', () => {
  const cases = {
    0: '0 min', 45: '45 min', 60: '1h', 135: '2h 15min',
    1440: '1d', 1460: '1d 20min', 1500: '1d 1h', 1640: '1d 3h 20min',
  }
  for (const [minutes, text] of Object.entries(cases)) assert.equal(formatDuration(Number(minutes)), text)
  assert.equal(formatDuration(44.5), '45 min')
  assert.equal(formatDuration(-5), '0 min')
})

const at = (hour, minute = 0, day = 10) => new Date(Date.UTC(2026, 10, day, hour, minute)).toISOString()
const NOW = new Date(Date.UTC(2026, 10, 20, 12, 0))
const timing = (withdrawn, due, returned) =>
  calculateLoanTiming({ retirado_em: withdrawn, previsto_em: due, devolvido_em: returned }, NOW)

test('duração real é a diferença exata entre retirada e devolução', () => {
  const loan = timing(at(9), null, at(11, 15))
  assert.equal(loan.duracao_real_minutos, 135)
  assert.equal(loan.duracao_real_texto, '2h 15min')
  assert.equal(loan.em_posse_minutos, null)
})

test('atraso é zero no prazo, positivo com atraso e null sem previsão', () => {
  assert.deepEqual(
    [timing(at(9), at(10), at(9, 50)).atraso_minutos, timing(at(9), at(10), at(9, 50)).status],
    [0, 'returned_on_time'])
  assert.deepEqual(
    [timing(at(9), at(10), at(10, 30)).atraso_minutos, timing(at(9), at(10), at(10, 30)).status],
    [30, 'returned_late'])
  const noDue = timing(at(9), null, at(10))
  assert.equal(noDue.atraso_minutos, null)
  assert.equal(noDue.status, 'returned')
})

test('posse em aberto informa o tempo decorrido e não conta duração nem atraso', () => {
  const loan = timing(at(9, 30, 20), at(10, 0, 20), null)
  assert.equal(loan.status, 'in_possession')
  assert.equal(loan.em_posse_minutos, 150)
  assert.equal(loan.duracao_real_minutos, null)
  assert.equal(loan.atraso_minutos, null)
  assert.equal(liveMinutes({ ...loan, retirado_em: at(9, 30, 20) }, new Date(Date.UTC(2026, 10, 20, 13, 0))), 210)
  assert.equal(liveMinutes({ ...timing(at(9), null, at(10)), retirado_em: at(9) }, NOW), null)
})

const withTiming = (id, personId, withdrawn, due, returned) => ({
  id, key_id: id, key: { code: `K${id}`, description: 'Chave' },
  person_id: personId, person: { name: `Pessoa ${personId}` },
  retirado_em: withdrawn, previsto_em: due, devolvido_em: returned,
  ...timing(withdrawn, due, returned),
})

test('médias de duração e de demora ignoram abertas e retiradas sem previsão', () => {
  const summary = summarizeLoans([
    withTiming(1, 1, at(9), at(10), at(10)), // 60 min, no prazo
    withTiming(2, 1, at(9), at(10), at(11, 30)), // 150 min, 90 min de atraso
    withTiming(3, 2, at(8), null, at(11)), // 180 min, sem previsão
    withTiming(4, 2, at(9, 0, 20), null, null), // em posse
  ])
  assert.equal(summary.total_retiradas, 4)
  assert.equal(summary.em_posse, 1)
  assert.equal(summary.devolucoes_concluidas, 3)
  assert.equal(summary.duracao_media_minutos, 130)
  assert.equal(summary.duracao_media_texto, '2h 10min')
  assert.equal(summary.devolucoes_com_prazo, 2)
  assert.equal(summary.devolucoes_com_atraso, 1)
  assert.equal(summary.taxa_atraso, 0.5)
  assert.equal(summary.atraso_medio_minutos, 45)
  assert.equal(summary.atraso_medio_texto, '45 min')
})

test('sem devoluções concluídas as médias são null', () => {
  for (const loans of [[], [withTiming(1, 1, at(9, 0, 20), null, null)]]) {
    const summary = summarizeLoans(loans)
    assert.equal(summary.duracao_media_minutos, null)
    assert.equal(summary.atraso_medio_minutos, null)
    assert.equal(summary.taxa_atraso, null)
  }
})

// --------------------------------------------------------- pessoa e dados de exemplo

test('resumo do histórico conta cada empréstimo uma vez (retirada + devolução)', () => {
  const loan = withTiming(1, 1, at(9), at(10), at(11))
  const events = [
    { ...movements[0], id: 1, type: 'withdrawal', loan },
    { ...movements[1], id: 2, type: 'return', loan },
    { ...movements[2], id: 3, type: 'return', loan: null },
  ]
  assert.equal(loansOf(events).length, 1)
  assert.equal(summarizeMovements(events).total_retiradas, 1)
  assert.equal(summarizeMovements(events).devolucoes_com_atraso, 1)
})

test('filtra por pessoa usando quem retirou a chave, mesmo na devolução feita por outro', () => {
  const loan = withTiming(1, 7, at(9), null, at(10))
  const events = [
    { ...movements[0], id: 1, person_id: 7, person: { name: 'Pessoa 7' }, type: 'withdrawal', loan },
    { ...movements[1], id: 2, person_id: 9, person: { name: 'Quem devolveu' }, type: 'return', loan },
    { ...movements[2], id: 3, person_id: 9, person: { name: 'Quem devolveu' }, type: 'return', loan: null },
  ]
  const result = (personId) => filterMovements(events, { ...filters, personId }).map((item) => item.id)
  assert.deepEqual(result(7), [2, 1])
  assert.deepEqual(result(9), [3])
  assert.deepEqual(result(null), [3, 2, 1])
  assert.deepEqual(result(404), [])
  assert.deepEqual(listPeople(events), [{ id: 7, name: 'Pessoa 7' }, { id: 9, name: 'Quem devolveu' }])
})

test('dados de exemplo trazem duração real coerente e posses em aberto', () => {
  const closed = exampleLoans.filter((loan) => loan.devolvido_em)
  assert.ok(closed.length > 0)
  for (const loan of closed) {
    const minutes = Math.floor((new Date(loan.devolvido_em) - new Date(loan.retirado_em)) / 60000)
    assert.equal(loan.duracao_real_minutos, minutes)
  }
  assert.ok(exampleLoans.some((loan) => loan.status === 'in_possession' && loan.em_posse_minutos > 0))
  assert.ok(exampleLoans.some((loan) => loan.status === 'returned_late'))
  assert.ok(exampleLoans.some((loan) => loan.status === 'returned'))
  assert.equal(exampleMovements.length, exampleLoans.length + closed.length)
  assert.ok(exampleMovements.every((movement) => movement.loan))
})

test('histórico de exemplo da pessoa lista as retiradas dela, mais recentes primeiro', () => {
  const history = examplePersonHistory(1)
  assert.equal(history.person.name, 'Mariana Costa')
  assert.ok(history.loans.length >= 2)
  assert.ok(history.loans.every((loan) => loan.person_id === 1))
  const times = history.loans.map((loan) => new Date(loan.retirado_em).getTime())
  assert.deepEqual(times, [...times].sort((a, b) => b - a))
  assert.deepEqual(history.summary, summarizeLoans(history.loans))
  assert.equal(examplePersonHistory(999).loans.length, 0)
})
