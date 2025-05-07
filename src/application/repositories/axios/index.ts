import { customLog } from '@app/utils/util.util'
import axios from 'axios'

export const appProfilesInstance = axios.create({
  baseURL: process.env?.PROFILES_ENDPOINT ?? '',
  headers: {
    common: {
      Authorization: `Bearer ${process.env?.BACKOFFICE_JWT ?? ''}`
    }
  }
})

export const appFpmInstance = axios.create({
  baseURL: 'https://jairhome.lklpay.com.mx:3004/api'
})

export const appBackofficeInstance = axios.create({
  baseURL: process.env?.BACKOFFICE_ENDPOINT ?? ''
})

//
// Interceptors
appProfilesInstance.interceptors.request.use((config) => {
  customLog('Request sent to Profiles:', `${config.baseURL as string}/${config.url as string}`)
  return config
}, async (error) => {
  customLog('Error al enviar la solicitud:', error)
  return await Promise.reject(error)
})

appFpmInstance.interceptors.request.use((config) => {
  customLog('Request sent to FPM:', `${config.baseURL as string}/${config.url as string}`)
  return config
}, async (error) => {
  customLog('Error al enviar la solicitud:', error)
  return await Promise.reject(error)
})

appBackofficeInstance.interceptors.request.use((config) => {
  customLog('Request sent to Backoffice:', `${config.baseURL as string}/${config.url as string}`)
  return config
}, async (error) => {
  customLog('Error al enviar la solicitud:', error)
  return await Promise.reject(error)
})
