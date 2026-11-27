import { borrowerOf, type HistoryMovement, type MovementType } from './types.ts'

export type HistoryFilters = {
  search: string
  type: MovementType | ''
  personId: number | null
  startDate: string
  endDate: string
  order: 'newest' | 'oldest'
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

export function filterMovements(movements: HistoryMovement[], filters: HistoryFilters) {
  const search = normalize(filters.search.trim())

  return movements.filter((movement) => {
    const date = new Date(movement.created_at)
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const text = [movement.key.code, movement.key.description, movement.person?.name,
      movement.operator?.name, movement.notes].filter(Boolean).join(' ')

    return (!search || normalize(text).includes(search)) &&
      (!filters.type || movement.type === filters.type) &&
      (filters.personId === null || borrowerOf(movement)?.id === filters.personId) &&
      (!filters.startDate || localDate >= filters.startDate) &&
      (!filters.endDate || localDate <= filters.endDate)
  }).sort((a, b) => {
    const difference = new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id
    return filters.order === 'newest' ? difference : -difference
  })
}

// Pessoas que aparecem no histórico, em ordem alfabética, para o filtro por pessoa.
export function listPeople(movements: HistoryMovement[]) {
  const people = new Map<number, string>()
  for (const movement of movements) {
    const borrower = borrowerOf(movement)
    if (borrower) people.set(borrower.id, borrower.name)
  }
  return [...people].map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}
