import { ETransactionBrand } from '@app/interfaces/transaction.interface'

export function mask (cardNumber: string): string {
  const first = cardNumber.slice(0, 6)
  const last = cardNumber.slice(-4)
  const masked = '*'.repeat(cardNumber.length - first.length - last.length)
  return `${first}${masked}${last}`
}

export function getCardBrand (cc: string): string {
  const amex = /^3[47][0-9*]{13}$/
  const visa = /^4[0-9*]{12}(?:[0-9]{3})?$/
  const mastercard = /^5[1-5][0-9*]{2}$/
  const mastercard2 = /^2[2-7][0-9*]{2}$/
  if (visa.test(cc)) {
    return 'visa'
  }
  if (amex.test(cc)) {
    return 'amex'
  }
  if (mastercard.test(cc.substring(0, 4)) || mastercard2.test(cc.substring(0, 4))) {
    return 'mastercard'
  }
  return 'otra'
}

export function getCardBrandRegex (brand: string): RegExp {
  const amex = /^3[47][0-9*]{13}$/
  const visa = /^4[0-9*]{12}(?:[0-9]{3})?$/
  const mastercard = /^(5[1-5]|2[2-7])[0-9*]{2}/
  const other = /^(?!3[47]|4[0-9]{3}|5[1-5]|2[2-7])[0-9*]+$/
  const all = /^.*$/

  if (brand === ETransactionBrand.VISA) {
    return visa
  }
  if (brand === ETransactionBrand.AMEX) {
    return amex
  }
  if (brand === ETransactionBrand.MASTERCARD) {
    return mastercard
  }
  if (brand === ETransactionBrand.OTHER) {
    return other
  }
  return all
}
