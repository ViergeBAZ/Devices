import PDFDocument from 'pdfkit'
import { Buffer } from 'buffer'
import { ETransactionStatus, type ITransaction } from '@app/interfaces/transaction.interface'
import axios from 'axios'
import { cancelledImgPath, approvedImgPath, companyLogo, declinedImgPath, refundImgPath, unknownImgPath } from '@app/constants/default-values'
import fs from 'fs'
import { TransactionSignatureModel } from '@app/repositories/mongoose/models-transactions/transaction-signature.model'
import { customLog } from '@app/utils/util.util'

interface Commercial {
  address: string
  exteriorNumber: string
  interiorNumber?: string | null
  town: string
  state: string
  zipCode: string
}

async function fetchImageBuffer (url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  return Buffer.from(response.data)
}

// Función simplificada para extraer imagen desde MongoDB Binary
function extractSignatureImage (data: any): Buffer | null {
  try {
    // Crear buffer directamente desde MongoDB Binary
    const buffer = Buffer.from(data.buffer)

    // Buscar header JPEG en las primeras posiciones (siempre está en posición 15)
    for (let i = 0; i < Math.min(buffer.length - 2, 50); i++) {
      if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
        return buffer.subarray(i)
      }
    }

    return null
  } catch (error) {
    customLog('Error extracting signature image:', error)
    return null
  }
}

async function getTransactionSignature (transactionId: string): Promise<Buffer | null> {
  try {
    const signature = await TransactionSignatureModel.findOne({
      transaction_id: transactionId
    }).lean()

    if (signature?.signature?.buffer != null) {
      return extractSignatureImage(signature.signature)
    }

    return null
  } catch (error) {
    customLog(`[TX:${transactionId}] Error al obtener la firma:`, error)
    return null
  }
}

export async function createTxVoucherPdf (transaction: ITransaction, commerce: any): Promise<Buffer> {
  let logoBuffer: Buffer | null
  try {
    logoBuffer = await fetchImageBuffer(companyLogo)
  } catch (err) {
    customLog('No se pudo cargar el logo remoto:', err)
  }

  // Obtener la firma si la transacción tiene signature flag
  let signatureBuffer: Buffer | null = null
  if (transaction.has_signature === true) {
    signatureBuffer = await getTransactionSignature(transaction['ID Transaction'])
  }

  return await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: [300, 700] })

    const buffers: Buffer[] = []
    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => { resolve(Buffer.concat(buffers)) })

    // Logo
    if (logoBuffer != null) {
      doc.image(logoBuffer, 85, undefined, { width: 120 })
      doc.moveDown(0.3)
    }
    // Título
    doc.fontSize(14).text('Ticket digital de venta', { align: 'center' })
    doc.moveDown(0.5)

    // Comercio
    const commercial = commerce.commercial as Commercial
    const fullAddress = formatCommercialAddress(commercial)
    doc.fontSize(10)
    doc.text(commerce.financial?.businessName?.toUpperCase(), { align: 'center' })
    doc.moveDown(0.2)
    doc.text(fullAddress?.toUpperCase(), { align: 'center' })
    if (commerce.address != null) {
      doc.moveDown(0.2)
      doc.text(commerce.address, { align: 'center' })
    }
    doc.moveDown(0.2)
    doc.text(`Número de afiliación: ${transaction['Afiliate Number']}`, { align: 'center' })
    doc.moveDown(0.5)

    const startX = doc.x
    let posY = doc.y
    const columnGap = 10
    const col1Width = 70
    const col2Width = 200

    function drawRow (label: string, value: string): void {
      doc.text(label, startX, posY, { width: col1Width })
      doc.text(value, startX + col1Width + columnGap, posY, { width: col2Width })
      posY += 16
    }

    // Fecha y tarjeta
    const fechaHora = formatYYMMDDHHmmSS(`${transaction['Transaction Date'] as string}${transaction['Transaction Time'] as string}`)
    drawRow('Fecha:', `${fechaHora}`)
    drawRow('No. de cuenta:', `**** **** **** ${transaction['Application PAN'].slice(-4)}`)

    const cardType = capitalizeWords(transaction['Card Type'])
    const bank = capitalizeWords(transaction.bank)
    const scheme = capitalizeWords(transaction.scheme)
    drawRow('Tipo:', `${cardType}, ${truncateStr(bank, 15)}, ${scheme}`)

    const tip = transaction.tip / 100

    drawRow('Subtotal:', `$${(transaction.Amount - tip).toFixed(2)} MXN`)
    drawRow('Cashback:', `$${tip?.toFixed(2) ?? '0.00'} MXN`)
    drawRow('Total:', `$${transaction.Amount.toFixed(2)} MXN`)
    posY += 10

    // Status
    const pageWidth = doc.page.width
    const statusIconBuffer = statusIcons[transaction.transactionStatus] ?? statusIcons[ETransactionStatus.DEFAULT]
    const iconWidth = 20
    const iconHeight = 20
    const iconX = (pageWidth - iconWidth) / 2

    if (statusIconBuffer != null) {
      doc.image(statusIconBuffer, iconX, posY, { width: iconWidth, height: iconHeight })
    }

    posY += iconHeight + 10

    const statusText = translateStatus(transaction.transactionStatus).toUpperCase()
    doc.fontSize(15)
    const textWidth = doc.widthOfString(statusText)
    doc.text(statusText, (pageWidth - textWidth) / 2, posY)

    posY += 35
    doc.fillColor('black').fontSize(9)

    // Detalles adicionales
    drawRow('Referencia:', transaction.reference)
    drawRow('RRN:', transaction['ID Transaction'])
    drawRow('ID Transacción:', transaction.txnReference)
    drawRow('Autorización:', transaction['MIT Fields']?.[0]?.[38] ?? '-----')
    // drawRow('Operación:', transaction._id.toString().slice(-7))
    drawRow('ID de terminal:', transaction['IFD Serial Number'] ?? '-----')
    drawRow('Secuencia:', extractSequence(transaction.tlv) ?? '-----')
    drawRow('AID:', extractAID(transaction.tlv) ?? '-----')
    drawRow('ARQC:', extractARQC(transaction.tlv) ?? '-----')
    drawRow('AUTORIZADO:', translateReadMode(transaction.readMode, signatureBuffer != null))
    doc.y = posY

    // Agregar firma si existe
    if (signatureBuffer != null) {
      posY += 20
      doc.fontSize(10)
      doc.text('Firma del cliente:', startX, posY)
      posY += 15

      try {
        // Definir dimensiones de la firma
        const signatureWidth = 120
        const signatureHeight = 60
        const signatureX = (pageWidth - signatureWidth) / 2

        // Usar la imagen extraída directamente (ya viene procesada desde getTransactionSignature)
        doc.image(signatureBuffer, signatureX, posY, {
          width: signatureWidth,
          height: signatureHeight
        })
        posY += signatureHeight + 10
      } catch (error) {
        customLog('Error al agregar la firma al PDF:', error instanceof Error ? error.message : String(error))
        doc.text('Error al cargar la firma', startX, posY)
        posY += 15
      }
    }

    doc.end()
  })
}

