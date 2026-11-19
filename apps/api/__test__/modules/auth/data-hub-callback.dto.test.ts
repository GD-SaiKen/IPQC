import { describe, expect, it } from 'vitest'
import { ValidationPipe } from '@nestjs/common'

import { DataHubCallbackDto } from '../../../modules/auth/dto/data-hub-callback.dto'

describe('DataHubCallbackDto ValidationPipe', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  })

  it('保留 code 与 state（全局 whitelist 不剥离）', async () => {
    const body = { code: 'auth-code', state: 'state-value', extra: 'drop-me' }
    const dto = (await pipe.transform(body, {
      type: 'body',
      metatype: DataHubCallbackDto,
    })) as DataHubCallbackDto

    expect(dto.code).toBe('auth-code')
    expect(dto.state).toBe('state-value')
    expect((dto as { extra?: string }).extra).toBeUndefined()
  })
})
