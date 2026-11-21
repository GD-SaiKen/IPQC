import { HttpException } from '@nestjs/common'

export const API_MSG = {
  badRequest: 'bad_request',
  unauthorized: 'unauthorized',
  dataHubUnauthorized: 'data_hub_unauthorized',
  forbidden: 'forbidden',
  notFound: 'not_found',
  conflict: 'conflict',
  gone: 'gone',
  internalError: 'internal_error',
} as const

const MSG_BY_STATUS: Record<number, string> = {
  400: API_MSG.badRequest,
  401: API_MSG.unauthorized,
  403: API_MSG.forbidden,
  404: API_MSG.notFound,
  409: API_MSG.conflict,
  410: API_MSG.gone,
  500: API_MSG.internalError,
}

const MESSAGE_BY_STATUS: Record<number, string> = {
  400: '请求参数不合法',
  401: '请先登录',
  403: '没有权限',
  404: '资源不存在',
  409: '数据冲突，请刷新后重试',
  500: '服务器繁忙，请稍后重试',
}

export function apiError(status: number, message?: string, msg?: string): HttpException {
  return new HttpException(
    {
      msg: msg ?? MSG_BY_STATUS[status] ?? API_MSG.internalError,
      message: message ?? MESSAGE_BY_STATUS[status] ?? '服务器繁忙，请稍后重试',
    },
    status,
  )
}

export function defaultMsgFor(status: number): string {
  return MSG_BY_STATUS[status] ?? API_MSG.internalError
}

export function defaultMessageFor(status: number): string {
  return MESSAGE_BY_STATUS[status] ?? '服务器繁忙，请稍后重试'
}
