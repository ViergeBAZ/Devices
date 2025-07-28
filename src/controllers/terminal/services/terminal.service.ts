/* models */
import { TerminalModel } from '@app/repositories/mongoose/models'
import { AppErrorResponse } from '@app/models/app.response'
import { type ClientSession } from 'mongoose'
import type { IPostTerminal, IGetTerminalsQuery, IGetCountTerminal, IGetSearchTerminals } from './dtos/terminal.dto'
import { compareApiKey, compareOtp, generateApiKey, hashString } from '@app/utils/auth.util'
import { ETerminalLocation, ETerminalOtpStatus, type ITerminal } from '@app/interfaces/terminal.interface'
import { otpExpiresIn, otpLength, otpValidCharacters } from '@app/constants/auth.constants'
import { appProfilesInstance } from '@app/repositories/axios'
import { arrayToObject, customLog } from '@app/utils/util.util'
import { type UpdateTerminalDto } from './dtos/update-terminal.dto'
import { appSendEmail } from '@app/utils/mail.util'
import { resetTpvPasscodeTemplate } from '@app/templates/reset-tpv-passcode.template'
import { generateRandomString } from '@app/utils/string.util'
import { ObjectId } from 'mongodb'
import { getAdvisor, getCommerce, getCommercesByField } from '@app/utils/db.util'
class TerminalService {
  async getTerminals (query: IGetTerminalsQuery): Promise<typeof data> {
    if (query?.filter == null) throw new AppErrorResponse({ name: 'No se encontraron parametros', statusCode: 400 })
    const end = Number(query?.end ?? 0)
    const start = Number(query?.start ?? 0)
    const limit = (end !== 0) ? end - start : 10

    const filter = query.filter
    const count = await TerminalModel.count({ location: filter, active: true })

    const terminals = await TerminalModel.find({ location: filter, active: true }, undefined, {
      skip: start, limit
    }).select('serialNumber commerce status id name model')

    const commerceIds = [...new Set(terminals.map((terminal: any) => String(terminal.commerce)))]
    const response = await appProfilesInstance.get(`user/backoffice/getCommercesInfo/?ids[]=${commerceIds.join('&ids[]=')}`)
    const names = response.data.response

    const terminalsCopy = JSON.parse(JSON.stringify(terminals))
    for (const terminal of terminalsCopy) {
      terminal.commerceName = names?.[String(terminal.commerce)]?.name ?? '-'
    }
    const data = { count, terminals: terminalsCopy }
    return data
  }

  async getTerminalsFranchise (franchiseId: string, query: IGetTerminalsQuery): Promise<typeof data> {
    if (query?.filter == null) throw new AppErrorResponse({ name: 'No se encontraron parametros', statusCode: 400 })
    const end = Number(query?.end ?? 0)
    const start = Number(query?.start ?? 0)
    const limit = (end !== 0) ? end - start : 10

    const filter = query.filter
    const queryFilter = { location: filter, franchise: new ObjectId(franchiseId), active: true }
    const count = await TerminalModel.count(queryFilter)

    const terminals = await TerminalModel.find(queryFilter, undefined, {
      skip: start, limit
    }).select('serialNumber commerce status id name model')

    const resume = await TerminalModel.aggregate()
      .match(queryFilter)
      .group({ _id: '$name', total: { $sum: 1 } })
      .exec()

    const commerceIds = [...new Set(terminals.map((terminal: any) => String(terminal.commerce)))]
    const response = await appProfilesInstance.get(`user/backoffice/getCommercesInfo/?ids[]=${commerceIds.join('&ids[]=')}`)
    const names = response.data.response

    const terminalsCopy = JSON.parse(JSON.stringify(terminals))
    for (const terminal of terminalsCopy) {
      terminal.commerceName = names?.[String(terminal.commerce)]?.name ?? '-'
    }
    const data = { count, terminals: terminalsCopy, resume }
    return data
  }

