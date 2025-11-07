import * as ExcelJS from 'exceljs'
import { Parser } from 'json2csv'
import mongoose, { type FilterQuery } from 'mongoose'
import { type IUserLocals, type ITransaction } from '../dtos/transaction.dto'
import { getCardBrandRegex } from '@app/utils/card.util'
import { ETefStatus, ETransactionStatus } from '@app/interfaces/transaction.interface'
import { TerminalModel, TransactionModel } from '@app/repositories/mongoose/models'
import { translate } from '@app/utils/translate'
import { convertirAMesYAnio, formatTimestamp, getStringDate } from '@app/utils/date.util'
import { concatObjs, sumField } from '@app/utils/util.util'
import { appProfilesInstance } from '@app/repositories/axios'
import { AppErrorResponse } from '@app/models/app.response'
import { type ITerminal } from '@app/interfaces/terminal.interface'
import { getCommerce } from '@app/utils/db.util'
import { createTxVoucherPdf } from '../reports/tx-voucher-pdf'
import { type GetTxReportDto } from '../dtos/get-tx-report.dto'
import { ObjectId } from 'mongodb'
import { borderStyle, headerStyle } from '@app/constants/excel.constants'
import { createAdvisorTxExcel } from '../reports/advisor-transactions-excel'
import { createFranchiseTxExcel } from '../reports/franchise-transactions-excel'

export class TransactionReportService {
  async getTransactionsReport (query: any, locals: IUserLocals): Promise<any> {
    const startDate = query?.startDate != null ? query?.startDate : '000000'
    const endDate = query?.endDate != null ? query?.endDate : '999999'
    const brand = query.brand
    const cardRegex = getCardBrandRegex(brand)
    console.log(startDate, endDate, cardRegex)

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      'Application PAN': { $regex: cardRegex },
      commerce: locals.user._id,
      active: true
    }

    const transactions = await TransactionModel.find(filter, undefined, {
      sort: { 'Transaction Date': 'desc', 'Transaction Time': 'desc' }
    })

    const mappedTransactions = transactions.map((transaction: any) => ({
      'ID de Transaccion': transaction['ID Transaction'],
      Tipo: transaction.type,
      Monto: transaction.Amount.toString(),
      Comision: transaction.comission.toString(),
      IVA: transaction.iva.toString(),
      'A depositar': transaction.toDeposit.toString(),
      Depositado: transaction.deposited.toString(),
      'PAN de la Aplicacion': transaction['Application PAN'],
      'Tipo de Tarjeta': translate(transaction['Card Type'], 'es'),
      Estado: translate(transaction.transactionStatus, 'es'),
      Fecha: transaction['Transaction Date'],
      Hora: transaction['Transaction Time']
    }))
    const fields = Object.keys(mappedTransactions[0])

