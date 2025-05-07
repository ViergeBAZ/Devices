/* models */
import { TransactionModel } from '@app/repositories/mongoose/models/transaction.model'
/* utils */
import {
  getYearLastTwoDigits,
  getThreeMonthsOfYear,
  convertStringToDate,
  getMonthTwoDigits,
  getDayTwoDigits,
  getWeek,
  getStringDate
} from '@app/utils/date.util'
/* dtos */
import type { FilterQuery } from 'mongoose'
import type { IGetTransaction, TAccumulatorOperator, ITerminalAggregator, IUserLocals } from '../dtos/transaction.dto'
import { EDepositStatus, ETefStatus, ETransactionStatus, ETransactionType, type ITransaction } from '@app/interfaces/transaction.interface'
import { getCardBrand, getCardBrandRegex } from '@app/utils/card.util'
import { holidays } from '@app/constants/holidays'
import { appProfilesInstance } from '@app/repositories/axios'
// import { appProfilesInstance } from '@app/repositories/profiles'
// import { AppErrorResponse } from '@app/models/app.response'

export class TransactionResumeService {
  async getDayTransactions (date: Date, group: TAccumulatorOperator, query: IGetTransaction, locals: IUserLocals): Promise<any> {
    const queryDate: string = `${getYearLastTwoDigits(date)}${getMonthTwoDigits(date)}${getDayTwoDigits(date)}`

    const brand = query.brand ?? ''
    const cardRegex = getCardBrandRegex(brand)

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': queryDate,
      'Application PAN': cardRegex,
      commerce: locals.user._id,
      active: true
    }

    if (query.branch && query.branch !== 'all') filter.branchId = query.branch
    if (query.type && query.type !== 'all') filter.type = (query.type === ETransactionType.TPV) ? ETransactionType.TPV : ETransactionType.ECOMMERCE
    if (query.serialNumber && query.serialNumber !== 'all') filter['IFD Serial Number'] = query.serialNumber
    if (query.status && query.status !== 'all') filter.transactionStatus = query.status

    const resume = await TransactionModel.aggregate<ITerminalAggregator>()
      .match({ ...filter, transactionStatus: ETransactionStatus.APPROVED })
      .group({ ...group, _id: '$Transaction Date' })

    const count = await TransactionModel.count(filter)
    const end = Number(query?.end ?? 0)
    const start = Number(query?.start ?? 0)
    const limit = (end !== 0) ? end - start : 10

