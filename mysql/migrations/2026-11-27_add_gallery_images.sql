-- Execute uma vez em bancos MySQL criados antes da tabela da galeria.
-- Cria o armazenamento de metadados das imagens vinculadas (opcionalmente) às chaves.
CREATE TABLE IF NOT EXISTS gallery_images (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category    VARCHAR(40)  NOT NULL,
  key_id      BIGINT UNSIGNED NULL,
  file_name   VARCHAR(255) NOT NULL,
  mime_type   VARCHAR(50)  NOT NULL,
  size_bytes  INT UNSIGNED NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by  BIGINT UNSIGNED NULL,
  UNIQUE KEY gallery_images_file_name_unique (file_name),
  KEY gallery_images_key_id_idx (key_id),
  KEY gallery_images_category_idx (category),
  KEY gallery_images_created_at_idx (created_at),
  CONSTRAINT gallery_images_key_fk FOREIGN KEY (key_id)
    REFERENCES `keys` (id) ON DELETE SET NULL,
  CONSTRAINT gallery_images_created_by_fk FOREIGN KEY (created_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;
