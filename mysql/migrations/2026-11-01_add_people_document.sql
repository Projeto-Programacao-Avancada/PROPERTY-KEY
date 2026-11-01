-- Execute uma vez em bancos MySQL criados antes da coluna de documento.
ALTER TABLE people
  ADD COLUMN document VARCHAR(30) NULL,
  ADD UNIQUE KEY people_document_unique (document);
