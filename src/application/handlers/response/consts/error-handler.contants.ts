import { type TFirebaseErrorCodes } from '../dtos/error-handler.dto'

export const AppError403 = new Map<TFirebaseErrorCodes, string>([
  ['auth/id-token-expired', 'El token de ID de Firebase proporcionado ha caducado.'],
  ['auth/id-token-revoked', 'Se revocó el token de ID de Firebase.'],
  ['auth/invalid-id-token', 'El token de ID proporcionado no es un token de ID de Firebase válido.'],
  ['auth/session-cookie-expired', 'La cookie de sesión de Firebase proporcionada ha caducado.'],
  ['auth/session-cookie-revoked', 'La cookie de sesión de Firebase ha sido revocada.']
])

export const AppError401 = new Map<TFirebaseErrorCodes, string>([
  ['auth/unauthorized-continue-uri', 'El dominio de la URL de continuación no está en la lista blanca. Incluya el dominio en la lista blanca en Firebase Console.']
])

export const AppError404 = new Map<TFirebaseErrorCodes, string>([
  ['auth/user-not-found', 'No existe un registro de usuario correspondiente al identificador proporcionado.']
])
