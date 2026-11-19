import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common'
import type { Request, Response } from 'express'

import { defaultMessageFor, defaultMsgFor } from './api-error'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const envelope = this.toEnvelope(exception)

    if (envelope.code >= 500) {
      this.logger.error(
        `${request.method} ${request.path} -> ${envelope.code} ${envelope.msg}`,
        exception instanceof Error ? exception.name : undefined,
      )
    }

    if (response.headersSent) {
      response.end()
      return
    }

    response.status(envelope.code).json(envelope)
  }

  private toEnvelope(exception: unknown): {
    code: number
    data: null
    msg: string
    message: string
  } {
    if (!(exception instanceof HttpException)) {
      return { code: 500, data: null, msg: defaultMsgFor(500), message: defaultMessageFor(500) }
    }

    const status = exception.getStatus()
    const payload = exception.getResponse()

    if (typeof payload === 'string') {
      const message = payload.startsWith('Cannot ') ? defaultMessageFor(status) : payload
      return { code: status, data: null, msg: defaultMsgFor(status), message }
    }

    const record = payload as Record<string, unknown>
    const msg = typeof record.msg === 'string' ? record.msg : defaultMsgFor(status)
    const rawMessage = record.message
    const message = Array.isArray(rawMessage)
      ? rawMessage.filter((item): item is string => typeof item === 'string').join('; ')
      : typeof rawMessage === 'string'
        ? rawMessage
        : defaultMessageFor(status)

    if (status >= 500) {
      return { code: status, data: null, msg, message: defaultMessageFor(status) }
    }

    return { code: status, data: null, msg, message }
  }
}