  async getTerminalsAdvisor (advisorId: string, query: IGetTerminalsQuery): Promise<typeof data> {
    if (query?.filter == null) throw new AppErrorResponse({ name: 'No se encontraron parametros', statusCode: 400 })
    const end = Number(query?.end ?? 0)
    const start = Number(query?.start ?? 0)
    const limit = (end !== 0) ? end - start : 10

    const advisor = await getAdvisor(advisorId)

    const commerces = await getCommercesByField('franchiseId', advisor.franchiseId, ['_id', 'adviser', 'financial.businessName'])
    const filteredCommerces = commerces.filter(x => x.adviser == null || x.adviser === advisorId)
    const commerceIds = [...new Set(filteredCommerces.map((commerce: any) => String(commerce._id)))]
    const commercesObj = arrayToObject(filteredCommerces, '_id')

    const queryFilter = { location: query.filter, commerce: { $in: commerceIds }, active: true }
    const count = await TerminalModel.count(queryFilter)

    const terminals = await TerminalModel.find(queryFilter, undefined, {
      skip: start, limit
    }).select('serialNumber commerce status id name model')

    const terminalsCopy = JSON.parse(JSON.stringify(terminals))
    for (const terminal of terminalsCopy) {
      terminal.commerceName = commercesObj?.[String(terminal.commerce)]?.financial?.businessName ?? '-'
    }
    const data = { count, terminals: terminalsCopy }
    return data
  }

  async getTerminal (_id: string): Promise<typeof terminal> {
    if (typeof _id === 'undefined') throw new AppErrorResponse({ name: 'Faltó agregar ID para la terminal', statusCode: 400 })

    const terminal = await TerminalModel.findOne({ _id, active: true })
      .select('serialNumber commerce franchise branchId name model status location "ID Terminal" internalCommerceId active id imeiTerminal imeiTwoTerminal chipSerialNumber chipTwoSerialNumber operativeMode')

    if (terminal == null) throw new AppErrorResponse({ name: 'No se encontró la terminal', statusCode: 404 })

    const populated = (await this.populateResults([terminal]))[0]
    return populated
  }

  async getTerminalFranchise (franchiseId: string, _id: string): Promise<typeof terminal> {
    if (typeof _id === 'undefined') throw new AppErrorResponse({ name: 'Faltó agregar ID para la terminal', statusCode: 400 })

    const terminal = await TerminalModel.findOne({ _id, active: true, franchise: franchiseId })
      .select('serialNumber commerce franchise branchId name model status location "ID Terminal" internalCommerceId active id imeiTerminal imeiTwoTerminal chipSerialNumber chipTwoSerialNumber operativeMode')

    if (terminal == null) throw new AppErrorResponse({ name: 'No se encontró la terminal', statusCode: 404 })

    const populated = (await this.populateResults([terminal]))[0]
    return populated
  }

  async getTerminalAdvisor (advisorId: string, _id: string): Promise<typeof terminal> {
    const advisor = await getAdvisor(advisorId)

    const terminal = await TerminalModel.findOne({ _id, active: true, franchise: advisor.franchiseId })
      .select('serialNumber commerce franchise branchId name model status location "ID Terminal" internalCommerceId active id imeiTerminal imeiTwoTerminal chipSerialNumber chipTwoSerialNumber operativeMode')

    if (terminal == null) throw new AppErrorResponse({ name: 'No se encontró la terminal', statusCode: 404 })

    const populated = (await this.populateResults([terminal]))[0]
    return populated
  }

  async searchTerminals (query: IGetSearchTerminals): Promise<any> {
    const fieldToSearch = query?.field ?? ''
    const value: string = query?.value ?? ''
    const location = query?.location ?? /(?:)/i
    const limit: number = query?.limit ?? 10

    const searchableFields = ['serialNumber', 'name', 'location']
    if (!searchableFields.includes(fieldToSearch)) throw new AppErrorResponse({ name: 'Campo no válido para buscar', statusCode: 403 })

    const filter = {
      [fieldToSearch]: new RegExp('' + value, 'i'),
      location,
      active: true
    }

    const terminals = await TerminalModel.find(filter)
      .select({ serialNumber: 1, commerce: 1, franchise: 1, name: 1, model: 1, status: 1, location: 1, internalCommerceId: 1, active: 1, id: 1, imeiTerminal: 1, imeiTwoTerminal: 1, chipSerialNumber: 1, chipTwoSerialNumber: 1, branchId: 1, 'ID Terminal': 1 })
      .limit(limit)

    if (terminals.length === 0) throw new AppErrorResponse({ name: 'No se encontraron terminales', statusCode: 404 })

    const commerceIds = [...new Set(terminals.map(terminal => terminal.commerce))]
    const response = await appProfilesInstance.get(`user/backoffice/getCommercesInfo/?ids[]=${commerceIds.join('&ids[]=')}`)
    const names = response.data.response

    const response2 = await appProfilesInstance.get(`franchise/backoffice/getFranchiseNames/?ids[]=${commerceIds.join('&ids[]=')}`)
    const names2 = response2.data.response

    const terminalsCopy = JSON.parse(JSON.stringify(terminals))

    for (const terminal of terminalsCopy) {
      terminal.commerceInfo = {
        commerceName: names[String(terminal.commerce)]?.name,
        commerceInternalId: names[String(terminal.commerce)]?.internalId,
        commerceResponsible: names[String(terminal.commerce)]?.commerceResponsible
      }
      terminal.franchiseName = names2[String(terminal.franchise)]
    }

    return terminalsCopy
  }

