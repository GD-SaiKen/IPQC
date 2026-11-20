import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export class LedgerSyncBodyDto {
  @IsUUID()
  shareId!: string

  /** @deprecated 使用 rootPaths；仍兼容单选 */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  rootPath?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(512, { each: true })
  rootPaths?: string[]
}