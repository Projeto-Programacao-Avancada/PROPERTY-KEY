import type { HistoryMovement } from './types'

/**
 * Ponto de integração do histórico com a futura API.
 * null: integração pendente; []: consulta realizada, sem registros.
 * Quando o backend estiver pronto, substituir este retorno pela consulta
 * autenticada que devolva HistoryMovement[]. Não criar tabelas neste arquivo.
 */
export function loadHistory(): Promise<HistoryMovement[] | null> {
  return Promise.resolve(null)
}