  async searchByCommerce (query: any, locals: any): Promise<any> {
    const commerceId = locals.user._id
    const terminalsFound = await this.search({ ...query, commerce: commerceId })
    return terminalsFound
  }

  async searchByFranchise (query: any, locals: any): Promise<any> {
    const franchiseId = locals.user._id
    const terminalsFound = await this.search({ ...query, franchise: franchiseId })
    return terminalsFound
  }

  async search (query: any): Promise<any> {
    const { limit = 10, short, sortField, ...queryFields } = query

    const allowedFields = ['~serialNumber', 'name', 'location', 'franchise', 'commerce']
    for (const field in queryFields) {
      if (!allowedFields.includes(field)) throw new AppErrorResponse({ statusCode: 404, name: `Campo no permitido: ${field}` })
    }

    const filter: any = { active: true }
    const selection = 'serialNumber commerce franchise name model status location "ID Terminal" internalCommerceId active id imeiTerminal imeiTwoTerminal chipSerialNumber chipTwoSerialNumber'

    for (const field in queryFields) {
      const value = queryFields[field]
      if (Array.isArray(value)) filter[field] = { $in: value }
      else if (field.charAt(0) === '~') filter[field.substring(1)] = new RegExp('' + String(value), 'i')
      else filter[field] = value
    }

    const terminalsFound = await TerminalModel.find(filter).select(selection).limit(limit)
    if (terminalsFound.length === 0) return [] // throw new AppErrorResponse({ name: 'No se encontraron terminales', statusCode: 404 })
    return await this.populateResults(terminalsFound)
  }

  async populateResults (resultObj: any): Promise<any> {
    const terminals = JSON.parse(JSON.stringify(resultObj))
    if (terminals == null || terminals.length === 0) return terminals

    const commerceIds = [...new Set(terminals.map((terminal: ITerminal) => terminal.commerce))]
    const response = await appProfilesInstance.get(`user/backoffice/getCommercesInfo/?ids[]=${commerceIds.join('&ids[]=')}`)
    const commerces = response.data.response

    const franchiseIds = [...new Set(terminals.map((terminal: ITerminal) => terminal.franchise))]
    const response2 = await appProfilesInstance.get(`franchise/backoffice/getFranchiseNames/?ids[]=${franchiseIds.join('&ids[]=')}`)
    const franchises = response2.data.response

    const branchIds = [...new Set(terminals.map((terminal: ITerminal) => terminal.branchId))]
    const response3 = await appProfilesInstance.get(`branch/backoffice/getBranches/?branchIds[]=${branchIds.join('&branchIds[]=')}`)
    const branches = response3.data.response

    return terminals.map((x: ITerminal) => ({
      ...x,
      commerceName: commerces[String(x.commerce)]?.name,
      commerceInfo: {
        commerceName: commerces[String(x.commerce)]?.name,
        commerceInternalId: commerces[String(x.commerce)]?.internalId,
        commerceResponsible: commerces[String(x.commerce)]?.commerceResponsible
      },
      franchiseName: franchises[String(x.franchise)]?.name,
      branchName: branches[String(x.branchId)]?.branchName
    }))
  }

