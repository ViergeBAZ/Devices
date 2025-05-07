import { TransactionModel } from '@app/repositories/mongoose/models/transaction.model'
import { getStringDate } from '@app/utils/date.util'
import { customLog } from '@app/utils/util.util'

class AppDispersionCronjob {
  async deleteSensitiveData (): Promise<typeof response> {
    const currentDate = new Date()
    const toDeleteDate = new Date(currentDate)
    toDeleteDate.setFullYear(currentDate.getFullYear() - 3)

    const toDeleteDateString = getStringDate(toDeleteDate)
    const result: any = await TransactionModel.find({ 'Transaction Date': { $lte: toDeleteDateString } })
    await TransactionModel.updateMany(
      { 'Transaction Date': { $lte: toDeleteDateString } },
      { $set: { 'Application PAN': '****************' } }
    )

    const response = `${result.length as string} documentos actualizados`
    customLog(response)
    return response
  }
}

export const appDispersionCronjob = new AppDispersionCronjob()
