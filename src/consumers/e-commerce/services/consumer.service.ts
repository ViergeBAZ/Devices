/* models */
import { TerminalModel, TransactionModel } from '@app/repositories/mongoose/models'
/* handlers */
import { messageHandler } from '@app/handlers/kafka'
/* dtos */
import type { KafkaMessage } from 'kafkajs'
import { EDepositStatus, type EOperationType, ETefStatus, ETransactionStatus, ETransactionType } from '@app/interfaces/transaction.interface'
import { appSendEmail } from '@app/utils/mail.util'
import { getStringDate } from '@app/utils/date.util'
import { excelReportRecipients } from '@app/constants/mail.constants'
import transactionReportService from '@controllers/transaction/services/subservices/report.service'
import mainProducer from '@producers/main-producer'
import { customLog } from '@app/utils/util.util'

export class ConsumerService {
  async onTransactionCreate (message: KafkaMessage): Promise<void> {
    const fields = messageHandler<Record<string, any>>(message)
    const exists = await TransactionModel.exists({ transaction: fields.transaction })
    // if (fields.fpmApproved !== true) fields.transactionStatus = ETransactionStatus.FPM_DECLINED
    const terminal = await TerminalModel.findOne({ serialNumber: fields['IFD Serial Number'] })

    if (exists != null) {
      customLog('La transacción ya está en la BD')
      return
    }
    await TransactionModel.create({
      ...fields,
      branchId: terminal?.branchId,
      type: fields.type ?? ETransactionType.ECOMMERCE
    })
  }

  async onTransactionUpdate (message: KafkaMessage): Promise<void> {
    const fields = messageHandler<Record<string, string>>(message)
    customLog(fields)
    const transaction = fields.transaction
    const MIT = fields.MIT
    const MITFields = fields['MIT Fields']
    const ISOCode = fields['ISO CODE RESPONSE']
    const ISOCodeDescription = fields['ISO CODE DESCRIPTION']
    const status = fields.status
    const transactionStatus = fields.transactionStatus as ETransactionStatus
    const operationType = fields.operationType as EOperationType
    const depositStatus = (['00', '000', '001'].includes(ISOCode) && [ETransactionStatus.APPROVED, ETransactionStatus.REFUND].includes(transactionStatus)) ? EDepositStatus.PENDING : EDepositStatus.NA
    const processorId = fields.processorId

    let tefStatus = ETefStatus.NA
    if (ISOCode === '00' && transactionStatus === ETransactionStatus.APPROVED) {
      tefStatus = ETefStatus.NOT_SENT
    } else if (ISOCode === '00' && transactionStatus === ETransactionStatus.REFUND) {
      tefStatus = ETefStatus.NOT_SENT
    }

    await TransactionModel.updateOne({ transaction }, {
      MIT,
      'MIT Fields': MITFields,
      'ISO CODE RESPONSE': ISOCode,
      'ISO CODE DESCRIPTION': ISOCodeDescription,
      status,
      transactionStatus,
      operationType,
      depositStatus,
      tefStatus: fields.tefStatus ?? tefStatus,
      processorId,
      originalRequest: fields.originalRequest,
      originalResponse: fields.originalResponse
    })
  }

  async onTransactionRefund (message: KafkaMessage): Promise<void> {
    const fields = messageHandler<Record<string, string>>(message)
    customLog(fields)

    const originalTransaction = await TransactionModel.findOne({ transaction: fields.transaction })
    if (originalTransaction == null) { customLog('No se encontró la transacción original'); return }

    // Update original transaction
    originalTransaction.refundPairId = fields.refundPairId
    await originalTransaction.save()

    // Update refund transaction
    await TransactionModel.updateOne({ transaction: fields.refundPairId }, {
      comission: -originalTransaction.comission,
      iva: -originalTransaction.iva,
      toDeposit: -originalTransaction.toDeposit,
      deposited: -originalTransaction.deposited,
      processorComission: -originalTransaction.processorComission,
      franchiseComission: -originalTransaction.franchiseComission,
      lklpayComission: -originalTransaction.lklpayComission,
      fixedComission: -originalTransaction.fixedComission,
      processorFixedComission: -originalTransaction.processorFixedComission,
      visaComission: -originalTransaction.visaComission,
      msiLklpayComission: -originalTransaction.msiLklpayComission,
      msiprocessorComission: -originalTransaction.msiprocessorComission
    })
  }

  async onTransactionBlock (message: KafkaMessage): Promise<any> {
    const transactions = messageHandler<Array<{ id: string, deposited: number }>>(message)
    const transactionIds = transactions.map(transaction => transaction.id)

    await TransactionModel.updateMany(
      { _id: { $in: transactionIds } },
      { depositStatus: EDepositStatus.PROCESSING }
    )

    customLog('Transacciones en proceso: ', transactions.length)
    return 'Transacciones en proceso: ' + String(transactions.length)
  }

  async onConfirmDeposit (message: KafkaMessage): Promise<any> {
    const transactions = messageHandler<any[]>(message)
    const transactionIds = transactions.map(transaction => transaction.id)

    const transactionsFound = await TransactionModel.find({
      _id: { $in: transactionIds },
      depositStatus: { $ne: EDepositStatus.DONE }
    })

    if (transactionsFound.length === 0) {
      customLog('No se actualizó ninguna transacción')
      return 'No se actualizó ninguna transacción'
    }

    const bulkOperations = transactionsFound.map(transactionFound => {
      const transaction = transactions.find(t => t.id === transactionFound._id.toString())
      const newDepositStatus = (transactionFound.deposited + Number(transaction.added) >= transactionFound.toDeposit) ? EDepositStatus.DONE : EDepositStatus.PENDING

      if (transactionFound.deposited + Number(transaction.added) > transactionFound.toDeposit) customLog('Warn', transaction.id, ': deposited + added = ', transactionFound.deposited + Number(transaction.added), '>', transactionFound.toDeposit)

      return {
        updateOne: {
          filter: { _id: transactionFound._id },
          update: {
            deposited: transaction.deposited,
            depositStatus: newDepositStatus
          }
        }
      }
    })

    if (bulkOperations.length > 0) await TransactionModel.bulkWrite(bulkOperations)

    customLog('Transacciones actualizadas: ', bulkOperations.length)
    return 'Transacciones actualizadas: ' + String(bulkOperations.length)
  }

  async tefReadUpdates (message: KafkaMessage): Promise<any> {
    const toUpdateTransactions = messageHandler<Record<string, string>>(message) as any

    const bulkOperations = toUpdateTransactions.map((transaction: any) => ({
      updateOne: {
        filter: {
          'ID Transaction': transaction['ID Transaction'],
          'Transaction Date': transaction['Transaction Date']
        },
        update: {
          $set: {
            tefStatus: String(transaction.tefStatus),
            tefRejectCode: String(transaction.rejectCode ?? '')
          }
        }
      }
    }))

    await TransactionModel.bulkWrite(bulkOperations)

    try {
      const currentDate = new Date()
      currentDate.setDate(currentDate.getDate() - 1)
      const currentDateString = getStringDate(currentDate)
      const excel = await transactionReportService.getTransactionsReportBackoffice3({ startDate: currentDateString, endDate: currentDateString })
      const attachments = [
        { filename: excel.fileName, content: excel.file }
      ]
      await appSendEmail(excelReportRecipients, 'Reporte de transacciones', '', attachments)
    } catch (error) {
      customLog('Error al guardar el archivo:', error)
    }
    await mainProducer.send([{ key: 'tef-read-update-done', value: '' }])
    return null
  }
}

const consumerService = new ConsumerService()
export default consumerService
