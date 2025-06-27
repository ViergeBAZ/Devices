import { type Request, type Response } from 'express'
/* repo */
import { AppMongooseRepo } from '@app/repositories/mongoose'
/* services */
import transactionService from './services/transaction.service'
/* handlers */
import { appErrorResponseHandler, appSuccessResponseHandler } from '@app/handlers/response'
/* dtos */
import type { AppControllerResponse } from '@app/models/app.response'
import type { IGetPendingBalance, IGetTransaction, ITpvTokenPayload, IUserLocals } from './services/dtos/transaction.dto'
import transactionResumeService from './services/subservices/resume.service'
import transactionReportService from './services/subservices/report.service'
import { type ETransactionProcessor } from '@app/interfaces/transaction.interface'
import transactionServiceV2 from './services/transactionV2.service'
import { type TpvBatchSettlementDto } from './services/dtos/tpv-batch-settlement.dto'

class TransactionController {
  public async getTransactions (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetTransaction
    const locals = res.locals as IUserLocals
    try {
      const response = await transactionService.getTransactions(query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      console.log(error)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTransactionByDate (req: Request, res: Response): Promise<AppControllerResponse> {
    const date = req.params?.date
    const query = req.query as IGetTransaction
    const locals = res.locals as IUserLocals
    try {
      const response = await transactionService.getTransactionByDate(date, query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTransaction (req: Request, res: Response): Promise<AppControllerResponse> {
    const id = req.params?.id
    const locals = res.locals as IUserLocals
    try {
      const response = await transactionService.getTransaction(id, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      console.log(error)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTransactionsByMonth (req: Request, res: Response): Promise<AppControllerResponse> {
    const date = req.params?.date
    const query = req.query as IGetTransaction
    const locals = res.locals as IUserLocals
    const session = await AppMongooseRepo.startSession()

    try {
      session.startTransaction()
      const response = await transactionService.getTransactionsByMonth(date, query, locals)
      await session.commitTransaction()
      await session.endSession()
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTransactionsByDateRange (req: Request, res: Response): Promise<AppControllerResponse> {
    const locals = res.locals as IUserLocals
    const query = req.body as IGetTransaction
    try {
      const response = await transactionService.getTransactionsByDateRange(query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTransactionsById (req: Request, res: Response): Promise<AppControllerResponse> {
    const transactionId = req.params?.id
    const query = req.query as IGetTransaction
    const locals = res.locals as IUserLocals
    try {
      const response = await transactionService.getTransactionsById(transactionId, query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTransactionsByIdAdmin (req: Request, res: Response): Promise<AppControllerResponse> {
    const transactionId = req.query?.id
    try {
      const response = await transactionService.getTransactionsByIdAdmin(String(transactionId))
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getDispersableTransactions (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetTransaction
    try {
      const response = await transactionResumeService.getDispersableResume(query)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getApprovedAndCanceled (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetTransaction
    const locals = res.locals as IUserLocals
    try {
      const response = await transactionService.getApprovedAndCanceled(query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getPendingBalance (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetPendingBalance
    const locals = res.locals as IUserLocals
    try {
      const response = await transactionService.getPendingBalance(query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTransactionsTpv (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetTransaction
    const locals = res.locals as IUserLocals

    try {
      const response = await transactionService.getTransactionsTpv(query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTpvBatchSettlement (req: Request, res: Response): Promise<AppControllerResponse> {
    const locals = res.locals.user as ITpvTokenPayload

    const dto: TpvBatchSettlementDto = {
      serialNumber: locals.serialNumber,
      commerceId: locals.commerceId,
      beginDate: req.query.beginDate as string,
      endDate: req.query.endDate as string
    }

    try {
      const response = await transactionService.getTpvBatchSettlement(dto)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      console.log(error)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTpvTransactionResume (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query
    const locals = res.locals as IUserLocals
    try {
      const response = await transactionService.getTpvTransactionResume(query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      console.log(error)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTransactionsMobile (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetTransaction
    const locals = res.locals as IUserLocals
    try {
      const response = await transactionService.getTransactionsMobile(query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTransactionsFranchise (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetTransaction
    const locals = res.locals as IUserLocals
    try {
      const response = await transactionService.getTransactionsFranchise(query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      console.log(error)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTransactionsFranchiseGroupedByMonth (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetTransaction
    const locals = res.locals as IUserLocals
    try {
      const response = await transactionService.getTransactionsFranchiseGroupedByMonth(query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      console.log(error)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getAdvisorAmount (req: Request, res: Response): Promise<AppControllerResponse> {
    const body = req.body
    try {
      const response = await transactionService.getAdvisorAmount(body)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTpvDispersableTransactions (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetTransaction
    const locals = res.locals as IUserLocals
    try {
      const response = await transactionService.getTpvDispersableTransactions(query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getAvailableTransactionsUrgentDeposit (req: Request, res: Response): Promise<AppControllerResponse> {
    const locals = res.locals as IUserLocals
    try {
      const response = await transactionResumeService.getAvailableTransactionsUrgentDeposit(locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTransactionsBackoffice (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query as IGetTransaction
    const locals = res.locals as IUserLocals
    try {
      const response = await transactionService.getTransactionsBackoffice(query, locals)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTransactionsByIdBackoffice (req: Request, res: Response): Promise<AppControllerResponse> {
    const transactionId = req.params?.id
    try {
      const response = await transactionService.getTransactionsByIdBackoffice(transactionId)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async test (req: Request, res: Response): Promise<AppControllerResponse> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const response = transactionService.test()
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error: any) {
      console.log(error?.response)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getTransactionsReport (req: Request, res: Response): Promise<AppControllerResponse> {
    try {
      const query = req.query
      const locals = res.locals as IUserLocals
      const result = await transactionReportService.getTransactionsReport2(query, locals)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      return res.status(400).json(error)
    }
  }

  public async getTransactionsReportBackoffice (req: Request, res: Response): Promise<AppControllerResponse> {
    try {
      const query = req.query
      const result = await transactionReportService.getTransactionsReportBackoffice(query)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      return res.status(400).json(error)
    }
  }

  public async getTransactionsReportBackoffice2 (req: Request, res: Response): Promise<AppControllerResponse> {
    try {
      const query = req.query
      const result = await transactionReportService.getTransactionsReportBackoffice2(query)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      console.log(error)
      return res.status(400).json(error)
    }
  }

  public async getTransactionsReportBackoffice3 (req: Request, res: Response): Promise<AppControllerResponse> {
    try {
      const query = req.query
      const result = await transactionReportService.getTransactionsReportBackoffice3(query)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      console.log(error)
      return res.status(400).json(error)
    }
  }

  public async getTransactionsReportBackoffice4 (req: Request, res: Response): Promise<AppControllerResponse> {
    try {
      const query = req.query
      const result = await transactionReportService.getTransactionsReportBackoffice4(query)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      console.log(error)
      return res.status(400).json(error)
    }
  }

  public async getBackofficeCSVReport (req: Request, res: Response): Promise<AppControllerResponse> {
    try {
      const query = req.query
      const result = await transactionReportService.getBackofficeCSVReport(query)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      console.log(error)
      return res.status(400).json(error)
    }
  }

  public async getFranchisesReportBackoffice (req: Request, res: Response): Promise<AppControllerResponse> {
    const locals = res.locals; console.log(locals)
    try {
      const query = req.query
      const result = await transactionReportService.getFranchisesReportBackoffice(query)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      console.log(error)
      return res.status(400).json(error)
    }
  }

  public async getFranchisesReportBackoffice2 (req: Request, res: Response): Promise<AppControllerResponse> {
    const locals = res.locals; console.log(locals)
    try {
      const query = req.query
      const result = await transactionReportService.getFranchisesReportBackoffice2(query)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      console.log(error)
      return res.status(400).json(error)
    }
  }

  public async getMonthlyReport (req: Request, res: Response): Promise<AppControllerResponse> {
    const locals = res.locals; console.log(locals)
    try {
      const query = req.query
      const result = await transactionReportService.getMonthlyReport(query, locals)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      console.log(error)
      return res.status(400).json(error)
    }
  }

  public async getMonthlyReport1 (req: Request, res: Response): Promise<AppControllerResponse> {
    const locals = res.locals; console.log(locals)
    try {
      const query = req.query
      const result = await transactionReportService.getMonthlyReport1(query, locals)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      console.log(error)
      return res.status(400).json(error)
    }
  }

  public async getMonthlyReport2 (req: Request, res: Response): Promise<AppControllerResponse> {
    const locals = res.locals; console.log(locals)
    try {
      const query = req.query
      const result = await transactionReportService.getMonthlyReport2(query, locals)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      console.log(error)
      return res.status(400).json(error)
    }
  }

  public async getMonthlyReport3 (req: Request, res: Response): Promise<AppControllerResponse> {
    const locals = res.locals
    try {
      const query = req.query
      const result = await transactionReportService.getMonthlyReport3(query, locals)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      console.log(error)
      return res.status(400).json(error)
    }
  }

  public async getCommercePendingBalanceBackoffice (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query
    try {
      const response = await transactionService.getCommercePendingBalanceBackoffice(query)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      console.log(error)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async searchByBackoffice (req: Request, res: Response): Promise<AppControllerResponse> {
    const query = req.query
    try {
      const response = await transactionServiceV2.searchByBackoffice(query)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  // -----------------------------------------------------------------------------------------------

  public async readTransactionsTEF (req: Request, res: Response): Promise<AppControllerResponse> {
    try {
      const query = req.query as { processor: ETransactionProcessor }
      const response = await transactionService.readTransactionsTEF(query)
      const result = appSuccessResponseHandler('success', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getVoucherPdf (req: Request, res: Response): Promise<AppControllerResponse> {
    try {
      const id = req.params.id
      const result = await transactionReportService.getTransactionVoucherPdf(id)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      console.log(error)
      return res.status(400).json(error)
    }
  }

  // public async sendEmail (req: Request, res: Response): Promise<AppControllerResponse> {
  //   const id = req.params?.id
  //   const locals = res.locals as IUserLocals

  //   try {
  //     const response = await transactionService.sendEmail(id, locals)
  //     const result = appSuccessResponseHandler('success', response)
  //     return res.status(200).json(result)
  //   } catch (error) {
  //     const { statusCode, error: err } = appErrorResponseHandler(error)
  //     return res.status(statusCode).json(err)
  //   }
  // }
}

export const transactionController: TransactionController = new TransactionController()
