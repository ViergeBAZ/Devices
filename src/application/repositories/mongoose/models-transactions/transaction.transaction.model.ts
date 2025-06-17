import { AppMongooseRepo2 } from '@app/repositories/mongoose/index-transactions'
import mongoose from 'mongoose';
import { ETefStatus, ETransactionProcessor, ETransactionStatus, type ITransaction, type TTransactionModel } from './transactions-interface'
import { customLog } from '@app/utils/util.util'
import { mask } from '@app/utils/card.util'
const { Schema, SchemaTypes } = mongoose

const TransactionSchema = new Schema<ITransaction, Record<string, unknown>>({
  /* regular fields */
  POS: { type: String, required: false },
  'ID Transaction': { type: String, required: true },
  Amount: { type: String, required: true },
  commerce: { type: SchemaTypes.ObjectId, default: '6427534b564dafe73299a7d8' },
  type: { type: String },
  'Application PAN': { type: String, required: true, set: (value: string) => mask(value) },
  'Cardholder Name': { type: String, required: false },
  'Cardholder Phone': { type: String, required: false },
  'Cardholder Email': { type: String, required: false },
  'Transaction Date': { type: String, required: true },
  'Transaction Time': { type: String, required: true },
  'SIC Code': { type: String },
  'ID Afiliate': { type: String },
  'Afiliate Number': { type: String },
  'ID Aggregator': { type: String },
  'ID Terminal': { type: String },
  status: { type: String },
  transactionStatus: { type: String, enum: ETransactionStatus, default: ETransactionStatus.DEFAULT },
  tefStatus: { type: String, enum: ETefStatus, default: ETefStatus.NA, required: true },
  'ISO CODE DESCRIPTION': { type: String },
  'ISO CODE RESPONSE': { type: String },
  'MIT Fields': [{ type: Object, required: false, default: [] }],
  reference: { type: String, required: true },
  'Card Type': { type: String, required: true },
  'Points BBVA': { type: Boolean, default: false },
  MSI: { type: Number, default: 0 },
  SKP: { type: Number, default: 0 },
  PF: { type: Number, default: 0 },

  epn: { type: String },
  processorId: { type: String },
  'IFD Serial Number': { type: String },
  tlv: { type: String, required: false },
  tpvModel: { type: String },
  /* extra fields */
  latitude: { type: Number },
  longitude: { type: Number },
  commerceName: { type: String },
  tip: { type: Number, default: 0 },
  bank: { type: String },
  bankProduct: { type: String },
  scheme: { type: String },
  fpmApproved: { type: Boolean },
  fpmValidationMsg: { type: String },
  processor: { type: String, enum: ETransactionProcessor, default: ETransactionProcessor.EGLOBAL },
  _3dsId: { type: String },
  linkId: { type: String },
  orderId: { type: String },
  /* refunds */
  refundPairId: { type: String },
  /* backup */
  originalRequest: { type: String },
  originalResponse: { type: String },
  /* AVS */
  avsId: { type: String },

  origin: { type: String },
  txnReference: { type: String },
  /* defaults */
  createdAt: { type: Date, default: () => Date.now() },
  updatedAt: { type: Date, default: () => Date.now() },
  active: { type: Boolean, default: true }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } })

/* pre (middlewares) */
TransactionSchema.pre('save', function (next: any) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
TransactionSchema.post('save', function (doc) {
  if (doc.isNew) {
    customLog(`[Transaction][${String(doc._id)}] Transacción creada: ${JSON.stringify(doc.toJSON())}`)
  }
})

/* model instance */
export const TransactionModelTransaction = AppMongooseRepo2.model<ITransaction, TTransactionModel>('transactions', TransactionSchema)
