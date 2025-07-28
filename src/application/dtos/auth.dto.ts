import { type Types } from '@app/repositories/mongoose'

export interface IUserTokenPayload {
  _id: Types.ObjectId | string
  commerceId: string
  branchId?: string
  virtualTpv?: string
  id: string
  name: string
  firstLastName: string
  email: string
  supportEmail: string
  accountType: string | number
  businessName: string
  state: string
  town: string
  country: string
  zipCode: string
  sicCode?: string
  /* afiliation numbers */
  afiliateNumberAmexTpv?: string
  afiliateNumberAmexEcom?: string
  afiliateNumberProsaTpv?: string
  afiliateNumberProsaEcom?: string
  afiliateNumberEglobalTpv?: string
  afiliateNumberEglobalEcom?: string
  afiliateNumberApiBbvaTpv?: string
  afiliateNumberApiBbvaEcom?: string
  /* non-required */
  businessLine?: string
  secondLastName?: string
  phone?: string
  'ID Terminal'?: string
  terminalId?: string
  serialNumber?: string
  internalCommerceId?: string
  address?: string
  branchName?: string
  branchAddress?: string
  tokenType: ETokenType
}

export interface IFranchiseTokenPayload {
  _id: Types.ObjectId
  id: string
  name: string
  firstLastName: string
  email: string
  accountType: string | number
  /* non-required */
  secondLastName?: string
  phone?: string
  tokenType: ETokenType
}

export interface IAdvisorTokenPayload {
  _id: Types.ObjectId
  id: string
  name: string
  firstLastName: string
  email: string
  tokenType: ETokenType
  /* non-required */
  secondLastName?: string
  phone?: string
}

export interface IBackofficeUserTokenPayload {
  _id: Types.ObjectId
  id: string
  name: string
  firstLastName: string
  email: string
  role: number
  /* non-required */
  secondLastName?: string
  phone?: string
  /* media */
  avatar?: string
}

export enum ETokenType {
  MOBILE = 'mobile',
  TPV = 'tpv',
  WEB = 'web',
  ECOMMERCE = 'ecommerce',
  FRANCHISE = 'franchise',
  ADVISOR = 'advisor'
}
