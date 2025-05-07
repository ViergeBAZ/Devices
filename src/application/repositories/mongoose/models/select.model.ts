import { type Types, Schema, model } from 'mongoose'
export interface ISelect {
  _id: Types.ObjectId
  name: string
  options?: any
  createdAt?: Date
  updatedAt?: Date
}

export const SelectSchema = new Schema<ISelect>({
  name: { type: String },
  options: [{ type: Object }],
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
})

/* model instance */
SelectSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

export const SelectModel = model<ISelect>('select', SelectSchema)
