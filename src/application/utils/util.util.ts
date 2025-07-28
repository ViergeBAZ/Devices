
export function sumField (array: any[], key: string): number {
  if (array.length === 0) return 0

  return array.map(element => {
    const value = parseFloat(element[key])
    return isNaN(value) ? 0 : value
  }).reduce((a: number, b: number) => a + b)
}

export function customLog (...payloads: any[]): void {
  const currentDate = new Date()
  const stringDate = new Intl.DateTimeFormat('es', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(currentDate)
  console.log(`[${stringDate}]:`, ...payloads)
}

export function arrayToObject (array: any, keyField: string): any {
  const result: any = {}
  for (const item of array) {
    result[item[keyField]] = item
  }
  return result
}

export function concatObjs (objetos: any[]): any {
  const resultado: any = {}

  objetos.forEach((objeto: any, indice: number) => {
    Object.keys(objeto).forEach((propiedad: string) => {
      const nuevaPropiedad = `${propiedad}${String(indice + 1)}`
      resultado[nuevaPropiedad] = objeto[propiedad]
    })
  })
  return resultado
}
