import type * as ExcelJS from 'exceljs'

export const borderStyle: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'aaaaaa' } },
  left: { style: 'thin', color: { argb: 'aaaaaa' } },
  bottom: { style: 'thin', color: { argb: 'aaaaaa' } },
  right: { style: 'thin', color: { argb: 'aaaaaa' } }
}

export const headerStyle: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'c3f7ef' }
}

export const currencyFmt1 = '_-$* #,##0.00_-;_-$* (#,##0.00)_-;_-$* "-"??;_-@_-'
export const currencyFmt = '$#,##0.00;-$#,##0.00;"-";@'