  async terminalCount (query: IGetCountTerminal): Promise<typeof count> {
    const count = await TerminalModel.aggregate()
      .match({ active: true })
      .group({ _id: '$name', locations: { $push: '$location' }, count: { $sum: 1 } })
      .lookup({ from: 'terminals', localField: '_id', foreignField: 'name', as: 'terminals' })
      .project({
        _id: 1,
        total: {
          $size: {
            $filter: {
              input: '$terminals',
              as: 'terminal',
              cond: {
                $eq: ['$$terminal.location', query.filter]
              }
            }
          }
        }
      })
      .exec()

    return count
  }

  async createTerminalFranchise (franchiseId: string, data: IPostTerminal, session: ClientSession): Promise<typeof response> {
    customLog(data)
    const exists = await TerminalModel.findOne({ serialNumber: data.serialNumber, active: true })
    if (exists != null) throw new AppErrorResponse({ name: `El numero de serie ya está ocupado ${String(exists._id)}`, statusCode: 409 })

    const terminal = new TerminalModel({ ...data, franchise: new ObjectId(franchiseId), location: ETerminalLocation.FRANCHISE })
    const savedTerminal = await terminal.save({ validateBeforeSave: true, session })
    const response = { created: true, terminal: savedTerminal }
    return response
  }

  async create (data: IPostTerminal, session: ClientSession): Promise<typeof response> {
    customLog(data)
    const exists = await TerminalModel.findOne({ serialNumber: data.serialNumber, active: true })
    if (exists != null) throw new AppErrorResponse({ name: `El numero de serie ya está ocupado ${String(exists._id)}`, statusCode: 409 })

    const terminal = new TerminalModel({ ...data })
    const savedTerminal = await terminal.save({ validateBeforeSave: true, session })
    const response = { created: true, terminal: savedTerminal }
    return response
  }

  async updateTerminalFranchise (franchiseId: string, body: UpdateTerminalDto, session: ClientSession): Promise<any> {
    const { _id, ...updateFields } = body
    body.franchise = franchiseId

    const allowedFields: Array<keyof UpdateTerminalDto> = [
      'name', 'serialNumber', 'warehouseManager', 'systemChargeResponsible',
      'arrivalTrackingGuide', 'parcelDistributor', 'arrivalDate', 'status',
      'pending', 'active', 'model', 'chipSerialNumber', 'chipTwoSerialNumber',
      'imeiTerminal', 'imeiTwoTerminal', 'commerce',
      'operativeMode'
    ]

    for (const field in updateFields) {
      if (!allowedFields.includes(field as keyof UpdateTerminalDto)) throw new AppErrorResponse({ statusCode: 403, name: `Campo no permitido: ${field}` })
    }

    const terminal = await TerminalModel.findOne({ _id, franchise: new ObjectId(franchiseId), active: true })
    if (terminal == null) throw new AppErrorResponse({ name: 'No se encontró la terminal', statusCode: 404 })
    const originalRecord = JSON.parse(JSON.stringify(terminal))

    // Update commerce
    if (body.commerce !== undefined && body.commerce !== originalRecord.commerce) {
      if (body.commerce === null) {
        terminal.location = ETerminalLocation.FRANCHISE
        terminal.commerce = undefined
      } else {
        const commerce = await getCommerce(body.commerce, ['franchiseId'])
        if (commerce.franchiseId !== String(terminal.franchise)) throw new AppErrorResponse({ name: 'No se puede asignar a este comercio', statusCode: 403 })
        terminal.location = ETerminalLocation.COMMERCE
        terminal.commerce = body.commerce as any
        terminal.branchId = undefined
        customLog(`Terminal asignada al comercio ${String(body.commerce)}\nSN: ${terminal.serialNumber}`)
      }
    }
    // Update branch
    if (body.branchId != null && body.branchId !== originalRecord.branchId) {
      const response = await appProfilesInstance.get(`branch/backoffice/search/?commerceId=${String(terminal.commerce)}&size=small`)
      const branches = response.data.response
      const branchIds: any[] = branches?.map((x: any) => x._id) ?? []
      if (!branchIds.includes(body.branchId)) throw new AppErrorResponse({ name: 'No se puede asignar a esta sucursal', statusCode: 403 })
      customLog(`Terminal asignada a la sucursal ${String(body.branchId)}`)
    }

    for (const field in updateFields) {
      const value = (updateFields as any)[field];
      (terminal as any)[field] = value
    }

    await terminal.save({ validateBeforeSave: true, validateModifiedOnly: true, session })
    return 'Success'
  }

