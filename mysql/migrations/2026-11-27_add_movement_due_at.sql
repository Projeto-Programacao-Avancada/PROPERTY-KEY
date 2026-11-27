-- Execute uma vez em bancos MySQL criados antes da previsão de devolução.
-- Coluna opcional: retiradas e devoluções antigas continuam válidas (due_at = NULL),
-- e o atraso delas é tratado como "não calculável" em vez de zero.
ALTER TABLE key_movements
  ADD COLUMN due_at DATETIME NULL AFTER notes;
