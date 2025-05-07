import type { Types } from 'mongoose'

export enum ETerminalLocation {
  WAREHOUSE = 'warehouse',
  FRANCHISE = 'franchise',
  COMMERCE = 'commerce',
}

export enum ETerminalStatus {
  SENT = 'Enviado',
  NO_SOFTWARE = 'Sin software',
  IN_PROCESS = 'En proceso de envío',
  SENT_LKLPAY = 'Enviado del distribuidor a LklPay',
  RECEIVED = 'Recibido e ingresado a almacén',
  ASIGNED_FRANCHISE = 'Asignado a una franquicia',
  ASIGNED_COMMERCE = 'Asignado a una franquicia',
  IN_PROCESS_FRANCHISE = 'Proceso de envío a una franquicia',
  IN_PROCESS_COMMERCE = 'Proceso de envío a un comercio',
  VERIFIED_COMMERCE = 'Verificado en comercio',
  VERIFIED_FRANCHISE = 'Verificado en franquicia',
  ACTIVATED_COMMERCE = 'Activado en comercio',
  ACTIVATED_FRANCHISE = 'Activado en franquicia'
}

export enum ETerminalOtpStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  WRONG = 'WRONG',
  EXPIRED = 'EXPIRED'
}

export enum ETerminalName {
  Pocket = 'pocket',
  Master = 'master',
  Smart = 'smart',
  Max = 'max',
}

export enum EOperativeMode {
  RETAIL = 'retail',
  RESTAURANT = 'restaurant',
  HOTEL = 'hotel'
}

export interface ITerminalLog {
  /* required fields */
  ip: string
  description: string
  user?: string
  /* defaults */
  createdAt?: Date
}

export interface ITerminal {
  /* required fields */
  id: number
  name: string
  model: string
  serialNumber: string
  warehouseManager: string
  systemChargeResponsible: string
  arrivalTrackingGuide: string
  parcelDistributor: string
  arrivalDate: Date
  'ID Terminal': string
  internalCommerceId: number
  operativeMode: EOperativeMode
  commerceTpvManagerEmail?: string
  /* auth */
  apiKey: string
  passcode: string
  /* non-required fields */
  commerce?: Types.ObjectId
  franchise?: Types.ObjectId
  branchId?: string
  chipSerialNumber?: string
  chipTwoSerialNumber?: string
  imeiTerminal?: string
  imeiTwoTerminal?: string
  /* otp */
  otpCode: string
  otpExpiresAt: string
  otpStatus: string

  /* status */
  location: ETerminalLocation
  status: ETerminalStatus
  pending: boolean
  /* virtual */
  commerceName?: string
  /* defaults */
  createdAt?: Date
  updatedAt?: Date
  active?: boolean
}
