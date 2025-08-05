import { Schema, SchemaTypes } from '@app/repositories/mongoose'
/* dtos */
import { ECardType, EDepositStatus, EISOResponseStatus, EMSI, EOperationType, ESaleType, ETefStatus, ETransactionProcessor, ETransactionStatus, type IMITFields, type ITransaction } from '../../../../interfaces/transaction.interface'
import { type HydratedDocument } from 'mongoose'
import { ETransactionType } from '../../../../interfaces/transaction.interface'
import { ETransactionValidations } from '@app/dtos/validation.dto'
import { mask } from '@app/utils/card.util'

const MITFieldsSchema = new Schema<IMITFields>({
  1: { type: String, required: false },
  3: { type: String, required: false },
  4: { type: String, required: false },
  7: { type: String, required: false },
  11: { type: String, required: false },
  12: { type: String, required: false },
  13: { type: String, required: false },
  15: { type: String, required: false },
  17: { type: String, required: false },
  18: { type: String, required: false },
  22: { type: String, required: false },
  23: { type: String, required: false },
  25: { type: String, required: false },
  32: { type: String, required: false },
  35: { type: String, required: false },
  37: { type: String, required: false },
  38: { type: String, required: false },
  39: { type: String, required: false },
  41: { type: String, required: false },
  43: { type: String, required: false },
  48: { type: String, required: false },
  49: { type: String, required: false },
  52: { type: String, required: false },
  54: { type: String, required: false },
  55: { type: String, required: false },
  58: { type: String, required: false },
  59: { type: String, required: false },
  60: { type: String, required: false },
  62: { type: String, required: false },
  63: { type: String, required: false },
  70: { type: String, required: false },
  90: { type: String, required: false },
  103: { type: String, required: false }
})

