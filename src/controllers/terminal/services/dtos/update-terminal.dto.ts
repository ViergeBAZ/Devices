/* eslint-disable @typescript-eslint/indent */
import { IsOptional, IsString, IsDateString, IsEnum, IsBoolean, IsEmail } from 'class-validator'
import { EOperativeMode, ETerminalStatus } from '@app/interfaces/terminal.interface'

export class UpdateTerminalDto {
  @IsString()
  _id: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  serialNumber?: string

  @IsOptional()
  @IsString()
  warehouseManager?: string

  @IsOptional()
  @IsString()
  systemChargeResponsible?: string

  @IsOptional()
  @IsString()
  arrivalTrackingGuide?: string

  @IsOptional()
  @IsString()
  parcelDistributor?: string

  @IsOptional()
  @IsDateString()
  arrivalDate?: string

  @IsOptional()
  @IsEnum(ETerminalStatus)
  status?: ETerminalStatus

  @IsOptional()
  @IsBoolean()
  pending?: boolean

  @IsOptional()
  @IsBoolean()
  active?: boolean

  @IsOptional()
  @IsString()
  model?: string

  @IsOptional()
  @IsString()
  chipSerialNumber?: string

  @IsOptional()
  @IsString()
  chipTwoSerialNumber?: string

  @IsOptional()
  @IsString()
  imeiTerminal?: string

  @IsOptional()
  @IsString()
  imeiTwoTerminal?: string

  @IsOptional()
  @IsEnum(EOperativeMode)
  operativeMode: EOperativeMode

  @IsOptional()
  @IsString()
  branchId?: string

  @IsOptional()
  @IsString()
  commerce?: string

  @IsOptional()
  @IsString()
  franchise?: string

  @IsOptional()
  @IsEmail()
  commerceTpvManagerEmail?: string
}
