const translationDict = {
  approved: 'aprobada',
  cancelled: 'cancelada',
  declined: 'declinada',
  reversed: 'revertida',
  credit: 'credito',
  debit: 'debito',
  international: 'internacional',
  done: 'hecho',
  pending: 'pendiente',
  'in-process': 'en proceso'
}

export function translate (payload: string, lang: string): string {
  if (payload in translationDict) return translationDict[payload as keyof typeof translationDict]
  else return payload
}

// export function translate (payload: keyof typeof translationDict, lang: string): string {
//   return translationDict[payload] ?? payload
// }
