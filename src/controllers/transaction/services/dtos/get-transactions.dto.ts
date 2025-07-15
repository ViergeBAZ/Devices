/* eslint-disable @typescript-eslint/indent */
import { Type } from 'class-transformer'
import { IsOptional, IsNumber, IsString, Matches, Min } from 'class-validator'

export class GetTransactionsDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'startDate must be YYMMDD format' })
  startDate?: string = '000000'

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'endDate must be YYMMDD format' })
  endDate?: string = '999999'

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  start?: number = 0

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  end?: number = 10

  @IsOptional()
  @IsString()
  serialNumber?: string

  @IsOptional()
  @IsString()
  commerce?: string
}
