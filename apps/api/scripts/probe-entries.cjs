const fs = require('node:fs')
const path = require('node:path')
const { PrismaClient } = require('@prisma/client')
const { createDecipheriv } = require('node:crypto')

const envPath = path.join(__dirname, '../.env')
if (fs.existsSync(envPath)) process.loadEnvFile(envPath)

const api = process.env.DATA_HUB_API_ORIGIN

async function token(prisma) {
  const u = await prisma.user.findFirst({ where: { phone: '13800000000', delFlag: 0 } })
  if (!u?.dataHubRefreshCiphertext) return null
  const key = Buffer.from(process.env.DATA_HUB_TOKEN_KEY, 'base64')
  const data = Buffer.from(u.dataHubRefreshCiphertext, 'base64')
  const dec = createDecipheriv('aes-256-gcm', key, Buffer.from(u.dataHubRefreshNonce, 'base64'))
  dec.setAuthTag(data.subarray(data.length - 16))
  const refresh = Buffer.concat([dec.update(data.subarray(0, data.length - 16)), dec.final()]).toString('utf8')
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refresh,
    client_id: process.env.DATA_HUB_OAUTH_CLIENT_ID,
    client_secret: process.env.DATA_HUB_OAUTH_CLIENT_SECRET,
  })
  const tr = await fetch(`${api}/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body })
  const tok = await tr.json()
  return tok.access_token
}

const prisma = new PrismaClient()
;(async () => {
  const access = await token(prisma)
  if (!access) {
    console.log('no token')
    return
  }
  const sharesRes = await fetch(`${api}/api/shares?page=1&pageSize=20`, {
    headers: { authorization: `Bearer ${access}` },
  })
  const sharesBody = await sharesRes.json()
  const shares = (sharesBody.data?.list ?? sharesBody.list ?? []).map((s) => ({
    id: s.id,
    name: s.displayName ?? s.name,
    status: s.connectionStatus ?? s.status,
  }))
  for (const s of shares.filter((x) => x.status === 'ready').slice(0, 3)) {
    const url = `${api}/api/shares/${s.id}/entries?path=&page=1&pageSize=20`
    const res = await fetch(url, { headers: { authorization: `Bearer ${access}` } })
    const body = await res.json()
    console.log('\n===', s.name, s.id, 'status', res.status, '===')
    console.log(JSON.stringify(body, null, 2).slice(0, 2000))
  }
})()
  .finally(() => prisma.$disconnect())