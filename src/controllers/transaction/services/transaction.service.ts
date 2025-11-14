/* models */
import { TransactionModel } from '@app/repositories/mongoose/models/transaction.model'
/* subservices / subclasses */
import { TransactionResumeService } from './subservices/resume.service'
/* utils */
import { convertStringToDate, formatYYMMDDHHmmSS, getDayName, getStringDate } from '@app/utils/date.util'
/* dtos */
import type { IGetTransaction, TAccumulatorOperator, ITerminalAggregator, IUserLocals, ITransaction, IGetPendingBalance } from './dtos/transaction.dto'
import type { FilterQuery } from 'mongoose'
import { AppErrorResponse } from '@app/models/app.response'
import { ECardType, ETefStatus, ETransactionProcessor, ETransactionStatus, ETransactionType } from '@app/interfaces/transaction.interface'
import { getCardBrandRegex } from '@app/utils/card.util'
// import { maxCancelationBalancePercentage } from '@app/constants/id.constants'
import { ObjectId } from 'mongodb'
import { appProfilesInstance } from '@app/repositories/axios'
import { customLog, sumField } from '@app/utils/util.util'
import { type TpvBatchSettlementDto } from './dtos/tpv-batch-settlement.dto'
import { type GetTransactionsDto } from './dtos/get-transactions.dto'
// import { createWriteStream } from 'fs'
interface FinalObject {
  tpv: Record<string, any[]>
  ecommerce: Record<string, any[]>
}
class TransactionService extends TransactionResumeService {
  async getTransactions (query: IGetTransaction, locals: IUserLocals): Promise<any> {
    const date = new Date()

    const totalAmount = { $sum: '$Amount' }
    const totalComission = { $sum: '$comission' }
    const totalIVA = { $sum: '$iva' }
    const totalDeposit = { $sum: '$toDeposit' }

    const group: TAccumulatorOperator = {
      Amount: totalAmount,
      Comission: totalComission,
      Deposit: totalDeposit,
      Sold: { $sum: 1 },
      iva: totalIVA
    }

    if (query.filter === 'week') return await this.getWeekResume(date, group, locals, query)
    if (query.filter === 'month') return await this.getMonthResume(group, locals, query)
    if (query.filter === 'range') return await this.getResumeByRange(group, locals, query)
    if (query.filter === 'id') return await this.getResumeById(group, locals, query)
    return await this.getDayTransactions(date, group, query, locals)
  }

  async getTransactionByDate (date: string, query: IGetTransaction, locals: IUserLocals): Promise<any> {
    const brand = query.brand ?? ''
    const cardRegex = getCardBrandRegex(brand)

    const totalAmount = { $sum: '$Amount' }
    const totalComission = { $sum: '$comission' }
    const totalIVA = { $sum: '$iva' }
    const totalDeposit = { $sum: '$toDeposit' }

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': date,
      'Application PAN': cardRegex,
      commerce: locals.user._id,
      active: true
    }

    if (query.branch != null && query.branch !== 'all') filter.branchId = query.branch
    if (query.type != null && query.type !== 'all') filter.type = (query.type === ETransactionType.TPV) ? ETransactionType.TPV : ETransactionType.ECOMMERCE
    if (query.serialNumber != null && query.serialNumber !== 'all') filter['IFD Serial Number'] = query.serialNumber
    if (query.status != null && query.status !== 'all') filter.transactionStatus = query.status

    const group: TAccumulatorOperator = {
      Amount: totalAmount,
      Comission: totalComission,
      Deposit: totalDeposit,
      Sold: { $sum: 1 },
      iva: totalIVA
    }

    const resume = await TransactionModel.aggregate<ITerminalAggregator>()
      .match(filter)
      .group({ ...group, _id: null })

    const selectedDate = convertStringToDate(date)
    const dayName = getDayName(selectedDate)

    const end = Number(query?.end ?? 0)
    const start = Number(query?.start ?? 0)
    const limit = (end !== 0) ? end - start : 10

    const count = await TransactionModel.count(filter)
    const transactions = await TransactionModel.find(filter, undefined, {
      sort: { 'Transaction Date': 'desc', 'Transaction Time': 'desc' },
      skip: start,
      limit
    }).select({ epn: 0 })

