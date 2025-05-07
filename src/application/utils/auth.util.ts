import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

export function verifyCommerceToken<T> (token: string): T {
  return jwt.verify(token, process.env.COMMERCE_JWT_PRIVATE_KEY ?? '') as T
}

export function verifyFranchiseToken<T> (token: string): T {
  return jwt.verify(token, process.env.FRANCHISE_JWT_PRIVATE_KEY ?? '') as T
}

export function verifyBackofficeToken<T> (token: string): T {
  return jwt.verify(token, process.env.BACKOFFICE_JWT_PRIVATE_KEY ?? '') as T
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
