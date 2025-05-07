import { plainToInstance } from 'class-transformer'
import { validate, type ValidationError } from 'class-validator'
import { type Request, type Response, type NextFunction } from 'express'

const formatErrors = (errors: ValidationError[]): any => {
  return errors.map((error) => ({
    property: error.property,
    constraints: error.constraints,
    children: ((error.children?.length) != null && (error.children?.length) > 0) ? formatErrors(error.children) : undefined
  }))
}

export const validateReq = (dto: any, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dtoInstance = plainToInstance(dto, req[source])
    const errors = await validate(dtoInstance, { whitelist: true, forbidNonWhitelisted: true })

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors: formatErrors(errors) })
    }

    next()
  }
}
