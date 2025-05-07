import { type Types, Schema, model } from '@app/repositories/mongoose'
import { CommerceLogger } from '@app/handlers/loggers/commerce-register.logger'

export interface ITicket {
  type: number
  status: number
  description: string
  /* refs */
  user: Types.ObjectId
  /* defaults */
  createdAt: Date
  updatedAt: Date
  active: boolean
}

export const TicketSchema = new Schema<ITicket>({
  type: { type: Number },
  status: { type: Number },
  description: { type: String },
  /* refs */
  user: { type: Schema.Types.ObjectId, ref: 'user' },
  /* defaults */
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() },
  active: { type: Boolean, default: true }
})

/* pre (middlewares) */
TicketSchema.pre('save', function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
TicketSchema.post('save', function (doc) {
  CommerceLogger.info(`[Tickets][${String(doc._id)}] Ticket creado: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const TicketModel = model<ITicket>('tickets', TicketSchema)
