/* eslint-disable @typescript-eslint/indent */
import { IsString, IsNotEmpty, Matches } from 'class-validator'

export class TpvBatchSettlementDto {
  serialNumber: string
  commerceId: string

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{12}$/, { message: 'beginDate must be in YYMMDDHHMMSS format' })
  beginDate: string

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{12}$/, { message: 'endDate must be in YYMMDDHHMMSS format' })
  endDate: string
}
