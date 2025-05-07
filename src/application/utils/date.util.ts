// import * as moment from 'moment'
/* constants */
import { AppDayNames } from '@app/constants/date.constants'
/* dtos */
import type { EDayNames } from '@app/dtos/date.dto'

export function getDayName (date: Date): EDayNames | undefined {
  const dayValue = date.getDay()
  return AppDayNames.get(dayValue)
}

export function getYear (date: Date): number {
  return date.getFullYear()
}

export function getYearLastTwoDigits (date: Date): string {
  return date.getFullYear().toString().substring(2)
}

export function getMonth (date: Date): number {
  return date.getMonth()
}

export function getMonthTwoDigits (date: Date): string {
  const month = date.getMonth() + 1
  if (month <= 9) return `0${month}`
  return `${month}`
}

export function getDay (date: Date): number {
  return date.getDate()
}

export function getStringDate (date: Date): string {
  return `${getYearLastTwoDigits(date)}${getMonthTwoDigits(date)}${getDayTwoDigits(date)}`
}

export function getDayTwoDigits (date: Date): string {
  const day = date.getDate()
  if (day <= 9) return `0${day}`
  return `${day}`
}

export function convertStringToDate (dateString: string): Date {
  const year = parseInt(dateString.substring(0, 2)) + 2000 // Agrega 2000 para obtener el año en formato completo
  const month = parseInt(dateString.substring(2, 4)) - 1 // Resta 1 al mes ya que los meses en JavaScript van de 0 a 11
  const day = parseInt(dateString.substring(4))
  return new Date(year, month, day)
}

export function getWeek (date: Date): {
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
} {
  const monday = new Date(date)
  monday.setDate(date.getDate() - date.getDay() + 1)

  const tuesday = new Date(date)
  tuesday.setDate(date.getDate() - date.getDay() + 2)

  const wednesday = new Date(date)
  wednesday.setDate(date.getDate() - date.getDay() + 3)

  const thursday = new Date(date)
  thursday.setDate(date.getDate() - date.getDay() + 4)

  const friday = new Date(date)
  friday.setDate(date.getDate() - date.getDay() + 5)

  const saturday = new Date(date)
  saturday.setDate(date.getDate() - date.getDay() + 6)

  const sunday = new Date(date)
  sunday.setDate(date.getDate() - date.getDay() + 7)

  return {
    monday: `${getMonthTwoDigits(monday)}${getDayTwoDigits(monday)}`,
    tuesday: `${getMonthTwoDigits(tuesday)}${getDayTwoDigits(tuesday)}`,
    wednesday: `${getMonthTwoDigits(wednesday)}${getDayTwoDigits(wednesday)}`,
    thursday: `${getMonthTwoDigits(thursday)}${getDayTwoDigits(thursday)}`,
    friday: `${getMonthTwoDigits(friday)}${getDayTwoDigits(friday)}`,
    saturday: `${getMonthTwoDigits(saturday)}${getDayTwoDigits(saturday)}`,
    sunday: `${getMonthTwoDigits(sunday)}${getDayTwoDigits(sunday)}`
  }
}

export function getThreeMonthsOfYear (date: Date): string[] {
  const year = date.getFullYear() // Obtener el año de la fecha
  const month = date.getMonth() // Obtener el mes de la fecha
  const months: string[] = []

  for (let i = 2; i >= 0; i--) {
    const previousMonth = new Date(year, month - i, 1)
    months.push(`${getYearLastTwoDigits(previousMonth)}${getMonthTwoDigits(previousMonth)}`)
  }

  return months
}

export function formatTimestamp (timestamp: number): string {
  const date = new Date(timestamp)

  const day = String(date.getDate()).padStart(2, '0')
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date)
  const year = String(date.getFullYear())
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  const formattedDate = `${day} ${month} ${year}`
  const formattedTime = `${hours}:${minutes}:${seconds}`

  return `${formattedDate} ${formattedTime}`
}

export function convertirAMesYAnio (entrada: string): string {
  const anio = '20' + entrada.slice(0, 2)
  const mes = Number(entrada.slice(2))

  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  const nombreMes = nombresMeses[mes - 1]
  const resultado = `${nombreMes} ${anio}`

  return resultado
}

export function formatYYMMDDHHmmSS (dateString: string): string {
  if (!/^\d{12}$/.test(dateString)) {
    throw new Error('Formato inválido, debe ser YYMMDDHHmmSS')
  }

  const year = parseInt(dateString.substring(0, 2), 10)
  const month = parseInt(dateString.substring(2, 4), 10)
  const day = dateString.substring(4, 6)
  const hours = dateString.substring(6, 8)
  const minutes = dateString.substring(8, 10)
  const seconds = dateString.substring(10, 12)

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const formattedMonth = monthNames[month - 1] ?? month

  return `${day}/${formattedMonth}/${year.toString().padStart(2, '0')} ${hours}:${minutes}:${seconds}`
}
