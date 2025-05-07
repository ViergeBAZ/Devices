export interface IReceiptTemplateProps {
  amount: number
  email: string
  commerceName: string
  address: string
  date: string
  time: string
  issuer: string
  authorizationCode: string
  receiptNumber: string
  card: string
  /* optional */
  description?: string
}
