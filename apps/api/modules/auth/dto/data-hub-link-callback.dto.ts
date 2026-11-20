import { IsOptional, IsString } from 'class-validator'

export class DataHubLinkCallbackDto {
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