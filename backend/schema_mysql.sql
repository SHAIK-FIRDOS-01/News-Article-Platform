-- =====================================================================
-- SignalReport: Production SQL Schema for MySQL 8.0+
-- Tech Stack: Python, Django, DRF, JavaScript, React, TailwindCSS, MySQL
-- =====================================================================
-- Description:
-- Designed SQL tables to store article records, publication dates,
-- and indexed category tags with referential integrity and performance indexes.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `signalreport`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `signalreport`;

-- ---------------------------------------------------------------------
-- Table: users
-- Stores analyst and operator account credentials and authentication state
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_staff` TINYINT(1) NOT NULL DEFAULT 0,
  `is_superuser` TINYINT(1) NOT NULL DEFAULT 0,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 1,
  `verification_code` VARCHAR(6) NULL,
  `verification_code_expires_at` DATETIME NULL,
  `tokens_valid_after` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table: articles
-- Stores curated news article records, publication dates, and indexed category tags
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `articles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT NULL,
  `content` LONGTEXT NULL,
  `url` VARCHAR(767) NOT NULL,
  `image_url` VARCHAR(1000) NULL,
  `source_name` VARCHAR(100) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `country` VARCHAR(10) NOT NULL DEFAULT 'in',
  `language` VARCHAR(10) NOT NULL DEFAULT 'en',
  `share_token` VARCHAR(16) NOT NULL,
  `published_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_articles_url` (`url`),
  UNIQUE KEY `uq_articles_share_token` (`share_token`),
  -- Primary category filter index
  KEY `idx_articles_category` (`category`),
  -- Publication date index for chronological timeline ordering
  KEY `idx_articles_published_at` (`published_at`),
  -- Composite index for fast category-filtered timeline queries
  KEY `ix_art_cat_pub` (`category`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table: bookmarks
-- Stores user-saved article bookmarks with referential cascade deletes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bookmarks` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `article_id` BIGINT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bookmark_user_article` (`user_id`, `article_id`),
  KEY `idx_bookmarks_user_id` (`user_id`),
  KEY `idx_bookmarks_article_id` (`article_id`),
  CONSTRAINT `fk_bookmarks_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookmarks_article` FOREIGN KEY (`article_id`)
    REFERENCES `articles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table: article_reads
-- Tracks read history per authenticated user for read/unread state badges
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `article_reads` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `article_id` BIGINT NOT NULL,
  `read_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_read_user_article` (`user_id`, `article_id`),
  KEY `idx_article_reads_user_id` (`user_id`),
  KEY `idx_article_reads_article_id` (`article_id`),
  CONSTRAINT `fk_reads_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reads_article` FOREIGN KEY (`article_id`)
    REFERENCES `articles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table: api_call_logs
-- Audits external GNews calls to enforce the 80-call daily request limiter
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `api_call_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `service` VARCHAR(50) NOT NULL DEFAULT 'gnews',
  `category` VARCHAR(50) NULL,
  `status_code` INT NOT NULL DEFAULT 200,
  `articles_retrieved` INT NOT NULL DEFAULT 0,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_api_call_logs_timestamp` (`timestamp`),
  KEY `idx_api_call_logs_service` (`service`),
  KEY `idx_api_call_logs_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table: llm_usage_bans
-- Enforces AI Groq LPU cooldowns and rate caps
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `llm_usage_bans` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_id` BIGINT NULL,
  `banned_until` DATETIME NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_llm_bans_ip` (`ip_address`),
  KEY `idx_llm_bans_until` (`banned_until`),
  CONSTRAINT `fk_llm_bans_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
