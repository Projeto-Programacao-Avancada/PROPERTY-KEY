import type { HistoryMovement, MovementType } from './types'

export type HistoryFilters = {
  search: string
  type: MovementType | ''
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
      (!filters.startDate || localDate >= filters.startDate) &&
      (!filters.endDate || localDate <= filters.endDate)
  }).sort((a, b) => {
    const difference = new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id
    return filters.order === 'newest' ? difference : -difference
  })
}
