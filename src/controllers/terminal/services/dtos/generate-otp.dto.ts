/* eslint-disable @typescript-eslint/indent */
import { IsString, IsNotEmpty } from 'class-validator'

export class GenerateOtpDto {
  @IsString()
  @IsNotEmpty()
  serialNumber: string
}
