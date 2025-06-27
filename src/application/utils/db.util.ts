import { AppErrorResponse } from '@app/models/app.response'
import { appProfilesInstance } from '@app/repositories/axios'

export async function getCommerce<T extends string> (commerceId: string, fields: T[]): Promise<Record<T, any>> {
  const response = await appProfilesInstance.get(`user/backoffice/search?_id=${commerceId}&fields[]=${fields.join('&fields[]=')}`)
  const commerce = response?.data?.response?.[0]

  if (commerce == null) throw new AppErrorResponse({ name: 'No se encontró el comercio', statusCode: 404, isOperational: true })

  return commerce
}
