import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export class LedgerSyncBodyDto {
  @IsUUID()
  shareId!: string

  @IsOptional()
  @IsString()
  @MaxLength(512)
  rootPath?: string
}