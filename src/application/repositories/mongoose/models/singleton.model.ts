import { type Types, Schema, model } from 'mongoose'
export interface ISingleton {
  _id: Types.ObjectId
  name: string
  object: any
  createdAt?: Date
  updatedAt?: Date
}

export const SingletonSchema = new Schema<ISingleton>({
  name: { type: String },
  object: [{ type: Object }],
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
})

/* model instance */
SingletonSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

export const SingletonModel = model<ISingleton>('singleton', SingletonSchema)
