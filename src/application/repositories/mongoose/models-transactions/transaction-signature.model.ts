import { AppMongooseRepo2 } from '@app/repositories/mongoose/index-transactions'
import mongoose from 'mongoose'
const { Schema } = mongoose

export interface ITransactionSignature {
  _id: mongoose.Types.ObjectId
  transaction_id: string
  signature: Buffer
  created_at: Date
}

const TransactionSignatureSchema = new Schema<ITransactionSignature>({
  transaction_id: { type: String, required: true, index: true },
  signature: { type: Buffer, required: true },
  created_at: { type: Date, default: Date.now }
}, {
  collection: 'transaction_signature'
})

export const TransactionSignatureModel = AppMongooseRepo2.model<ITransactionSignature>('TransactionSignature', TransactionSignatureSchema)
