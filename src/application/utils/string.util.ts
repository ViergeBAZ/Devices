export function generateRandomString (length: number, charset: string): string {
  let result = ''
  const charsetLength = charset.length
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charsetLength))
  }
  return result
}