    const transactions = await TransactionModel.find(filter, undefined, {
      sort: { 'Transaction Date': 'desc', 'Transaction Time': 'desc' },
      skip: start,
      limit
    }).select({ epn: 0 })
    const data = { count, transactions, resume: resume[0] }
    return data
  }

  async getWeekResume (date: Date, group: TAccumulatorOperator, locals: IUserLocals, query: IGetTransaction): Promise<any> {
    const week = getWeek(date)
    const { monday, tuesday, wednesday, thursday, friday, saturday, sunday } = week
    const selectedDate = query.selectedDate ?? ''
    const brand = query.brand ?? ''
    const cardRegex = getCardBrandRegex(brand)

    let regex = new RegExp(
      `^${getYearLastTwoDigits(date)}(${String(monday)}|${String(tuesday)}|${String(wednesday)}|${String(thursday)}|${String(friday)}|${String(saturday)}|${String(sunday)})$`
    )

    if (selectedDate.length !== 0) { regex = new RegExp(`^(${selectedDate})$`) }

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $regex: regex },
      'Application PAN': { $regex: cardRegex },
      active: true,
      commerce: locals.user._id
    }

    if (query.branch && query.branch !== 'all') filter.branchId = query.branch
    if (query.type && query.type !== 'all') filter.type = (query.type === ETransactionType.TPV) ? ETransactionType.TPV : ETransactionType.ECOMMERCE
    if (query.serialNumber && query.serialNumber !== 'all') filter['IFD Serial Number'] = query.serialNumber
    if (query.status && query.status !== 'all') filter.transactionStatus = query.status

    const resume = await TransactionModel.aggregate<ITerminalAggregator>()
      .match({ ...filter, transactionStatus: ETransactionStatus.APPROVED })
      .group({ ...group, _id: 'null' })
      .exec()

    const filtered = await TransactionModel.aggregate<ITerminalAggregator>()
      .match({ ...filter, transactionStatus: ETransactionStatus.APPROVED })
      .group({ ...group, _id: '$Transaction Date' })
      .exec()

    const aggregate = filtered
      .map((item) => {
        const res = {
          date: item._id,
          comission: item.Comission,
          toDeposit: item.Deposit,
          sales: item.Amount,
          sold: item.Sold,
          iva: item.iva
        }

        const year = getYearLastTwoDigits(date)

        if (item._id === `${year}${monday}`) return { day: 'Lunes', ...res }
        if (item._id === `${year}${tuesday}`) return { day: 'Martes', ...res }
        if (item._id === `${year}${wednesday}`) return { day: 'Miércoles', ...res }
        if (item._id === `${year}${thursday}`) return { day: 'Jueves', ...res }
        if (item._id === `${year}${friday}`) return { day: 'Viernes', ...res }
        if (item._id === `${year}${saturday}`) return { day: 'Sábado', ...res }
        if (item._id === `${year}${sunday}`) return { day: 'Domingo', ...res }

        return res
      })
      .sort((a, b) => Number(a.date) - Number(b.date))

    const count = await TransactionModel.count(filter)

    const data = { resume: resume[0], transactions: aggregate, count }
    return data
  }

  async getMonthResume (group: TAccumulatorOperator, locals: IUserLocals, query: IGetTransaction): Promise<any> {
    const latest = await TransactionModel.findOne({ active: true, commerce: locals.user._id }, undefined, { sort: { 'Transaction Date': -1 } })
    const selectedDate = query.selectedDate ?? ''
    if (latest == null) {
      return { count: 0, transactions: [], resume: [] }
    }

    const brand = query.brand ?? ''
    const cardRegex = getCardBrandRegex(brand)

    const latestDate = convertStringToDate(String(latest['Transaction Date']))
    let months = getThreeMonthsOfYear(latestDate)
    if (selectedDate.length !== 0) { months = [selectedDate] }

    const regex = new RegExp(`^(${months.join('|')}).{2}$`)

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': regex,
      'Application PAN': cardRegex,
      commerce: locals.user._id,
      active: true
    }

    if (query.branch && query.branch !== 'all') filter.branchId = query.branch
    if (query.type && query.type !== 'all') filter.type = (query.type === ETransactionType.TPV) ? ETransactionType.TPV : ETransactionType.ECOMMERCE
    if (query.serialNumber && query.serialNumber !== 'all') filter['IFD Serial Number'] = query.serialNumber
    if (query.status && query.status !== 'all') filter.transactionStatus = query.status

    const resume = await TransactionModel.aggregate<ITerminalAggregator>()
      .match({ ...filter, transactionStatus: ETransactionStatus.APPROVED })
      .group({ ...group, _id: null })
      .exec()

    const monthResume = await TransactionModel.aggregate<ITerminalAggregator>()
      .match({ ...filter, transactionStatus: ETransactionStatus.APPROVED })
      .group({ ...group, _id: { $substr: ['$Transaction Date', 0, 4] } })
      .exec()

    const count = await TransactionModel.count(filter)

    return { count, transactions: monthResume?.sort?.((a, b) => Number(b._id) - Number(a._id)), resume: resume[0] }
  }

  async getResumeByRange (group: TAccumulatorOperator, locals: IUserLocals, query: IGetTransaction): Promise<any> {
    const startDate = query.startDate
    const endDate = query.endDate
    const brand = query.brand ?? ''
    const cardRegex = getCardBrandRegex(brand)

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      'Application PAN': { $regex: cardRegex },
      commerce: locals.user._id,
      active: true
    }
    if (query.branch && query.branch !== 'all') filter.branchId = query.branch
    if (query.type && query.type !== 'all') filter.type = (query.type === ETransactionType.TPV) ? ETransactionType.TPV : ETransactionType.ECOMMERCE
    if (query.serialNumber && query.serialNumber !== 'all') filter['IFD Serial Number'] = query.serialNumber
    if (query.status && query.status !== 'all') filter.transactionStatus = query.status

    const resume = await TransactionModel.aggregate<ITerminalAggregator>()
      .match({ ...filter, transactionStatus: ETransactionStatus.APPROVED })
      .group({ ...group, _id: null })
      .exec()

    const end = Number(query?.end ?? 0)
    const start = Number(query?.start ?? 0)
    const limit = (end !== 0) ? end - start : 10

    const transactions = await TransactionModel.aggregate<ITerminalAggregator>()
      .match(filter)
      .skip(start)
      .limit(limit)
      .exec()

    const count = await TransactionModel.count(filter)
    return { count, transactions, resume: resume[0] }
  }

  async getResumeById (group: TAccumulatorOperator, locals: IUserLocals, query: IGetTransaction): Promise<any> {
    const ticketId = query?.ticketId ?? ''
    const brand = query.brand ?? ''
    const cardRegex = getCardBrandRegex(brand)
    const filter: FilterQuery<ITransaction> = {
      'ID Transaction': new RegExp('' + ticketId, 'i'),
      'Application PAN': { $regex: cardRegex },
      commerce: locals.user._id,
      active: true
    }

    const resume = await TransactionModel.aggregate<ITerminalAggregator>()
      .match({ ...filter, transactionStatus: ETransactionStatus.APPROVED })
      .group({ ...group, _id: null })
      .exec()

    const count = await TransactionModel.count(filter)
    return { count, resume: resume[0] }
  }

  async getDispersableResume (query: IGetTransaction): Promise<any[]> {
    const user = query.user ?? /^.*$/
    const startDate = query.startDate ?? '0'
    const endDate = query.endDate ?? '0'

    const filter = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      transactionStatus: ETransactionStatus.APPROVED,
      tefStatus: { $in: [ETefStatus.APPROVED, ETefStatus.WARNING] },
      depositStatus: EDepositStatus.PENDING,
      commerce: user,
      active: true
    }

    const fieldsToSelect = {
      _id: 1,
      'SIC Code': 1,
      Amount: 1,
      commerce: 1,
      'Card Type': 1,
      'Application PAN': 1,
      'Transaction Date': 1,
      'ID Transaction': 1,
      iva: 1,
      comission: 1,
      toDeposit: 1,
      type: 1,
      deposited: 1,
      processorComission: 1,
      franchiseComission: 1,
      fixedComission: 1,
      lklpayComission: 1,
      tefStatus: 1,
      depositStatus: 1,
      toDepositGreaterThanDeposited: 1
    }

    const transactions = await TransactionModel.aggregate()
      .match(filter)
      .sort({ createdAt: 1 })
      .addFields({ toDepositGreaterThanDeposited: { $gt: ['$toDeposit', '$deposited'] } })
      .project(fieldsToSelect)

    const commerceIds = [...new Set(transactions.map((transactions: any) => String(transactions.commerce)))]
    const response = await appProfilesInstance.get(`user/backoffice/getCommercesInfo/?ids[]=${commerceIds.join('&ids[]=')}`)
    const names = response.data.response

    const groupedTransactions: Record<string, any> = {}
    transactions.forEach((transaction: any) => {
      const commerceId = transaction.commerce
      const minEcommerceDaysToDisperse = names[String(commerceId)]?.minEcommerceDaysToDisperse
      const readyToDisperse = this.checkTransactionReadyToDisperse(transaction, endDate, minEcommerceDaysToDisperse)
      console.log(transaction['Transaction Date'], transaction.type, readyToDisperse, transaction['ID Transaction'])
      if (!readyToDisperse) return

      if (groupedTransactions[commerceId] === undefined && transaction.toDepositGreaterThanDeposited === true) {
        groupedTransactions[commerceId] = {
          commerce_id: commerceId,
          transactions: []
        }
      }

      const brand = getCardBrand(transaction['Application PAN'])
      transaction.brand = brand
      if (transaction.toDepositGreaterThanDeposited === true) {
        groupedTransactions[commerceId].transactions.push(transaction)
      }
    })

    const groupedResults = Object.values(groupedTransactions)
    return groupedResults
  }

  async getAvailableTransactionsUrgentDeposit (locals: IUserLocals): Promise<any[]> {
    const filter = {
      transactionStatus: ETransactionStatus.APPROVED,
      depositStatus: EDepositStatus.PENDING,
      type: ETransactionType.TPV,
      commerce: locals.user._id,
      active: true
    }

    const fieldsToSelect = {
      Amount: 1,
      'Card Type': 1,
      'ID Transaction': 1,
      iva: 1,
      comission: 1,
      toDeposit: 1,
      deposited: 1,
      type: 1,
      processorComission: 1,
      franchiseComission: 1,
      lklpayComission: 1,
      fixedComission: 1,
      depositStatus: 1
    }

    const transactions = await TransactionModel.aggregate().match(filter).sort({ createdAt: 1 }).project(fieldsToSelect)
    const filteredTransactions = transactions.filter(transaction => transaction.toDeposit > transaction.deposited)
    return filteredTransactions
  }

  checkTransactionReadyToDisperse (transaction: ITransaction, today: string, minEcommerceDaysToDisperse: number = 3): boolean {
    const type = transaction.type
    if (type === ETransactionType.TPV) return true

    const stringTransactionDate = transaction['Transaction Date'] ?? ''

    const transactionDate = convertStringToDate(stringTransactionDate)
    const currentDate = new Date(transactionDate)
    let count = 1
    while (count < minEcommerceDaysToDisperse) {
      currentDate.setDate(currentDate.getDate() + 1)
      const currentDateString = getStringDate(currentDate)
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek === 6 || dayOfWeek === 0 || holidays.includes(currentDateString)) continue
      count += 1
    }

    const transactionDispersableDate = currentDate
    if (today < getStringDate(transactionDispersableDate)) return false
    return true
  }
}

const transactionResumeService: TransactionResumeService = new TransactionResumeService()
export default transactionResumeService
