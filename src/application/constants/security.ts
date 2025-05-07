import { appBackofficeInstance } from '@app/repositories/axios'

export const tableMode = (process.env?.EXTERNAL_PERMISSION_TABLE === 'true') ? 'external' : 'local'

export async function getPermissions (): Promise<any> {
  if (tableMode === 'local') return localPermissionTable

  const { data } = await appBackofficeInstance.get('user/getPermissions?name=permissionsDevices')
  return data?.response?.object
}

export const localPermissionTable = [
  {
    module: '/api/transaction',
    endpoints: [
      { path: '/tef', roles: [] },
      { path: '/:date', roles: [] },
      { path: '/detail/:id', roles: [] },
      { path: '/month/:date', roles: [] },
      { path: '/dateRange', roles: [] },
      { path: '/detail/:id/email', roles: [] },
      { path: '/getTransactionById/:id', roles: [] },
      { path: '/commerce/getPendingBalance', roles: [] },
      { path: '/report/transactionsReport', roles: [] },

      { path: '/admin/to-disperse', roles: [] },
      { path: '/admin/approvedAndCancelled', roles: [] },
      { path: '/admin/getTransactionById', roles: [] },
      { path: '/tpv/getTransactions', roles: [] },

      { path: '/backoffice/getTransactions', roles: [] },
      { path: '/backoffice/getTransactionById/:id', roles: [] },
      { path: '/backoffice/transactionsReport', roles: ['1'] },
      { path: '/backoffice/transactionsReport2', roles: [] },
      { path: '/backoffice/transactionsReport3', roles: [] },

      { path: '/franchise/getTransactions', roles: [] },

      { path: '/commerce/getTpvDispersableTransactions', roles: [] },
      { path: '/commerce/getAvailableTransactionsUrgentDeposit', roles: [] }
    ]
  },
  {
    module: '/api/terminal',
    endpoints: [
      { path: '/updateTerminal', roles: [] },
      { path: '/assignTerminalFranchise', roles: [] },
      { path: '/assignTerminalCommerce', roles: [] },

      { path: '/generateOtp', roles: [] },
      { path: '/assignApiKeyWithOtp', roles: [] },
      { path: '/assignApiKey', roles: [] },
      { path: '/assignApiKey', roles: [] },
      { path: '/searchTerminals', roles: [] }
    ]
  },
  {
    module: '/api/simcard',
    endpoints: [
      { path: '/', roles: [] },
      { path: '/:id', roles: [] },
      { path: '/createMany', roles: [] },
      { path: '/assignSimcardFranchise', roles: [] },
      { path: '/assignSimcardCommerce', roles: [] }
    ]
  },
  {
    module: '/api/catalog',
    endpoints: [
      { path: '/terminalModels', roles: [] }
    ]
  }
]
