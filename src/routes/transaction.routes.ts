import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
/* controllers */
import { transactionController } from '@controllers/transaction/transaction.controller'
/* middlewares */
import { adminAuthMiddleware, backofficeMiddleware, commerceMiddleware, franchiseMiddleware } from '@app/middlewares/auth.middleware'
import { validateReq } from '@app/middlewares/class-validation.middleware'
import { TpvBatchSettlementDto } from '@controllers/transaction/services/dtos/tpv-batch-settlement.dto'

class TransactionRoutes extends ServerRouter {
  constructor () {
    super()
    this.config()
  }

  config (): void {
    this.router.get('/', commerceMiddleware, transactionController.getTransactions as RequestHandler)
    this.router.get('/tef', transactionController.readTransactionsTEF as RequestHandler)
    this.router.get('/:date', commerceMiddleware, transactionController.getTransactionByDate as RequestHandler)
    this.router.get('/detail/:id', commerceMiddleware, transactionController.getTransaction as RequestHandler)
    this.router.get('/month/:date', commerceMiddleware, transactionController.getTransactionsByMonth as RequestHandler)
    this.router.post('/dateRange', commerceMiddleware, transactionController.getTransactionsByDateRange as RequestHandler)
    // this.router.post('/detail/:id/email', commerceMiddleware, transactionController.sendEmail as RequestHandler)
    this.router.get('/getTransactionById/:id', commerceMiddleware, transactionController.getTransactionsById as RequestHandler)
    this.router.get('/commerce/getPendingBalance', commerceMiddleware, transactionController.getPendingBalance as RequestHandler)

    this.router.get('/admin/to-disperse', adminAuthMiddleware, transactionController.getDispersableTransactions as RequestHandler)
    this.router.get('/admin/approvedAndCancelled', adminAuthMiddleware, transactionController.getApprovedAndCanceled as RequestHandler)
    this.router.get('/admin/getTransactionById', transactionController.getTransactionsByIdAdmin as RequestHandler)
    // ---------- TPV --------------
    this.router.get('/tpv/getTransactions', commerceMiddleware, transactionController.getTransactionsTpv as RequestHandler)
    this.router.get('/tpv/getTransactionsMobile', commerceMiddleware, transactionController.getTransactionsMobile as RequestHandler)
    this.router.get('/tpv/getTpvBatchSettlement', [commerceMiddleware, validateReq(TpvBatchSettlementDto, 'query')], transactionController.getTpvBatchSettlement as RequestHandler)
    this.router.get('/tpv/getTpvTransactionResume', commerceMiddleware, transactionController.getTpvTransactionResume as RequestHandler)

    this.router.get('/backoffice/getTransactions', [backofficeMiddleware], transactionController.getTransactionsBackoffice as RequestHandler)
    this.router.get('/backoffice/getTransactionById/:id', [backofficeMiddleware], transactionController.getTransactionsByIdBackoffice as RequestHandler)
    this.router.get('/backoffice/getPendingBalance', [backofficeMiddleware], transactionController.getCommercePendingBalanceBackoffice as RequestHandler)

    this.router.get('/backoffice/search', [backofficeMiddleware], transactionController.searchByBackoffice as RequestHandler)

    this.router.get('/franchise/getTransactions', franchiseMiddleware as RequestHandler, transactionController.getTransactionsFranchise as RequestHandler)
    this.router.get('/franchise/getTransactionsGroupedByMonth', franchiseMiddleware as RequestHandler, transactionController.getTransactionsFranchiseGroupedByMonth as RequestHandler)

    this.router.get('/commerce/getTpvDispersableTransactions', commerceMiddleware, transactionController.getTpvDispersableTransactions as RequestHandler)
    this.router.get('/commerce/getAvailableTransactionsUrgentDeposit', commerceMiddleware, transactionController.getAvailableTransactionsUrgentDeposit as RequestHandler)

    // ---------- Reports ----------
    this.router.get('/report/transactionsReport', commerceMiddleware, transactionController.getTransactionsReport as RequestHandler)
    this.router.get('/backoffice/transactionsReport', [backofficeMiddleware], transactionController.getTransactionsReportBackoffice as RequestHandler)
    this.router.get('/backoffice/transactionsReport2', transactionController.getTransactionsReportBackoffice2 as RequestHandler)
    this.router.get('/backoffice/transactionsReport3', transactionController.getTransactionsReportBackoffice3 as RequestHandler)
    this.router.get('/backoffice/transactionsReport4', transactionController.getTransactionsReportBackoffice4 as RequestHandler)
    this.router.get('/backoffice/BackofficeCSVReport', transactionController.getBackofficeCSVReport as RequestHandler)
    this.router.get('/backoffice/franchisesReport', transactionController.getFranchisesReportBackoffice as RequestHandler)
    this.router.get('/backoffice/franchisesReport2', transactionController.getFranchisesReportBackoffice2 as RequestHandler)
    this.router.get('/backoffice/monthlyReport', /* [backofficeMiddleware], */ transactionController.getMonthlyReport as RequestHandler)
    this.router.get('/backoffice/monthlyReport1', /* [backofficeMiddleware], */ transactionController.getMonthlyReport1 as RequestHandler)
    this.router.get('/backoffice/monthlyReport2', /* [backofficeMiddleware], */ transactionController.getMonthlyReport2 as RequestHandler)
    this.router.get('/backoffice/monthlyReport3', /* [backofficeMiddleware], */ transactionController.getMonthlyReport3 as RequestHandler)

    this.router.get('/backoffice/voucher/:id', [backofficeMiddleware],transactionController.getVoucherPdf as RequestHandler)
    // ---------- Test -------------
    this.router.get('/test/test/test', transactionController.test as RequestHandler)
  }
}

const transactionRoutes: TransactionRoutes = new TransactionRoutes()
export default transactionRoutes.router
