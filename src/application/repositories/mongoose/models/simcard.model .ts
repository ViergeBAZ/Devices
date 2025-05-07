import { type Types, Schema, model } from 'mongoose'

export interface ISimcard {
  /* required fields */
  id?: number
  /* status */
  status: ESimcardStatus
  /* relations */
  franchiseId: Types.ObjectId
  commerceId: Types.ObjectId
  /* defaults */
  createdAt?: Date
  updatedAt?: Date
  active?: boolean
}

export enum ESimcardStatus {
  WAREHOUSE = 'warehouse',
  FRANCHISE = 'franchise',
  COMMERCE = 'commerce'
}

export const SimcardSchema = new Schema<ISimcard>({
  /* required fields */
  id: { type: Number },
  /* status */
  status: { type: String, enum: ESimcardStatus, default: ESimcardStatus.WAREHOUSE },
  /* relations */
  franchiseId: { type: Schema.Types.ObjectId, ref: 'franchises' },
  commerceId: { type: Schema.Types.ObjectId, ref: 'users' },
  /* defaults */
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() },
  active: { type: Boolean, default: true }
})

/* model instance */
SimcardSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

export const SimcardModel = model<ISimcard>('simcard', SimcardSchema)
