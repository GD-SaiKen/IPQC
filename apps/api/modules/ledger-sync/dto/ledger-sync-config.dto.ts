import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

class SelectedEntryDto {
  @IsString()
  path!: string

  @IsIn(['directory', 'file'])
  kind!: 'directory' | 'file'
}

export class PutLedgerSyncConfigDto {
  @IsOptional()
  @IsUUID()
  shareId?: string | null

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedEntryDto)
  @ArrayMaxSize(500)
  selectedEntries!: SelectedEntryDto[]

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(500)
  excludedPaths!: string[]

  @IsInt()
  @Min(0)
  @Max(23)
  hour!: number

  @IsInt()
  @Min(0)
  @Max(59)
  minute!: number
}