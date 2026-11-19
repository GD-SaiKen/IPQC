import { IsOptional, IsString } from 'class-validator'

export class DataHubCallbackDto {
  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @IsString()
  error?: string
}