  async updateTerminalAdvisor (advisorId: string, body: UpdateTerminalDto, session: ClientSession): Promise<any> {
    const { _id, ...updateFields } = body

    const allowedFields: Array<keyof UpdateTerminalDto> = [
      'branchId', 'commerce', 'operativeMode'
    ]

    for (const field in updateFields) {
      if (!allowedFields.includes(field as keyof UpdateTerminalDto)) throw new AppErrorResponse({ statusCode: 403, name: `Campo no permitido: ${field}` })
    }

    const terminal = await TerminalModel.findOne({ _id, active: true })
    if (terminal == null) throw new AppErrorResponse({ name: 'No se encontró la terminal', statusCode: 404 })
    const originalRecord = JSON.parse(JSON.stringify(terminal))

    const advisor = await getAdvisor(advisorId)
    if (advisor.franchiseId !== String(terminal.franchise)) throw new AppErrorResponse({ name: 'No se puede modificar esta terminal', statusCode: 403 })

    // Update commerce
    if (body.commerce !== undefined && body.commerce !== originalRecord.commerce) {
      if (body.commerce === null) {
        terminal.location = ETerminalLocation.FRANCHISE
        terminal.commerce = undefined
      } else {
        const commerce = await getCommerce(body.commerce, ['franchiseId'])
        if (commerce.franchiseId !== String(terminal.franchise)) throw new AppErrorResponse({ name: 'No se puede asignar a este comercio', statusCode: 403 })
        terminal.location = ETerminalLocation.COMMERCE
        terminal.commerce = body.commerce as any
        terminal.branchId = undefined
        customLog(`Terminal asignada al comercio ${String(body.commerce)}\nSN: ${terminal.serialNumber}`)
      }
    }
    // Update branch
    if (body.branchId != null && body.branchId !== originalRecord.branchId) {
      const response = await appProfilesInstance.get(`branch/backoffice/search/?commerceId=${String(terminal.commerce)}&size=small`)
      const branches = response.data.response
      const branchIds: any[] = branches?.map((x: any) => x._id) ?? []
      if (!branchIds.includes(body.branchId)) throw new AppErrorResponse({ name: 'No se puede asignar a esta sucursal', statusCode: 403 })
      customLog(`Terminal asignada a la sucursal ${String(body.branchId)}`)
    }

    for (const field in updateFields) {
      const value = (updateFields as any)[field];
      (terminal as any)[field] = value
    }

    await terminal.save({ validateBeforeSave: true, validateModifiedOnly: true, session })
    return 'Success'
  }

