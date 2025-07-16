import type { AccumulatorOperator } from 'mongoose'
import { type IUserTokenPayload } from '@app/dtos/auth.dto'

export type { ITransaction } from '@app/interfaces/transaction.interface'

export type TAccumulatorOperator = Record<string, AccumulatorOperator>

export interface ITerminalAggregator {
  Amount: number
  Comission: number
  Deposit: number
  Sold: number
  iva: number
  _id: string
}

export interface IGetTransaction {
  filter?: string
  start?: number
  end?: number
  startDate?: string
  endDate?: string
  selectedDate?: string
  ticketId?: string
  brand?: string
  user?: string
  type?: string
  branch?: string
  serialNumber?: string
  status?: string
}

export interface IGetTransactionResponse {
  'Additional Terminal Capabilities': string
  Amount: string
  'Application PAN': string
  'CVM Results': string
  'IFD Serial Number': string
  'Kernel ID': string
  TTQ: string
  TVR: string
  'Terminal Capabilities': string
  'Track 2 Equivalent Data': string
  'Transaction Currency Code': string
  'Transaction Date': string
  'Transaction Time': string
  'Transaction Type': string
  tlv: string
}

export interface IGetTransactionMonthResponse {
  day: string
  date: string
  sales: number
  sold: number
  comission: number
  deposit: number
}

/* locals */
export interface IUserLocals {
  user: IUserTokenPayload
}

export interface ICommerceAggregator {
  Amount: number
  commerce_id: string
}

export interface IGetPendingBalance {
  filter?: string
}

export interface ITpvTokenPayload {
  _id: string
  commerceId: string
  branchId: string
  serialNumber: string
  tokenType: string
  iat: number
  exp: number
}
