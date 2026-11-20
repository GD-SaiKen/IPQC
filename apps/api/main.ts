import 'reflect-metadata'

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import cookieParser from 'cookie-parser'
import express from 'express'

import { AppModule } from './app.module'
import { ApiResponseInterceptor, ensureDatabase, HttpExceptionFilter } from './common'

function loadEnv(): void {
  const envPath = resolve(__dirname, '../.env')
  if (existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath)
    } catch {
      /* 使用进程已有环境变量 */
    }
  }
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap')
  loadEnv()

  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (databaseUrl) {
    const created = await ensureDatabase(databaseUrl)
    logger.log(created ? '数据库不存在，已自动创建并应用迁移' : '数据库已就绪，迁移检查完成')
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  app.setGlobalPrefix('api')
  app.disable('x-powered-by')
  app.use(cookieParser())
  app.use(express.json())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new ApiResponseInterceptor())

  const port = Number(process.env.PORT ?? 3006)
  await app.listen(port)
  logger.log(`IPQC API http://localhost:${port}/api`)
}

void bootstrap()