  async update (body: UpdateTerminalDto, session: ClientSession): Promise<any> {
    const { _id, ...updateFields } = body
    customLog('updateData', body)

    const allowedFields: Array<keyof UpdateTerminalDto> = [
      'name', 'serialNumber', 'warehouseManager', 'systemChargeResponsible',
      'arrivalTrackingGuide', 'parcelDistributor', 'arrivalDate', 'status',
      'pending', 'active', 'model', 'chipSerialNumber', 'chipTwoSerialNumber',
      'imeiTerminal', 'imeiTwoTerminal', 'branchId', 'commerce', 'franchise',
      'operativeMode'
    ]

    for (const field in updateFields) {
      if (!allowedFields.includes(field as keyof UpdateTerminalDto)) throw new AppErrorResponse({ statusCode: 403, name: `Campo no permitido: ${field}` })
    }

    const terminal = await TerminalModel.findOne({ _id, active: true })
    if (terminal == null) throw new AppErrorResponse({ name: 'No se encontró la terminal', statusCode: 404 })
    const originalRecord = JSON.parse(JSON.stringify(terminal))

    // Update franchise
    if (body.franchise !== undefined && body.franchise !== originalRecord.franchise) {
      terminal.location = (body.franchise !== null) ? ETerminalLocation.FRANCHISE : ETerminalLocation.WAREHOUSE
      terminal.franchise = body.franchise as any
      terminal.commerce = undefined
      terminal.branchId = undefined
    }
    // Update commerce
    if (body.commerce !== undefined && body.commerce !== originalRecord.commerce) {
      if (body.commerce === null) {
        terminal.location = (body.franchise !== null) ? ETerminalLocation.FRANCHISE : ETerminalLocation.WAREHOUSE
        terminal.commerce = undefined
      } else {
        const commerce = await getCommerce(body.commerce, ['franchiseId'])
        if (commerce.franchiseId !== String(terminal.franchise)) throw new AppErrorResponse({ name: 'No se puede asignar a este comercio', statusCode: 403 })
        terminal.location = ETerminalLocation.COMMERCE
        terminal.commerce = body.commerce as any
        terminal.branchId = undefined
        customLog(`Terminal asignada al comercio ${String(body.commerce)}\nSN: ${terminal.serialNumber}`)
      }
    }
    // Update branch
    if (body.branchId != null && body.branchId !== originalRecord.branchId) {
      const response = await appProfilesInstance.get(`branch/backoffice/search/?commerceId=${String(terminal.commerce)}&size=small`)
      const branches = response.data.response
      const branchIds: any[] = branches?.map((x: any) => x._id) ?? []
      if (!branchIds.includes(body.branchId)) throw new AppErrorResponse({ name: 'No se puede asignar a esta sucursal', statusCode: 403 })
      customLog(`Terminal asignada a la sucursal ${String(body.branchId)}`)
    }

    for (const field in updateFields) {
      const value = (updateFields as any)[field];
      (terminal as any)[field] = value
    }

    await terminal.save({ validateBeforeSave: true, validateModifiedOnly: true, session })
    return 'Success'
  }

  async resetApiKey (serialNumber: string, session: ClientSession): Promise<any> {
    const terminal = await TerminalModel.findOne({ serialNumber, active: true, pending: false })
    if (terminal == null) throw new AppErrorResponse({ name: 'Terminal no encontrada', statusCode: 404 })

    const { apiKey, hashedApiKey } = await generateApiKey()
    // Actualizar el registro de la terminal con la API Key hasheada
    terminal.apiKey = hashedApiKey
    terminal.location = ETerminalLocation.COMMERCE
    const data = await terminal.save({ validateBeforeSave: true, validateModifiedOnly: true, session })

    return { apiKey, data }
  }

  async tpvLogin (serialNumber: string, apiKey: string): Promise<any> {
    const terminal = await TerminalModel.findOne({ serialNumber, active: true, pending: false })
    if (terminal == null) throw new AppErrorResponse({ name: 'Terminal no encontrada', statusCode: 404 })

    const result = compareApiKey(apiKey, terminal.apiKey)
    if (!result) return { result }

    return {
      result,
      commerce: terminal.commerce,
      branchId: terminal.branchId,
      internalCommerceId: terminal.internalCommerceId,
      terminalId: terminal.id,
      operativeMode: terminal.operativeMode
    }
  }

  async generateOtp (serialNumber: string): Promise<any> {
    const terminal = await TerminalModel.findOne({ serialNumber, active: true, pending: false })
    if (terminal == null) {
      throw new AppErrorResponse({ name: 'Terminal no encontrada / en proceso de asignación', statusCode: 404 })
    }

    const currentTimestamp = Date.now()
    const otpTimestamp = new Date(currentTimestamp + otpExpiresIn)
    const otp = generateRandomString(otpLength, otpValidCharacters)

    terminal.otpCode = hashString(otp)
    terminal.otpExpiresAt = otpTimestamp.toISOString()
    terminal.otpStatus = ETerminalOtpStatus.PENDING
    await terminal.save({ validateBeforeSave: true, validateModifiedOnly: true })
    return { otp }
  }

  async generateOtpFranchise (franchiseId: string, serialNumber: string): Promise<any> {
    const terminal = await TerminalModel.findOne({ serialNumber, active: true, pending: false, franchise: franchiseId })
    if (terminal == null) {
      throw new AppErrorResponse({ name: 'Terminal no encontrada / en proceso de asignación', statusCode: 404 })
    }

    const currentTimestamp = Date.now()
    const otpTimestamp = new Date(currentTimestamp + otpExpiresIn)
    const otp = generateRandomString(otpLength, otpValidCharacters)

    terminal.otpCode = hashString(otp)
    terminal.otpExpiresAt = otpTimestamp.toISOString()
    terminal.otpStatus = ETerminalOtpStatus.PENDING
    await terminal.save({ validateBeforeSave: true, validateModifiedOnly: true })
    return { otp }
  }

