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
    console.log('asd', totalAmountApproved, totalAmountCancelled)

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
      const transactions = await TransactionModel.find({ commerce: e._id })
      return transactions
    }))

    const resultFixed = result.filter((innerArray) => Array.isArray(innerArray) && innerArray.length > 0)

    console.log(resultFixed[0])

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
  async getTransactionsFranchise (query: any, locals: any): Promise<any[]> {
    const currentDate = new Date()
    const stringCurrentDate = getStringDate(currentDate)
    const franchiseId = new ObjectId(locals.user._id)
    const advisorId = query.advisorId
    const commerceId = query.commerceId

    let startDate = query.startDate != null ? query.startDate : stringCurrentDate
    let endDate = query.endDate != null ? query.endDate : stringCurrentDate

    const queryFilter = query.filter

    if (queryFilter === 'week') {
      const lastMonday = new Date(currentDate)
      lastMonday.setDate(currentDate.getDate() - (currentDate.getDay() + 6) % 7)
      const nextSunday = new Date(currentDate)
      nextSunday.setDate(currentDate.getDate() + (7 - (currentDate.getDay() + 6) % 7))
      startDate = getStringDate(lastMonday)
      endDate = getStringDate(nextSunday)
      const filter: FilterQuery<ITransaction> = {
        transactionStatus: ETransactionStatus.APPROVED,
        franchiseId,
        'Transaction Date': { $gte: startDate, $lte: endDate },
        active: true
      }
      if (commerceId != null) filter.commerce = commerceId
      if (advisorId != null) filter.advisordId = advisorId
      const groupedTransactions: any[] = await TransactionModel.aggregate([
        { $match: filter },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: '$Transaction Date',
            date: { $first: '$Transaction Date' },
            total: { $sum: '$Amount' },
            totalComission: { $sum: '$franchiseComission' },
            totalTransactions: { $sum: 1 }
          }
        }
        // { $project: { _id: 1 } }
      ])

      for (const group of groupedTransactions) {
        group.day = getDayName(convertStringToDate(group.date))
      }
    }
    if (queryFilter === 'month') {
      startDate = `${String(stringCurrentDate.substring(0, 4))}00`
      endDate = `${String(stringCurrentDate.substring(0, 4))}99`
    }

    const filter: FilterQuery<ITransaction> = {
      transactionStatus: ETransactionStatus.APPROVED,
      franchiseId,
      'Transaction Date': { $gte: startDate, $lte: endDate },
      active: true
    }

    if (commerceId != null) filter.commerce = commerceId
    if (advisorId != null) filter.advisordId = advisorId

    const groupedTransactions: any[] = await TransactionModel.aggregate([
      { $match: filter },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$commerce',
          commerce: { $first: '$commerce' },
          total: { $sum: '$Amount' },
          totalComission: { $sum: '$franchiseComission' },
          totalTransactions: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ])

    // Agregar comercios sin transacciones encontradas
    let commercesInfo = []
    try {
      const res = await appProfilesInstance.get('/user/franchise/getCommerces', {
        headers: { Authorization: `Bearer ${String(locals.token)}` }
      })
      commercesInfo = res.data.response
    } catch (error) { console.log('No respondió el servidor profiles') }

    for (const commerce of commercesInfo) {
      if (groupedTransactions.find((group: any) => { return group._id === commerce._id }) == null) {
        groupedTransactions.push({
          commerce: commerce._id, externalCommerceId: commerce.externalCommerceId ,total: 0, totalComission: 0, totalTransactions: 0
        })
      }
    }

    const advisorsInfo: any = {}
    const uniqueAdvisors = [...new Set(commercesInfo.map((commerceInfo: { adviser: string }) => commerceInfo?.adviser))]
    for (const advisor of uniqueAdvisors) {
      try {
        const response2 = await appProfilesInstance.get(`/advisor/admin/getAdvisorById/${advisor as string}`)
        advisorsInfo[advisor as string] = response2.data.response
      } catch (error) { console.log('No respondió el servidor profiles') }
    }

    // Aqui se incluyen comercios de los que no se pudo recuperar información
    const notFoundCommerces = []
    // Actualizar nombre de comercio y asesor
    for (const element of groupedTransactions) {
      const commerceId = element.commerce
      const commerceInfo = commercesInfo.find((commerce: any) => commerce._id === commerceId)

      if (commerceInfo == null) {
        element.active = false
        notFoundCommerces.push(commerceId)
        // continue
      }

      let advisorName = 'x'
      const advisor = advisorsInfo?.[commerceInfo?.adviser]

      if (advisor != null) advisorName = `${String(advisor.name)} ${String(advisor.firstLastName)} ${String(advisor.secondLastName)}`
      element.commerce = commerceInfo?.financial?.businessName ?? 'x'
      element.adviser = advisorName ?? 'x'
      element.businessLine = commerceInfo?.businessLine ?? 'x'
      element._id = commerceInfo?._id ?? 'x'
    }

    return groupedTransactions
  }

  async getTransactionsFranchiseGroupedByMonth (query: any, locals: any): Promise<any> {
    const franchiseId = new ObjectId(locals.user._id)
    const filter: FilterQuery<ITransaction> = {
      transactionStatus: ETransactionStatus.APPROVED,
      franchiseId,
      active: true
    }

    const groupedTransactions: any[] = await TransactionModel.aggregate([
      { $match: filter },
      {
        $addFields: {
          transactionDate: {
            $dateFromString: {
              dateString: {
                $concat: [
                  '20', // Agrega el prefijo '20' para formar el año completo
                  { $substr: ['$Transaction Date', 0, 2] },
                  { $substr: ['$Transaction Date', 2, 2] },
                  { $substr: ['$Transaction Date', 4, 2] }
                ]
              },
              format: '%Y%m%d'
            }
          }
        }
      },
      { $sort: { transactionDate: 1 } },
      {
        $group: {
          _id: {
            month: { $month: '$transactionDate' },
            year: { $year: '$transactionDate' }
          },
          total: { $sum: '$Amount' },
          totalComission: { $sum: '$franchiseComission' },
          totalTransactions: { $sum: 1 },
          distinctCommerces: { $addToSet: '$commerce' }
        }
      }
    ])

    const uniqueCommercesCount = [...new Set(groupedTransactions.map(group => group.distinctCommerces).flat())].length

    let commerceCount
    try {
      const response = await appProfilesInstance.get('/user/franchise/getCommerces', {
        headers: { Authorization: `Bearer ${String(locals.token)}` }
      })
      commerceCount = response.data.response.length
    } catch (error) { console.log('No respondió el servidor profiles') }

    const resume = {
      commerceCount: commerceCount ?? String(uniqueCommercesCount) + '*',
      totalTransactions: sumField(groupedTransactions, 'totalTransactions'),
      totalComission: sumField(groupedTransactions, 'totalComission'),
      total: sumField(groupedTransactions, 'total')
    }
    return { groupedTransactions, resume }
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

    console.log(finalObject)

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

    const filteredTransactions = await TransactionModel.find(filter).select({ epn: 0 })
    const filtered = filteredTransactions.filter((e) => e.toDeposit > e.deposited).filter((e) => this.checkTransactionReadyToDisperse(e, endDate))
    const total = filtered.reduce((accumulator, e) => accumulator + e.toDeposit - e.deposited, 0)
    console.log(total)
    return total
  }

  async getTransactionsBackoffice (query: any, locals: IUserLocals): Promise<any> {
    const startDate = query.startDate ?? '000000'
    const endDate = query.endDate ?? '999999'
    const start = query.start ?? 0
    const end = query.end ?? 10
    const limit = (end !== 0) ? end - start : 10

    //Filtros default
    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      active: true
    }

    //Si el id del comercío no es 'all', undefined o null se filtra por el id del comercio
    if (query.commerce != null && query.commerce !== 'all'){
      filter.commerce = query.commerce
    }

    const transactions = await TransactionModel
      .aggregate()
      .match(filter)
      .sort({ 'Transaction Date': -1, 'Transaction Time': -1 })
      .project({ 'Transaction Date': 1, 'Transaction Time': 1, Amount: 1, comission: 1, commerce: 1, iva: 1, 'ID Transaction': 1, lklpayComission: 1, fixedComission: 1, type: 1, transactionStatus: 1, depositStatus: 1, tefStatus: 1, operationType: 1,  RRN: { $getField: { field: "37", input: { $arrayElemAt: ["$MIT Fields", 0] } } } })
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

  async getTransactionsByIdBackoffice (transactionId: string): Promise<any> {
    const transaction = await TransactionModel.findOne({ _id: transactionId })
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

  async populateResults (resultObj: any): Promise<any> {
    const transactions = JSON.parse(JSON.stringify(resultObj))
    if (transactions == null || transactions.length === 0) return transactions

    let commerces: any, franchises: any, branches: any
    try {
      const commerceIds = [...new Set(transactions.map((transaction: ITransaction) => transaction.commerce))]
      const response = await appProfilesInstance.get(`user/backoffice/getCommercesInfo/?ids[]=${commerceIds.join('&ids[]=')}`)
      commerces = response.data.response

      const franchiseIds = [...new Set(transactions.map((transaction: ITransaction) => transaction.franchiseId))]
      const response2 = await appProfilesInstance.get(`franchise/backoffice/getFranchiseNames/?ids[]=${franchiseIds.join('&ids[]=')}`)
      franchises = response2.data.response

      const branchIds = [...new Set(transactions.map((transaction: ITransaction) => transaction.branchId))]
      const response3 = await appProfilesInstance.get(`branch/backoffice/getBranches/?branchIds[]=${branchIds.join('&branchIds[]=')}`)
      branches = response3.data.response
    } catch (error) {
      customLog('No se obtuvo respuesta del servidor profiles')
    }

    return transactions.map((x: ITransaction) => ({
      ...x,
      commerceName: commerces?.[String(x.commerce)]?.name,
      franchiseName: franchises?.[String(x.franchiseId)]?.name,
      branchName: branches?.[String(x.branchId)]?.branchName,
      commerceInfo: {
        commerceName: commerces?.[String(x.commerce)]?.name,
        commerceInternalId: commerces?.[String(x.commerce)]?.internalId,
        commerceResponsible: commerces?.[String(x.commerce)]?.commerceResponsible
      },
      branchInfo: { ...branches?.[String(x.branchId)] }
    }))
  }

  async test (): Promise<any> {
    const updated = await TransactionModel.updateMany(
      {
        transactionStatus: ETransactionStatus.APPROVED,
        'Transaction Date': '240705'
      },
      {
        tefStatus: ETefStatus.APPROVED
      }
    )

    console.log(updated)
  }
}

const transactionService: TransactionService = new TransactionService()
export default transactionService
