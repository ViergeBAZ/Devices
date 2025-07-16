import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

const commerceKey = process.env.COMMERCE_JWT_PRIVATE_KEY
const advisorKey = process.env.ADVISOR_JWT_PRIVATE_KEY
const franchiseKey = process.env.FRANCHISE_JWT_PRIVATE_KEY
const backofficeKey = process.env.BACKOFFICE_JWT_PRIVATE_KEY

export function verifyCommerceToken<T> (token: string): T {
  return jwt.verify(token, commerceKey ?? '') as T
}

export function verifyFranchiseToken<T> (token: string): T {
  return jwt.verify(token, franchiseKey ?? '') as T
}

export function verifyAdvisorToken<T> (token: string): T {
  return jwt.verify(token, advisorKey ?? '') as T
}

export function verifyBackofficeToken<T> (token: string): T {
  return jwt.verify(token, backofficeKey ?? '') as T
}

export async function generateApiKey (): Promise<{ apiKey: string, hashedApiKey: string }> {
  // Generar API Key
  const uuid: string = uuidv4()
  const apiKey = 'api-' + uuid + '-' + Math.random().toString(36).substring(2, 8)
  // Hashear y encriptar la API Key
  const salt: string = bcrypt.genSaltSync(5)
  const hashedApiKey = bcrypt.hashSync(apiKey, salt)
  return { apiKey, hashedApiKey }
}

export function compareApiKey (apiKey: string, hashedApiKey: string): boolean {
  return bcrypt.compareSync(apiKey, hashedApiKey)
}

export function compareOtp (otp: string, hashedOtp: string): boolean {
  return bcrypt.compareSync(otp, hashedOtp)
}

export function hashString (password: string): string {
  const salt: string = bcrypt.genSaltSync(10)
  const hash: string = bcrypt.hashSync(password, salt)
  return hash
}