    const data = { count, transactions, resume: resume[0], day: dayName }
    return data
  }

  async getTransactionsByMonth (date: string, query: IGetTransaction, locals: IUserLocals): Promise<any> {
    const regex = new RegExp(`^${date}.{2}$`)

    const brand = query.brand ?? ''
    const cardRegex = getCardBrandRegex(brand)

    const totalAmount = { $sum: '$Amount' }
    const totalComission = { $sum: '$comission' }
    const totalIVA = { $sum: '$iva' }
    const totalDeposit = { $sum: '$toDeposit' }

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $regex: regex },
      'Application PAN': { $regex: cardRegex },
      commerce: locals.user._id,
      active: true
    }

    if (query.branch != null && query.branch !== 'all') filter.branchId = query.branch
    if (query.type != null && query.type !== 'all') filter.type = (query.type === ETransactionType.TPV) ? ETransactionType.TPV : ETransactionType.ECOMMERCE
    if (query.serialNumber != null && query.serialNumber !== 'all') filter['IFD Serial Number'] = query.serialNumber
    if (query.status != null && query.status !== 'all') filter.transactionStatus = query.status

    const group: TAccumulatorOperator = {
      Amount: totalAmount,
      Comission: totalComission,
      Deposit: totalDeposit,
      Sold: { $sum: 1 },
      iva: totalIVA
    }

    const end = Number(query?.end ?? 0)
    const start = Number(query?.start ?? 0)
    const limit = (end !== 0) ? end - start : 10

    const count = await TransactionModel.count(filter)

    const transactions = await TransactionModel.find(filter, undefined, {
      sort: { 'Transaction Date': -1, 'Transaction Time': -1 },
      skip: start,
      limit
    }).select({ epn: 0 })

    const resume = await TransactionModel.aggregate<ITerminalAggregator>()
      .match({ ...filter, transactionStatus: ETransactionStatus.APPROVED })
      .group({ ...group, _id: { $substr: ['$Transaction Date', 0, 4] } })
      .sort({ 'Transaction Date': -1, 'Transaction Time': -1 })
      .exec()

    const data = { transactions, yearMonth: date, resume: resume[0], count }
    return data
  }

  async getTransactionsByDateRange (query: IGetTransaction, locals: IUserLocals): Promise<any> {
    const startDate = query.startDate
    const endDate = query.endDate
    const brand = query.brand ?? ''
    const end = Number(query?.end ?? 0)
    const start = Number(query?.start ?? 0)
    const limit = (end !== 0) ? end - start : 10
    const cardRegex = getCardBrandRegex(brand ?? '')

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      'Application PAN': { $regex: cardRegex },
      commerce: locals.user._id,
      active: true
    }

    if (query.branch != null && query.branch !== 'all') filter.branchId = query.branch
    if (query.type != null && query.type !== 'all') filter.type = (query.type === ETransactionType.TPV) ? ETransactionType.TPV : ETransactionType.ECOMMERCE
    if (query.serialNumber != null && query.serialNumber !== 'all') filter['IFD Serial Number'] = query.serialNumber
    if (query.status != null && query.status !== 'all') filter.transactionStatus = query.status

    const [results, count] = await Promise.all([
      TransactionModel.find(filter)
        .sort({ 'Transaction Date': -1, 'Transaction Time': -1 })
        .skip(start)
        .limit(limit)
        .select({ epn: 0 }),
      TransactionModel.countDocuments(filter)
    ])
    return {
      transactions: results,
      count
    }
  }

  async getTransaction (id: string, locals: IUserLocals): Promise<any> {
    const data = await TransactionModel.findOne({ _id: id, commerce: locals.user._id, active: true }).select({ epn: 0 })
    if (data == null) throw new AppErrorResponse({ description: 'Detalles no encontrados', name: 'Detalles no encontrados', statusCode: 404 })
    const copy = JSON.parse(JSON.stringify(data))
    delete copy['MIT Fields']
    return copy
  }

  async getTransactionsById (transactionId: string, query: IGetTransaction, locals: IUserLocals): Promise<any> {
    let { start, end, brand } = query
    const cardRegex = getCardBrandRegex(brand ?? '')

    end = Number(end ?? 0)
    start = Number(start ?? 0)
    const limit = (end !== 0) ? end - start : 10

    const filter: FilterQuery<ITransaction> = {
      'ID Transaction': new RegExp('' + transactionId, 'i'),
      'Application PAN': cardRegex,
      commerce: locals.user._id,
      active: true
    }

    const fieldsToSelect = {
      _id: 1,
      Amount: 1,
      'Application PAN': 1,
      'Cardholder Name': 1,
      'Cardholder Email': 1,
      'Transaction Date': 1,
      'Transaction Time': 1,
      'ID Transaction': 1,
      comission: 1,
      toDeposit: 1,
      transactionStatus: 1,
      type: 1,
      iva: 1
    }

    const transactions = await TransactionModel.aggregate()
      .match(filter)
      .sort({ 'Transaction Date': -1, 'Transaction Time': -1 })
      .project(fieldsToSelect)
      .skip(start)
      .limit(limit)

    const count = await TransactionModel.count(filter)
    return { count, transactions }
  }

  async getTransactionsByIdAdmin (transactionId: string): Promise<any> {
    const filter: FilterQuery<ITransaction> = {
      'ID Transaction': transactionId,
      active: true
    }

    const transaction = await TransactionModel.findOne(filter)
    if (transaction == null) return null

    const copy = JSON.parse(JSON.stringify(transaction))
    delete copy['MIT Fields']
    return copy
  }

  async getTransactionsTpv (query: any, locals: any): Promise<any> {
    // const idTerminal = locals.user['ID Terminal']
    const serialNumber = locals.user.serialNumber

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    const endDate = new Date()
    const startDateString = getStringDate(startDate)
    const endDateString = getStringDate(endDate)

    const filter: FilterQuery<ITransaction> = {
      // 'ID Terminal': idTerminal,
      'IFD Serial Number': serialNumber,
      'Transaction Date': { $gte: startDateString, $lte: endDateString },
      commerce: locals.user._id,
      active: true
    }

    const transactions = await TransactionModel.find(filter)
      .sort({ 'Transaction Date': -1, 'Transaction Time': -1 })
      .select({ epn: 0 })

    // const approvedAndCancelledToday = await transactionService.getApprovedAndCanceled({ user: locals.user._id, type: ETransactionType.TPV }, null)
    // const approvedTodayTransactions = approvedAndCancelledToday.transactionsApprovedToday
    // const cancelledTodayTransactions = approvedAndCancelledToday.transactionsCancelledToday
    // const totalAmountApproved = approvedTodayTransactions.reduce((total: number, transaction: any) => { return total + Number(transaction.Amount) }, 0)
    // const totalAmountCancelled = cancelledTodayTransactions.reduce((total: number, transaction: any) => { return total + Number(transaction.Amount) }, 0)

    const transaccionsFixed = [...transactions].map((transaction: any) => {
      const currentDate = new Date()
      const currentDateString = getStringDate(currentDate)

      return {
        authorization: transaction.authorization,
        ...transaction._doc,
        isCancelable: (transaction['Transaction Date'] === currentDateString && transaction.deposited === 0 && transaction.transactionStatus === 'approved'), // (Number(totalAmountCancelled) + Number(transaction.Amount)) < (totalAmountApproved * maxCancelationBalancePercentage / 100)
        isRefundable: (transaction['Transaction Date'] !== currentDateString && transaction.transactionStatus === 'approved')
      }
    })

    const groupedByDateTransactions: Record<string, any[]> = {}

    for (const transaction of transaccionsFixed) {
      const transactionDate = transaction['Transaction Date']

      if (groupedByDateTransactions[transactionDate] == null) {
        groupedByDateTransactions[transactionDate] = []
      }

      groupedByDateTransactions[transactionDate].push(transaction)
    }

    const groupedTransactionsArray = Object.keys(groupedByDateTransactions).map((date) => ({
      date,
      transactions: groupedByDateTransactions[date]
    }))

    groupedTransactionsArray.reverse()
    return { transactions: groupedTransactionsArray }
  }

  async getTpvBatchSettlement (dto: TpvBatchSettlementDto): Promise<any> {
    const beginDate = dto.beginDate
    const endDate = dto.endDate

    const filter: FilterQuery<ITransaction> = {
      'IFD Serial Number': dto.serialNumber,
      commerce: dto.commerceId,
      type: ETransactionType.TPV,
      active: true,
      $expr: {
        $and: [
          { $gte: [{ $concat: ['$Transaction Date', '$Transaction Time'] }, beginDate] },
          { $lte: [{ $concat: ['$Transaction Date', '$Transaction Time'] }, endDate] }
        ]
      }
    }

    const transactions = await TransactionModel.find(filter).select({ scheme: 1, Amount: 1, transactionStatus: 1, 'Card Type': 1, 'Transaction Date': 1, 'Transaction Time': 1, 'Application PAN': 1, _id: 0 })

    const batchSettlement: any = {
      batchName: `RESUMEN ${formatYYMMDDHHmmSS(beginDate)} a ${formatYYMMDDHHmmSS(endDate)}`,
      debit: {},
      credit: {},
      international: {},
      totalApproved: { count: 0, amount: 0 },
      totalOthers: { count: 0, amount: 0 },
      transactions
    }

    transactions.forEach(transaction => {
      const scheme = transaction.scheme
      const amount = transaction.Amount
      const transactionStatus = transaction.transactionStatus

      if (batchSettlement.debit[scheme] === undefined) {
        batchSettlement.debit[scheme] = { count: 0, amount: 0 }
        batchSettlement.credit[scheme] = { count: 0, amount: 0 }
        batchSettlement.international[scheme] = { count: 0, amount: 0 }
      }

      if (transactionStatus !== ETransactionStatus.APPROVED) {
        batchSettlement.totalOthers.count++
        batchSettlement.totalOthers.amount = Number(batchSettlement.totalOthers.amount) + amount
        return
      }

      // Por tipo de tarjeta
      if (transaction['Card Type'] === ECardType.DEBIT) {
        batchSettlement.debit[scheme].count++
        batchSettlement.debit[scheme].amount = Number(batchSettlement.debit[scheme].amount) + amount
      } else if (transaction['Card Type'] === ECardType.CREDIT) {
        batchSettlement.credit[scheme].count++
        batchSettlement.credit[scheme].amount = Number(batchSettlement.credit[scheme].amount) + amount
      } else if (transaction['Card Type'] === ECardType.INTERNATIONAL) {
        batchSettlement.international[scheme].count++
        batchSettlement.international[scheme].amount = Number(batchSettlement.international[scheme].amount) + amount
      }

      batchSettlement.totalApproved.count++
      batchSettlement.totalApproved.amount = Number(batchSettlement.totalApproved.amount) + amount
    })

    return batchSettlement
  }

  async getTpvTransactionResume (query: any, locals: any): Promise<any> {
    // const idTerminal = locals.user['ID Terminal']
    const serialNumber = locals.user.serialNumber

    const currentDate = new Date()
    const date = query.date ?? getStringDate(currentDate)

    const filter: FilterQuery<ITransaction> = {
      // 'ID Terminal': idTerminal,
      'IFD Serial Number': serialNumber,
      'Transaction Date': date,
      commerce: locals.user._id,
      transactionStatus: ETransactionStatus.APPROVED,
      type: ETransactionType.TPV,
      active: true
    }

    const transactions = await TransactionModel
      .find(filter, { Amount: 1, 'ID Transaction': 1, 'Transaction Date': 1, 'Transaction Time': 1, 'Application PAN': 1 })
      .lean()
      .sort({ 'Transaction Date': -1, 'Transaction Time': -1 })
      .select({ epn: 0 })
    const totaAmount = sumField(transactions, 'Amount')
    const totalTransactions = transactions.length

    return { transactions, totaAmount, totalTransactions, date }
  }

  async getTransactionsMobile (query: any, locals: any): Promise<any> {
    const startDate = query.startDate ?? '000000'
    const endDate = query.endDate ?? '999999'
    const start = query.start ?? 0
    const end = query.end ?? 10
    const limit = (end !== 0) ? end - start : 10
    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      commerce: locals.user._id,
      active: true
    }

    const transactions = await TransactionModel.find(filter)
      .sort({ 'Transaction Date': -1, 'Transaction Time': -1 })
      .skip(Number(start))
      .limit(Number(limit))
      .select({ epn: 0 })

    const approvedAndCancelledToday = await transactionService.getApprovedAndCanceled({ user: locals.user._id, type: ETransactionType.TPV }, null)
    const approvedTodayTransactions = approvedAndCancelledToday.transactionsApprovedToday
    const cancelledTodayTransactions = approvedAndCancelledToday.transactionsCancelledToday
    const totalAmountApproved = approvedTodayTransactions.reduce((total: number, transaction: any) => { return total + Number(transaction.Amount) }, 0)
    const totalAmountCancelled = cancelledTodayTransactions.reduce((total: number, transaction: any) => { return total + Number(transaction.Amount) }, 0)
    customLog('asd', totalAmountApproved, totalAmountCancelled)

    const transaccionsFixed = [...transactions].map((transaction: any) => {
      const currentDate = new Date()
      const currentDateString = getStringDate(currentDate)
      if (transaction['Transaction Date'] === currentDateString && transaction.deposited === 0 && transaction.transactionStatus === 'approved') {
        return {
          authorization: transaction.authorization,
          ...transaction._doc,
          /*
          Commented for request
          isCancelable: (Number(totalAmountCancelled) + Number(transaction.Amount)) < (totalAmountApproved * maxCancelationBalancePercentage / 100) */
          isCancelable: true
        }
      }

      return {
        authorization: transaction.authorization,
        ...transaction._doc,
        isCancelable: true
      }
    })

    const groupedByDateTransactions: Record<string, any[]> = {}

    for (const transaction of transaccionsFixed) {
      const transactionDate = transaction['Transaction Date']

      if (groupedByDateTransactions[transactionDate] == null) {
        groupedByDateTransactions[transactionDate] = []
      }

      groupedByDateTransactions[transactionDate].push(transaction)
    }

    const groupedTransactionsArray = Object.keys(groupedByDateTransactions).map((date) => ({
      date,
      transactions: groupedByDateTransactions[date]
    }))

    groupedTransactionsArray.reverse()

    return { transactions: groupedTransactionsArray }
  }

  async getAdvisorAmount (body: []): Promise<any> {
    const result = await Promise.all(body.map(async (e: any) => {
      const transactions = await TransactionModel.find({ commerce: e._id, active: true })
      return transactions
    }))

    const resultFixed = result.filter((innerArray) => Array.isArray(innerArray) && innerArray.length > 0)

    customLog(resultFixed[0])

    const summed = resultFixed[0].reduce((a: any, b: any) => {
      return {
        franchiseComission: Number(a.franchiseComission) + Number(b.franchiseComission),
        Amount: Number(b.Amount) + Number(a.Amount)
      }
    }, { franchiseComission: 0, Amount: 0 })

    return summed
  }

  async getTpvDispersableTransactions (query: any, locals: any): Promise<any> {
    const filter: FilterQuery<ITransaction> = {
      type: ETransactionType.TPV,
      commerce: locals.user._id,
      transactionStatus: ETransactionStatus.APPROVED,
      active: true
    }

    const fieldsToSelect = {
      _id: 1,
      Amount: 1,
      'Transaction Date': 1,
      'Transaction Time': 1,
      'ID Transaction': 1,
      toDeposit: 1,
      deposited: 1,
      toDepositGreaterThanDeposited: 1
    }

    let transactions = await TransactionModel.aggregate()
      .match(filter)
      .sort({ createdAt: 1 })
      .addFields({ toDepositGreaterThanDeposited: { $gt: ['$toDeposit', '$deposited'] } })
      .project(fieldsToSelect)

    transactions = transactions.filter((item: any) => item.toDepositGreaterThanDeposited === true)

    return { transactions }
  }

  // Distros
  async getTransactionsFranchise (dto: GetTransactionsDto, franchiseId: string): Promise<any> {
    const startDate = dto.startDate ?? '000000'
    const endDate = dto.endDate ?? '999999'
    const start = dto.start ?? 0
    const end = dto.end ?? 10
    const limit = (end !== 0) ? end - start : 10

    const commerceId = dto.commerce

    const filter: FilterQuery<ITransaction> = {
      franchiseId: new ObjectId(franchiseId),
      'Transaction Date': { $gte: startDate, $lte: endDate },
      active: true
    }

    if (commerceId != null) filter.commerce = commerceId
    const selection = { Amount: 1, 'Transaction Date': 1, 'Transaction Time': 1, transactionStatus: 1, authorization: 1, commerce: 1, 'ID Transaction': 1 }

    const [records, resumeRaw, count] = await Promise.all([
      TransactionModel.find(filter).select(selection).skip(start).limit(limit).sort({ 'Transaction Date': -1, 'Transaction Time': -1 }).lean(),

      TransactionModel.aggregate<ITerminalAggregator>()
        .match({ ...filter, transactionStatus: ETransactionStatus.APPROVED })
        .group({
          _id: null,
          Amount: { $sum: '$Amount' },
          Sold: { $sum: 1 }
        }),

      TransactionModel.countDocuments(filter)
    ])

    const resume = resumeRaw?.[0] ?? { Amount: 0, Sold: 0 }

    const populated = await this.populateResults(records, true, false, false)

    return { transactions: populated, resume, total: count }
  }

  // Advisor
  async getTransactionsAdvisor (dto: GetTransactionsDto, advisorId: string): Promise<any> {
    const startDate = dto.startDate ?? '000000'
    const endDate = dto.endDate ?? '999999'
    const start = dto.start ?? 0
    const end = dto.end ?? 10
    const limit = (end !== 0) ? end - start : 10

    const commerceId = dto.commerce

    const filter: FilterQuery<ITransaction> = {
      advisorId: new ObjectId(advisorId),
      'Transaction Date': { $gte: startDate, $lte: endDate },
      active: true
    }

    if (commerceId != null) filter.commerce = commerceId
    const selection = { Amount: 1, 'Transaction Date': 1, 'Transaction Time': 1, transactionStatus: 1, authorization: 1, commerce: 1, 'ID Transaction': 1 }

    const [records, resumeRaw, count] = await Promise.all([
      TransactionModel.find(filter).select(selection).skip(start).limit(limit).sort({ 'Transaction Date': -1, 'Transaction Time': -1 }).lean(),

      TransactionModel.aggregate<ITerminalAggregator>()
        .match({ ...filter, transactionStatus: ETransactionStatus.APPROVED })
        .group({
          _id: null,
          Amount: { $sum: '$Amount' },
          Sold: { $sum: 1 }
        }),

      TransactionModel.countDocuments(filter)
    ])

    const resume = resumeRaw?.[0] ?? { Amount: 0, Sold: 0 }

    const populated = await this.populateResults(records, true, false, false)

    return { transactions: populated, resume, total: count }
  }

  // -------------------------------------------------------------------------------------------------

  async readTransactionsTEF (query: { processor: ETransactionProcessor }): Promise<any> {
    const date = new Date()
    const stringDate = getStringDate(date)
    const processor = query.processor ?? ETransactionProcessor.EGLOBAL
    if (!Object.values(ETransactionProcessor).includes(processor)) throw new AppErrorResponse({ name: '', statusCode: 400 })

    const data = await TransactionModel.aggregate([
      {
        $match: {
          'Transaction Date': { $lte: stringDate },
          transactionStatus: { $in: [ETransactionStatus.APPROVED, ETransactionStatus.REFUND] },
          processor,
          tefStatus: { $in: [ETefStatus.NOT_SENT] },
          active: true
        }
      },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$type', documentos: { $push: '$$ROOT' } } },
      { $group: { _id: null, resultados: { $push: { k: '$_id', v: '$documentos' } } } },
      { $project: { _id: 0, resultado: { $arrayToObject: '$resultados' } } }
    ])

    if (data[0] === undefined) return

    const finalObject: FinalObject = { tpv: {}, ecommerce: {} }

    if (data[0].resultado.tpv != null) {
      data[0].resultado.tpv.forEach((item: any) => {
        if (finalObject.tpv[item['ID Afiliate']] != null) finalObject.tpv[item['ID Afiliate']].push(item)
        else finalObject.tpv[item['ID Afiliate']] = [item]
      })
    }

    if (data[0].resultado['e-commerce'] != null) {
      data[0].resultado['e-commerce'].forEach((item: any) => {
        if (finalObject.ecommerce[item['ID Afiliate']] != null) finalObject.ecommerce[item['ID Afiliate']].push(item)
        else finalObject.ecommerce[item['ID Afiliate']] = [item]
      })
    }

    customLog(finalObject)

    return { resultado: finalObject }
  }

  async getDispersableTransactions (query: IGetTransaction, locals: IUserLocals): Promise<any> {
    return await this.getDispersableResume(query)
  }

  async getApprovedAndCanceled (query: IGetTransaction, locals: any): Promise<any> {
    const user = query.user ?? /^.*$/
    const type = query.type ?? /^.*$/

    const currentDate = new Date()
    const currentDateString = getStringDate(currentDate)

    const fieldsToSelect = {
      _id: 1,
      Amount: 1,
      commerce: 1,
      'Transaction Date': 1,
      'ID Transaction': 1,
      iva: 1,
      comission: 1,
      toDeposit: 1,
      type: 1,
      deposited: 1,
      processorComission: 1,
      franchiseComission: 1,
      lklpayComission: 1,
      transactionStatus: 1
    }

    const filterApproved = {
      'Transaction Date': currentDateString,
      $or: [
        { transactionStatus: ETransactionStatus.APPROVED },
        { transactionStatus: ETransactionStatus.CANCELLED }
      ],
      type,
      commerce: user,
      active: true
    }

    const filterCancelled = {
      'Transaction Date': currentDateString,
      transactionStatus: ETransactionStatus.CANCELLED,
      type,
      commerce: user,
      active: true
    }

    const transactionsApprovedToday = await TransactionModel.aggregate()
      .match(filterApproved)
      .sort({ createdAt: 1 })
      .project(fieldsToSelect)

    const transactionsCancelledToday = await TransactionModel.aggregate()
      .match(filterCancelled)
      .sort({ createdAt: 1 })
      .project(fieldsToSelect)

    return { transactionsApprovedToday, transactionsCancelledToday }
  }

  async getPendingBalance (query: IGetPendingBalance, locals: IUserLocals): Promise<any> {
    const currentDate = new Date()
    const endDate = getStringDate(currentDate)
    const queryFilter = query.filter ?? ''

    const filter: any = {
      commerce: locals.user._id,
      transactionStatus: ETransactionStatus.APPROVED
    }
    if (queryFilter === 'urgent') filter['Card Type'] = { $ne: 'international' }

    filter.active = true
    const filteredTransactions = await TransactionModel.find(filter).select({ epn: 0 })
    const filtered = filteredTransactions.filter((e) => e.toDeposit > e.deposited).filter((e) => this.checkTransactionReadyToDisperse(e, endDate))
    const total = filtered.reduce((accumulator, e) => accumulator + e.toDeposit - e.deposited, 0)
    customLog(total)
    return total
  }

  async getTransactionsBackoffice (query: any, locals: IUserLocals): Promise<any> {
    const startDate = query.startDate ?? '000000'
    const endDate = query.endDate ?? '999999'
    const start = query.start ?? 0
    const end = query.end ?? 10
    const limit = (end !== 0) ? end - start : 10

    // Filtros opcionales
    const rrn = query?.rrn != null ? query?.rrn : null
    const authorizationNumber = query?.authorizationNumber != null ? query?.authorizationNumber : null
    const amount = query?.amount != null ? query?.amount : null

    // Filtros default
    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      active: true
    }

    // Si el id del comercío no es 'all', undefined o null se filtra por el id del comercio
    if (query.commerce != null && query.commerce !== 'all') {
      filter.commerce = query.commerce
    }

    // Filtros opcionales
    if (rrn != null) {
      filter['ID Transaction'] = rrn
    }
    if (authorizationNumber != null) {
      filter['MIT Fields'] = { $elemMatch: { 38: authorizationNumber } }
    }
    if (amount != null) {
      filter.Amount = { $eq: parseFloat(amount) }
    }

    const transactions = await TransactionModel
      .aggregate()
      .match(filter)
      .sort({ 'Transaction Date': -1, 'Transaction Time': -1 })
      .project({ 'Transaction Date': 1, 'Transaction Time': 1, Amount: 1, comission: 1, commerce: 1, iva: 1, 'ID Transaction': 1, lklpayComission: 1, fixedComission: 1, type: 1, transactionStatus: 1, depositStatus: 1, tefStatus: 1, operationType: 1, RRN: { $getField: { field: '37', input: { $arrayElemAt: ['$MIT Fields', 0] } } }, 'Afiliate Number': '$Afiliate Number' })
      .skip(Number(start))
      .limit(Number(limit))

    const totalAmount = { $sum: '$Amount' }
    const totalComission = { $sum: '$comission' }
    const totalIVA = { $sum: '$iva' }
    const totalDeposit = { $sum: '$toDeposit' }
    const totalLklpayComission = { $sum: '$lklpayComission' }
    const totalFixedComission = { $sum: '$fixedComission' }

    const group: TAccumulatorOperator = {
      Amount: totalAmount,
      Comission: totalComission,
      Deposit: totalDeposit,
      Sold: { $sum: 1 },
      iva: totalIVA,
      lklpayComission: totalLklpayComission,
      fixedComission: totalFixedComission
    }

    const resume = await TransactionModel.aggregate<ITerminalAggregator>()
      .match({ ...filter, transactionStatus: ETransactionStatus.APPROVED })
      .group({ ...group, _id: null })
      .exec()

    const count = await TransactionModel.count(filter)

    const commerceIds = [...new Set(transactions.map(transaction => transaction.commerce))]
    const response = await appProfilesInstance.get(`user/backoffice/getCommercesInfo/?ids[]=${commerceIds.join('&ids[]=')}`)
    const names = response.data.response

    for (const transaction of transactions) {
      transaction.commerceName = names?.[transaction.commerce]?.name ?? 'x'
    }
    return { transactions, resume: resume[0] ?? { Amount: 0, Comission: 0, Deposit: 0, Sold: 0, iva: 0, lklpayComission: 0, fixedComission: 0 }, total: count }
  }

  async getTransactionByIdBackoffice (transactionId: string): Promise<any> {
    const transaction = await TransactionModel.findOne({ _id: transactionId, active: true })
    if (transaction == null) throw new AppErrorResponse({ name: 'No se encontró la transacción', statusCode: 404 })
    const populated = (await this.populateResults([transaction]))[0]
    return populated
  }

  async getTransactionByIdFranchise (transactionId: string, franchiseId: string): Promise<any> {
    const transaction = await TransactionModel.findOne({ _id: transactionId, active: true, franchiseId: new ObjectId(franchiseId) })
    if (transaction == null) throw new AppErrorResponse({ name: 'No se encontró la transacción', statusCode: 404 })
    const populated = (await this.populateResults([transaction]))[0]
    return populated
  }

  async getTransactionByIdAdvisor (transactionId: string, advisorId: string): Promise<any> {
    const transaction = await TransactionModel.findOne({ _id: transactionId, active: true, advisorId: new ObjectId(advisorId) })
    if (transaction == null) throw new AppErrorResponse({ name: 'No se encontró la transacción', statusCode: 404 })
    const populated = (await this.populateResults([transaction]))[0]
    return populated
  }

  async getCommercePendingBalanceBackoffice (query: any): Promise<any> {
    const commerceId = query.id
    const currentDate = new Date()
    const endDate = getStringDate(currentDate)

    const filter: any = {
      commerce: commerceId,
      transactionStatus: ETransactionStatus.APPROVED
    }

    const filteredTransactions = await TransactionModel.find(filter)
    const filtered = filteredTransactions.filter((e) => e.toDeposit > e.deposited).filter((e) => this.checkTransactionReadyToDisperse(e, endDate))
    const total = filtered.reduce((accumulator, e) => accumulator + e.toDeposit - e.deposited, 0)
    return total
  }

  async populateResults (resultObj: any, populateCommerces = true, populateFranchises = true, populateBranches = true): Promise<any> {
    const transactions = JSON.parse(JSON.stringify(resultObj))
    if (transactions == null || transactions.length === 0) return transactions

    let commerces: any = {}; let franchises: any = {}; let branches: any = {}

    try {
      const promises = []

      if (populateCommerces) {
        const commerceIds = [...new Set(transactions.map((t: ITransaction) => t.commerce))]
        if (commerceIds.length > 0) {
          promises.push(
            appProfilesInstance
              .get(`user/backoffice/getCommercesInfo/?ids[]=${commerceIds.join('&ids[]=')}`)
              .then(res => (commerces = res.data.response ?? {}))
          )
        }
      }

      if (populateFranchises) {
        const franchiseIds = [...new Set(transactions.map((t: ITransaction) => t.franchiseId))]
        if (franchiseIds.length > 0) {
          promises.push(
            appProfilesInstance
              .get(`franchise/backoffice/getFranchiseNames/?ids[]=${franchiseIds.join('&ids[]=')}`)
              .then(res => (franchises = res.data.response ?? {}))
          )
        }
      }

      if (populateBranches) {
        const branchIds = [...new Set(transactions.map((t: ITransaction) => t.branchId))]
        if (branchIds.length > 0) {
          promises.push(
            appProfilesInstance
              .get(`branch/backoffice/getBranches/?branchIds[]=${branchIds.join('&branchIds[]=')}`)
              .then(res => (branches = res.data.response ?? {}))
          )
        }
      }

      await Promise.all(promises)
    } catch (error) {
      customLog('No se obtuvo respuesta del servidor profiles')
    }

    return transactions.map((x: ITransaction) => ({
      ...x,
      ...(populateCommerces && {
        commerceName: commerces?.[String(x.commerce)]?.name,
        commerceInfo: {
          commerceName: commerces?.[String(x.commerce)]?.name,
          commerceInternalId: commerces?.[String(x.commerce)]?.internalId,
          commerceResponsible: commerces?.[String(x.commerce)]?.commerceResponsible
        }
      }),
      ...(populateFranchises && {
        franchiseName: franchises?.[String(x.franchiseId)]?.name
      }),
      ...(populateBranches && {
        branchName: branches?.[String(x.branchId)]?.branchName,
        branchInfo: { ...branches?.[String(x.branchId)] }
      })
    }))
  }
}

const transactionService: TransactionService = new TransactionService()
export default transactionService
