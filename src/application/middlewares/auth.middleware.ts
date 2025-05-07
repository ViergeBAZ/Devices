import { type Request, type Response, type NextFunction } from 'express'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response'
/* models */
import { AppErrorResponse } from '@app/models/app.response'
/* utils */
import { verifyBackofficeToken, verifyCommerceToken, verifyFranchiseToken } from '@app/utils/auth.util'
/* dtos */
import { type IBackofficeUserPayload, type IUserPayload } from '@app/dtos/auth.dto'
// import { getPermissions } from '@app/constants/security'

export function commerceMiddleware (req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization
    const sessionToken = authHeader?.split?.(' ')?.[1] ?? false

    if (typeof sessionToken === 'undefined' || sessionToken === false || sessionToken.trim() === '') {
      throw new AppErrorResponse({ statusCode: 400, name: 'Se requiere un token de acceso válido', isOperational: true })
    }

    const verified = verifyCommerceToken<IUserPayload>(sessionToken)
    res.locals.user = verified
    next()
  } catch (error) {
    console.log(error)
    const { statusCode, error: err } = appErrorResponseHandler(error)
    res.status(statusCode).json({ error: err })
  }
}

export async function backofficeMiddleware (req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    const sessionToken = authHeader?.split?.(' ')?.[1] ?? false

    if (typeof sessionToken === 'undefined' || sessionToken === false || sessionToken.trim() === '') {
      throw new AppErrorResponse({ statusCode: 400, name: 'Se requiere un token de acceso válido', isOperational: true })
    }

    const verified = verifyBackofficeToken<IBackofficeUserPayload>(sessionToken)
    res.locals.user = verified
    res.locals.token = sessionToken

    // ----------------- Manejo de roles ----------------
    // const modulePermissions = (await getPermissions()).find((p: any) => p.module === req.baseUrl)?.endpoints
    // console.log(modulePermissions)
    // const endpoint = modulePermissions?.find((e: any) => e.path === req.route.path)
    // if (endpoint != null) {
    //   const hasPermission = (endpoint.roles.includes(String(verified.role)) === true || endpoint?.roles.length === 0)
    //   if (!hasPermission) { throw new AppErrorResponse({ statusCode: 403, name: `Permisos insuficientes ${String(endpoint.path)} (${String(verified._id)})` }) }
    // }
    next()
  } catch (error) {
    const { statusCode, error: err } = appErrorResponseHandler(error)
    res.status(statusCode).json({ error: err })
  }
}

export async function franchiseMiddleware (req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    const sessionToken = authHeader?.split?.(' ')?.[1] ?? false

    if (typeof sessionToken === 'undefined' || sessionToken === false || sessionToken.trim() === '') {
      throw new AppErrorResponse({ statusCode: 400, name: 'Se requiere un token de acceso válido', isOperational: true })
    }

    const verified = verifyFranchiseToken<IUserPayload>(sessionToken)
    res.locals.user = verified
    res.locals.token = sessionToken
    next()
  } catch (error) {
    const { statusCode, error: err } = appErrorResponseHandler(error)
    res.status(statusCode).json({ error: err })
  }
}

export function adminAuthMiddleware (req: Request, res: Response, next: NextFunction): void {
  // TODO
  next()
}
