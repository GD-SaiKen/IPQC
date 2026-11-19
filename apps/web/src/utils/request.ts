import axios from 'axios'
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

import { msgError, msgSuccess } from './feedback'
import { notifySessionExpired } from '@/stores/auth'

const SUCCESS_CODE = 200

export interface RequestOptions {
  showSuccess?: boolean
  successMessage?: string
  showError?: boolean
  errorMessage?: string
  sessionExpiredOn401?: boolean
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    requestOptions?: RequestOptions
  }
}

export interface ApiFailure extends Error {
  code: number
  msg: string
}

interface ApiEnvelope<T> {
  code: number
  data: T
  msg: string
  message: string
}

function isEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    'msg' in body &&
    'message' in body
  )
}

function fallbackMessage(code: number): string {
  if (code === 0) {
    return '网络异常，请检查网络后重试'
  }
  if (code === 401) {
    return '请先登录'
  }
  return '请求失败'
}

function reportFailure(
  code: number,
  msg: string,
  message: string,
  options: RequestOptions,
): ApiFailure {
  const finalMessage = options.errorMessage ?? message ?? msg ?? fallbackMessage(code)
  if (options.showError !== false) {
    msgError(finalMessage)
  }
  const error = new Error(finalMessage) as ApiFailure
  error.code = code
  error.msg = msg
  return error
}

const client = axios.create({
  baseURL: '/api',
  timeout: 60_000,
  withCredentials: true,
})

client.interceptors.response.use(
  (response: AxiosResponse) => {
    const options: RequestOptions = response.config.requestOptions ?? {}
    const body = response.data
    if (!isEnvelope(body)) {
      return response
    }
    if (body.code !== SUCCESS_CODE) {
      throw reportFailure(body.code, body.msg, body.message, options)
    }
    if (options.showSuccess) {
      msgSuccess(options.successMessage ?? body.message ?? '操作成功')
    }
    response.data = body.data
    return response
  },
  (error: AxiosError) => {
    const options: RequestOptions = error.config?.requestOptions ?? {}
    if (!error.response) {
      throw reportFailure(0, 'network_error', fallbackMessage(0), options)
    }
    const body = error.response.data
    if (isEnvelope(body)) {
      if (body.code === 401 && options.sessionExpiredOn401 !== false) {
        notifySessionExpired()
      }
      throw reportFailure(body.code, body.msg, body.message, options)
    }
    throw reportFailure(error.response.status, 'bad_request', fallbackMessage(error.response.status), options)
  },
)

function mergeOptions(config?: AxiosRequestConfig): AxiosRequestConfig {
  return {
  ...config,
    requestOptions: {
      showSuccess: false,
      showError: true,
      sessionExpiredOn401: true,
      ...config?.requestOptions,
    },
  }
}

export const request = {
  isUnauthorized(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as ApiFailure).code === 401
  },
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await client.get<T>(url, mergeOptions(config))
    return res.data
  },
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await client.post<T>(url, data, mergeOptions(config))
    return res.data
  },
}