export const TransactionSchema = new Schema<ITransaction, Record<string, unknown>>({
  POS: { type: String, required: true },
  'SIC Code': { type: String, required: true },
  'ID Afiliate': { type: String, required: true },
  'ID Terminal': { type: String, required: true, default: '-' },
  'ID Aggregator': { type: String, required: true },
  'ID Transaction': { type: String, required: true },
  'Afiliate Number': { type: String, required: true },
  /* regular fields */
  type: { type: String, enum: ETransactionType, required: true },
  'Additional Terminal Capabilities': { type: String },
  Amount: {
    type: Number,
    required: true,
    min: [0, ETransactionValidations.INVALID_MIN],
    set: function (this: HydratedDocument<ITransaction>, value: any) {
      if (this.type === ETransactionType.TPV) {
        const removeStart = value.replace('9F0206', '')
        return Number(removeStart) / 100
      }
      return value
    },
    /* ISO */
    'ISO CODE RESPONSE': { type: String, required: false },
    'ISO CODE DESCRIPTION': { type: String, required: false },
    status: { type: String, enum: EISOResponseStatus, required: true },
    transactionStatus: { type: String, enum: ETransactionStatus, required: true },
    reference: { type: String, required: true, immutable: true },
    MIT: { type: String, required: false },
    'MIT Fields': [{ type: MITFieldsSchema, required: false }],
    tlv: {
      type: String,
      required: function (this: HydratedDocument<ITransaction>) {
        if (this.type === ETransactionType.ECOMMERCE) return false
        return true
      }
    },
    TTQ: { type: String },
    TVR: { type: String },
    commerce: {
      type: String,
      required: function (this: HydratedDocument<ITransaction>) {
        return (this.type === ETransactionType.ECOMMERCE)
      }
    },
    /* external refs */
    transaction: { type: SchemaTypes.ObjectId, immutable: true, required: true, unique: true },
    /* defaults */
    createdAt: { type: Date, default: () => Date.now(), immutable: true },
    updatedAt: { type: Date, default: () => Date.now() },
    active: { type: Boolean, default: true }
  },
  'Card Type': { type: String, enum: ECardType, required: true },
  'Application PAN': { type: String, required: true, set: (value: string) => mask(value) },
  'CVM Results': { type: String },
  'Cardholder Name': { type: String },
  'Cardholder Phone': {
    type: String,
    required: function (this: HydratedDocument<ITransaction>) {
      return (this.type === ETransactionType.ECOMMERCE)
    }
  },
  'Cardholder Email': {
    type: String,
    required: function (this: HydratedDocument<ITransaction>) {
      return (this.type === ETransactionType.ECOMMERCE)
    }
  },
  MSI: { type: Number, enum: EMSI, default: EMSI.NONE },
  PF: { type: Number, enum: EMSI, default: EMSI.NONE },
  SKP: { type: Number, enum: EMSI, default: EMSI.NONE },
  epn: { type: String },
  saleType: { type: String, enum: ESaleType },
  'Kernel ID': { type: String },
  'IFD Serial Number': { type: String },
  'Transaction Date': { type: String },
  'Transaction Time': { type: String },
  'Transaction Type': { type: String },
  'Terminal Capabilities': { type: String },
  'Track 2 Equivalent Data': { type: String },
  'Transaction Currency Code': { type: String },
  'Points BBVA': {
    type: Boolean,
    default: false,
    set: function (this: HydratedDocument<ITransaction>, value: string | boolean) {
      if (this.type === ETransactionType.TPV) {
        const valueNum = Number(value as string) / 100
        return (valueNum > 0)
      }
      return value
    }
  },
  /* ISO */
  'ISO CODE RESPONSE': { type: String, required: false },
  'ISO CODE DESCRIPTION': { type: String, required: false },
  status: { type: String, enum: EISOResponseStatus, required: true },
  transactionStatus: { type: String, enum: ETransactionStatus, required: true },
  reference: { type: String, required: true, immutable: true },
  MIT: { type: String, required: false },
  'MIT Fields': [{ type: MITFieldsSchema, required: false, default: [] }],
  tlv: { type: String, required: false },
  tlvTags: { type: Object },
  TTQ: { type: String },
  TVR: { type: String },
  commerce: { type: String, required: true },
  /* deposits-and-fees */
  comission: { type: Number, required: true, default: 0 },
  iva: { type: Number, required: true, default: 0 },
  toDeposit: { type: Number, required: true, default: 0 },
  deposited: { type: Number, required: true, default: 0 },
  processorComission: { type: Number, required: true, default: 0 },
  franchiseComission: { type: Number, required: true, default: 0 },
  lklpayComission: { type: Number, required: true, default: 0 },
  fixedComission: { type: Number, required: true, default: 0 },
  processorFixedComission: { type: Number, required: true, default: 0 },
  visaComission: { type: Number, required: true, default: 0 },
  msiLklpayComission: { type: Number, required: true, default: 0 },
  msiprocessorComission: { type: Number, required: true, default: 0 },
  franchiseId: { type: SchemaTypes.ObjectId },
  advisorId: { type: SchemaTypes.ObjectId },
  branchId: { type: String },
  tefStatus: { type: String, enum: ETefStatus, default: ETefStatus.NA, required: true },
  tefRejectCode: { type: String },
  depositStatus: { type: String, enum: EDepositStatus, default: EDepositStatus.NA },
  /* external refs */
  transaction: { type: SchemaTypes.ObjectId, immutable: true, required: true },
  /* geolocation */
  latitude: { type: Number },
  longitude: { type: Number },
  valeType: { type: Number },
  commerceName: { type: String },
  tip: { type: Number, default: 0 },
  bank: { type: String },
  bankProduct: { type: String },
  scheme: { type: String },
  fpmApproved: { type: Boolean },
  fpmValidationMsg: { type: String },
  processor: { type: String, enum: ETransactionProcessor, default: ETransactionProcessor.EGLOBAL },
  processorId: { type: String },
  tpvModel: { type: String },
  /* ecommerce */
  _3dsId: { type: String },
  linkId: { type: String },
  orderId: { type: String },
  operationType: { type: String, enum: EOperationType, required: true },
  readMode: { type: String },
  origin: { type: String },
  txnReference: { type: String },
  has_signature: { type: Boolean, default: false },
  /* refunds */
  refundPairId: { type: String },
  /* backup */
  originalRequest: { type: String },
  originalResponse: { type: String },
  /* AVS */
  avsId: { type: String },
  /* defaults */
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() },
  active: { type: Boolean, default: true }
},
{ toJSON: { virtuals: true }, toObject: { virtuals: true } }
)