  async assignApiKeyWithOtp (commerceInternalId: string, serialNumber: string, otp: string): Promise<{ apiKey: string, passcode: string }> {
    const response = await appProfilesInstance.get('/user/admin/getCommerceByInternalId/' + String(commerceInternalId))
    const user = response.data.response

    if (user == null) throw new AppErrorResponse({ name: 'No se encontró el comercio', statusCode: 404 })
    const userId = user._id

    const terminal = await TerminalModel.findOne({ serialNumber, active: true, pending: false })
    if (terminal?.commerce?.toString() !== userId) throw new AppErrorResponse({ name: 'La terminal no está asignada al comercio', statusCode: 403 })
    if (terminal == null) throw new AppErrorResponse({ name: 'Terminal no encontrada / en proceso de asignación', statusCode: 404 })

    const isValid = compareOtp(otp, terminal.otpCode)
    const currentTime = Date.now()
    const otpExpiresAt = new Date(terminal.otpExpiresAt)

    if (terminal.otpStatus !== ETerminalOtpStatus.PENDING) {
      throw new AppErrorResponse({ statusCode: 401, name: 'Credenciales incorrectas o OTP expirada (1)' })
    }

    if (!isValid) {
      terminal.otpStatus = ETerminalOtpStatus.WRONG
      await terminal.save({ validateBeforeSave: true, validateModifiedOnly: true })
      throw new AppErrorResponse({ statusCode: 401, name: 'Credenciales incorrectas o OTP expirada (2)' })
    }

    if (currentTime > otpExpiresAt.getTime()) {
      terminal.otpStatus = ETerminalOtpStatus.EXPIRED
      await terminal.save({ validateBeforeSave: true, validateModifiedOnly: true })
      throw new AppErrorResponse({ statusCode: 401, name: 'Credenciales incorrectas o OTP expirada (3)' })
    }
    const { apiKey, hashedApiKey } = await generateApiKey()
    terminal.apiKey = hashedApiKey
    terminal.otpStatus = ETerminalOtpStatus.SUCCESS
    await terminal.save({ validateBeforeSave: true, validateModifiedOnly: true })

    const commerce = await getCommerce(String(terminal.commerce), ['email'])
    const commerceEmail = commerce.email

    if (commerceEmail != null && commerceEmail !== '') {
      const template = resetTpvPasscodeTemplate({ serialNumber: terminal.serialNumber, passcode: otp })
      await appSendEmail(commerceEmail, '[TPV] Codigo de verificación restablecido', template)
    }

    return { apiKey, passcode: otp }
  }

  async resetPasscode (commerceId: string, serialNumber: string): Promise<{ passcode: string }> {
    const terminal = await TerminalModel.findOne({ active: true, serialNumber, commerce: commerceId })
    if (terminal === null) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró la terminal' })

    const commerce = await getCommerce(String(terminal.commerce), ['email'])
    const commerceEmail = commerce.email

    if (commerceEmail == null || commerceEmail === '') {
      throw new AppErrorResponse({ statusCode: 401, name: 'No se encontró email de restablecimiento de código' })
    }

    const newPasscode = generateRandomString(otpLength, otpValidCharacters)
    terminal.passcode = newPasscode
    await terminal.save()

    const template = resetTpvPasscodeTemplate({ serialNumber: terminal.serialNumber, passcode: newPasscode })
    await appSendEmail(commerceEmail, '[TPV] Codigo de verificación restablecido', template)

    return { passcode: newPasscode }
  }

  async deleteTerminal (id: string): Promise<ITerminal> {
    const record = await TerminalModel.findByIdAndUpdate(id, { active: false, deletedAt: new Date() })
    if (record == null) throw new AppErrorResponse({ statusCode: 404, name: 'Terminal no encontrada' })
    return record
  }
}

const terminalService: TerminalService = new TerminalService()
export default terminalService
