-- Tables of this resource: CREATE TABLE IF NOT EXISTS, names prefixed with the resource (ai_<name>_...),
-- every table ending with ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;".
-- Installed by createDatabaseTables on start: missing tables and columns are added, nothing is dropped,
-- keys are only created with a new table (plan indexes before the first release).

-- The sleeping body of a logged-out character (char_id = ai_core_characters.id). Only what survives a restart:
-- carried / seated states are runtime, a restart puts every body on the ground at its last position. The look is
-- not copied: it is read from ai-appearance when a client needs it. Rows older than the panel's days are purged
-- in chunks at start and every 10 minutes through the logged_out_at index (UTC).
CREATE TABLE IF NOT EXISTS `ai_exitsleeping_sleepers` (
  `char_id` INT UNSIGNED NOT NULL,
  `model` VARCHAR(32) NOT NULL,
  `anim` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `x` FLOAT NOT NULL,
  `y` FLOAT NOT NULL,
  `z` FLOAT NOT NULL,
  `heading` FLOAT NOT NULL,
  `logged_out_at` DATETIME NOT NULL,
  PRIMARY KEY (`char_id`),
  KEY `logged_out_at` (`logged_out_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
