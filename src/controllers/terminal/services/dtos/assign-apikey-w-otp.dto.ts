/* eslint-disable @typescript-eslint/indent */
import { IsString, IsNotEmpty } from 'class-validator'

export class AssingApiKeyWOtpDto {
  @IsString()
  @IsNotEmpty()
  commerceInternalId: string

  @IsString()
  @IsNotEmpty()
  serialNumber: string

  @IsString()
  @IsNotEmpty()
  otp: string
}
