/**
 * 写入/更新默认管理员：node apps/api/scripts/ensure-default-admin.cjs
 * 读取 AUTH_BOOTSTRAP_*（或内置默认值），需要 DATABASE_URL。
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const { existsSync } = require('node:fs')
const { resolve } = require('node:path')

const envPath = resolve(__dirname, '../.env')
if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath)
  } catch {
    /* ignore */
  }
}

const phone = (process.env.AUTH_BOOTSTRAP_PHONE ?? '13800000000').trim()
const plain = (process.env.AUTH_BOOTSTRAP_PASSWORD ?? 'Aasd1234').trim()
const displayName = (process.env.AUTH_BOOTSTRAP_DISPLAY_NAME ?? '管理员').trim()
const role = (process.env.AUTH_BOOTSTRAP_ROLE ?? 'admin').trim()

const prisma = new PrismaClient()
;(async () => {
  const passwordHash = await bcrypt.hash(plain, 10)
  await prisma.user.upsert({
    where: { phone },
    create: { phone, displayName, passwordHash, role },
    update: { passwordHash, displayName, role, delFlag: 0 },
  })
  console.log(`默认管理员已就绪：${phone}（${role}）`)
})()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())