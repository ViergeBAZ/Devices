/* repo */
import { Schema, model, type CallbackError } from 'mongoose'
/* models */
import { AppErrorResponse } from '@app/models/app.response'
/* counters */
import { TerminalCounterModel } from '@app/repositories/mongoose/models/terminal-counter.model'
/* handlers */
import { TerminalLogger } from '@app/handlers/loggers/terminal.logger'
/* dtos */
import { type ITerminal, ETerminalStatus, ETerminalLocation, ETerminalOtpStatus, EOperativeMode } from '@app/interfaces/terminal.interface'

export const TerminalSchema = new Schema<ITerminal>({
  /* required fields */
  id: { type: Number },
  name: { type: String, required: true },
  model: { type: String, required: true },
  serialNumber: { type: String, required: true, unique: true },
  warehouseManager: { type: String, required: true },
  systemChargeResponsible: { type: String, required: true },
  arrivalTrackingGuide: { type: String, required: true },
  parcelDistributor: { type: String, required: true },
  arrivalDate: { type: Date, required: true },
  franchise: { type: Schema.Types.ObjectId, ref: 'franchises' },
  commerce: { type: Schema.Types.ObjectId, ref: 'users' },
  branchId: { type: String },
  'ID Terminal': { type: String },
  internalCommerceId: { type: Number },
  operativeMode: { type: String, enum: EOperativeMode, default: EOperativeMode.RETAIL },
  commerceTpvManagerEmail: { type: String },
  /* auth */
  apiKey: { type: String },
  passcode: { type: String },
  /* non-required fields */
  chipSerialNumber: { type: String },
  chipTwoSerialNumber: { type: String },
  imeiTerminal: { type: String },
  imeiTwoTerminal: { type: String },
  /* otp */
  otpCode: { type: String },
  otpExpiresAt: { type: String },
  otpStatus: { type: String, enum: ETerminalOtpStatus },
  /* status */
  location: { type: String, enum: ETerminalLocation, default: ETerminalLocation.WAREHOUSE },
  status: { type: String, enum: ETerminalStatus, default: ETerminalStatus.NO_SOFTWARE },
  pending: { type: Boolean, default: false },
  /* defaults */
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() },
  active: { type: Boolean, default: true }
})

/* pre (middlewares) */
TerminalSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())

  if (this.isNew) {
    try {
      const counter = await TerminalCounterModel.findOneAndUpdate({ active: true, _id: '65089fd2c9dd2efbb9470b14' }, { $inc: { seq: 1 } })
      if (counter == null) throw new AppErrorResponse({ name: 'Error en el contador de Terminales', description: 'Error en el contador de Terminales', statusCode: 500, isOperational: true })
      this.id = counter.seq + 1
      next()
    } catch (error) {
      next(error as CallbackError)
    }
  }

  next()
})

/* post (middlewares) */
TerminalSchema.post('save', function (doc) {
  TerminalLogger.info(`[Terminal][${String(doc._id)}] Datos de terminal actualizados: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const TerminalModel = model<ITerminal>('terminals', TerminalSchema)
