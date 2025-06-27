import path from 'path'

export const companyLogo = process.env.COMPANY_LOGO_URL ?? ''

export const approvedImgPath = path.resolve(__dirname, '../../../assets/icons/check.png')
export const declinedImgPath = path.resolve(__dirname, '../../../assets/icons/cross.png')
export const cancelledImgPath = path.resolve(__dirname, '../../../assets/icons/block.png')
export const refundImgPath = path.resolve(__dirname, '../../../assets/icons/back.png')
export const unknownImgPath = path.resolve(__dirname, '../../../assets/icons/question.png')
