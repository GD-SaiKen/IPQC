import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface SuccessEnvelope<T> {
  code: 200
  data: T
  msg: 'success'
  message: string
}

function isEnvelope(payload: unknown): payload is SuccessEnvelope<unknown> {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'code' in payload &&
    'data' in payload &&
    'msg' in payload
  )
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (isEnvelope(payload)) {
          return payload
        }
        return {
          code: 200,
          data: payload ?? null,
          msg: 'success',
          message: '操作成功',
        } satisfies SuccessEnvelope<unknown>
      }),
    )
  }
}
