import { MongoServerError } from 'mongodb'
import { AxiosError } from 'axios'
import { AppErrorResponse, AppResponse } from '@app/models/app.response'
import type { IErrorHandlerResponse } from './dtos/error-handler.dto'
import { TokenExpiredError } from 'jsonwebtoken'

export function appErrorResponseHandler (error: unknown | any): IErrorHandlerResponse {
  const result = new AppResponse()

  if (error instanceof AppErrorResponse) {
    return { statusCode: error.statusCode, error }
  }

  if (error instanceof TokenExpiredError) {
    return { statusCode: 401, code: 'ACCESS_TOKEN_EXPIRED', error }
  }

  if (error instanceof MongoServerError) {
    result.code = error.code
    result.message = 'Error en la base de datos'
    return { statusCode: 500, error: result }
  }

  if (error instanceof AxiosError) {
    const axiosError = error?.response?.data
    console.log('Error axios:', axiosError?.statusCode, axiosError?.name)
    return { statusCode: error.status ?? 500, error: error.response?.data }
  }

  result.message = String(error)
  return { statusCode: 500, error: result }
}
