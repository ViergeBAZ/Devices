import { type Types } from '@app/repositories/mongoose'

export enum ETransactionType {
  ECOMMERCE = 'e-commerce',
  TPV = 'tpv'
}

export enum ECardType {
  DEBIT = 'debit',
  CREDIT = 'credit',
  INTERNATIONAL = 'international'
}

export enum EMSI {
  NONE = 0,
  THREE = 3,
  SIX = 6,
  NINE = 9,
  TWELVE = 12,
  EIGHTEEN = 18,
}

export enum EISOResponseStatus {
  PENDING = 'Pending - Se hizo la solicitud pero no llegó al ISO',
  SENT = 'ISO - Solicitud completada con el ISO, es espera de respuesta',
  SOLVED = 'ISO Response - Respuesta recibida por parte del ISO',
  SENT_VISA = 'Pending - Se hizo la solicitud a cybersource'
}

export enum ETransactionStatus {
  DEFAULT = 'n/a',
  APPROVED = 'approved',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
  REFUND = 'refund',
  FPM_DECLINED = 'fpm-declined'
}

export enum EOperationType {
  SALE = 'sale',
  REFUND = 'refund'
}

export enum ESaleType {
  SALE = '00',
  SALE_POINTS = '02',
  SALE_TIP = '03',
  CANCEL = '01',
  REFUND = '04',
  SALE_CASHBACK = '05'
}

export enum ETefStatus {
  NOT_SENT = 'not-sent',
  WARNING = 'warning',
  DECLINED = 'declined',
  APPROVED = 'approved',
  NA = 'n/a'
}

export enum EDepositStatus {
  PROCESSING = 'in-process',
  DONE = 'done',
  PENDING = 'pending',
  NA = 'n/a'
}

export enum ETransactionBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMEX = 'amex',
  OTHER = 'other'
}

export enum ETransactionProcessor {
  CYBERSOURCE = 'cybersource',
  EGLOBAL = 'eglobal',
  BANORTE = 'banorte',
  BBVA = 'bbva',
  AMEX = 'amex',
  VIERGE = 'vierge',
  BLUMON = 'blumon'
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

export interface ITransaction {
  _id: Types.ObjectId
  /* cancelation fields */
  'POS': string
  'SIC Code': string
  'ID Afiliate': string
  'ID Terminal': string
  'ID Aggregator': string
  'ID Transaction': string
  'Afiliate Number': string
  /* required fields */
  Amount: number
  commerce: string
  type: ETransactionType
  'Application PAN': string
  'Points BBVA': boolean
  SKP: EMSI
  PF: EMSI
  saleType: ESaleType
  epn?: string
  'Card Type': ECardType
  MSI: EMSI
  status: EISOResponseStatus
  transactionStatus: ETransactionStatus
  reference: string
  /* opt tpv */
  'Cardholder Email'?: string
  'Cardholder Phone'?: string
  'Cardholder Name'?: string
  'Additional Terminal Capabilities'?: string
  'CVM Results'?: string
  'IFD Serial Number'?: string
  'Kernel ID'?: string
  'Terminal Capabilities'?: string
  'Track 2 Equivalent Data'?: string
  'Transaction Currency Code'?: string
  'Transaction Date'?: string
  'Transaction Time'?: string
  'Transaction Type'?: string
  /* ISO */
  'ISO CODE RESPONSE'?: string
  'ISO CODE DESCRIPTION'?: string
  'MIT'?: string
  'MIT Fields': IMITFields[]
  tlv?: string
  tlvTags?: string
  TTQ?: string
  TVR?: string
  comission: number
  iva: number
  toDeposit: number
  deposited: number
  processorComission: number
  franchiseComission: number
  lklpayComission: number
  fixedComission: number
  processorFixedComission: number
  visaComission: number
  msiLklpayComission: number
  msiprocessorComission: number
  franchiseId: Types.ObjectId
  advisorId: Types.ObjectId
  branchId: string
  tefStatus: ETefStatus
  tefRejectCode: string
  depositStatus: EDepositStatus
  processorId: string
  tpvModel: string
  /* refs */
  transaction: Types.ObjectId
  latitude: number
  longitude: number
  valeType: number
  commerceName: string
  tip: number
  bank: string
  bankProduct: string
  scheme: string
  fpmApproved: boolean
  fpmValidationMsg: string
  processor: string
  _3dsId: string
  linkId: string
  orderId: string
  operationType: EOperationType
  readMode: string
  origin: string
  txnReference: string
  /* refunds */
  refundPairId: string
  /* backup */
  originalRequest: string
  originalResponse: string
  /* AVS */
  avsId: string
  /* defaults */
  createdAt?: Date
  updatedAt?: Date
  active?: boolean
}