function formatCommercialAddress (commercial: Commercial): string {
  const parts = []
  parts.push(`${commercial.address} ${commercial.exteriorNumber}`)
  if (commercial.interiorNumber != null && commercial.interiorNumber.trim() !== '') {
    parts.push(`Int. ${commercial.interiorNumber}`)
  }

  parts.push(commercial.town)
  parts.push(commercial.state)
  parts.push(`CP: ${commercial.zipCode}`)
  return parts.join(', ')
}

function capitalizeWords (str: string): string {
  return str.split(' ').map(word => word.length > 0 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : '').join(' ')
}

function truncateStr (text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '..'
}

function translateStatus (status: ETransactionStatus): string {
  switch (status) {
    case ETransactionStatus.DEFAULT:
      return 'No disponible'
    case ETransactionStatus.APPROVED:
      return 'Aprobada'
    case ETransactionStatus.DECLINED:
      return 'Rechazada'
    case ETransactionStatus.CANCELLED:
      return 'Cancelada'
    case ETransactionStatus.REVERSED:
      return 'Rechazada*'
    case ETransactionStatus.REFUND:
      return 'Reembolso'
    case ETransactionStatus.FPM_DECLINED:
      return 'Rechazada FPM'
    default:
      return 'Desconocido'
  }
}

function extractAID (tlv: string | undefined): string | undefined {
  if (tlv == null) return '----'
  const tag = '9F10'
  const index = tlv.indexOf(tag)
  if (index === -1) return

  const len = parseInt(tlv.substr(index + 2, 2), 16)
  return tlv.substr(index + 4, len * 2)
}

function extractARQC (tlv: string | undefined): string | undefined {
  if (tlv == null) return '----'
  const tag = '9F26'
  const index = tlv.indexOf(tag)
  if (index === -1) return

  const len = parseInt(tlv.substr(index + 4, 2), 16)
  return tlv.substr(index + 6, len * 2)
}

function extractSequence (tlv: string | undefined): string | undefined {
  if (tlv == null) return '----'
  const tag = '9F41'
  const index = tlv.indexOf(tag)
  if (index === -1) return

  const len = parseInt(tlv.substr(index + 4, 2), 16)
  return tlv.substr(index + 6, len * 2)
}

function translateReadMode (code: string, hasSignature: boolean = false): string {
  switch (code) {
    case '01':
      return 'Tarjeta digitada'
    case '80':
      return 'Fallback'
    case '05':
      return hasSignature ? 'Chip + firma' : 'Autorizado con Chip + NIP'
    case '07':
      return hasSignature ? 'Autorizado con firma' : 'Autorizado sin contacto'
    default:
      return 'Desconocido'
  }
}

function formatYYMMDDHHmmSS (value: string): string {
  if (!/^\d{12}$/.test(value)) return 'Fecha inválida'

  const year = 2000 + parseInt(value.slice(0, 2), 10)
  const month = value.slice(2, 4)
  const day = value.slice(4, 6)
  const hour = value.slice(6, 8)
  const minute = value.slice(8, 10)
  const second = value.slice(10, 12)

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

const statusIcons: Record<string, Buffer> = {
  [ETransactionStatus.APPROVED]: fs.readFileSync(approvedImgPath),
  [ETransactionStatus.CANCELLED]: fs.readFileSync(cancelledImgPath),
  [ETransactionStatus.DECLINED]: fs.readFileSync(declinedImgPath),
  [ETransactionStatus.REVERSED]: fs.readFileSync(declinedImgPath),
  [ETransactionStatus.REFUND]: fs.readFileSync(refundImgPath),
  [ETransactionStatus.DEFAULT]: fs.readFileSync(unknownImgPath),
  [ETransactionStatus.FPM_DECLINED]: fs.readFileSync(declinedImgPath)
}
