-- CreateTable
CREATE TABLE "oauth_logins" (
    "id" UUID NOT NULL,
    "state_hash" VARCHAR(64) NOT NULL,
    "code_verifier" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "oauth_logins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_logins_state_hash_key" ON "oauth_logins"("state_hash");