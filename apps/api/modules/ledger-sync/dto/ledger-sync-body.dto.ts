import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator'

import { LEDGER_ROLES, LEDGER_TEMPLATES } from '../ledger-roles'

export class SelectedEntryDto {
  @IsString()
  @MaxLength(512)
  path!: string

  @IsIn(['directory', 'file'])
  kind!: 'directory' | 'file'

  @IsOptional()
  @IsIn(LEDGER_ROLES)
  role?: (typeof LEDGER_ROLES)[number]

  @IsOptional()
  @IsIn(LEDGER_TEMPLATES)
  template?: (typeof LEDGER_TEMPLATES)[number]
}

export class PreviewFileDto {
  @IsString()
  @MaxLength(512)
  path!: string

  @IsOptional()
  @IsString()
  modifiedAt?: string
}

export class LedgerSyncBodyDto {
  @IsUUID()
  shareId!: string

  /** @deprecated 使用 selectedEntries */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  rootPath?: string

  /** @deprecated 使用 selectedEntries */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(512, { each: true })
  rootPaths?: string[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @ValidateNested({ each: true })
  @Type(() => SelectedEntryDto)
  selectedEntries?: SelectedEntryDto[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(512)
  @IsString({ each: true })
  @MaxLength(512, { each: true })
  excludedPaths?: string[]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2500)
  @ValidateNested({ each: true })
  @Type(() => PreviewFileDto)
  previewFiles?: PreviewFileDto[]
}