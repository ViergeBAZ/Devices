/* eslint-disable @typescript-eslint/indent */
import { IsString, IsNotEmpty } from 'class-validator'

export class TpvLoginDto {
  @IsString()
  @IsNotEmpty()
  serialNumber: string

  @IsString()
  @IsNotEmpty()
  apiKey: string
}
