-- ==========================================================================
-- SIMASET BMN — Skema basis data (MariaDB / MySQL)
-- --------------------------------------------------------------------------
-- Nama kolom sengaja dibuat sama dengan kunci JSON yang dipakai front-end,
-- sehingga API dapat memetakan baris 1:1 tanpa lapisan penerjemah dan kode
-- render purwarupa tidak perlu diubah.
--
-- Jalankan: php db/migrate.php           (memakai api/config.php)
-- ==========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---- Metadata aplikasi ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `app_meta` (
  `k`  VARCHAR(64)  NOT NULL PRIMARY KEY,
  `v`  TEXT         NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Master data ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `buildings` (
  `id`    VARCHAR(16)  NOT NULL PRIMARY KEY,
  `name`  VARCHAR(160) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `locations` (
  `location_id`  VARCHAR(32)  NOT NULL PRIMARY KEY,
  `site`         VARCHAR(120) NULL,
  `building`     VARCHAR(160) NULL,
  `building_id`  VARCHAR(16)  NULL,
  `floor`        VARCHAR(32)  NULL,
  `room`         VARCHAR(32)  NULL,
  `label`        VARCHAR(200) NOT NULL,
  KEY idx_locations_building (`building_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `units` pada data purwarupa adalah array string; diberi kunci pengganti.
CREATE TABLE IF NOT EXISTS `units` (
  `id`    INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name`  VARCHAR(160) NOT NULL,
  UNIQUE KEY uq_units_name (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `code`      VARCHAR(32)  NOT NULL PRIMARY KEY,
  `name`      VARCHAR(120) NOT NULL,
  `examples`  JSON         NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `custodians` (
  `custodian_id`  VARCHAR(32)  NOT NULL PRIMARY KEY,
  `name`          VARCHAR(160) NOT NULL,
  `unit`          VARCHAR(160) NULL,
  `type`          VARCHAR(64)  NULL,
  `status`        VARCHAR(32)  NULL,
  `nip`           VARCHAR(64)  NULL,
  `phone`         VARCHAR(48)  NULL,
  `asset_count`   INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Register aset -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `assets` (
  `asset_id`         VARCHAR(48)  NOT NULL PRIMARY KEY,
  `bmn_uid`          VARCHAR(64)  NULL,
  `satker`           VARCHAR(32)  NULL,
  `kode_barang`      VARCHAR(32)  NULL,
  `nup`              VARCHAR(32)  NULL,
  `name`             VARCHAR(200) NOT NULL,
  `category`         VARCHAR(120) NULL,
  `category_code`    VARCHAR(32)  NULL,
  `brand`            VARCHAR(120) NULL,
  `model`            VARCHAR(120) NULL,
  `serial`           VARCHAR(120) NULL,
  `year`             SMALLINT     NULL,
  `value`            BIGINT       NULL,
  `warranty_until`   DATE         NULL,
  `location_id`      VARCHAR(32)  NULL,
  `location_label`   VARCHAR(200) NULL,
  `custodian_id`     VARCHAR(32)  NULL,
  `custodian_name`   VARCHAR(160) NULL,
  `unit`             VARCHAR(160) NULL,
  `condition_score`  TINYINT      NULL,
  `condition_label`  VARCHAR(64)  NULL,
  `criticality`      VARCHAR(32)  NULL,
  `risk_level`       VARCHAR(32)  NULL,
  `status`           VARCHAR(64)  NULL,
  `tag_id`           VARCHAR(32)  NULL,
  `sensitive`        TINYINT(1)   NOT NULL DEFAULT 0,
  `photo`            VARCHAR(255) NULL,
  KEY idx_assets_category (`category`),
  KEY idx_assets_location (`location_id`),
  KEY idx_assets_custodian (`custodian_id`),
  KEY idx_assets_status (`status`),
  KEY idx_assets_sensitive (`sensitive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `asset_tags` (
  `tag_id`       VARCHAR(32)  NOT NULL PRIMARY KEY,
  `asset_id`     VARCHAR(48)  NULL,
  `bmn_uid`      VARCHAR(64)  NULL,
  `qr_payload`   VARCHAR(255) NULL,
  `material`     VARCHAR(64)  NULL,
  `print_batch`  VARCHAR(32)  NULL,
  `status`       VARCHAR(64)  NULL,
  `printed_at`   DATE         NULL,
  KEY idx_tags_asset (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Sensus --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sensus_plans` (
  `sensus_id`      VARCHAR(32)  NOT NULL PRIMARY KEY,
  `area`           VARCHAR(200) NULL,
  `petugas`        VARCHAR(160) NULL,
  `start_date`     DATE         NULL,
  `status`         VARCHAR(32)  NULL,
  `target_count`   INT          NOT NULL DEFAULT 0,
  `scanned_count`  INT          NOT NULL DEFAULT 0,
  `anomaly_count`  INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sensus_items` (
  `item_id`          VARCHAR(32)  NOT NULL PRIMARY KEY,
  `sensus_id`        VARCHAR(32)  NULL,
  `asset_id`         VARCHAR(48)  NULL,
  `asset_name`       VARCHAR(200) NULL,
  `scan_time`        DATE         NULL,
  `result`           VARCHAR(32)  NULL,
  `anomaly_type`     VARCHAR(64)  NULL,
  `location_label`   VARCHAR(200) NULL,
  `condition_label`  VARCHAR(64)  NULL,
  KEY idx_sensus_items_plan (`sensus_id`),
  KEY idx_sensus_items_asset (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Mutasi / IMACD & JML ------------------------------------------------
CREATE TABLE IF NOT EXISTS `mutasi` (
  `request_id`     VARCHAR(32)  NOT NULL PRIMARY KEY,
  `asset_id`       VARCHAR(48)  NULL,
  `asset_name`     VARCHAR(200) NULL,
  `change_type`    VARCHAR(64)  NULL,
  `old_location`   VARCHAR(200) NULL,
  `new_location`   VARCHAR(200) NULL,
  `old_custodian`  VARCHAR(160) NULL,
  `new_custodian`  VARCHAR(160) NULL,
  `requestor`      VARCHAR(160) NULL,
  `approver`       VARCHAR(160) NULL,
  `status`         VARCHAR(64)  NULL,
  `request_date`   DATE         NULL,
  `reason`         VARCHAR(255) NULL,
  KEY idx_mutasi_asset (`asset_id`),
  KEY idx_mutasi_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `jml_events` (
  `event_id`    VARCHAR(32)  NOT NULL PRIMARY KEY,
  `person`      VARCHAR(160) NULL,
  `event_type`  VARCHAR(32)  NULL,
  `asset_id`    VARCHAR(48)  NULL,
  `status`      VARCHAR(64)  NULL,
  `event_date`  DATE         NULL,
  KEY idx_jml_asset (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Pemeliharaan & inspeksi --------------------------------------------
CREATE TABLE IF NOT EXISTS `work_orders` (
  `wo_id`           VARCHAR(32)  NOT NULL PRIMARY KEY,
  `asset_id`        VARCHAR(48)  NULL,
  `asset_name`      VARCHAR(200) NULL,
  `type`            VARCHAR(32)  NULL,
  `priority`        VARCHAR(32)  NULL,
  `technician`      VARCHAR(160) NULL,
  `vendor`          VARCHAR(160) NULL,
  `problem`         VARCHAR(500) NULL,
  `scheduled_date`  DATE         NULL,
  `completed_date`  DATE         NULL,
  `cost`            BIGINT       NOT NULL DEFAULT 0,
  `downtime_hours`  DECIMAL(8,2) NOT NULL DEFAULT 0,
  `status`          VARCHAR(64)  NULL,
  `photo`           VARCHAR(255) NULL,
  KEY idx_wo_asset (`asset_id`),
  KEY idx_wo_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inspections` (
  `inspection_id`       VARCHAR(32)  NOT NULL PRIMARY KEY,
  `asset_id`            VARCHAR(48)  NULL,
  `asset_name`          VARCHAR(200) NULL,
  `inspector`           VARCHAR(160) NULL,
  `date`                DATE         NULL,
  `physical_condition`  TINYINT      NULL,
  `performance`         TINYINT      NULL,
  `reliability`         TINYINT      NULL,
  `safety`              TINYINT      NULL,
  `maintenance`         TINYINT      NULL,
  `documentation`       TINYINT      NULL,
  `finding`             VARCHAR(500) NULL,
  `recommendation`      VARCHAR(500) NULL,
  `photo`               VARCHAR(255) NULL,
  KEY idx_insp_asset (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Risiko, kinerja, biaya ---------------------------------------------
CREATE TABLE IF NOT EXISTS `risks` (
  `risk_id`      VARCHAR(32)  NOT NULL PRIMARY KEY,
  `asset_id`     VARCHAR(48)  NULL,
  `asset_name`   VARCHAR(200) NULL,
  `event`        VARCHAR(255) NULL,
  `likelihood`   TINYINT      NULL,
  `consequence`  TINYINT      NULL,
  `score`        SMALLINT     NULL,
  `level`        VARCHAR(32)  NULL,
  `control`      VARCHAR(500) NULL,
  `residual`     VARCHAR(32)  NULL,
  `owner`        VARCHAR(160) NULL,
  KEY idx_risks_asset (`asset_id`),
  KEY idx_risks_level (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `asset_kpis` (
  `kpi_id`        VARCHAR(32)   NOT NULL PRIMARY KEY,
  `asset_id`      VARCHAR(48)   NULL,
  `asset_name`    VARCHAR(200)  NULL,
  `availability`  DECIMAL(6,2)  NULL,
  `mtbf_days`     DECIMAL(10,2) NULL,
  `mttr_hours`    DECIMAL(10,2) NULL,
  `utilization`   DECIMAL(6,2)  NULL,
  `ahi`           DECIMAL(6,2)  NULL,
  `decision`      VARCHAR(64)   NULL,
  `period`        VARCHAR(64)   NULL,
  KEY idx_kpi_asset (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `costs` (
  `cost_id`     VARCHAR(32)  NOT NULL PRIMARY KEY,
  `asset_id`    VARCHAR(48)  NULL,
  `asset_name`  VARCHAR(200) NULL,
  `cost_type`   VARCHAR(64)  NULL,
  `amount`      BIGINT       NOT NULL DEFAULT 0,
  `period`      VARCHAR(32)  NULL,
  `source`      VARCHAR(64)  NULL,
  KEY idx_costs_asset (`asset_id`),
  KEY idx_costs_type (`cost_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Rekonsiliasi SAKTI/SIMAN -------------------------------------------
CREATE TABLE IF NOT EXISTS `recon_batches` (
  `batch_id`     VARCHAR(32)  NOT NULL PRIMARY KEY,
  `period`       VARCHAR(64)  NULL,
  `source`       VARCHAR(64)  NULL,
  `file`         VARCHAR(255) NULL,
  `status`       VARCHAR(64)  NULL,
  `total_items`  INT          NOT NULL DEFAULT 0,
  `matched`      INT          NOT NULL DEFAULT 0,
  `exception`    INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `recon_items` (
  `item_id`         VARCHAR(32)  NOT NULL PRIMARY KEY,
  `batch_id`        VARCHAR(32)  NULL,
  `bmn_uid`         VARCHAR(64)  NULL,
  `asset_name`      VARCHAR(200) NULL,
  `match_status`    VARCHAR(32)  NULL,
  `exception_note`  VARCHAR(255) NULL,
  KEY idx_recon_items_batch (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Aset siber & sanitisasi --------------------------------------------
CREATE TABLE IF NOT EXISTS `cyber_assets` (
  `cyber_asset_id`       VARCHAR(32)  NOT NULL PRIMARY KEY,
  `asset_id`             VARCHAR(48)  NULL,
  `name`                 VARCHAR(200) NULL,
  `classification`       VARCHAR(64)  NULL,
  `custodian`            VARCHAR(160) NULL,
  `authorization`        VARCHAR(200) NULL,
  `last_access`          DATE         NULL,
  access_count_30d     INT          NOT NULL DEFAULT 0,
  `movement_monitoring`  VARCHAR(32)  NULL,
  KEY idx_cyber_asset (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `access_logs` (
  `log_id`          VARCHAR(32)  NOT NULL PRIMARY KEY,
  `cyber_asset_id`  VARCHAR(32)  NULL,
  `asset_name`      VARCHAR(200) NULL,
  `user`            VARCHAR(160) NULL,
  `action`          VARCHAR(120) NULL,
  `timestamp`       DATE         NULL,
  `result`          VARCHAR(32)  NULL,
  KEY idx_acclog_cyber (`cyber_asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sanitizations` (
  `sanitization_id`  VARCHAR(32)  NOT NULL PRIMARY KEY,
  `asset_id`         VARCHAR(48)  NULL,
  `media`            VARCHAR(64)  NULL,
  `method`           VARCHAR(120) NULL,
  `operator`         VARCHAR(160) NULL,
  `verification`     VARCHAR(120) NULL,
  `certificate_no`   VARCHAR(64)  NULL,
  `date`             DATE         NULL,
  `nist_ref`         VARCHAR(120) NULL,
  KEY idx_sanit_asset (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `disposals` (
  `disposal_id`  VARCHAR(32)  NOT NULL PRIMARY KEY,
  `asset_id`     VARCHAR(48)  NULL,
  `asset_name`   VARCHAR(200) NULL,
  `reason`       VARCHAR(255) NULL,
  `assessment`   VARCHAR(255) NULL,
  `approval`     VARCHAR(120) NULL,
  `method`       VARCHAR(64)  NULL,
  `evidence`     VARCHAR(255) NULL,
  `date`         DATE         NULL,
  KEY idx_disp_asset (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Governance, audit, dokumen, laporan --------------------------------
CREATE TABLE IF NOT EXISTS `gov_policy` (
  `id`           VARCHAR(32)  NOT NULL PRIMARY KEY,
  `title`        VARCHAR(255) NULL,
  `version`      VARCHAR(32)  NULL,
  `status`       VARCHAR(64)  NULL,
  `approved_by`  VARCHAR(160) NULL,
  `date`         DATE         NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gov_objectives` (
  `id`      VARCHAR(32)  NOT NULL PRIMARY KEY,
  `title`   VARCHAR(255) NULL,
  `target`  VARCHAR(64)  NULL,
  `actual`  VARCHAR(64)  NULL,
  `period`  VARCHAR(64)  NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gov_samp` (
  `id`      VARCHAR(32)  NOT NULL PRIMARY KEY,
  `title`   VARCHAR(255) NULL,
  `status`  VARCHAR(64)  NULL,
  `date`    DATE         NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gov_amp` (
  `id`        VARCHAR(32)  NOT NULL PRIMARY KEY,
  `title`     VARCHAR(255) NULL,
  `program`   VARCHAR(255) NULL,
  `resource`  VARCHAR(160) NULL,
  `target`    VARCHAR(160) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gov_management_review` (
  `id`      VARCHAR(32)  NOT NULL PRIMARY KEY,
  `period`  VARCHAR(64)  NULL,
  `input`   VARCHAR(255) NULL,
  `action`  VARCHAR(255) NULL,
  `status`  VARCHAR(64)  NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gov_improvement` (
  `id`      VARCHAR(32)  NOT NULL PRIMARY KEY,
  `title`   VARCHAR(255) NULL,
  `linked`  VARCHAR(160) NULL,
  `status`  VARCHAR(64)  NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audits` (
  `audit_id`           VARCHAR(32)  NOT NULL PRIMARY KEY,
  `scope`              VARCHAR(255) NULL,
  `finding`            VARCHAR(500) NULL,
  `severity`           VARCHAR(32)  NULL,
  `root_cause`         VARCHAR(500) NULL,
  `corrective_action`  VARCHAR(500) NULL,
  `pic`                VARCHAR(160) NULL,
  `due_date`           DATE         NULL,
  `status`             VARCHAR(64)  NULL,
  `repeat_finding`     TINYINT(1)   NOT NULL DEFAULT 0,
  KEY idx_audits_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `documents` (
  `document_id`  VARCHAR(32)  NOT NULL PRIMARY KEY,
  `asset_id`     VARCHAR(48)  NULL,
  `asset_name`   VARCHAR(200) NULL,
  `type`         VARCHAR(120) NULL,
  `version`      VARCHAR(32)  NULL,
  `uploaded_by`  VARCHAR(160) NULL,
  `uploaded_at`  DATE         NULL,
  `expiry`       DATE         NULL,
  KEY idx_docs_asset (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reports` (
  `report_id`  VARCHAR(32)  NOT NULL PRIMARY KEY,
  `name`       VARCHAR(255) NULL,
  `period`     VARCHAR(64)  NULL,
  `unit`       VARCHAR(160) NULL,
  `category`   VARCHAR(64)  NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- IoT & integrasi -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `iot_devices` (
  `device_id`       VARCHAR(32)   NOT NULL PRIMARY KEY,
  `asset_id`        VARCHAR(48)   NULL,
  `asset_name`      VARCHAR(200)  NULL,
  `device_type`     VARCHAR(120)  NULL,
  `protocol`        VARCHAR(32)   NULL,
  `location_label`  VARCHAR(200)  NULL,
  `status`          VARCHAR(32)   NULL,
  `metric`          VARCHAR(64)   NULL,
  `unit`            VARCHAR(32)   NULL,
  `last_value`      DECIMAL(12,3) NULL,
  `threshold_min`   DECIMAL(12,3) NULL,
  `threshold_max`   DECIMAL(12,3) NULL,
  `battery`         TINYINT       NULL,
  `firmware`        VARCHAR(32)   NULL,
  `last_seen`       DATETIME      NULL,
  `interval_menit`  INT           NULL,
  KEY idx_iot_asset (`asset_id`),
  KEY idx_iot_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `iot_alerts` (
  `alert_id`      VARCHAR(32)  NOT NULL PRIMARY KEY,
  `device_id`     VARCHAR(32)  NULL,
  `asset_id`      VARCHAR(48)  NULL,
  `asset_name`    VARCHAR(200) NULL,
  `metric`        VARCHAR(64)  NULL,
  `value`         VARCHAR(64)  NULL,
  `threshold`     VARCHAR(64)  NULL,
  `severity`      VARCHAR(32)  NULL,
  `status`        VARCHAR(32)  NULL,
  `triggered_at`  DATETIME     NULL,
  `action`        VARCHAR(255) NULL,
  `wo_id`         VARCHAR(32)  NULL,
  KEY idx_alert_device (`device_id`),
  KEY idx_alert_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `integrations` tidak punya kunci alami tunggal pada data purwarupa;
-- `system` dijadikan unik dan `id` sebagai kunci pengganti untuk CRUD.
CREATE TABLE IF NOT EXISTS `integrations` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `system`      VARCHAR(120) NOT NULL,
  `arah`        VARCHAR(64)  NULL,
  `mechanism`   VARCHAR(120) NULL,
  `status`      VARCHAR(32)  NULL,
  `last_sync`   DATETIME     NULL,
  `next_sync`   VARCHAR(64)  NULL,
  `records`     INT          NOT NULL DEFAULT 0,
  `health`      VARCHAR(64)  NULL,
  `data_desc`   VARCHAR(255) NULL,
  UNIQUE KEY uq_integrations_system (`system`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sync_logs` (
  `log_id`      VARCHAR(32)  NOT NULL PRIMARY KEY,
  `system`      VARCHAR(120) NULL,
  `started_at`  DATETIME     NULL,
  `duration`    VARCHAR(32)  NULL,
  `records`     INT          NOT NULL DEFAULT 0,
  `result`      VARCHAR(32)  NULL,
  `note`        VARCHAR(255) NULL,
  KEY idx_synclog_system (`system`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Persetujuan ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `approvals` (
  `approval_id`    VARCHAR(32)  NOT NULL PRIMARY KEY,
  `jenis`          VARCHAR(120) NULL,
  `object_id`      VARCHAR(48)  NULL,
  `judul`          VARCHAR(255) NULL,
  `requested_by`   VARCHAR(200) NULL,
  `requested_at`   DATE         NULL,
  `nilai`          VARCHAR(64)  NULL,
  `status`         VARCHAR(32)  NULL,
  `role_required`  VARCHAR(64)  NULL,
  `modul`          VARCHAR(64)  NULL,
  `catatan`        VARCHAR(255) NULL,
  `decided_by`     VARCHAR(64)  NULL,
  `decided_at`     DATETIME     NULL,
  KEY idx_apv_status (`status`),
  KEY idx_apv_role (`role_required`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Pengguna & keamanan -------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `user_id`        VARCHAR(32)  NOT NULL PRIMARY KEY,
  `name`           VARCHAR(160) NOT NULL,
  `email`          VARCHAR(190) NOT NULL,
  `role`           VARCHAR(64)  NOT NULL,
  `nip`            VARCHAR(64)  NULL,
  `unit`           VARCHAR(160) NULL,
  `status`         VARCHAR(32)  NOT NULL DEFAULT 'Aktif',
  `mfa`            VARCHAR(32)  NULL,
  `last_login`     DATETIME     NULL,
  `created_at`     DATE         NULL,
  `akun_demo`      VARCHAR(16)  NULL,
  `password_hash`  VARCHAR(255) NULL,
  UNIQUE KEY uq_users_email (`email`),
  KEY idx_users_role (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jejak audit setiap perubahan data melalui API.
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `at`         DATETIME     NOT NULL,
  `user_id`    VARCHAR(32)  NULL,
  `user_email` VARCHAR(190) NULL,
  `role`       VARCHAR(64)  NULL,
  `action`     VARCHAR(32)  NOT NULL,
  `dataset`    VARCHAR(64)  NULL,
  `record_id`  VARCHAR(64)  NULL,
  `ip`         VARCHAR(64)  NULL,
  `detail`     TEXT         NULL,
  KEY idx_audit_at (`at`),
  KEY idx_audit_user (`user_id`),
  KEY idx_audit_dataset (`dataset`, `record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pembatasan percobaan masuk (anti brute force).
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id`     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `email`  VARCHAR(190) NULL,
  `ip`     VARCHAR(64)  NULL,
  `at`     DATETIME     NOT NULL,
  `ok`     TINYINT(1)   NOT NULL DEFAULT 0,
  KEY idx_attempt_ip (`ip`, `at`),
  KEY idx_attempt_email (`email`, `at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
