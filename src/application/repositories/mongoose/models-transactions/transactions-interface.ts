import { type Document } from '@app/repositories/mongoose/index-transactions'
import { type Model, type Types } from 'mongoose'

export enum ETransactionType {
  ECOMMERCE = 'e-commerce',
  TPV = 'tpv'
}

export enum ETransactionStatus {
  DEFAULT = 'n/a',
  APPROVED = 'approved',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  REFUND = 'refund',
  REVERSED = 'reversed'
}

export enum ETefStatus {
  NOT_SENT = 'not-sent',
  WARNING = 'warning',
  DECLINED = 'declined',
  APPROVED = 'approved',
  NA = 'n/a'
}

export enum EISOResponseStatus {
  PENDING = 'Pending - Se hizo la solicitud pero no llegó al ISO',
  SENT = 'ISO - Solicitud completada con el ISO, es espera de respuesta',
  SOLVED = 'ISO Response - Respuesta recibida por parte del ISO',
}

export enum ETransactionProcessor {
  CYBERSOURCE = 'cybersource',
  EGLOBAL = 'eglobal',
  BANORTE = 'banorte',
  BBVA = 'bbva'
}

export interface IMITFields {
  '1'?: string
  '3'?: string
  '4'?: string
  '7'?: string
  '11'?: string
  '12'?: string
  '13'?: string
  '15'?: string
  '17'?: string
  '18'?: string
  '22'?: string
  '23'?: string
  '25'?: string
  '32'?: string
  '35'?: string
  '37'?: string
  '38'?: string
  '39'?: string
  '41'?: string
  '43'?: string
  '48'?: string
  '49'?: string
  '52'?: string
  '54'?: string
  '55'?: string
  '58'?: string
  '59'?: string
  '60'?: string
  '62'?: string
  '63'?: string
  '70'?: string
  '90'?: string
  '103'?: string
}

export interface ITransaction extends Document {
  _id: Types.ObjectId
  /* fields */
  POS: string
  'ID Transaction': string
  Amount: string
  commerce: Types.ObjectId
  type?: ETransactionType
  'Application PAN': string
  'Cardholder Name': string
  'Cardholder Phone': string
  'Cardholder Email': string
  'Transaction Date': string
  'Transaction Time': string
  'SIC Code': string
  'ID Afiliate': string
  'Afiliate Number': string
  'ID Aggregator': string
  'ID Terminal': string
  status: EISOResponseStatus
  transactionStatus: ETransactionStatus
  tefStatus: ETefStatus
  'ISO CODE DESCRIPTION': string
  'ISO CODE RESPONSE': string
  'MIT Fields': IMITFields[]
  reference: string
  'Card Type': string
  'Points BBVA': boolean
  MSI: number
  SKP: number
  PF: number

  epn?: string
  processorId: string
  'IFD Serial Number': string
  tlv?: string
  tpvModel: string
  /* extra fields */
  latitude: number
  longitude: number
  commerceName: string
  tip: number
  bank: string
  bankProduct: string
  scheme: string
  fpmApproved: boolean
  fpmValidationMsg: string
  processor: ETransactionProcessor
  _3dsId: string
  linkId: string
  orderId: string
  /* refund */
  refundPairId?: string
  /* backup */
  originalRequest: string
  originalResponse: string
  /* AVS */
  avsId: string

  origin: string
  txnReference: string
  /* defaults */
  createdAt?: Date
  updatedAt?: Date
  active?: boolean
}

export type TTransactionModel = Model<ITransaction, Record<string, unknown>>
