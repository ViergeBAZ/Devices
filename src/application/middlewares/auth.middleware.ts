import { type Request, type Response, type NextFunction } from 'express'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response'
/* models */
import { AppErrorResponse } from '@app/models/app.response'
/* utils */
import { verifyAdvisorToken, verifyBackofficeToken, verifyCommerceToken, verifyFranchiseToken } from '@app/utils/auth.util'
/* dtos */
import { type IFranchiseTokenPayload, type IAdvisorTokenPayload, type IBackofficeUserTokenPayload, type IUserTokenPayload } from '@app/dtos/auth.dto'
import { customLog } from '@app/utils/util.util'
// import { getPermissions } from '@app/constants/security'

export function commerceMiddleware (req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization
    const sessionToken = authHeader?.split?.(' ')?.[1] ?? false

    if (typeof sessionToken === 'undefined' || sessionToken === false || sessionToken.trim() === '') {
      throw new AppErrorResponse({ statusCode: 400, name: 'Se requiere un token de acceso válido' })
    }

    const verified = verifyCommerceToken<IUserTokenPayload>(sessionToken)
    res.locals.user = verified
    next()
  } catch (error) {
    customLog(error)
    const { statusCode, error: err } = appErrorResponseHandler(error)
    res.status(statusCode).json({ error: err })
  }
}

export async function backofficeMiddleware (req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    const sessionToken = authHeader?.split?.(' ')?.[1] ?? false

    if (typeof sessionToken === 'undefined' || sessionToken === false || sessionToken.trim() === '') {
      throw new AppErrorResponse({ statusCode: 400, name: 'Se requiere un token de acceso válido' })
    }

    const verified = verifyBackofficeToken<IBackofficeUserTokenPayload>(sessionToken)
    res.locals.user = verified
    res.locals.token = sessionToken
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
      throw new AppErrorResponse({ statusCode: 400, name: 'Se requiere un token de acceso válido' })
    }

    const verified = verifyFranchiseToken<IFranchiseTokenPayload>(sessionToken)
    res.locals.user = verified
    res.locals.token = sessionToken
    next()
  } catch (error) {
    const { statusCode, error: err } = appErrorResponseHandler(error)
    res.status(statusCode).json({ error: err })
  }
}

export async function advisorMiddleware (req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    const sessionToken = authHeader?.split?.(' ')?.[1] ?? false

    if (typeof sessionToken === 'undefined' || sessionToken === false || sessionToken.trim() === '') {
      throw new AppErrorResponse({ statusCode: 400, name: 'Se requiere un token de acceso válido' })
    }

    const verified = verifyAdvisorToken<IAdvisorTokenPayload>(sessionToken)
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
