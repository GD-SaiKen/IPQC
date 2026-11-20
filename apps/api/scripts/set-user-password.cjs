/**
 * 为已有用户设置登录密码：node apps/api/scripts/set-user-password.cjs <11位手机号> <明文密码>
 * 需要环境变量 DATABASE_URL（或 apps/api/.env 由 shell 注入）。
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const phone = process.argv[2]
const plain = process.argv[3]
if (!phone || !plain) {
  console.error('用法: node apps/api/scripts/set-user-password.cjs <phone> <password>')
  process.exit(1)
}

const prisma = new PrismaClient()
;(async () => {
  const hash = await bcrypt.hash(plain, 10)
  const result = await prisma.user.updateMany({
    where: { phone, delFlag: 0 },
    data: { passwordHash: hash },
  })
  if (result.count === 0) {
    console.error('未找到该手机号的用户')
    process.exit(1)
  }
  console.log('密码已更新')
})()
  .finally(() => prisma.$disconnect())