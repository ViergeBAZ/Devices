/* eslint-disable @typescript-eslint/indent */
import { IsString } from 'class-validator'

export class DeleteTerminalDto {
  @IsString()
  id: string
}
