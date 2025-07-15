/* eslint-disable @typescript-eslint/indent */
import { IsOptional, IsString, Matches } from 'class-validator'

export class GetTxReportDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'startDate must be YYMMDD format' })
  startDate: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'endDate must be YYMMDD format' })
  endDate: string

  @IsOptional()
  @IsString()
  serialNumber?: string

  @IsOptional()
  @IsString()
  commerce?: string
}
