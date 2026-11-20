-- AlterTable
ALTER TABLE "users" ADD COLUMN "password_hash" VARCHAR(60);

-- DropTable
DROP TABLE "oauth_logins";