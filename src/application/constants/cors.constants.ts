const defaultCorsOrigin = [
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'https://fer.lklpay.com.mx:5173',
  'https://fer.lklpay.com.mx:5174',
  'https://fer.lklpay.com.mx:5175',
  'https://fer.lklpay.com.mx:5176',
  'https://ferhome.lklpay.com.mx:5173',
  'https://ferhome.lklpay.com.mx:5174',
  'https://ferhome.lklpay.com.mx:5175',
  'https://ferhome.lklpay.com.mx:5176',
  'https://lkl-pay-client.vercel.app',
  'https://lkl-pay-franchise.vercel.app',
  'https://lklpayboost.vercel.app',
  'https://devbt.lklpay.com.mx:3005',
  'https://lklpaybackoffice.vercel.app',
  'https://lklpayboostdistros.vercel.app',
  'https://lklpayboost.vercel.app',
  'https://backoffice.lklpay.com.mx',
  'https://boostdistro.lklpay.com.mx',
  'https://boost.lklpay.com.mx',
  'https://lklpaydistro.vercel.app/',

  /* taa-kin */
  'https://clientes.taakinpay.com',
  'https://distribuidores.taakinpay.com',
  'https://backoffice.taakinpay.com',
  'https://epayment.taakinpay.com',

  'https://mybackoffice.lklpay.com.mx',
  'https://adviser.lklpay.com.mx',
  'https://branches.lklpay.com.mx'
]

export const cors = {
  credentials: true,
  origin: process.env.CORS_ORIGIN != null ? JSON.parse(process.env.CORS_ORIGIN) : defaultCorsOrigin
}
