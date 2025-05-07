/* repo */
import { type Types, Schema, model } from 'mongoose'

export interface ITerminalCounter {
  _id: Types.ObjectId
  seq: number
  commerce?: Types.ObjectId
  active: boolean
}

export const TerminalCounterSchema = new Schema<ITerminalCounter>({
  seq: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  commerce: { type: Schema.Types.ObjectId, ref: 'users' }
})

export const TerminalCounterModel = model<ITerminalCounter>('terminal-counter', TerminalCounterSchema)
