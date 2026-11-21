import { Type } from 'class-transformer'
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator'

class PreviewFileDto {
  @IsString()
  path!: string

  @IsOptional()
  @IsString()
  modifiedAt?: string
}

export class LedgerSyncRunDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviewFileDto)
  previewFiles?: PreviewFileDto[]
}