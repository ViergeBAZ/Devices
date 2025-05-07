import { type Types } from '@app/repositories/mongoose'

export enum ECommerceUserRoles {
  AGGREGATOR = 1,
  MORAL = 2,
  PHYSICAL = 3,
}

export interface IRefreshToken {
  refreshToken: string
  expiryDate: Date
}

export interface IUserPayload {
  _id: string
  id: string
  name: string
  firstLastName: string
  email: string
  accountType: string | number
  /* non-required */
  businessLine?: string
  businessName: string
  secondLastName?: string
  phone?: string
  bucket?: string
}

export interface IFranchisePayload {
  _id: Types.ObjectId
  id: string
  name: string
  firstLastName: string
  email: string
  accountType: string | number
  /* non-required */
  secondLastName?: string
  phone?: string
  bucket?: string
}

export interface IBackofficeUserPayload {
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
