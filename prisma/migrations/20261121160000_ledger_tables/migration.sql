-- Ledger tables and sync metadata

CREATE TABLE "ledger_fa" (
    "id" UUID NOT NULL,
    "source_key" TEXT,
    "source_file" TEXT,
    "source_sheet" VARCHAR(128),
    "source_row" INTEGER,
    "date" VARCHAR(32) NOT NULL DEFAULT '',
    "stage" VARCHAR(64) NOT NULL DEFAULT '',
    "dept" VARCHAR(64) NOT NULL DEFAULT '',
    "pn" VARCHAR(64) NOT NULL DEFAULT '',
    "part" VARCHAR(64) NOT NULL DEFAULT '',
    "item" VARCHAR(200) NOT NULL DEFAULT '',
    "spec" VARCHAR(500) NOT NULL DEFAULT '',
    "meas" VARCHAR(500) NOT NULL DEFAULT '',
    "result" VARCHAR(64) NOT NULL DEFAULT '',
    "who" VARCHAR(64) NOT NULL DEFAULT '',
    "status" VARCHAR(64) NOT NULL DEFAULT '',
    "action" VARCHAR(500) NOT NULL DEFAULT '',
    "eng" VARCHAR(64) NOT NULL DEFAULT '',
    "src" VARCHAR(64) NOT NULL DEFAULT '',
    "fb" DECIMAL(12,4),
    "iv" DECIMAL(12,4),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ledger_fa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ledger_fa_source_key_unique" ON "ledger_fa"("source_key") WHERE "source_key" IS NOT NULL;

CREATE TABLE "ledger_fqc_ng" (
    "id" UUID NOT NULL,
    "source_key" TEXT,
    "source_file" TEXT,
    "source_sheet" VARCHAR(128),
    "source_row" INTEGER,
    "ws" VARCHAR(64) NOT NULL DEFAULT '',
    "d" VARCHAR(32) NOT NULL DEFAULT '',
    "pn" VARCHAR(64) NOT NULL DEFAULT '',
    "lot" VARCHAR(64) NOT NULL DEFAULT '',
    "cat" VARCHAR(200) NOT NULL DEFAULT '',
    "defs" VARCHAR(500) NOT NULL DEFAULT '',
    "who" VARCHAR(64) NOT NULL DEFAULT '',
    "act" VARCHAR(500) NOT NULL DEFAULT '',
    "re" VARCHAR(64) NOT NULL DEFAULT '',
    "rd" VARCHAR(32) NOT NULL DEFAULT '',
    "samp" DECIMAL(12,4),
    "bad" DECIMAL(12,4),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ledger_fqc_ng_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ledger_fqc_ng_source_key_unique" ON "ledger_fqc_ng"("source_key") WHERE "source_key" IS NOT NULL;

CREATE TABLE "ledger_fqc" (
    "id" UUID NOT NULL,
    "source_key" TEXT,
    "source_file" TEXT,
    "source_sheet" VARCHAR(128),
    "source_row" INTEGER,
    "date" VARCHAR(32) NOT NULL DEFAULT '',
    "pn" VARCHAR(64) NOT NULL DEFAULT '',
    "part" VARCHAR(64) NOT NULL DEFAULT '',
    "issue" VARCHAR(500) NOT NULL DEFAULT '',
    "checker" VARCHAR(64) NOT NULL DEFAULT '',
    "depts" VARCHAR(200) NOT NULL DEFAULT '',
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "action" VARCHAR(500) NOT NULL DEFAULT '',
    "stock" DECIMAL(12,4),
    "ng" DECIMAL(12,4),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ledger_fqc_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ledger_fqc_source_key_unique" ON "ledger_fqc"("source_key") WHERE "source_key" IS NOT NULL;

CREATE TABLE "ledger_cmp" (
    "id" UUID NOT NULL,
    "source_key" TEXT,
    "source_file" TEXT,
    "source_sheet" VARCHAR(128),
    "source_row" INTEGER,
    "date" VARCHAR(32) NOT NULL DEFAULT '',
    "from_source" VARCHAR(64) NOT NULL DEFAULT '',
    "dept" VARCHAR(64) NOT NULL DEFAULT '',
    "model" VARCHAR(64) NOT NULL DEFAULT '',
    "part" VARCHAR(64) NOT NULL DEFAULT '',
    "pn" VARCHAR(64) NOT NULL DEFAULT '',
    "issue" VARCHAR(500) NOT NULL DEFAULT '',
    "cause" VARCHAR(500) NOT NULL DEFAULT '',
    "temp" VARCHAR(500) NOT NULL DEFAULT '',
    "perm" VARCHAR(500) NOT NULL DEFAULT '',
    "owner" VARCHAR(64) NOT NULL DEFAULT '',
    "plan_reply" VARCHAR(32) NOT NULL DEFAULT '',
    "act_reply" VARCHAR(32) NOT NULL DEFAULT '',
    "ontime_reply" VARCHAR(8) NOT NULL DEFAULT '',
    "plan_disp" VARCHAR(32) NOT NULL DEFAULT '',
    "act_disp" VARCHAR(32) NOT NULL DEFAULT '',
    "ontime_disp" VARCHAR(8) NOT NULL DEFAULT '',
    "plan_close" VARCHAR(32) NOT NULL DEFAULT '',
    "act_close" VARCHAR(32) NOT NULL DEFAULT '',
    "ontime_close" VARCHAR(8) NOT NULL DEFAULT '',
    "repeat" VARCHAR(8) NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ledger_cmp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ledger_cmp_source_key_unique" ON "ledger_cmp"("source_key") WHERE "source_key" IS NOT NULL;

CREATE TABLE "ledger_perf" (
    "id" UUID NOT NULL,
    "source_key" TEXT,
    "source_file" TEXT,
    "source_sheet" VARCHAR(128),
    "source_row" INTEGER,
    "date" VARCHAR(32) NOT NULL DEFAULT '',
    "dept" VARCHAR(64) NOT NULL DEFAULT '',
    "who" VARCHAR(64) NOT NULL DEFAULT '',
    "attr" VARCHAR(64) NOT NULL DEFAULT '',
    "item" VARCHAR(500) NOT NULL DEFAULT '',
    "score" DECIMAL(12,4),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ledger_perf_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ledger_perf_source_key_unique" ON "ledger_perf"("source_key") WHERE "source_key" IS NOT NULL;

CREATE TABLE "ledger_mat" (
    "id" UUID NOT NULL,
    "t" VARCHAR(200) NOT NULL DEFAULT '',
    "dept" VARCHAR(64) NOT NULL DEFAULT '',
    "type" VARCHAR(64) NOT NULL DEFAULT '',
    "ver" VARCHAR(64) NOT NULL DEFAULT '',
    "date" VARCHAR(32) NOT NULL DEFAULT '',
    "pages" DECIMAL(12,4),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ledger_mat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ledger_trn" (
    "id" UUID NOT NULL,
    "date" VARCHAR(32) NOT NULL DEFAULT '',
    "dept" VARCHAR(64) NOT NULL DEFAULT '',
    "topic" VARCHAR(200) NOT NULL DEFAULT '',
    "trainer" VARCHAR(64) NOT NULL DEFAULT '',
    "way" VARCHAR(64) NOT NULL DEFAULT '',
    "num" DECIMAL(12,4),
    "hours" DECIMAL(12,4),
    "pass" DECIMAL(12,4),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ledger_trn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ledger_exam" (
    "id" UUID NOT NULL,
    "date" VARCHAR(32) NOT NULL DEFAULT '',
    "who" VARCHAR(64) NOT NULL DEFAULT '',
    "dept" VARCHAR(64) NOT NULL DEFAULT '',
    "subject" VARCHAR(200) NOT NULL DEFAULT '',
    "level" VARCHAR(8) NOT NULL DEFAULT '',
    "score" DECIMAL(12,4),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ledger_exam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ledger_skill" (
    "id" UUID NOT NULL,
    "who" VARCHAR(64) NOT NULL DEFAULT '',
    "dept" VARCHAR(64) NOT NULL DEFAULT '',
    "lv" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ledger_skill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "check_scores" (
    "id" UUID NOT NULL,
    "workshop" VARCHAR(32) NOT NULL,
    "month" VARCHAR(16) NOT NULL,
    "score" DECIMAL(12,4) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "check_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "check_scores_workshop_month_key" ON "check_scores"("workshop", "month");

CREATE TABLE "ledger_tombstones" (
    "id" UUID NOT NULL,
    "table_name" VARCHAR(16) NOT NULL,
    "source_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_tombstones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ledger_tombstones_table_source_key" ON "ledger_tombstones"("table_name", "source_key");

CREATE TABLE "ledger_sync_config" (
    "id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "share_id" UUID,
    "selected_entries" JSONB NOT NULL DEFAULT '[]',
    "excluded_paths" JSONB NOT NULL DEFAULT '[]',
    "hour" INTEGER NOT NULL DEFAULT 6,
    "minute" INTEGER NOT NULL DEFAULT 0,
    "saved_by_user_id" UUID,
    "config_version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ledger_sync_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ledger_sync_runs" (
    "id" UUID NOT NULL,
    "run_type" VARCHAR(16) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),
    "actor_user_id" UUID,
    "config_version" INTEGER NOT NULL DEFAULT 0,
    "scheduled_run_date" VARCHAR(10),
    "executor_id" UUID,
    "lease_expires_at" TIMESTAMPTZ(3),
    "added_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "diff_count" INTEGER NOT NULL DEFAULT 0,
    "unmatched_count" INTEGER NOT NULL DEFAULT 0,
    "tombstone_skip_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ledger_sync_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ledger_sync_runs_scheduled_date_unique"
ON "ledger_sync_runs"("scheduled_run_date")
WHERE "run_type" = 'scheduled' AND "scheduled_run_date" IS NOT NULL;

CREATE TABLE "ledger_sync_run_diffs" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "table_name" VARCHAR(16) NOT NULL,
    "row_id" UUID,
    "field" VARCHAR(64) NOT NULL DEFAULT '',
    "share_value" TEXT NOT NULL DEFAULT '',
    "grid_value" TEXT NOT NULL DEFAULT '',
    "kind" VARCHAR(32) NOT NULL,
    "workshop" VARCHAR(32),
    "month" VARCHAR(16),
    CONSTRAINT "ledger_sync_run_diffs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ledger_sync_run_diffs_run_id_idx" ON "ledger_sync_run_diffs"("run_id");

ALTER TABLE "ledger_sync_run_diffs"
ADD CONSTRAINT "ledger_sync_run_diffs_run_id_fkey"
FOREIGN KEY ("run_id") REFERENCES "ledger_sync_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;