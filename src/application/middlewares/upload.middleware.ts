import multer from 'multer'

export const uploadFileMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // archivo no mayor a 3mb
})
