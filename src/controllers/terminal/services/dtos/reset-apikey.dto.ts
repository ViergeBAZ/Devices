/* eslint-disable @typescript-eslint/indent */
import { IsString, IsNotEmpty } from 'class-validator'

export class ResetApiKeyDto {
  @IsString()
  @IsNotEmpty()
  serialNumber: string
}
