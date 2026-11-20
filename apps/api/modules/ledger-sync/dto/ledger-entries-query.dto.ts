import { IsOptional, IsString, MaxLength } from 'class-validator'

export class LedgerEntriesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  path?: string
}