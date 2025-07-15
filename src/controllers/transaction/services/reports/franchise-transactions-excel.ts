import { borderStyle, currencyFmt, headerStyle } from '@app/constants/excel.constants'
import { ETransactionStatus, type ITransaction } from '@app/interfaces/transaction.interface'
import { appProfilesInstance } from '@app/repositories/axios'
import { translate } from '@app/utils/translate'
import { sumField } from '@app/utils/util.util'
import ExcelJS from 'exceljs'

export async function createFranchiseTxExcel (data: ITransaction[]): Promise<any> {
  const commerceIds = [...new Set(data.map((x: any) => String(x.commerce)))]
  const response = await appProfilesInstance.get(`user/backoffice/getCommercesInfo/?ids[]=${commerceIds.join('&ids[]=')}`)
  const names = response.data.response

  const mappedTransactions = data.map((transaction: any) => {
    return {
      amount: transaction.Amount,
      tip: transaction.tip,
      'Transaction Date': transaction['Transaction Date'],
      'Transaction Time': transaction['Transaction Time'],
      'ID Transaction': transaction['ID Transaction'],
      commerce: names?.[String(transaction.commerce)]?.name,
      type: transaction.type,
      'Card Type': translate(transaction['Card Type'], 'es'),
      scheme: transaction.scheme,
      transactionStatus: translate(transaction.transactionStatus, 'es'),
      depositStatus: translate(transaction.depositStatus, 'es'),
      serialNumber: transaction['IFD Serial Number'] ?? 'NA',
      authorization: transaction?.['MIT Fields']?.[0]?.[38] ?? 'NA',
      tasaComission: transaction.comission / transaction.Amount,
      last4Digits: '**' + (transaction['Application PAN'].slice(-4) as string)
    }
  })

  const approved = mappedTransactions.filter((transaction: any) => transaction.transactionStatus === translate(ETransactionStatus.APPROVED, 'es'))
  const notApproved = mappedTransactions.filter((transaction: any) => transaction.transactionStatus !== translate(ETransactionStatus.APPROVED, 'es'))

  const totals = {
    approved: [
      sumField(approved, 'amount'),
      sumField(approved, 'tip')
    ],
    notApproved: [
      sumField(notApproved, 'amount'),
      sumField(notApproved, 'tip')
    ]
  }

  // ------------------- Construir archivo excel ----------------------------------------------------
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Report')

  const columns = [
    { header: 'Monto', key: 'amount', width: 14, style: { numFmt: currencyFmt } },
    { header: 'Propina', key: 'tip', width: 8, style: { numFmt: currencyFmt } },
    { header: 'Fecha', key: 'Transaction Date', width: 10 },
    { header: 'Hora', key: 'Transaction Time', width: 10 },
    { header: 'ID de Transaccion', key: 'ID Transaction', width: 20 },
    { header: 'Comercio', key: 'commerce', width: 20 },
    { header: 'Tipo', key: 'type', width: 12 },
    { header: 'Tarjeta', key: 'Card Type', width: 12 },
    { header: 'Marca', key: 'scheme', width: 12 },
    { header: 'Estatus', key: 'transactionStatus', width: 12 },
    { header: 'Estado del depósito', key: 'depositStatus', width: 12 },
    { header: 'Número de Serie', key: 'serialNumber', width: 16 },
    { header: 'Auth', key: 'authorization', width: 10 },
    { header: 'Tasa', key: 'tasaComission', width: 10, style: { numFmt: '0.00%' } },
    { header: 'Tarjeta', key: 'last4Digits', width: 10 }
  ]

  worksheet.columns = columns

  mappedTransactions.forEach((transaction: any, index: any) => {
    const row = worksheet.addRow(transaction)
    row.eachCell((cell: any) => { cell.border = borderStyle })
  })

  const headerRow = worksheet.getRow(1)
  headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
  headerRow.eachCell((cell: any) => { cell.border = borderStyle })
  headerRow.font = { bold: true }

  worksheet.addRow([])
  worksheet.addRow([])
  const totalPreHeader = worksheet.addRow(['Total aprobadas'])
  const totalsHeader = worksheet.addRow('Monto,Propina'.split(','))
  const totalsRow = worksheet.addRow(totals.approved)
  totalPreHeader.eachCell((cell: any) => { cell.border = borderStyle })
  totalsHeader.eachCell((cell: any) => { cell.border = borderStyle })
  totalsHeader.eachCell((cell: any) => { cell.fill = headerStyle })
  totalsRow.eachCell((cell: any) => { cell.border = borderStyle })

  worksheet.addRow([])
  worksheet.addRow([])
  const total2PreHeader = worksheet.addRow(['Total canceladas / declinadas'])
  const totals2Header = worksheet.addRow('Monto,Propina'.split(','))
  const totals2Row = worksheet.addRow(totals.notApproved)
  total2PreHeader.eachCell((cell: any) => { cell.border = borderStyle })
  totals2Header.eachCell((cell: any) => { cell.border = borderStyle })
  totals2Header.eachCell((cell: any) => { cell.fill = headerStyle })
  totals2Row.eachCell((cell: any) => { cell.border = borderStyle })

  worksheet.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return buffer
}
