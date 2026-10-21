CREATE DATABASE IF NOT EXISTS property_key
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE property_key;

-- Usuários que fazem login no sistema (substitui o Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NULL,
  phone         VARCHAR(20)  NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY users_email_unique (email),
  UNIQUE KEY users_phone_unique (phone)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `keys` (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(30)  NOT NULL,
  description VARCHAR(120) NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'available',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by  BIGINT UNSIGNED NULL,
  UNIQUE KEY keys_code_unique (code),
  CONSTRAINT keys_status_check CHECK (status IN ('available', 'withdrawn')),
  CONSTRAINT keys_created_by_fk FOREIGN KEY (created_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS people (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  phone      VARCHAR(20)  NULL,
  email      VARCHAR(255) NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS key_movements (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  key_id     BIGINT UNSIGNED NOT NULL,
  person_id  BIGINT UNSIGNED NULL,
  type       VARCHAR(20) NOT NULL,
  notes      TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED NULL,
  KEY key_movements_key_id_idx (key_id),
  KEY key_movements_created_at_idx (created_at),
  CONSTRAINT movements_type_check CHECK (type IN ('withdrawal', 'return')),
  CONSTRAINT movements_key_fk FOREIGN KEY (key_id)
    REFERENCES `keys` (id) ON DELETE CASCADE,
  CONSTRAINT movements_person_fk FOREIGN KEY (person_id)
    REFERENCES people (id) ON DELETE SET NULL,
  CONSTRAINT movements_created_by_fk FOREIGN KEY (created_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;