    // const fields = ['ID Transaction', 'type', 'Amount', 'comission', 'iva', 'toDeposit', 'deposited', 'Application PAN', 'Card Type', 'transactionStatus', 'Transaction Date', 'Transaction Time', 'reference']
    const json2csv = new Parser({ fields })
    const csv = json2csv.parse(mappedTransactions)
    return { file: csv, fileName: 'transactions_.csv' }
  }

  async getTransactionsReport2 (query: any, locals: IUserLocals): Promise<any> {
    console.log('3')
    const startDate = (query?.startDate != null ? query?.startDate : '000000') as string
    const endDate = (query?.endDate != null ? query?.endDate : '999999') as string
    const brand = query.brand
    const commerce = locals.user._id

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      'Application PAN': { $regex: getCardBrandRegex(brand) },
      commerce,
      active: true
    }

    const transactions: any = await TransactionModel.find(filter, undefined, {
      sort: { 'Transaction Date': 1, 'Transaction Time': 1 }
    })

    const transactionsCopy = JSON.parse(JSON.stringify(transactions))

    const mappedTransactions = transactionsCopy.map((transaction: any) => {
      const ivaPercentage = (transaction.comission > 0) ? (transaction.iva / transaction.comission) : 0
      return {
        amount: transaction.Amount,
        comission: transaction.comission,
        iva: transaction.iva,
        toDeposit: transaction.toDeposit,
        fixedComission: transaction.fixedComission,
        IvaFijo: transaction.fixedComission * ivaPercentage,
        // Extra info
        'Transaction Date': transaction['Transaction Date'],
        'Transaction Time': transaction['Transaction Time'],
        'ID Transaction': transaction['ID Transaction'],
        type: transaction.type,
        'Card Type': translate(transaction['Card Type'], 'es'),
        transactionStatus: translate(transaction.transactionStatus, 'es'),
        depositStatus: translate(transaction.depositStatus, 'es')
      }
    })

    const approved = mappedTransactions.filter((transaction: any) => transaction.transactionStatus === translate(ETransactionStatus.APPROVED, 'es'))
    const notApproved = mappedTransactions.filter((transaction: any) => transaction.transactionStatus !== translate(ETransactionStatus.APPROVED, 'es'))

    const totals = {
      approved: [
        sumField(approved, 'amount'),
        approved.reduce((acc: number, transaction: any) => acc + Number(transaction.comission), 0),
        approved.reduce((acc: number, transaction: any) => acc + Number(transaction.iva), 0),
        approved.reduce((acc: number, transaction: any) => acc + Number(transaction.toDeposit), 0),
        approved.reduce((acc: number, transaction: any) => acc + Number(transaction.fixedComission), 0),
        sumField(approved, 'IvaFijo')
      ],
      notApproved: [
        notApproved.reduce((acc: number, transaction: any) => acc + Number(transaction.amount), 0),
        notApproved.reduce((acc: number, transaction: any) => acc + Number(transaction.comission), 0),
        notApproved.reduce((acc: number, transaction: any) => acc + Number(transaction.iva), 0),
        notApproved.reduce((acc: number, transaction: any) => acc + Number(transaction.toDeposit), 0),
        notApproved.reduce((acc: number, transaction: any) => acc + Number(transaction.fixedComission), 0),
        sumField(notApproved, 'IvaFijo')
      ]
    }

    // ------------------- Construir archivo excel ----------------------------------------------------
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Report')

    const headerStrings = 'Monto,Comisión,IVA,A depositar,Fijo,IvaFijo,Fecha,Hora,ID de Transaccion,Tipo,Tarjeta,Estatus,Estado del deposito'.split(',')
    const headerRow = worksheet.addRow(headerStrings)
    headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
    headerRow.eachCell((cell: any) => { cell.border = borderStyle })
    headerRow.font = { bold: true }
    // Agrega tus datos
    mappedTransactions.forEach((transaction: any, index: any) => {
      const row = worksheet.addRow(Object.values(transaction))
      row.eachCell((cell: any) => { cell.border = borderStyle })
    })

    worksheet.addRow([])
    worksheet.addRow([])
    const totalPreHeader = worksheet.addRow(['Total aprobadas'])
    const totalsHeader = worksheet.addRow('Monto,Comision,IVA,A depositar,Fijo,IvaFijo'.split(','))
    const totalsRow = worksheet.addRow(totals.approved)
    totalPreHeader.eachCell((cell: any) => { cell.border = borderStyle })
    totalsHeader.eachCell((cell: any) => { cell.border = borderStyle })
    totalsHeader.eachCell((cell: any) => { cell.fill = headerStyle })
    totalsRow.eachCell((cell: any) => { cell.border = borderStyle })

    worksheet.addRow([])
    worksheet.addRow([])
    const total2PreHeader = worksheet.addRow(['Total canceladas / declinadas'])
    const totals2Header = worksheet.addRow('Monto,Comision,IVA,A depositar,Fijo,IvaFijo'.split(','))
    const totals2Row = worksheet.addRow(totals.notApproved)
    total2PreHeader.eachCell((cell: any) => { cell.border = borderStyle })
    totals2Header.eachCell((cell: any) => { cell.border = borderStyle })
    totals2Header.eachCell((cell: any) => { cell.fill = headerStyle })
    totals2Row.eachCell((cell: any) => { cell.border = borderStyle })

    const columnHeaders = 'Monto,Comisión,IVA,A depositar,Fijo,IvaFijo,Fecha,Hora,ID de Transaccion,Tipo de tx,Tipo Tarjeta,Estado de la transaccion,Estado del deposito'.split(',')

    columnHeaders.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1)
      const headerLength = header.length
      const columnWidth = Math.max(headerLength + 2, 10)

      column.width = columnWidth

      if (index >= columnHeaders.length - 7) {
        column.eachCell({ includeEmpty: true }, (cell: any) => {
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        })
      } else {
        column.eachCell({ includeEmpty: true }, (cell: any) => {
          cell.alignment = { horizontal: 'left', vertical: 'middle' }
        })
      }
    })

    const currentDate = new Date()
    const excelBuffer = await workbook.xlsx.writeBuffer()
    const dateRange = startDate !== endDate ? `${startDate}-${endDate}` : startDate
    const formattedTime = formatTimestamp(Date.now())
    const generationTime = dateRange !== getStringDate(currentDate) ? formattedTime : formattedTime.split(' ')[1]
    return { file: excelBuffer, fileName: `Reporte ${dateRange} Generado el ${generationTime}.xlsx` }
  }

  async getTransactionsReportBackoffice (query: any): Promise<any> {
    const startDate = (query?.startDate != null ? query?.startDate : '000000') as string
    const endDate = (query?.endDate != null ? query?.endDate : '999999') as string
    const brand = query.brand
    const commerce = query?.commerce != null ? query?.commerce : { $regex: /^.*$/ }

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      'Application PAN': { $regex: getCardBrandRegex(brand) },
      transactionStatus: ETransactionStatus.APPROVED,
      commerce,
      active: true
    }

    const transactions = await TransactionModel.find(filter, undefined, {
      sort: { 'Transaction Date': 1, 'Transaction Time': 1 }
    })

    const mappedTransactions = transactions.map((transaction: any) => ({
      'ID de Transaccion': transaction['ID Transaction'],
      Tipo: transaction.type,
      Monto: transaction.Amount.toString(),
      Comision: transaction.comission.toString(),
      IVA: transaction.iva.toString(),
      'A depositar': transaction.toDeposit.toString(),
      Depositado: transaction.deposited.toString(),
      'PAN de la Aplicacion': transaction['Application PAN'],
      'Tipo de Tarjeta': translate(transaction['Card Type'], 'es'),
      Estado: translate(transaction.transactionStatus, 'es'),
      Fecha: transaction['Transaction Date'],
      Hora: transaction['Transaction Time']
    }))
    const fields = Object.keys(mappedTransactions[0])

    // const fields = ['ID Transaction', 'type', 'Amount', 'comission', 'iva', 'toDeposit', 'deposited', 'Application PAN', 'Card Type', 'transactionStatus', 'Transaction Date', 'Transaction Time', 'reference']
    const json2csv = new Parser({ fields })
    const csv = json2csv.parse(mappedTransactions)
    return { file: csv, fileName: `report${startDate}-${endDate}_generatedAt${String(Date.now())}.csv` }
  }

  async getTransactionsReportBackoffice2 (query: any): Promise<any> {
    const startDate = (query?.startDate != null ? query?.startDate : '000000') as string
    const endDate = (query?.endDate != null ? query?.endDate : '999999') as string
    const brand = query.brand
    const commerce = query?.commerce != null ? query?.commerce : { $regex: /^.*$/ }

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      'Application PAN': { $regex: getCardBrandRegex(brand) },
      transactionStatus: ETransactionStatus.APPROVED,
      commerce,
      active: true
    }

    const transactions: any = await TransactionModel.find(filter, undefined, {
      sort: { 'Transaction Date': 1, 'Transaction Time': 1 }
    })

    const commerceIds = [...new Set(transactions.map((transactions: any) => String(transactions.commerce)))]
    const response = await appProfilesInstance.get(`user/backoffice/getCommercesInfo/?ids[]=${commerceIds.join('&ids[]=')}`)
    const names = response.data.response

    const transactionsCopy = JSON.parse(JSON.stringify(transactions))
    for (const transaction of transactionsCopy) {
      transaction.comercio = names?.[String(transaction.commerce)]?.name ?? '-'
    }

    const mappedTransactions = transactionsCopy.map((transaction: any) => {
      const ivaPercentage = transaction.iva / transaction.comission
      return {
        Monto: transaction.Amount,
        Comision: transaction.comission,
        IVA: transaction.iva,
        'A depositar': transaction.toDeposit,
        Banco: transaction.processorComission,
        Distro: transaction.franchiseComission,
        Lklpay: transaction.lklpayComission,
        Fijo: transaction.fixedComission,
        IvaBanco: transaction.processorComission * ivaPercentage,
        IvaDistro: transaction.franchiseComission * ivaPercentage,
        IvaLklpay: transaction.lklpayComission * ivaPercentage,
        IvaFijo: transaction.fixedComission * ivaPercentage,
        Fecha: transaction['Transaction Date'],
        Hora: transaction['Transaction Time'],
        'ID de Transaccion': transaction['ID Transaction'],
        Tipo: transaction.type,
        'Tipo de Tarjeta': translate(transaction['Card Type'], 'es'),
        Comercio: transaction?.comercio
      }
    })
    const fields = Object.keys(mappedTransactions[0])

    const json2csv = new Parser({ fields })
    let csv = json2csv.parse(mappedTransactions)
    csv += '\n\nTotal\n'
    csv += 'Monto,Comision,IVA,A depositar,Banco,Distro,Lklpay,Fijo,IvaBanco,IvaDistro,IvaLklpay,IvaFijo\n'
    const totals = [
      mappedTransactions.reduce((acc: number, transaction: any) => acc + Number(transaction.Monto), 0),
      mappedTransactions.reduce((acc: number, transaction: any) => acc + Number(transaction.Comision), 0),
      mappedTransactions.reduce((acc: number, transaction: any) => acc + Number(transaction.IVA), 0),
      mappedTransactions.reduce((acc: number, transaction: any) => acc + Number(transaction['A depositar']), 0),
      mappedTransactions.reduce((acc: number, transaction: any) => acc + Number(transaction.Banco), 0),
      mappedTransactions.reduce((acc: number, transaction: any) => acc + Number(transaction.Distro), 0),
      mappedTransactions.reduce((acc: number, transaction: any) => acc + Number(transaction.Lklpay), 0),
      mappedTransactions.reduce((acc: number, transaction: any) => acc + Number(transaction.Fijo), 0),
      mappedTransactions.reduce((acc: number, transaction: any) => acc + Number(transaction.IvaBanco), 0),
      mappedTransactions.reduce((acc: number, transaction: any) => acc + Number(transaction.IvaDistro), 0),
      mappedTransactions.reduce((acc: number, transaction: any) => acc + Number(transaction.IvaLklpay), 0),
      mappedTransactions.reduce((acc: number, transaction: any) => acc + Number(transaction.IvaFijo), 0)
    ]
    csv += totals.join(',')
    return { file: csv, fileName: `report${startDate}-${endDate}_generatedAt${String(Date.now())}.csv` }
  }

  async getTransactionsReportBackoffice3 (query: any): Promise<any> {
    const startDate = (query?.startDate != null ? query?.startDate : '000000') as string
    const endDate = (query?.endDate != null ? query?.endDate : '999999') as string
    const brand = query.brand

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      'Application PAN': { $regex: getCardBrandRegex(brand) },
      // transactionStatus: ETransactionStatus.APPROVED,
      // tefStatus: ETefStatus.APPROVED,
      active: true
    }

    if (query.commerce !== null && query.commerce !== 'all') filter.commerce = query.commerce

    console.log(filter)

    const transactions: any = await TransactionModel.find(filter, undefined, {
      sort: { 'Transaction Date': 1, 'Transaction Time': 1 },
      allowDiskUse: true
    })

    console.log(transactions.length)

    const commerceIds = [...new Set(transactions.map((transactions: any) => String(transactions.commerce)))]
    const response = await appProfilesInstance.get(`user/backoffice/getCommercesInfo/?ids[]=${commerceIds.join('&ids[]=')}`)
    const names = response.data.response

    const franchiseIds = [...new Set(transactions.map((transactions: any) => String(transactions.franchiseId)))]
    const response2 = await appProfilesInstance.get(`franchise/backoffice/getFranchiseNames/?ids[]=${franchiseIds.join('&ids[]=')}`)
    const names2 = response2.data.response

    const transactionsCopy = JSON.parse(JSON.stringify(transactions))
    for (const transaction of transactionsCopy) {
      transaction.comercio = names?.[String(transaction.commerce)]?.name ?? '-'
      transaction.clabeComercio = names?.[String(transaction.commerce)]?.clabe ?? '-'
      transaction.franquicia = names2?.[String(transaction.franchiseId)]?.name ?? '-'
      transaction.clabeFranquicia = names2?.[String(transaction.franchiseId)]?.clabe ?? '-'
    }

    const mappedTransactions = transactionsCopy.map((transaction: any) => {
      const ivaPercentage = (transaction.comission > 0) ? (transaction.iva / transaction.comission) : 0
      return {
        amount: transaction.Amount,
        comission: transaction.comission,
        iva: transaction.iva,
        toDeposit: transaction.toDeposit,
        processorComission: transaction.processorComission,
        franchiseComission: transaction.franchiseComission,
        lklpayComission: transaction.lklpayComission,
        fixedComission: transaction.fixedComission / (1 + ivaPercentage),
        IvaBanco: transaction.processorComission * ivaPercentage,
        IvaDistro: transaction.franchiseComission * ivaPercentage,
        IvaLklpay: transaction.lklpayComission * ivaPercentage,
        IvaFijo: (transaction.fixedComission / (1 + ivaPercentage)) * ivaPercentage,
        msiLklpayComission: transaction.msiLklpayComission,
        msiprocessorComission: transaction.msiprocessorComission,
        // Extra info
        'Transaction Date': transaction['Transaction Date'],
        'Transaction Time': transaction['Transaction Time'],
        'ID Transaction': transaction['ID Transaction'],
        type: transaction.type,
        'Card Type': translate(transaction['Card Type'], 'es'),
        comercio: transaction?.comercio,
        franquicia: transaction?.franquicia,
        clabeComercio: transaction.clabeComercio,
        clabeFranquicia: transaction.clabeFranquicia,
        transactionStatus: transaction.transactionStatus,
        tefStatus: transaction.tefStatus,
        depositStatus: transaction.depositStatus
      }
    })

    const approved = mappedTransactions.filter((transaction: any) => transaction.transactionStatus === ETransactionStatus.APPROVED)
    const notApproved = mappedTransactions.filter((transaction: any) => transaction.transactionStatus !== ETransactionStatus.APPROVED)
    const tefApproved = mappedTransactions.filter((transaction: any) => transaction.tefStatus === ETefStatus.APPROVED)

    const totals = {
      approved: [
        sumField(approved, 'amount'),
        sumField(approved, 'comission'),
        sumField(approved, 'iva'),
        sumField(approved, 'toDeposit'),
        sumField(approved, 'processorComission'),
        sumField(approved, 'franchiseComission'),
        sumField(approved, 'lklpayComission'),
        sumField(approved, 'fixedComission'),
        sumField(approved, 'IvaBanco'),
        sumField(approved, 'IvaDistro'),
        sumField(approved, 'IvaLklpay'),
        sumField(approved, 'IvaFijo')
      ],
      notApproved: [
        sumField(notApproved, 'amount'),
        sumField(notApproved, 'comission'),
        sumField(notApproved, 'iva'),
        sumField(notApproved, 'toDeposit'),
        sumField(notApproved, 'processorComission'),
        sumField(notApproved, 'franchiseComission'),
        sumField(notApproved, 'lklpayComission'),
        sumField(notApproved, 'fixedComission'),
        sumField(notApproved, 'IvaBanco'),
        sumField(notApproved, 'IvaDistro'),
        sumField(notApproved, 'IvaLklpay'),
        sumField(notApproved, 'IvaFijo')
      ],
      tefApproved: [
        sumField(tefApproved, 'amount'),
        sumField(tefApproved, 'comission'),
        sumField(tefApproved, 'iva'),
        sumField(tefApproved, 'toDeposit'),
        sumField(tefApproved, 'processorComission'),
        sumField(tefApproved, 'franchiseComission'),
        sumField(tefApproved, 'lklpayComission'),
        sumField(tefApproved, 'fixedComission'),
        sumField(tefApproved, 'IvaBanco'),
        sumField(tefApproved, 'IvaDistro'),
        sumField(tefApproved, 'IvaLklpay'),
        sumField(tefApproved, 'IvaFijo')
      ]
    }

    // ------------------- Construir archivo excel ----------------------------------------------------
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Report')

    const headerRow = worksheet.addRow(
      'Monto,Comisión,IVA,A depositar,Banco,Distro,Lklpay,Fijo,IvaBanco,IvaDistro,IvaLklpay,IvaFijo,MsiLkl,MsiBanco,Fecha,Hora,ID de Transaccion,Tipo,Tarjeta,Comercio,Distribuidor,Clabe comercio,Clabe distribuidor,TransactionStatus,TefStatus,DepositStatus'.split(',')
    )
    headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
    headerRow.eachCell((cell: any) => { cell.border = borderStyle })
    headerRow.font = { bold: true }
    // Agrega tus datos
    mappedTransactions.forEach((transaction: any, index: any) => {
      const row = worksheet.addRow(Object.values(transaction))
      row.eachCell((cell: any) => { cell.border = borderStyle })
    })

    worksheet.addRow([])
    worksheet.addRow([])
    const totalPreHeader = worksheet.addRow(['Total aprobadas'])
    const totalsHeader = worksheet.addRow('Monto,Comision,IVA,A depositar,Banco,Distro,Lklpay,Fijo,IvaBanco,IvaDistro,IvaLklpay,IvaFijo'.split(','))
    const totalsRow = worksheet.addRow(totals.approved)
    totalPreHeader.eachCell((cell: any) => { cell.border = borderStyle })
    totalsHeader.eachCell((cell: any) => { cell.border = borderStyle })
    totalsHeader.eachCell((cell: any) => { cell.fill = headerStyle })
    totalsRow.eachCell((cell: any) => { cell.border = borderStyle })

    worksheet.addRow([])
    worksheet.addRow([])
    const total2PreHeader = worksheet.addRow(['Total canceladas / declinadas'])
    const totals2Header = worksheet.addRow('Monto,Comision,IVA,A depositar,Banco,Distro,Lklpay,Fijo,IvaBanco,IvaDistro,IvaLklpay,IvaFijo'.split(','))
    const totals2Row = worksheet.addRow(totals.notApproved)
    total2PreHeader.eachCell((cell: any) => { cell.border = borderStyle })
    totals2Header.eachCell((cell: any) => { cell.border = borderStyle })
    totals2Header.eachCell((cell: any) => { cell.fill = headerStyle })
    totals2Row.eachCell((cell: any) => { cell.border = borderStyle })

    worksheet.addRow([])
    worksheet.addRow([])
    const total3PreHeader = worksheet.addRow(['Total aprobadas TEF'])
    const totals3Header = worksheet.addRow('Monto,Comision,IVA,A depositar,Banco,Distro,Lklpay,Fijo,IvaBanco,IvaDistro,IvaLklpay,IvaFijo'.split(','))
    const totals3Row = worksheet.addRow(totals.tefApproved)
    total3PreHeader.eachCell((cell: any) => { cell.border = borderStyle })
    totals3Header.eachCell((cell: any) => { cell.border = borderStyle })
    totals3Header.eachCell((cell: any) => { cell.fill = headerStyle })
    totals3Row.eachCell((cell: any) => { cell.border = borderStyle })
    // worksheet.columns.forEach((column: any) => {column.width = 12})

    const columnHeaders = 'Monto,Comisión,IVA,A depositar,Banco,Distro,Lklpay,Fijo,IvaBanco,IvaDistro,IvaLklpay,IvaFijo,Fecha,Hora,ID de Transaccion,Tipo,Tarjeta,Comercio,Distribuidor,Clabe comercio,Clabe distribuidor,TransactionStatus,TefStatus,DepositStatus'.split(',')

    columnHeaders.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1)
      const headerLength = header.length
      const columnWidth = Math.max(headerLength + 2, 10)

      column.width = columnWidth

      column.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      })
    })

    const currentDate = new Date()
    const excelBuffer = await workbook.xlsx.writeBuffer()
    const dateRange = startDate !== endDate ? `${startDate}-${endDate}` : startDate
    const formattedTime = formatTimestamp(Date.now())
    const generationTime = dateRange !== getStringDate(currentDate) ? formattedTime : formattedTime.split(' ')[1]
    return { file: excelBuffer, fileName: `Reporte ${dateRange} Generado el ${generationTime}.xlsx` }
  }

  async getTransactionsReportFranchise (dto: GetTxReportDto, franchiseId: string): Promise<any> {
    const startDate = dto.startDate
    const endDate = dto.endDate

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      franchiseId: new ObjectId(franchiseId),
      active: true
    }

    if (dto.commerce !== null) filter.commerce = dto.commerce

    const transactions: any = await TransactionModel.find(filter, undefined, {
      sort: { 'Transaction Date': 1, 'Transaction Time': 1 },
      allowDiskUse: true
    }).lean()

    const currentDate = new Date()
    const buffer = await createFranchiseTxExcel(transactions)
    const dateRange = startDate !== endDate ? `${startDate}-${endDate}` : startDate
    const formattedTime = formatTimestamp(Date.now())
    const generationTime = dateRange !== getStringDate(currentDate) ? formattedTime : formattedTime.split(' ')[1]
    return { file: buffer, fileName: `Reporte ${dateRange} Generado el ${generationTime}.xlsx` }
  }

  async getTransactionsReportAdvisor (dto: GetTxReportDto, advisorId: string): Promise<any> {
    const startDate = dto.startDate
    const endDate = dto.endDate

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      advisorId: new ObjectId(advisorId),
      active: true
    }

    if (dto.commerce !== null) filter.commerce = dto.commerce

    const transactions: any = await TransactionModel.find(filter, undefined, {
      sort: { 'Transaction Date': 1, 'Transaction Time': 1 },
      allowDiskUse: true
    }).lean()

    const currentDate = new Date()
    const buffer = await createAdvisorTxExcel(transactions)
    const dateRange = startDate !== endDate ? `${startDate}-${endDate}` : startDate
    const formattedTime = formatTimestamp(Date.now())
    const generationTime = dateRange !== getStringDate(currentDate) ? formattedTime : formattedTime.split(' ')[1]
    return { file: buffer, fileName: `Reporte ${dateRange} Generado el ${generationTime}.xlsx` }
  }

  async getTransactionsReportBackoffice4 (query: any): Promise<any> {
    const startDate = (query?.startDate != null ? query?.startDate : '000000') as string
    const endDate = (query?.endDate != null ? query?.endDate : '999999') as string
    let commerce = query?.commerce != null ? query?.commerce : ''
    if (commerce === 'all') commerce = { $regex: /^.*$/ }

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      transactionStatus: ETransactionStatus.APPROVED,
      commerce,
      active: true
    }

    const transactions: any = await TransactionModel.find(filter, undefined, {
      sort: { 'Card Type': 1, 'Transaction Date': 1, 'Transaction Time': 1 },
      allowDiskUse: true
    })

    if (transactions.length === 0) throw new AppErrorResponse({ description: '', name: 'No se encontraron transacciones', statusCode: 404, isOperational: true })

    const commerceIds = [...new Set(transactions.map((transactions: any) => String(transactions.commerce)))]
    const response = await appProfilesInstance.get(`user/backoffice/getCommercesInfo/?ids[]=${commerceIds.join('&ids[]=')}`)
    const names = response.data.response

    if (commerceIds.length === 0) throw new AppErrorResponse({ description: '', name: 'No se encontró el comercio', statusCode: 404, isOperational: true })
    const commerceName: string = names?.[commerce]?.name ?? 'Todos los comercios'

    const mappedTransactions = transactions.map((transaction: any) => {
      const ivaPercentage = (transaction.comission > 0) ? (transaction.iva / transaction.comission) : 0
      return {
        'ID Transaction': transaction['ID Transaction'],
        'Transaction Date': transaction['Transaction Date'],
        'Transaction Time': transaction['Transaction Time'],
        amount: transaction.Amount,
        comission: transaction.comission,
        iva: transaction.iva,
        fixedComission: transaction.fixedComission / (1 + ivaPercentage),
        IvaFijo: (transaction.fixedComission / (1 + ivaPercentage)) * ivaPercentage,
        toDeposit: transaction.toDeposit,
        'Card Type': translate(transaction['Card Type'], 'es')
      }
    })

    const totalAmount = sumField(mappedTransactions, 'amount')
    const totalToDeposit = sumField(mappedTransactions, 'toDeposit')
    // ------------------- Construir archivo excel ----------------------------------------------------
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Report')

    const columnHeaders = 'ID de Transaccion,Fecha,Hora,Monto,Comisión,IVA,Fijo,IvaFijo,A depositar,Tarjeta'.split(',')
    const headerRow = worksheet.addRow(columnHeaders)
    headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
    headerRow.eachCell((cell: any) => { cell.border = borderStyle })
    headerRow.font = { bold: true }
    // Agrega tus datos
    mappedTransactions.forEach((transaction: any, index: any) => {
      const row = worksheet.addRow(Object.values(transaction))
      row.eachCell((cell: any, cellNumber: number) => {
        cell.border = borderStyle
        if (cellNumber >= 4 && cellNumber <= 9) {
          cell.numFmt = '_-$* #,##0.00_-;_-$* (#,##0.00)_-;_-$* "-"??;_-@_-'
          if (cell.value < 0) cell.font = { color: { argb: 'C40000' } }
        }
      })
    })

    worksheet.addRow([])
    worksheet.addRow([])
    const totalPreHeader = worksheet.addRow(['', '', '', 'Total', '', '', '', '', '', ''])
    const totalsHeader = worksheet.addRow(',,,Monto,,,,,A depositar,'.split(','))
    const totalsRow = worksheet.addRow(['', '', '', totalAmount, '', '', '', '', totalToDeposit, ''])
    totalPreHeader.eachCell((cell: any) => { cell.border = borderStyle })
    totalsHeader.eachCell((cell: any, cellNumber: number) => {
      cell.border = borderStyle
      if (cellNumber === 4 || cellNumber === 9) cell.fill = headerStyle
    })
    totalsRow.eachCell((cell: any, cellNumber: number) => {
      cell.border = borderStyle
      if (cellNumber === 4 || cellNumber === 9) cell.numFmt = '_-$* #,##0.00_-;_-$* (#,##0.00)_-;_-$* "-"??;_-@_-'
    })

    columnHeaders.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1)
      const headerLength = header.length
      const columnWidth = Math.max(headerLength + 2, 10)
      column.width = columnWidth

      column.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      })
    })

    worksheet.eachRow((row: any) => { row.height = 13.5 })

    const excelBuffer = await workbook.xlsx.writeBuffer()
    const dateRange = startDate !== endDate ? `${startDate}-${endDate}` : startDate
    return { file: excelBuffer, fileName: `${commerceName} (${dateRange}).xlsx` }
  }

  async getBackofficeCSVReport (query: any): Promise<any> {
    // Definir si el filtro comercio es obligatorio o sera opcional. (Devolver todos los comercios si no se especifica)
    const startDate = (query?.startDate != null ? query?.startDate : '000000') as string
    const endDate = (query?.endDate != null ? query?.endDate : '999999') as string
    const commerce = query?.commerce != null ? query?.commerce : null

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      active: true
    }
    if (commerce != null && commerce !== 'all') {
      filter.commerce = commerce
    }
    const transactions = await TransactionModel.aggregate([
      { $match: filter },
      { $sort: { 'Transaction Date': -1, 'Transaction Time': -1 } },
      {
        $project: {
          Status: '$transactionStatus',
          'S/N': '$IFD Serial Number',
          'Fecha de Transaccion': '$Transaction Date',
          'Hora de Transaccion': '$Transaction Time',
          'Tipo de Transaccion': '$operationType',
          Comercio: '$commerceName',
          'PAN Enmascarado': '$Application PAN',
          Banco: '$bank',
          'Producto Bancario': '$bankProduct',
          'Modo de Entrada': '$readMode',
          RRN: { $toString: { $arrayElemAt: ['$MIT Fields.37', 0] } },
          Monto: '$Amount',
          Cashback: { $divide: [{ $toDouble: '$tip' }, 100] },
          Subtotal: { $round: [{ $abs: { $subtract: [{ $toDouble: '$Amount' }, { $divide: [{ $toDouble: '$tip' }, 100] }] } }, 2] },
          'Codigo de Respuesta': '$ISO CODE RESPONSE',
          Descripcion: '$ISO CODE DESCRIPTION',
          'Numero de Autorizacion': { $arrayElemAt: ['$MIT Fields.38', 0] },
          TxnReference: '$txnReference',
          'Numero de Afiliacion': '$ID Afiliate'
        }
      }
    ])
    if (transactions.length === 0) {
      return {
        file: '',
        fileName: `report${startDate}-${endDate}_generatedAt${String(Date.now())}.csv`
      }
    }
    const fields = Object.keys(transactions[0])
    const json2csv = new Parser({ fields })
    const csv = json2csv.parse(transactions)
    return {
      file: csv,
      fileName: `report${startDate}-${endDate}_generatedAt${String(Date.now())}.csv`
    }
  }

  async getBackofficeReportClarification (query: any): Promise<any> {
    const startDate = (query?.startDate != null ? query?.startDate : '000000') as string
    const commerce = query?.commerce != null ? query?.commerce : null
    const rrn = query?.rrn != null ? query?.rrn : null
    const authorizationNumber = query?.authorizationNumber != null ? query?.authorizationNumber : null
    const affiliationNumber = query?.affiliationNumber != null ? query?.affiliationNumber : null
    const cardNumber = query?.cardNumber != null ? query?.cardNumber : null
    const amount = query?.amount != null ? query?.amount : null

    // Validacion mínimo 3 filtros obligatorios
    const activeFilters = [
      startDate !== '000000',
      commerce !== null,
      rrn !== null,
      authorizationNumber !== null,
      affiliationNumber !== null,
      cardNumber !== null,
      amount !== null
    ].filter(Boolean).length

    if (activeFilters < 3) {
      throw new AppErrorResponse({
        name: 'Filtros insuficientes',
        description: 'Se requieren al menos 3 filtros para generar el reporte de aclaración',
        statusCode: 400,
        isOperational: true
      })
    }
    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate },
      active: true
    }
    if (commerce != null) {
      filter.commerce = commerce
    }
    if (rrn != null) {
      filter['ID Transaction'] = rrn
    }
    if (authorizationNumber != null) {
      filter['MIT Fields.38'] = { $in: [authorizationNumber] }
    }
    if (affiliationNumber != null) {
      filter['ID Afiliate'] = { $in: [affiliationNumber] }
    }
    if (cardNumber != null && /^\d{4}$/.test(cardNumber)) {
      filter['Application PAN'] = { $regex: new RegExp(`${cardNumber}$`) }
    }
    if (amount != null) {
      filter.Amount = { $eq: parseFloat(amount) }
    }
    const transactions = await TransactionModel.aggregate([
      { $match: filter },
      { $sort: { 'Transaction Date': -1, 'Transaction Time': -1 } },
      {
        $project: {
          Status: '$transactionStatus',
          'S/N': '$IFD Serial Number',
          'Fecha de Transaccion': '$Transaction Date',
          'Hora de Transaccion': '$Transaction Time',
          'Tipo de Transaccion': '$operationType',
          Comercio: '$commerceName',
          'PAN Enmascarado': '$Application PAN',
          Banco: '$bank',
          'Producto Bancario': '$bankProduct',
          'Modo de Entrada': '$readMode',
          RRN: '$ID Transaction',
          Monto: { $round: [{ $abs: { $subtract: [{ $toDouble: '$Amount' }, { $divide: [{ $toDouble: '$tip' }, 100] }] } }, 2] },
          Cashback: { $divide: [{ $toDouble: '$tip' }, 100] },
          'Monto Total': '$Amount',
          'Codigo de Respuesta': '$ISO CODE RESPONSE',
          Descripcion: '$ISO CODE DESCRIPTION',
          'Numero de Autorizacion': { $arrayElemAt: ['$MIT Fields.38', 0] },
          TxnReference: '$txnReference',
          'Numero de Afiliacion': '$ID Afiliate'

        }
      }
    ])
    if (transactions.length === 0) {
      return []
    }
    return transactions
  }

  async getFranchisesReportBackoffice (query: any): Promise<any> {
    const startDate = (query?.startDate != null ? query?.startDate : '000000') as string
    const endDate = (query?.endDate != null ? query?.endDate : '999999') as string

    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: startDate, $lte: endDate },
      transactionStatus: ETransactionStatus.APPROVED,
      tefStatus: { $in: [ETefStatus.APPROVED, ETefStatus.WARNING] },
      active: true
    }

    const aggregationPipeline = [
      {
        $match: filter
      },
      {
        $group: {
          _id: '$franchiseId',
          totalAmount: { $sum: '$Amount' },
          totalFranchiseComission: { $sum: '$franchiseComission' },
          commerceCount: { $addToSet: '$commerce' }
        }
      },
      {
        $project: {
          _id: 1,
          totalAmount: 1,
          totalFranchiseComission: 1,
          commerceCount: { $size: '$commerceCount' }
        }
      }
    ]

    const franchiseSummaries: any[] = await TransactionModel.aggregate(aggregationPipeline)

    const franchiseIds = franchiseSummaries.map((franchiseSummaries: any) => String(franchiseSummaries._id))
    const response2 = await appProfilesInstance.get(`franchise/backoffice/getFranchiseNames/?ids[]=${franchiseIds.join('&ids[]=')}`)
    const names2 = response2.data.response

    const franchiseSummariescopy = JSON.parse(JSON.stringify(franchiseSummaries))
    for (const doc of franchiseSummariescopy) {
      doc.franquicia = names2?.[String(doc._id)]?.name ?? '-'
    }

    const mappedSummaries = franchiseSummariescopy.map((doc: any) => {
      return {
        franchiseName: doc.franquicia,
        amount: doc.totalAmount,
        comission: doc.totalFranchiseComission,
        commerceCount: doc.commerceCount
      }
    })

    // ------------------- Construir archivo excel ----------------------------------------------------
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Report')

    const headerRow = worksheet.addRow(
      'Distribuidor,Total Ventas,Comisión Distribuidor,Comercios'.split(',')
    )
    headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
    headerRow.eachCell((cell: any) => { cell.border = borderStyle })
    headerRow.font = { bold: true }
    // Agrega tus datos
    mappedSummaries.forEach((doc: any, index: any) => {
      const row = worksheet.addRow(Object.values(doc))
      row.eachCell((cell: any) => { cell.border = borderStyle })
    })

    const columnHeaders = 'Distribuidor,Total Ventas,Comisión Distribuidor,Comercios'.split(',')

    columnHeaders.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1)
      const headerLength = header.length
      const columnWidth = Math.max(headerLength + 4, 10)
      column.width = columnWidth
      column.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      })
    })

    const currentDate = new Date()
    const excelBuffer = await workbook.xlsx.writeBuffer()
    const dateRange = startDate !== endDate ? `${startDate}-${endDate}` : startDate
    const formattedTime = formatTimestamp(Date.now())
    const generationTime = dateRange !== getStringDate(currentDate) ? formattedTime : formattedTime.split(' ')[1]
    return { file: excelBuffer, fileName: `Reporte de Distribuidores ${dateRange} Generado el ${generationTime}.xlsx` }
  }

  async getFranchisesReportBackoffice2 (query: any): Promise<any> {
    const startDate = (query?.startDate != null ? query?.startDate : '000000') as string
    const endDate = (query?.endDate != null ? query?.endDate : '999999') as string

    const MINIMUM_AMOUNT = 0
    const MONTHLY_COMISION = 35
    const FIRST_MONTH_EXTRA = 50

    const firstMonthPipeline = [
      {
        $match: {
          transactionStatus: ETransactionStatus.APPROVED,
          active: true
        }
      },
      {
        $group: {
          _id: { commerce: '$commerce' },
          firstMonth: {
            $min: {
              $cond: { if: { $gte: ['$Amount', MINIMUM_AMOUNT] }, then: { $substr: ['$Transaction Date', 0, 4] }, else: null }
            }
          }
        }
      },
      { $project: { _id: 0, commerce: '$_id.commerce', firstMonth: 1 } }
    ]

    const firstMonthResults = await TransactionModel.aggregate(firstMonthPipeline)
    const firstMonthResultObject: any = {}
    firstMonthResults.forEach((result: any) => {
      firstMonthResultObject[String(result.commerce)] = result.firstMonth
    })
    console.log(firstMonthResultObject)

    const aggregationPipeline = [
      {
        $match: {
          'Transaction Date': { $gte: startDate, $lte: endDate },
          transactionStatus: ETransactionStatus.APPROVED,
          active: true
        }
      },
      {
        $group: {
          _id: { franchiseId: '$franchiseId', commerce: '$commerce', month: { $substr: ['$Transaction Date', 0, 4] } },
          totalAmount: { $sum: '$Amount' },
          totalFranchiseComission: { $sum: '$franchiseComission' }
        }
      },
      {
        $group: {
          _id: { franchiseId: '$_id.franchiseId', commerce: '$_id.commerce' },
          commerceArray: {
            $push: {
              month: '$_id.month',
              commerceTotal: '$totalAmount',
              totalFranchiseComission: '$totalFranchiseComission',
              totalCambaceo: {
                $sum: {
                  $cond: { if: { $gte: ['$totalAmount', MINIMUM_AMOUNT] }, then: MONTHLY_COMISION, else: 0 } // Sumar $35 si han transaccionado mas de 10 pesos
                }
              }
            }
          },
          totalAmount: { $sum: '$totalAmount' },
          totalFranchiseComission: { $sum: '$totalFranchiseComission' },
          commerceCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.franchiseId',
          commerceArray: { $push: { commerce: '$_id.commerce', data: '$commerceArray' } },
          totalAmount: { $sum: '$totalAmount' },
          totalFranchiseComission: { $sum: '$totalFranchiseComission' },
          totalCambaceo: { $sum: { $sum: '$commerceArray.totalCambaceo' } }, // Sumar los bonos de todos los comercios y meses
          commerceCount: { $sum: '$commerceCount' }
        }
      },
      {
        $project: {
          _id: 1,
          totalAmount: 1,
          totalFranchiseComission: 1,
          totalCambaceo: 1,
          commerceArray: 1,
          commerceCount: 1
        }
      }
    ]

    const franchiseSummaries: any[] = await TransactionModel.aggregate(aggregationPipeline)

    const franchiseIds = franchiseSummaries.map((franchiseSummaries: any) => String(franchiseSummaries._id))
    const response2 = await appProfilesInstance.get(`franchise/backoffice/getFranchiseNames/?ids[]=${franchiseIds.join('&ids[]=')}`)
    const names2 = response2.data.response

    // Obtener todos los commerceIds diferentes
    // const commerceIdsSet = new Set()
    // franchiseSummaries.forEach((franchiseSummary: any) => {
    //   franchiseSummary.commerceArray.forEach((commerce: any) => {
    //     commerceIdsSet.add(commerce.commerce)
    //   })
    // })
    // const commerceIds = Array.from(commerceIdsSet)
    // console.log(commerceIds)

    const franchiseSummariescopy = JSON.parse(JSON.stringify(franchiseSummaries))
    for (const doc of franchiseSummariescopy) {
      const franchiseInfo = names2?.[String(doc._id)]
      doc.franquicia = franchiseInfo?.name ?? '-'

      let totalNewCommercesComission = 0
      let totalMonthlyComission = 0

      if (franchiseInfo?.franchiseType === '1') {
        for (const commerce of doc.commerceArray) {
          const firstMonth = (firstMonthResultObject?.[commerce.commerce] ?? '') as string
          totalMonthlyComission = doc.totalCambaceo

          if (firstMonth != null && `${firstMonth}01` > startDate && `${firstMonth}01` < endDate) {
            doc.totalFranchiseComission = 0
            totalMonthlyComission = Number(totalMonthlyComission) - MONTHLY_COMISION
            totalNewCommercesComission = totalNewCommercesComission + FIRST_MONTH_EXTRA
          }
        }
      }
      doc.totalNewCommercesComission = totalNewCommercesComission
      doc.totalMonthlyComission = totalMonthlyComission
    }
    // console.log(franchiseSummariescopy)
    // console.log(franchiseSummariescopy[0])
    // console.log(franchiseSummariescopy[0].commerceArray[0].data)

    const mappedSummaries = franchiseSummariescopy.map((doc: any) => {
      return {
        franchiseName: doc.franquicia,
        amount: doc.totalAmount,
        comission: doc.totalFranchiseComission,
        totalNewCommercesComission: doc.totalNewCommercesComission,
        totalMonthlyComission: doc.totalMonthlyComission,
        commerceCount: doc.commerceCount
      }
    })

    // console.log(mappedSummaries)
    // ------------------- Construir archivo excel ----------------------------------------------------
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Report')

    const headerRow = worksheet.addRow(
      'Distribuidor,Total Ventas,Comisión Distribuidor,Cambaceo nuevos,Cambaceo mensual,Comercios'.split(',')
    )
    headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
    headerRow.eachCell((cell: any) => { cell.border = borderStyle })
    headerRow.font = { bold: true }
    // Agrega tus datos
    mappedSummaries.forEach((doc: any, index: any) => {
      const row = worksheet.addRow(Object.values(doc))
      row.eachCell((cell: any) => { cell.border = borderStyle })
    })

    const columnHeaders = 'Distribuidor,Total Ventas,Comisión Distribuidor,Cambaceo nuevos,Cambaceo mensual,Comercios'.split(',')

    columnHeaders.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1)
      const headerLength = header.length
      const columnWidth = Math.max(headerLength + 4, 10)
      column.width = columnWidth
      column.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      })
    })

    const currentDate = new Date()
    const excelBuffer = await workbook.xlsx.writeBuffer()
    const dateRange = startDate !== endDate ? `${startDate}-${endDate}` : startDate
    const formattedTime = formatTimestamp(Date.now())
    const generationTime = dateRange !== getStringDate(currentDate) ? formattedTime : formattedTime.split(' ')[1]
    return { file: excelBuffer, fileName: `Reporte de Distribuidores2 ${dateRange} Generado el ${generationTime}.xlsx` }
  }

  async getMonthlyReport (query: any, locals: any): Promise<any> {
    const { data } = await appProfilesInstance.get('/user/backoffice/getActiveUsers')

    const franchiseIds = [...new Set(data.response.map((commerce: any) => String(commerce.franchiseId)))]
    const response2 = await appProfilesInstance.get(`franchise/backoffice/getFranchiseNames/?ids[]=${franchiseIds.join('&ids[]=')}`)
    const names2 = response2.data.response

    const commerces = data.response.map((commerce: any) => {
      return {
        _id: commerce._id,
        name: commerce.financial.businessName,
        franchise: names2[commerce.franchiseId].name,
        createdAt: commerce.createdAt,
        status: commerce.status,
        state: commerce.financial.state
      }
    })

    const month = (query?.month != null ? query?.month : '01') as string
    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: `${month}01`, $lte: `${month}31` },
      transactionStatus: ETransactionStatus.APPROVED,
      tefStatus: { $in: [ETefStatus.APPROVED, ETefStatus.WARNING] },
      active: true
    }

    const aggregationPipeline = [
      {
        $match: filter
      },
      {
        $group: {
          _id: '$commerce',
          totalAmount: { $sum: '$Amount' }
        }
      },
      {
        $project: {
          _id: 1,
          totalAmount: 1
        }
      }
    ]

    const transactions: any[] = await TransactionModel.aggregate(aggregationPipeline)
    const transactionsCopy = JSON.parse(JSON.stringify(transactions))

    for (const commerce of commerces) {
      const totalAmount = transactionsCopy.find((transaction: any) => transaction._id === commerce._id)?.totalAmount ?? 0
      commerce.totalAmount = totalAmount
    }

    // ------------------- Construir archivo excel ----------------------------------------------------
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Report')

    const headerRow = worksheet.addRow(
      '_id,Comercio,Distribuidor,Fecha Alta,Status,Estado,Ventas'.split(',')
    )
    headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
    headerRow.eachCell((cell: any) => { cell.border = borderStyle })
    headerRow.font = { bold: true }
    // Agrega tus datos
    commerces.forEach((doc: any, index: any) => {
      const row = worksheet.addRow(Object.values(doc))
      row.eachCell((cell: any) => { cell.border = borderStyle })
    })

    const columnHeaders = '_id,Comercio,Distribuidor,Fecha Alta,Status,Estado,Ventas'.split(',')

    columnHeaders.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1)
      const headerLength = header.length
      const columnWidth = Math.max(headerLength + 4, 10)
      column.width = columnWidth
      column.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      })
    })

    const excelBuffer = await workbook.xlsx.writeBuffer()
    return { file: excelBuffer, fileName: 'Reporte Mensual comercios.xlsx' }
  }

  async getMonthlyReport1 (query: any, locals: any): Promise<any> {
    const { data } = await appProfilesInstance.get('/user/backoffice/getActiveUsers')

    const franchiseIds = [...new Set(data.response.map((commerce: any) => String(commerce.franchiseId)))]
    const response2 = await appProfilesInstance.get(`franchise/backoffice/getFranchiseNames/?ids[]=${franchiseIds.join('&ids[]=')}`)
    const names2 = response2.data.response

    let commerces = data.response.map((commerce: any) => {
      return {
        _id: commerce._id,
        name: commerce.financial.businessName,
        franchise: names2[commerce.franchiseId].name,
        createdAt: commerce.createdAt,
        status: commerce.status,
        state: commerce.financial.state,
        accountType: commerce.accountType
      }
    })

    const month = (query?.month != null ? query?.month : '01') as string
    const filter: FilterQuery<ITransaction> = {
      'Transaction Date': { $gte: `${month}01`, $lte: `${month}31` },
      transactionStatus: { $in: [ETransactionStatus.APPROVED, ETransactionStatus.DECLINED] },
      active: true
    }

    const aggregationPipeline = [
      {
        $match: filter
      },
      {
        $group: {
          _id: '$commerce',
          totalAmountApproved: {
            $sum: { $cond: [{ $eq: ['$transactionStatus', ETransactionStatus.APPROVED] }, '$Amount', 0] }
          },
          totalRecordsApproved: {
            $sum: { $cond: [{ $eq: ['$transactionStatus', ETransactionStatus.APPROVED] }, 1, 0] }
          },
          totalRecordsDeclined1: {
            $sum: {
              $cond: [
                { $in: ['$ISO CODE RESPONSE', ['01', '05']] },
                1,
                0
              ]
            }
          },
          totalAmountDeclined1: {
            $sum: {
              $cond: [
                { $in: ['$ISO CODE RESPONSE', ['01', '05']] },
                { $cond: [{ $eq: ['$transactionStatus', ETransactionStatus.DECLINED] }, '$Amount', 0] },
                0
              ]
            }
          },
          totalAmountDeclined2: {
            $sum: {
              $cond: [
                { $in: ['$ISO CODE RESPONSE', ['01', '05']] },
                0,
                { $cond: [{ $eq: ['$transactionStatus', ETransactionStatus.DECLINED] }, '$Amount', 0] }
              ]
            }
          },
          totalAmountDeclined: {
            $sum: {
              $cond: [
                { $eq: ['$transactionStatus', ETransactionStatus.DECLINED] },
                '$Amount',
                0
              ]
            }
          },
          totalRecordsDeclined2: {
            $sum: {
              $cond: [
                { $in: ['$ISO CODE RESPONSE', ['01', '05']] },
                0,
                { $cond: [{ $eq: ['$transactionStatus', ETransactionStatus.DECLINED] }, 1, 0] }
              ]
            }
          },
          totalRecordsDeclined: {
            $sum: {
              $cond: [
                { $eq: ['$transactionStatus', ETransactionStatus.DECLINED] },
                1,
                0
              ]
            }
          },
          totalRecords: { $sum: 1 },
          totalAmount: { $sum: '$Amount' }
        }
      },
      {
        $project: {
          _id: 1,
          totalAmount: 1,
          totalAmountApproved: 1,
          totalAmountDeclined: 1,
          totalAmountDeclined1: 1,
          totalAmountDeclined2: 1,

          totalRecords: 1,
          totalRecordsApproved: 1,
          totalRecordsDeclined: 1,
          totalRecordsDeclined1: 1,
          totalRecordsDeclined2: 1
        }
      }
    ]

    const transactions: any[] = await TransactionModel.aggregate(aggregationPipeline)
    const transactionsCopy = JSON.parse(JSON.stringify(transactions))

    for (const commerce of commerces) {
      const totalAmount = transactionsCopy.find((transaction: any) => transaction._id === commerce._id)?.totalAmount ?? 0
      const totalAmountApproved = transactionsCopy.find((transaction: any) => transaction._id === commerce._id)?.totalAmountApproved ?? 0
      const totalAmountDeclined1 = transactionsCopy.find((transaction: any) => transaction._id === commerce._id)?.totalAmountDeclined1 ?? 0
      const totalAmountDeclined2 = transactionsCopy.find((transaction: any) => transaction._id === commerce._id)?.totalAmountDeclined2 ?? 0
      const totalAmountDeclined = transactionsCopy.find((transaction: any) => transaction._id === commerce._id)?.totalAmountDeclined ?? 0

      const totalRecords = transactionsCopy.find((transaction: any) => transaction._id === commerce._id)?.totalRecords ?? 0
      const totalRecordsApproved = transactionsCopy.find((transaction: any) => transaction._id === commerce._id)?.totalRecordsApproved ?? 0
      const totalRecordsDeclined = transactionsCopy.find((transaction: any) => transaction._id === commerce._id)?.totalRecordsDeclined ?? 0
      const totalRecordsDeclined1 = transactionsCopy.find((transaction: any) => transaction._id === commerce._id)?.totalRecordsDeclined1 ?? 0
      const totalRecordsDeclined2 = transactionsCopy.find((transaction: any) => transaction._id === commerce._id)?.totalRecordsDeclined2 ?? 0
      commerce.totalAmount = totalAmount
      commerce.totalAmountApproved = totalAmountApproved
      commerce.totalAmountDeclined = totalAmountDeclined
      commerce.totalAmountDeclined1 = totalAmountDeclined1
      commerce.totalAmountDeclined2 = totalAmountDeclined2
      commerce.totalRecords = totalRecords
      commerce.totalRecordsApproved = totalRecordsApproved
      commerce.totalRecordsDeclined = totalRecordsDeclined
      commerce.totalRecordsDeclined1 = totalRecordsDeclined1
      commerce.totalRecordsDeclined2 = totalRecordsDeclined2

      const terminals = await TerminalModel.find({ commerce: commerce._id })
      commerce.terminals = terminals.map((x: ITerminal) => x.serialNumber).join(' / ')
      if (terminals.length === 0) commerce.terminals = '-'

      const lastTransaction = await TransactionModel.findOne({ commerce: commerce._id }).sort({ createdAt: -1 })
      commerce.lastTransaction = lastTransaction?.['Transaction Date'] ?? '-'
    }

    commerces = commerces.map((commerce: any) => {
      const { accountType, ...rest } = commerce
      return {
        ...rest,
        accountType
      }
    })

    // ------------------- Construir archivo excel ----------------------------------------------------
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Report')

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'aaaaaa' } },
      left: { style: 'thin', color: { argb: 'aaaaaa' } },
      bottom: { style: 'thin', color: { argb: 'aaaaaa' } },
      right: { style: 'thin', color: { argb: 'aaaaaa' } }
    }

    const headerStyle: ExcelJS.FillPattern = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'c3f7ef' }
    }

    worksheet.mergeCells(1, 1, 1, 6)
    worksheet.mergeCells(1, 7, 1, 11)
    worksheet.getCell(1, 7).value = 'Monto'
    worksheet.getCell(1, 7).fill = headerStyle
    worksheet.getCell(1, 7).border = borderStyle
    worksheet.getCell(1, 7).font = { bold: true }
    worksheet.getCell(1, 7).alignment = { horizontal: 'center', vertical: 'middle' }

    worksheet.mergeCells(1, 12, 1, 16)
    worksheet.getCell(1, 12).value = 'N° de ventas'
    worksheet.getCell(1, 12).fill = headerStyle
    worksheet.getCell(1, 12).border = borderStyle
    worksheet.getCell(1, 12).font = { bold: true }

    const headerRow = worksheet.addRow(
      '_id,Comercio,Distribuidor,Fecha Alta,Status,Estado,Total,Aprobadas,Declinadas,(01 y 05),(Otros),Total,Aprobadas,Declinadas,(01 y 05),(Otros),Terminales,lastTxDate,AccType'.split(',')
    )
    headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
    headerRow.eachCell((cell: any) => { cell.border = borderStyle })
    headerRow.font = { bold: true }
    // Agrega tus datos
    commerces.forEach((doc: any, index: any) => {
      const row = worksheet.addRow(Object.values(doc))
      row.eachCell((cell: any) => { cell.border = borderStyle })
    })

    const columnHeaders = '_id,Comercio,Distribuidor,Fecha Alta,Status,Estado,Total,Aprobadas,Declinadas,(01 y 05),(Otros),Total,Aprobadas,Declinadas,(01 y 05),(Otros),Terminales,lastTxDate,AccType'.split(',')

    columnHeaders.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1)
      const headerLength = header.length
      const columnWidth = Math.max(headerLength + 2, 10)
      column.width = columnWidth
      column.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      })
    })

    worksheet.getCell(1, 7).alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getCell(1, 12).alignment = { horizontal: 'center', vertical: 'middle' }

    const excelBuffer = await workbook.xlsx.writeBuffer()
    return { file: excelBuffer, fileName: 'Reporte Mensual comercios.xlsx' }
  }

  async getMonthlyReport2 (query: any, locals: any): Promise<any> {
    const startMonth = (query?.startMonth != null ? query?.startMonth : '0000') as string
    const endMonth = (query?.endMonth != null ? query?.endMonth : '9999') as string
    // Se obtiene la lista de comercios activos
    const { data } = await appProfilesInstance.get('/user/backoffice/getActiveUsers')

    const franchiseIds = [...new Set(data.response.map((commerce: any) => String(commerce.franchiseId)))]
    const response2 = await appProfilesInstance.get(`franchise/backoffice/getFranchiseNames/?ids[]=${franchiseIds.join('&ids[]=')}`)
    const names2 = response2.data.response

    // Se crea la primera versión de la lista con los campos del comercio y el distribuidor
    const commerces = data.response.map((commerce: any) => {
      return [
        {
          _id: commerce._id,
          name: commerce.financial.businessName,
          afiliation: commerce.afiliateNumberEglobalTpv,
          afiliationType: commerce.afiliateNumberEglobalTpv === '4513993' ? 'AGREGADOR' : 'NATURAL',
          franchise: names2[commerce.franchiseId].name,
          createdAt: commerce.createdAt.replace(/T.*/, ''),
          status: commerce.status,
          state: commerce.financial.state
        },
        {
          _id: commerce._id,
          name: commerce.financial.businessName,
          afiliation: commerce.afiliateNumberEglobalEcom,
          afiliationType: commerce.afiliateNumberEglobalEcom === '4513996' ? 'AGREGADOR' : 'NATURAL',
          franchise: names2[commerce.franchiseId].name,
          createdAt: commerce.createdAt.replace(/T.*/, ''),
          status: commerce.status,
          state: commerce.financial.state
        }
      ]
    }).flat().sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt))

    const filter: FilterQuery<ITransaction> = {
      transactionStatus: ETransactionStatus.APPROVED,
      'Transaction Date': { $gte: `${startMonth}01`, $lte: `${endMonth}31` },
      // tefStatus: ETefStatus.APPROVED,
      active: true
    }

    const aggregationPipeline = [
      {
        $match: filter
      },
      {
        $addFields: {
          month: {
            $substr: ['$Transaction Date', 0, 4]
          }
        }
      },
      {
        $group: {
          _id: {
            commerce: '$commerce',
            affiliation_id: '$ID Afiliate',
            month: '$month'
          },
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$Amount' },
          processorComission: { $sum: '$processorComission' },
          franchiseComission: { $sum: '$franchiseComission' },
          lklpayComission: { $sum: '$lklpayComission' },
          fixedComission: { $sum: '$fixedComission' },
          concatField: {
            $first: {
              $concat: ['$month', '$commerce', '$ID Afiliate', { $dateToString: { date: '$createdAt', format: '%Y-%m-%d' } }]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalTransactions: 1,
          totalAmount: 1,
          processorComission: 1,
          franchiseComission: 1,
          lklpayComission: 1,
          fixedComission: 1,
          month: '$_id.month',
          concatField: 1
        }
      },
      {
        $sort: {
          concatField: 1
        }
      }
    ]

    const transactions: any[] = await TransactionModel.aggregate(aggregationPipeline as any)
    const transactionsCopy = JSON.parse(JSON.stringify(transactions))
    const months: any[] = [...new Set(transactionsCopy.map((line: any) => String(line.month)))].sort((a: any, b: any) => a.toLowerCase().localeCompare(b.toLowerCase()))
    console.log(months)

    // Se crea un elemento por comercio por mes
    const commercesByMonth: any[] = []
    for (const month of months) {
      const monthArray = []
      for (const commerce of commerces) {
        const index = transactionsCopy.findIndex((transaction: any) => (
          String(transaction._id.commerce) === String(commerce._id) &&
          String(transaction._id.affiliation_id) === String(commerce.afiliation) &&
          String(transaction._id.month) === String(month)
        ))
        let transactionsFound: any = {}
        if (index !== -1) {
          transactionsFound = transactionsCopy[index]
          transactionsCopy.splice(index, 1)
        }
        const commerceByMonth = commerce
        commerceByMonth.totalTransactions = transactionsFound?.totalTransactions ?? 0
        commerceByMonth.totalAmount = transactionsFound?.totalAmount ?? 0
        commerceByMonth.processorComission = transactionsFound?.processorComission ?? 0
        commerceByMonth.franchiseComission = transactionsFound?.franchiseComission ?? 0
        commerceByMonth.lklpayComission = transactionsFound?.lklpayComission ?? 0
        commerceByMonth.fixedComission = transactionsFound?.fixedComission ?? 0
        commerceByMonth.month = month
        monthArray.push(JSON.parse(JSON.stringify(commerceByMonth)))
      }
      commercesByMonth.push(monthArray)
    }
    console.log(commercesByMonth.flat().length)
    console.log(commerces.length)

    // Se juntan los elementos de cada mes por comercio en un solo elemento (linea)
    const concatCommercesByMonth = []
    const commerceCount = commercesByMonth[0].length
    for (let j = 0; j < commerceCount; j++) {
      const toConcatObjs: any[] = []
      for (let k = 0; k < months.length; k++) {
        const obj = commercesByMonth[k][j]
        if (k > 0) {
          delete obj._id; delete obj.name; delete obj.afiliation; delete obj.franchise; delete obj.createdAt; delete obj.status; delete obj.state; delete obj.afiliationType
        }
        toConcatObjs.push(JSON.parse(JSON.stringify(obj)))
      }
      concatCommercesByMonth.push(concatObjs(toConcatObjs))
    }

    // ------------------- Construir archivo excel ----------------------------------------------------
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Report', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 2 }]
    })

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'aaaaaa' } },
      left: { style: 'thin', color: { argb: 'aaaaaa' } },
      bottom: { style: 'thin', color: { argb: 'aaaaaa' } },
      right: { style: 'thin', color: { argb: 'aaaaaa' } }
    }

    const headerStyle: ExcelJS.FillPattern = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'c3f7ef' }
    }

    const offset = 9
    const detN = 7 // detail cells quantity
    console.log(offset, detN)
    for (let j = 0; j < months.length; j++) {
      const startCol = offset + j * detN
      console.log(1, startCol, 1, startCol + detN - 1)
      worksheet.mergeCells(1, startCol, 1, startCol + detN - 1)
      worksheet.getCell(1, startCol).value = convertirAMesYAnio(months[j])
      worksheet.getCell(1, startCol).fill = headerStyle
      worksheet.getCell(1, startCol).border = borderStyle
      worksheet.getCell(1, startCol).font = { bold: true }
      worksheet.getCell(1, startCol).alignment = { horizontal: 'center', vertical: 'middle' }
    }

    // Headers 1
    const columnHeaders = ('_id,Comercio      ,Afiliación  ,Tasa    ,Distribuidor      ,Fecha Alta,Status,Estado    ' + ',Ventas,Monto    ,BBVA  ,Distro  ,Lklpay ,Ecom ,Mes'.repeat(months.length)).split(',')
    const headerRow = worksheet.addRow(
      columnHeaders
    )
    headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
    headerRow.eachCell((cell: any) => { cell.border = borderStyle })
    headerRow.font = { bold: true }

    const alternateColors = ['FFFFFF', 'E0E0E0']
    let currentCommerce: string = ''
    let colorIndex = 0

    concatCommercesByMonth.forEach((doc: any, index: any) => {
      const row = worksheet.addRow(Object.values(doc))
      row.eachCell((cell: any) => { cell.border = borderStyle })

      const backgroundColor = alternateColors[colorIndex % alternateColors.length]
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: backgroundColor } }
      row.eachCell((cell: any) => { cell.border = borderStyle })
      if (doc._id1 === currentCommerce) colorIndex++
      else currentCommerce = doc._id1
    })

    columnHeaders.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1)
      const headerLength = header.length
      const columnWidth = Math.max(headerLength + 1, 6)
      column.width = columnWidth
      column.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      })
    })

    for (let j = 0; j < months.length; j++) {
      worksheet.getCell(1, offset + j * detN).alignment = { horizontal: 'center', vertical: 'middle' }
    }

    const excelBuffer = await workbook.xlsx.writeBuffer()
    return { file: excelBuffer, fileName: 'Reporte Mensual comercios.xlsx' }
  }

  async getMonthlyReport3 (query: any, locals: any): Promise<any> {
    const startMonth = (query?.startMonth != null ? query?.startMonth : '0000') as string
    const endMonth = (query?.endMonth != null ? query?.endMonth : '9999') as string
    // Se obtiene la lista de comercios activos
    const { data } = await appProfilesInstance.get('/user/backoffice/getActiveUsers')

    const franchiseIds = [...new Set(data.response.map((commerce: any) => String(commerce.franchiseId)))]
    const response2 = await appProfilesInstance.get(`franchise/backoffice/getFranchiseNames/?ids[]=${franchiseIds.join('&ids[]=')}`)
    const names2 = response2.data.response

    // Se crea la primera versión de la lista con los campos del comercio y el distribuidor
    const commerces = data.response.map((commerce: any) => {
      return {
        _id: commerce._id,
        name: commerce.financial.businessName,
        franchise: names2[commerce.franchiseId].name,
        status: commerce.status
      }
    })

    const filter: FilterQuery<ITransaction> = {
      transactionStatus: ETransactionStatus.APPROVED,
      'Transaction Date': { $gte: `${startMonth}01`, $lte: `${endMonth}31` },
      active: true
    }

    const aggregationPipeline = [
      {
        $match: filter
      },
      {
        $group: {
          _id: {
            commerce: '$commerce'
          },
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$Amount' },
          totalComission: { $sum: '$comission' },
          processorComission: { $sum: '$processorComission' },
          franchiseComission: { $sum: '$franchiseComission' },
          lklpayComission: { $sum: '$lklpayComission' },
          fixedComission: { $sum: '$fixedComission' }
        }
      },
      {
        $project: {
          _id: 1,
          totalTransactions: 1,
          totalAmount: 1,
          totalComission: 1,
          processorComission: 1,
          franchiseComission: 1,
          lklpayComission: 1,
          fixedComission: 1
        }
      }
    ]

    const transactions: any[] = await TransactionModel.aggregate(aggregationPipeline as any)
    const transactionsCopy = JSON.parse(JSON.stringify(transactions))

    // console.log('tcopy', transactionsCopy)

    const rowArray = []

    for (const commerce of commerces) {
      const index = transactionsCopy.findIndex((transaction: any) => (
        String(transaction._id.commerce) === String(commerce._id)
      ))

      let transactionsFound: any = {}
      if (index !== -1) {
        transactionsFound = transactionsCopy[index]
        transactionsCopy.splice(index, 1)
      }

      // commerce.totalTransactions = transactionsFound?.totalTransactions ?? 0
      const totalAmount = transactionsFound?.totalAmount ?? 0
      const totalComission = transactionsFound?.totalComission ?? 0
      const processorComission = transactionsFound?.processorComission ?? 0
      const franchiseComission = transactionsFound?.franchiseComission ?? 0

      const margin = totalComission - processorComission
      const operativeCost = 0

      const rowIndex: number = rowArray.length + 1

      rowArray.push({
        name: commerce.name,
        totalAmount,
        processorComission,
        processorRate: { formula: `IFERROR(C${rowIndex + 1}/B${rowIndex + 1}, "-")` },
        // processorRate: totalAmount !== 0 ? (processorComission / totalAmount) : 0,
        totalComission,
        totalRate: { formula: `IFERROR(E${rowIndex + 1}/B${rowIndex + 1}, "-")` },
        // totalRate: totalAmount !== 0 ? (totalComission / totalAmount) : 0,
        margin,
        operativeCost,
        utility: margin - operativeCost,
        franchise: commerce.franchise,
        franchiseRate: { formula: `IFERROR(L${rowIndex + 1}/G${rowIndex + 1}, "-")` },
        // franchiseRate: margin !== 0 ? (franchiseComission / margin) : 0,
        franchiseComission
      })
    }
    // console.log(rowArray)

    // ------------------- Construir archivo excel ----------------------------------------------------
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Report', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    })

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'aaaaaa' } },
      left: { style: 'thin', color: { argb: 'aaaaaa' } },
      bottom: { style: 'thin', color: { argb: 'aaaaaa' } },
      right: { style: 'thin', color: { argb: 'aaaaaa' } }
    }

    const headerStyle: ExcelJS.FillPattern = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'dce6f1' }
    }

    // Headers 1
    const columnHeaders = ('COMERCIO      ,VENTAS            ,BBVA          ,Tasa BBVA,Comision Cobrada sin iva,Tasa Cobrada,Margen       ,Costo Operativo,UTILIDAD      ,DISTRIBUIDOR      ,COMISIÓN  ,DISTRIBUIDOR').split(',')
    const headerRow = worksheet.addRow(
      columnHeaders
    )
    headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
    headerRow.eachCell((cell: any) => { cell.border = borderStyle })
    headerRow.font = { bold: true }

    // const alternateColors = ['FFFFFF', 'E0E0E0']
    // let colorIndex = 0

    rowArray.forEach((doc: any, index: any) => {
      const row = worksheet.addRow(Object.values(doc))
      row.eachCell((cell: any) => { cell.border = borderStyle })
      // const backgroundColor = alternateColors[colorIndex % alternateColors.length]
      // row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: backgroundColor } }
      row.eachCell((cell: any) => { cell.border = borderStyle })
      // colorIndex++
    })

    worksheet.getColumn(4).numFmt = '0.00%' // Columna de Tasa BBVA
    worksheet.getColumn(6).numFmt = '0.00%' // Columna de Tasa Cobrada
    worksheet.getColumn(11).numFmt = '0.00%' // Columna de Comisión Distribuidor
    worksheet.getColumn(4).alignment = { horizontal: 'right', vertical: 'middle' }
    worksheet.getColumn(6).alignment = { horizontal: 'right', vertical: 'middle' }
    worksheet.getColumn(11).alignment = { horizontal: 'right', vertical: 'middle' }
    // Aplica formato de moneda
    worksheet.getColumn(2).numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)' // Columna de Ventas
    worksheet.getColumn(3).numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)' // Columna de BBVA
    worksheet.getColumn(5).numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)' // Columna de Comisión Cobrada sin IVA
    worksheet.getColumn(7).numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)' // Columna de Margen
    worksheet.getColumn(8).numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)' // Columna de Costo Operativo
    worksheet.getColumn(9).numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)' // Columna de Utilidad
    worksheet.getColumn(12).numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)' // Columna de Comisión Distribuidor

    columnHeaders.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1)
      const headerLength = header.length
      const columnWidth = Math.max(headerLength + 1, 6)
      column.width = columnWidth
      column.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      })
    })

    const excelBuffer = await workbook.xlsx.writeBuffer()
    return { file: excelBuffer, fileName: 'Reporte Mensual comercios.xlsx' }
  }

  async getTransactionVoucherPdf (transactionId: string): Promise<any> {
    const transaction = await TransactionModel.findOne({ _id: transactionId, active: true }).lean()
    if (transaction == null) throw new AppErrorResponse({ name: 'No se encontró la transacción', statusCode: 400 })
    let commerce

    try {
      commerce = await getCommerce(transaction.commerce, ['financial', 'commercial'])
    } catch (error) {}
    if (commerce == null) throw new AppErrorResponse({ name: 'No se encontró el comercio', statusCode: 400 })
    const pdfBuffer: Buffer = await createTxVoucherPdf(transaction, commerce)

    return { file: pdfBuffer, fileName: `${transactionId}.pdf` }
  }
}

const transactionReportService: TransactionReportService = new TransactionReportService()
export default transactionReportService
