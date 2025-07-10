import { type Types, Schema, model } from 'mongoose'

export interface IVoucherDownload {
  _id: Types.ObjectId
  userId: string
  userName: string
  userEmail: string
  downloadTime: Date
  voucherNumber: string
  origin?: string
  createdAt?: Date
  updatedAt?: Date
  active?: boolean
}

export const VoucherDownloadSchema = new Schema<IVoucherDownload>({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  downloadTime: { type: Date, required: true },
  voucherNumber: { type: String, required: true },
  origin: { type: String },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() },
  active: { type: Boolean, default: true }
})

/* pre (middlewares) */
VoucherDownloadSchema.pre('save', function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* model instance */
export const VoucherDownloadModel = model<IVoucherDownload>('voucher-download', VoucherDownloadSchema)
