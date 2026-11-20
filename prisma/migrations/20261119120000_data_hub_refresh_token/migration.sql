-- AlterTable
ALTER TABLE "users" ADD COLUMN "data_hub_refresh_ciphertext" TEXT,
ADD COLUMN "data_hub_refresh_nonce" VARCHAR(32),
ADD COLUMN "data_hub_refresh_key_version" INTEGER;